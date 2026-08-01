/**
 * The `DIGCHAT1` sealed envelope — the on-wire form of every directed dig-chat message, and the
 * thing NC-1 is about.
 *
 * # The rule this file exists to keep
 *
 * Every directed message is end-to-end encrypted to the RECIPIENT'S DID-anchored identity key,
 * layered ON TOP of mTLS. mTLS authenticates and encrypts the pipe; any intermediary that terminates
 * it — a relay, a hole-punch forwarder, a store-and-forward mailbox, a gateway — must see ciphertext
 * only. So the plaintext never exists outside the two endpoints, and the bytes that travel are these.
 *
 * # The byte layout, which is a contract
 *
 * ```text
 * offset  size  field
 *   0     8     magic      "DIGCHAT1"
 *   8     1     version    0x01
 *   9     1     suite      0x01 = X25519 / HKDF-SHA256 / XChaCha20-Poly1305
 *  10     2     sender_did_len      u16, big-endian
 *  12     n     sender_did          UTF-8
 *   …     2     recipient_did_len   u16, big-endian
 *   …     m     recipient_did       UTF-8
 *   …    32     epk        the sender's ephemeral X25519 public key
 *   …    24     nonce      the XChaCha20-Poly1305 nonce
 *   …     4     ct_len     u32, big-endian
 *   …     k     ciphertext AEAD output, tag included
 * ```
 *
 * Big-endian throughout, because that is what every wire format in this ecosystem already uses and a
 * second implementation should not have to discover the answer by experiment.
 *
 * # Why the header is authenticated but not encrypted
 *
 * The two DIDs and the ephemeral key are the ADDRESS: a relay has to read them to route, so they are
 * carried in the clear — and they are bound into the AEAD's associated data, so a relay that rewrote
 * the recipient, swapped the sender, or replayed a body under a different header produces a
 * decryption failure rather than a delivered message. Routing metadata is visible to the relay by
 * necessity; CONTENT is not visible to it at all. That distinction is stated here rather than left
 * for a reader to infer, because it is the honest limit of what this format hides.
 */

/** The eight magic bytes every envelope starts with. */
export const MAGIC = new Uint8Array([0x44, 0x49, 0x47, 0x43, 0x48, 0x41, 0x54, 0x31]); // "DIGCHAT1"

/** The only envelope version this build writes, and the lowest it reads. */
export const VERSION = 1;

/** Suite 1: X25519 key agreement, HKDF-SHA256 key derivation, XChaCha20-Poly1305 AEAD. */
export const SUITE_X25519_XCHACHA20POLY1305 = 1;

/** The X25519 public-key length, in bytes. */
export const EPK_LEN = 32;

/** The XChaCha20-Poly1305 nonce length, in bytes. */
export const NONCE_LEN = 24;

/**
 * The largest plaintext one envelope carries, in bytes.
 *
 * 48 KiB, chosen FROM the transport's own limit rather than from taste: the DIG peer framing layer
 * caps a decoded frame at 64 KiB, and an envelope's header plus the AEAD tag has to fit inside that
 * with room for the two DIDs. A message that would not survive the transport is refused here, where
 * the error can name the reason, instead of at a framing layer that can only say the frame was too
 * big.
 */
export const MAX_PLAINTEXT_BYTES = 48 * 1024;

/** The largest a DID may be, in UTF-8 bytes — the header length field is a u16, and this is well under it. */
export const MAX_DID_BYTES = 512;

/** A decoded envelope. Every field is header material; the body stays sealed. */
export interface Envelope {
  readonly version: number;
  readonly suite: number;
  readonly senderDid: string;
  readonly recipientDid: string;
  readonly epk: Uint8Array;
  readonly nonce: Uint8Array;
  readonly ciphertext: Uint8Array;
}

/** Thrown when bytes claiming to be an envelope are not one this build can read. */
export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeError';
  }
}

/**
 * Serialise an envelope to its wire bytes.
 *
 * @throws {EnvelopeError} if any field is outside the bounds the format allows — refusing to WRITE a
 * malformed envelope keeps the failure at the sender, where there is something to say about it.
 */
export function encodeEnvelope(envelope: Envelope): Uint8Array {
  const sender = utf8(envelope.senderDid, 'sender');
  const recipient = utf8(envelope.recipientDid, 'recipient');
  requireLength(envelope.epk, EPK_LEN, 'ephemeral public key');
  requireLength(envelope.nonce, NONCE_LEN, 'nonce');

  const total =
    MAGIC.length +
    2 +
    2 +
    sender.length +
    2 +
    recipient.length +
    EPK_LEN +
    NONCE_LEN +
    4 +
    envelope.ciphertext.length;
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  let at = 0;

  bytes.set(MAGIC, at);
  at += MAGIC.length;
  bytes[at++] = envelope.version;
  bytes[at++] = envelope.suite;
  view.setUint16(at, sender.length, false);
  at += 2;
  bytes.set(sender, at);
  at += sender.length;
  view.setUint16(at, recipient.length, false);
  at += 2;
  bytes.set(recipient, at);
  at += recipient.length;
  bytes.set(envelope.epk, at);
  at += EPK_LEN;
  bytes.set(envelope.nonce, at);
  at += NONCE_LEN;
  view.setUint32(at, envelope.ciphertext.length, false);
  at += 4;
  bytes.set(envelope.ciphertext, at);

  return bytes;
}

/**
 * Parse wire bytes into an {@link Envelope}.
 *
 * **Every byte here arrives from a peer and is untrusted.** The parser reads no length it has not
 * first checked against the remaining input, so a truncated or hostile envelope produces an
 * `EnvelopeError` rather than a slice past the end of the buffer or an allocation sized by an
 * attacker. The DIDs it returns are likewise untrusted text — they are identifiers, never markup and
 * never a log line without escaping.
 *
 * @throws {EnvelopeError} for anything that is not a well-formed envelope of a known version.
 */
export function decodeEnvelope(bytes: Uint8Array): Envelope {
  const reader = new Reader(bytes);

  const magic = reader.take(MAGIC.length, 'magic');
  if (!equalBytes(magic, MAGIC)) throw new EnvelopeError('not a DIGCHAT1 envelope');

  const version = reader.takeU8('version');
  if (version !== VERSION) throw new EnvelopeError(`unsupported envelope version ${version}`);
  const suite = reader.takeU8('suite');
  if (suite !== SUITE_X25519_XCHACHA20POLY1305) {
    throw new EnvelopeError(`unsupported cipher suite ${suite}`);
  }

  const senderDid = reader.takeString('sender DID');
  const recipientDid = reader.takeString('recipient DID');
  const epk = reader.take(EPK_LEN, 'ephemeral public key');
  const nonce = reader.take(NONCE_LEN, 'nonce');
  const ciphertext = reader.take(reader.takeU32('ciphertext length'), 'ciphertext');
  reader.expectEnd();

  return { version, suite, senderDid, recipientDid, epk, nonce, ciphertext };
}

/**
 * The associated data the AEAD authenticates: everything in the header EXCEPT the ciphertext length.
 *
 * Binding the two DIDs and the ephemeral key is what stops a relay re-addressing a message it cannot
 * read — the recipient's decryption fails instead of succeeding under a forged sender.
 */
export function associatedData(
  envelope: Pick<Envelope, 'version' | 'suite' | 'senderDid' | 'recipientDid' | 'epk'>,
): Uint8Array {
  const sender = utf8(envelope.senderDid, 'sender');
  const recipient = utf8(envelope.recipientDid, 'recipient');
  const bytes = new Uint8Array(
    MAGIC.length + 2 + 2 + sender.length + 2 + recipient.length + EPK_LEN,
  );
  const view = new DataView(bytes.buffer);
  let at = 0;
  bytes.set(MAGIC, at);
  at += MAGIC.length;
  bytes[at++] = envelope.version;
  bytes[at++] = envelope.suite;
  view.setUint16(at, sender.length, false);
  at += 2;
  bytes.set(sender, at);
  at += sender.length;
  view.setUint16(at, recipient.length, false);
  at += 2;
  bytes.set(recipient, at);
  at += recipient.length;
  bytes.set(envelope.epk, at);
  return bytes;
}

/** UTF-8 encode a DID, refusing one too long for the header's length field. */
function utf8(did: string, role: string): Uint8Array {
  const bytes = new TextEncoder().encode(did);
  if (bytes.length === 0) throw new EnvelopeError(`the ${role} DID is empty`);
  if (bytes.length > MAX_DID_BYTES) {
    throw new EnvelopeError(`the ${role} DID is longer than ${MAX_DID_BYTES} bytes`);
  }
  return bytes;
}

function requireLength(bytes: Uint8Array, expected: number, role: string): void {
  if (bytes.length !== expected) {
    throw new EnvelopeError(`the ${role} must be ${expected} bytes, got ${bytes.length}`);
  }
}

/** Constant-time-independent byte equality. Used only on the magic, which is public. */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/** A bounds-checked cursor over untrusted bytes. */
class Reader {
  private at = 0;

  constructor(private readonly bytes: Uint8Array) {}

  take(length: number, role: string): Uint8Array {
    if (length < 0 || this.at + length > this.bytes.length) {
      throw new EnvelopeError(`the envelope ended inside the ${role}`);
    }
    const slice = this.bytes.subarray(this.at, this.at + length);
    this.at += length;
    return slice;
  }

  takeU8(role: string): number {
    return this.take(1, role)[0]!;
  }

  takeU32(role: string): number {
    const bytes = this.take(4, role);
    return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, false);
  }

  /** A u16-prefixed UTF-8 string, rejected if it is not valid UTF-8. */
  takeString(role: string): string {
    const lengthBytes = this.take(2, `${role} length`);
    const length = new DataView(lengthBytes.buffer, lengthBytes.byteOffset, 2).getUint16(0, false);
    const bytes = this.take(length, role);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new EnvelopeError(`the ${role} is not valid UTF-8`);
    }
  }

  expectEnd(): void {
    if (this.at !== this.bytes.length) {
      throw new EnvelopeError(`${this.bytes.length - this.at} trailing bytes after the envelope`);
    }
  }
}
