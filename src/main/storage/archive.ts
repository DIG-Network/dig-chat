/**
 * The portable, passphrase-derived history archive: dig-chat's ONE at-rest form that travels between
 * machines and tools.
 *
 * # Why a second at-rest form exists beside `./history`
 *
 * History at rest (`./history`) is sealed to THIS OS user through `safeStorage` — fast, invisible, and
 * bound to the machine, which is exactly wrong for an export the user carries to another device. So an
 * export is sealed to a PASSPHRASE instead: anyone who knows it, on any machine, can read the archive,
 * and nobody who does not can. That is a deliberately different trust model, orthogonal to the
 * keypair-sealed at-rest contract NC-2 will eventually add (dig_ecosystem#2004) — a passphrase is
 * something the user knows, not the identity keypair.
 *
 * # The container, and what the tag protects
 *
 * `DIGCHAT-ARCHIVE` v1 is a single JSON file with base64 fields (SPEC §5.7): an Argon2id-derived key
 * (m=65536 KiB, t=3, p=1) feeds AES-256-GCM. The GCM AAD is the canonical header WITHOUT the
 * ciphertext, so magic, version, KDF parameters, salt and nonce are all AUTHENTICATED: a downgraded
 * parameter, a bumped version, or a reused nonce fails the tag rather than silently taking effect.
 *
 * # A decode gives nothing away
 *
 * A wrong passphrase and a corrupt file are the SAME failure — one GCM authentication error
 * ({@link ArchiveDecryptError}) — so the archive is not an oracle for guessing the passphrase. Decode
 * is total: any failure throws and the caller touches nothing; there is no partial import.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { argon2id } from '@noble/hashes/argon2';

import type { ChatMessage } from '../chat/conversation';
import { isStoredMessage, sanitizeStoredMessage } from '../chat/stored-message';

/** The magic string every archive begins with, so a foreign file is refused before any key work. */
export const ARCHIVE_MAGIC = 'DIGCHAT-ARCHIVE';

/** The only container version this build writes and reads. */
export const ARCHIVE_VERSION = 1;

/**
 * The largest archive this build will read into memory (#2020).
 *
 * A history is bounded to ≤1000 messages / ≤1 MB plaintext (SPEC §5.4); the container adds only a
 * small header plus base64's ~33% overhead, so a legitimate archive is comfortably under 2 MiB. The
 * cap is set to 4 MiB — generous headroom for the header and encoding over that ceiling — so an honest
 * export always fits while a hostile or corrupt multi-GB `.digchat` file is refused BEFORE `JSON.parse`
 * rather than being read whole into the main process and OOM-ing it. The bound is enforced twice: on
 * the raw bytes here (a pure guard), and on the file's `stat` size before it is ever read (index.ts).
 */
export const ARCHIVE_MAX_BYTES = 4 * 1_024 * 1_024;

/** Argon2id work factors (SPEC §5.7). Interactive-desktop tuned: 64 MiB, three passes, single lane. */
// #2029: the cost (m/t/p) is injectable so tests can derive with a cheap factor; production omits the arg.
const KDF = { algo: 'argon2id', m: 65_536, t: 3, p: 1 } as const;

const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

/** The KDF descriptor as it appears in the container header. */
interface KdfHeader {
  readonly algo: 'argon2id';
  readonly m: number;
  readonly t: number;
  readonly p: number;
  readonly saltB64: string;
}

/**
 * The authenticated header — every field EXCEPT the ciphertext. Its canonical JSON is the GCM AAD, so
 * the key order here is the contract: {@link canonicalHeader} serialises exactly these keys in exactly
 * this order.
 */
interface ArchiveHeader {
  readonly magic: string;
  readonly v: number;
  readonly kdf: KdfHeader;
  readonly cipher: 'AES-256-GCM';
  readonly nonceB64: string;
}

/** The whole on-disk container: the authenticated header plus the sealed body. */
interface ArchiveContainer extends ArchiveHeader {
  readonly ctB64: string;
}

/** The plaintext shape sealed inside the archive — the same {@link ChatMessage} list `./history` holds. */
interface ArchivePayload {
  readonly v: 1;
  readonly messages: ChatMessage[];
}

/**
 * Seal `messages` into a `DIGCHAT-ARCHIVE` v1 container under `passphrase`.
 *
 * A fresh random salt and nonce are drawn per call, so two exports of the same history are distinct
 * ciphertexts and no nonce is ever reused under a derived key.
 */
export function encodeArchive(passphrase: string, messages: readonly ChatMessage[]): Buffer {
  const salt = randomBytes(SALT_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const key = deriveKey(passphrase, salt);

  const header: ArchiveHeader = {
    magic: ARCHIVE_MAGIC,
    v: ARCHIVE_VERSION,
    kdf: { ...KDF, saltB64: salt.toString('base64') },
    cipher: 'AES-256-GCM',
    nonceB64: nonce.toString('base64'),
  };

  const payload: ArchivePayload = { v: 1, messages: [...messages] };
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(canonicalHeader(header), 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), 'utf8')),
    cipher.final(),
  ]);
  const sealed = Buffer.concat([ciphertext, cipher.getAuthTag()]);

  const container: ArchiveContainer = { ...header, ctB64: sealed.toString('base64') };
  return Buffer.from(JSON.stringify(container), 'utf8');
}

/**
 * Open a `DIGCHAT-ARCHIVE` container with `passphrase`, returning its messages re-sanitised.
 *
 * Fail-closed, in order: the bytes must be within the size cap ({@link ArchiveTooLargeError}) so a
 * hostile file cannot OOM the process before it is even parsed, then parse and carry the magic
 * ({@link ArchiveFormatError}), then
 * be a version this build understands ({@link ArchiveUnsupportedVersionError}), then authenticate under
 * the derived key ({@link ArchiveDecryptError} — the ONE signal that covers both a wrong passphrase and
 * a tampered file). Only then is the plaintext parsed, and every entry is re-run through the peer-text
 * sanitiser (§5.5) because the archive is an untrusted file. Any failure throws; nothing partial is
 * ever returned.
 *
 * @throws {ArchiveTooLargeError} the bytes exceed {@link ARCHIVE_MAX_BYTES} — refused before any parse.
 * @throws {ArchiveFormatError} the bytes are not a well-formed archive container.
 * @throws {ArchiveUnsupportedVersionError} the container version is not one this build reads.
 * @throws {ArchiveDecryptError} authentication failed — wrong passphrase or corrupt/tampered file.
 */
export function decodeArchive(passphrase: string, bytes: Buffer): ChatMessage[] {
  // The size guard runs FIRST, before JSON.parse, so an oversize file is rejected without ever being
  // materialised as a parsed value — the cheap check that stops a self-inflicted OOM (#2020).
  if (bytes.length > ARCHIVE_MAX_BYTES) throw new ArchiveTooLargeError(bytes.length);

  const container = parseContainer(bytes);
  if (container.magic !== ARCHIVE_MAGIC) throw new ArchiveFormatError('not a DIG Chat archive');
  if (container.v !== ARCHIVE_VERSION) throw new ArchiveUnsupportedVersionError(container.v);

  const salt = Buffer.from(container.kdf.saltB64, 'base64');
  const nonce = Buffer.from(container.nonceB64, 'base64');
  const sealed = Buffer.from(container.ctB64, 'base64');
  const key = deriveKey(passphrase, salt);

  const plaintext = openSealed(container, key, nonce, sealed);
  return sanitiseMessages(parsePayload(plaintext));
}

/** Argon2id(utf8(passphrase), salt) → 32-byte key, at the locked work factors. */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  const key = argon2id(new TextEncoder().encode(passphrase), salt, {
    m: KDF.m,
    t: KDF.t,
    p: KDF.p,
    dkLen: KEY_BYTES,
  });
  return Buffer.from(key);
}

/**
 * The canonical JSON of the authenticated header, used as the GCM AAD.
 *
 * The key order is FIXED here rather than left to `JSON.stringify`'s insertion order, so the AAD is
 * reproducible byte-for-byte on decode regardless of how a foreign encoder ordered its container. This
 * is what binds magic + version + KDF params + salt + nonce to the ciphertext.
 */
function canonicalHeader(header: ArchiveHeader): string {
  return JSON.stringify({
    magic: header.magic,
    v: header.v,
    kdf: {
      algo: header.kdf.algo,
      m: header.kdf.m,
      t: header.kdf.t,
      p: header.kdf.p,
      saltB64: header.kdf.saltB64,
    },
    cipher: header.cipher,
    nonceB64: header.nonceB64,
  });
}

/** Parse and shape-check the container. A malformed shape is a format error, never a decrypt attempt. */
function parseContainer(bytes: Buffer): ArchiveContainer {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new ArchiveFormatError('the archive is not valid JSON');
  }
  if (!isContainer(value)) throw new ArchiveFormatError('the archive is missing required fields');
  return value;
}

/** Run the AEAD open, translating any authentication failure into the single decrypt error. */
function openSealed(header: ArchiveHeader, key: Buffer, nonce: Buffer, sealed: Buffer): string {
  const tag = sealed.subarray(sealed.length - 16);
  const ciphertext = sealed.subarray(0, sealed.length - 16);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(Buffer.from(canonicalHeader(header), 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new ArchiveDecryptError();
  }
}

/** Parse the decrypted payload. A garbled payload after a VALID tag is still a decrypt-side failure. */
function parsePayload(plaintext: string): ChatMessage[] {
  let payload: Partial<ArchivePayload>;
  try {
    payload = JSON.parse(plaintext) as Partial<ArchivePayload>;
  } catch {
    throw new ArchiveDecryptError();
  }
  if (payload.v !== 1 || !Array.isArray(payload.messages)) throw new ArchiveDecryptError();
  return payload.messages;
}

/** Re-neutralise every imported entry (§5.5): the archive is an untrusted file, its text is peer text. */
function sanitiseMessages(messages: readonly unknown[]): ChatMessage[] {
  return messages.filter(isStoredMessage).map(sanitizeStoredMessage);
}

/** Whether a decoded value has the exact container shape, so a malformed file is a format error. */
function isContainer(value: unknown): value is ArchiveContainer {
  if (typeof value !== 'object' || value === null) return false;
  const { magic, v, kdf, cipher, nonceB64, ctB64 } = value as Record<string, unknown>;
  return (
    typeof magic === 'string' &&
    typeof v === 'number' &&
    isKdfHeader(kdf) &&
    cipher === 'AES-256-GCM' &&
    typeof nonceB64 === 'string' &&
    typeof ctB64 === 'string'
  );
}

/** Whether a value is a well-formed KDF descriptor. */
function isKdfHeader(value: unknown): value is KdfHeader {
  if (typeof value !== 'object' || value === null) return false;
  const { algo, m, t, p, saltB64 } = value as Record<string, unknown>;
  return (
    algo === 'argon2id' &&
    typeof m === 'number' &&
    typeof t === 'number' &&
    typeof p === 'number' &&
    typeof saltB64 === 'string'
  );
}

/** Thrown when the bytes are not a well-formed `DIGCHAT-ARCHIVE` container. */
export class ArchiveFormatError extends Error {
  readonly messageId = 'error.archiveFormat';

  constructor(detail: string) {
    super(`this file is not a DIG Chat archive: ${detail}`);
    this.name = 'ArchiveFormatError';
  }
}

/** Thrown when the container version is newer than this build knows how to read. */
export class ArchiveUnsupportedVersionError extends Error {
  readonly messageId = 'error.archiveVersion';

  constructor(readonly version: unknown) {
    super(`this DIG Chat archive is version ${String(version)}, which this build cannot read`);
    this.name = 'ArchiveUnsupportedVersionError';
  }
}

/**
 * Thrown when the archive fails to authenticate.
 *
 * Deliberately ONE error for both a wrong passphrase and a corrupt/tampered file: distinguishing them
 * would turn the archive into an oracle a guesser could use to tell "close" from "wrong".
 */
export class ArchiveDecryptError extends Error {
  readonly messageId = 'error.archiveDecrypt';

  constructor() {
    super('the passphrase is wrong or the archive is damaged');
    this.name = 'ArchiveDecryptError';
  }
}

/**
 * Thrown when the archive exceeds {@link ARCHIVE_MAX_BYTES} (#2020).
 *
 * A legitimate history is small (SPEC §5.4), so an over-cap file is malformed or hostile. Refusing it
 * before `JSON.parse`/`readFile` keeps a multi-gigabyte `.digchat` from being read whole into the main
 * process and OOM-ing it. The import is total — nothing is added — like every other archive failure.
 */
export class ArchiveTooLargeError extends Error {
  readonly messageId = 'error.archiveTooLarge';

  constructor(readonly byteLength: number) {
    super(
      `this archive is ${byteLength} bytes, larger than DIG Chat will read (${ARCHIVE_MAX_BYTES})`,
    );
    this.name = 'ArchiveTooLargeError';
  }
}
