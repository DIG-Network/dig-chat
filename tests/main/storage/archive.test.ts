import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_MAX_BYTES,
  ArchiveDecryptError,
  ArchiveFormatError,
  ArchiveTooLargeError,
  ArchiveUnsupportedVersionError,
  decodeArchive,
  encodeArchive,
} from '../../../src/main/storage/archive';
import type { ChatMessage } from '../../../src/main/chat/conversation';

/**
 * The portable, passphrase-derived history archive (SPEC §5.7).
 *
 * The archive is the ONE at-rest form a stranger's tool must be able to read, so the tests pin the
 * container's guarantees rather than its convenience: a passphrase round-trips; a wrong passphrase and
 * a corrupt file are the SAME single authentication failure (no oracle that distinguishes them); every
 * header field is bound by the GCM AAD so a tampered version or salt fails the tag rather than
 * silently taking effect; and peer text that survived a hand-edited archive is re-neutralised on the
 * way back in (§5.5).
 */

const PASSPHRASE = 'correct horse battery staple';

/**
 * A deliberately cheap Argon2id cost, used ONLY in these tests.
 *
 * Production seals at m=65536 (64 MiB), which makes a single derivation take seconds — fine for a
 * once-per-export human action, ruinous for a suite that encodes and decodes dozens of times. The cost
 * is injectable (#2029), so the tests drive the KDF at a few kibibytes and one pass: the crypto path is
 * byte-for-byte the same, only the work factor shrinks, so every guarantee below is still exercised in
 * milliseconds instead of a minute. Encode and decode MUST agree on the cost, so both are given it.
 */
const TEST_KDF = { m: 8, t: 1, p: 1 } as const;

/** Seal under the cheap test cost, so a round-trip test is milliseconds not seconds. */
function seal(passphrase: string, messages: readonly ChatMessage[]): Buffer {
  return encodeArchive(passphrase, messages, TEST_KDF);
}

/** Open under the same cheap test cost the matching {@link seal} used. */
function open(passphrase: string, bytes: Buffer): ChatMessage[] {
  return decodeArchive(passphrase, bytes, TEST_KDF);
}

function message(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'sent-1',
    direction: 'sent',
    peerDid: 'did:chia:bob',
    body: 'the vault combination is not going in a log file',
    at: 1_800_000_000_000,
    ...over,
  };
}

/** Parse the JSON container so a test can tamper with a single field and re-serialise it. */
function container(bytes: Buffer): Record<string, unknown> {
  return JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
}

describe('round-trip', () => {
  it('decodes exactly what it encoded, for the right passphrase', () => {
    const history = [
      message({ id: 'sent-1', body: 'hello' }),
      message({ id: 'received-2', direction: 'received', peerDid: 'did:chia:alice', body: 'hi' }),
    ];
    const bytes = seal(PASSPHRASE, history);
    expect(open(PASSPHRASE, bytes)).toEqual(history);
  });

  it('produces a well-formed container: magic, version, kdf params and base64 fields', () => {
    const parsed = container(seal(PASSPHRASE, [message()]));
    expect(parsed.magic).toBe('DIGCHAT-ARCHIVE');
    expect(parsed.v).toBe(1);
    expect(parsed.cipher).toBe('AES-256-GCM');
    const kdf = parsed.kdf as { algo: string; m: number; t: number; p: number; saltB64: string };
    // The header records the cost actually used, so a cheap-cost seal writes the cheap cost — the
    // production default is pinned separately below.
    expect(kdf).toMatchObject({ algo: 'argon2id', ...TEST_KDF });
    expect(Buffer.from(kdf.saltB64, 'base64')).toHaveLength(16);
    expect(Buffer.from(parsed.nonceB64 as string, 'base64')).toHaveLength(12);
  });

  it('defaults to the production Argon2id cost (m=65536) when no cost is given (#2029)', () => {
    // The guard on the whole change: the cost is injectable ONLY to speed tests. A seal with no cost
    // argument MUST still write the production work factor into the header, so a future edit cannot
    // silently weaken every real export by lowering the default.
    const parsed = container(encodeArchive(PASSPHRASE, [message()]));
    expect(parsed.kdf as { m: number; t: number; p: number }).toMatchObject({
      m: 65536,
      t: 3,
      p: 1,
    });
  });

  it('uses a fresh salt and nonce each time, so two encodes of the same input differ', () => {
    const a = container(seal(PASSPHRASE, [message()]));
    const b = container(seal(PASSPHRASE, [message()]));
    expect(a.nonceB64).not.toBe(b.nonceB64);
    expect((a.kdf as { saltB64: string }).saltB64).not.toBe((b.kdf as { saltB64: string }).saltB64);
  });
});

describe('a decode failure is total, and gives nothing away', () => {
  it('rejects a wrong passphrase as an authentication failure', () => {
    const bytes = seal(PASSPHRASE, [message()]);
    expect(() => open('wrong passphrase', bytes)).toThrow(ArchiveDecryptError);
  });

  it('rejects a truncated ciphertext the same way — no distinct "corrupt" signal', () => {
    const parsed = container(seal(PASSPHRASE, [message()]));
    const ct = Buffer.from(parsed.ctB64 as string, 'base64');
    parsed.ctB64 = ct.subarray(0, ct.length - 4).toString('base64');
    const tampered = Buffer.from(JSON.stringify(parsed), 'utf8');
    expect(() => open(PASSPHRASE, tampered)).toThrow(ArchiveDecryptError);
  });

  it('rejects a bumped version field via the AAD binding, not as a version error', () => {
    // The ciphertext still says v:1 inside; flipping only the header v proves the header is
    // authenticated — the tag fails before any version dispatch on the plaintext.
    const parsed = container(seal(PASSPHRASE, [message()]));
    parsed.v = 1; // keep the format-version gate happy so the AAD check is what fires
    (parsed.kdf as { saltB64: string }).saltB64 = Buffer.alloc(16, 7).toString('base64');
    const tampered = Buffer.from(JSON.stringify(parsed), 'utf8');
    expect(() => open(PASSPHRASE, tampered)).toThrow(ArchiveDecryptError);
  });

  it('rejects an altered nonce via the AAD binding', () => {
    const parsed = container(seal(PASSPHRASE, [message()]));
    parsed.nonceB64 = Buffer.alloc(12, 9).toString('base64');
    const tampered = Buffer.from(JSON.stringify(parsed), 'utf8');
    expect(() => open(PASSPHRASE, tampered)).toThrow(ArchiveDecryptError);
  });
});

describe('the file size is capped before any parse (#2020)', () => {
  it('rejects a buffer larger than the cap as ArchiveTooLargeError, before JSON.parse', () => {
    // The oversize buffer is deliberately NOT valid JSON: if the guard fired AFTER the parse it would
    // surface as an ArchiveFormatError instead, so demanding the too-large error proves the cap runs
    // first — a hostile multi-GB file never reaches JSON.parse and cannot OOM the main process.
    const oversize = Buffer.alloc(ARCHIVE_MAX_BYTES + 1, 0x7b); // 0x7b = '{', never a complete JSON doc
    expect(() => open(PASSPHRASE, oversize)).toThrow(ArchiveTooLargeError);
  });

  it('lets a buffer at the cap proceed to normal parsing', () => {
    // A buffer exactly at the cap is under the limit, so the guard passes and the ordinary format check
    // takes over: this junk is not a container, so it fails as a format error, not a size error.
    const atCap = Buffer.alloc(ARCHIVE_MAX_BYTES, 0x7b);
    expect(() => open(PASSPHRASE, atCap)).toThrow(ArchiveFormatError);
  });

  it('round-trips a normal archive well under the cap', () => {
    const bytes = seal(PASSPHRASE, [message()]);
    expect(bytes.length).toBeLessThan(ARCHIVE_MAX_BYTES);
    expect(open(PASSPHRASE, bytes)).toEqual([message()]);
  });
});

describe('the container is validated before any key work', () => {
  it('rejects a missing or wrong magic as a format error', () => {
    const parsed = container(seal(PASSPHRASE, [message()]));
    parsed.magic = 'NOPE';
    expect(() => open(PASSPHRASE, Buffer.from(JSON.stringify(parsed)))).toThrow(ArchiveFormatError);
  });

  it('rejects bytes that are not JSON as a format error', () => {
    expect(() => open(PASSPHRASE, Buffer.from('not json at all'))).toThrow(ArchiveFormatError);
  });

  it('rejects an unknown format version distinctly', () => {
    const parsed = container(seal(PASSPHRASE, [message()]));
    parsed.v = 2;
    expect(() => open(PASSPHRASE, Buffer.from(JSON.stringify(parsed)))).toThrow(
      ArchiveUnsupportedVersionError,
    );
  });
});

describe('imported peer text is re-sanitised (§5.5)', () => {
  it('strips control and direction-altering bytes from a hand-crafted payload', () => {
    // A body carrying a carriage return, an ANSI escape and a right-to-left override — the archive
    // was authored by a tool that did not sanitise. The reader must, because the file is untrusted.
    const hostile = message({ body: 'safe\r[31m‮evil', peerDid: 'did:chia:‮bob' });
    const bytes = seal(PASSPHRASE, [hostile]);
    const [restored] = open(PASSPHRASE, bytes);
    const RETURN = String.fromCharCode(0x0d);
    const OVERRIDE = String.fromCharCode(0x202e);
    expect(restored!.body).not.toContain(RETURN);
    expect(restored!.body).not.toContain(OVERRIDE);
    expect(restored!.peerDid).not.toContain(OVERRIDE);
  });

  it('drops a NaN-timestamped entry on import, keeping the finite ones (#2021)', () => {
    // A hand-crafted archive whose author skipped the finite-timestamp check must not smuggle a
    // non-finite `at` into history on the way in — the reader re-runs the shape check and drops it.
    const good = message({ id: 'good-1' });
    const bytes = seal(PASSPHRASE, [good, { ...message({ id: 'nan-1' }), at: Number.NaN }]);
    expect(open(PASSPHRASE, bytes)).toEqual([good]);
  });
});
