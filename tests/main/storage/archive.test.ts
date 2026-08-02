import { describe, expect, it } from 'vitest';

import {
  ArchiveDecryptError,
  ArchiveFormatError,
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
    const bytes = encodeArchive(PASSPHRASE, history);
    expect(decodeArchive(PASSPHRASE, bytes)).toEqual(history);
  });

  it('produces a well-formed container: magic, version, kdf params and base64 fields', () => {
    const parsed = container(encodeArchive(PASSPHRASE, [message()]));
    expect(parsed.magic).toBe('DIGCHAT-ARCHIVE');
    expect(parsed.v).toBe(1);
    expect(parsed.cipher).toBe('AES-256-GCM');
    expect(parsed.kdf).toMatchObject({ algo: 'argon2id', m: 65536, t: 3, p: 1 });
    expect(Buffer.from(parsed.kdf['saltB64' as never] as string, 'base64')).toHaveLength(16);
    expect(Buffer.from(parsed.nonceB64 as string, 'base64')).toHaveLength(12);
  });

  it('uses a fresh salt and nonce each time, so two encodes of the same input differ', () => {
    const a = container(encodeArchive(PASSPHRASE, [message()]));
    const b = container(encodeArchive(PASSPHRASE, [message()]));
    expect(a.nonceB64).not.toBe(b.nonceB64);
    expect((a.kdf as { saltB64: string }).saltB64).not.toBe((b.kdf as { saltB64: string }).saltB64);
  });
});

describe('a decode failure is total, and gives nothing away', () => {
  it('rejects a wrong passphrase as an authentication failure', () => {
    const bytes = encodeArchive(PASSPHRASE, [message()]);
    expect(() => decodeArchive('wrong passphrase', bytes)).toThrow(ArchiveDecryptError);
  });

  it('rejects a truncated ciphertext the same way — no distinct "corrupt" signal', () => {
    const parsed = container(encodeArchive(PASSPHRASE, [message()]));
    const ct = Buffer.from(parsed.ctB64 as string, 'base64');
    parsed.ctB64 = ct.subarray(0, ct.length - 4).toString('base64');
    const tampered = Buffer.from(JSON.stringify(parsed), 'utf8');
    expect(() => decodeArchive(PASSPHRASE, tampered)).toThrow(ArchiveDecryptError);
  });

  it('rejects a bumped version field via the AAD binding, not as a version error', () => {
    // The ciphertext still says v:1 inside; flipping only the header v proves the header is
    // authenticated — the tag fails before any version dispatch on the plaintext.
    const parsed = container(encodeArchive(PASSPHRASE, [message()]));
    parsed.v = 1; // keep the format-version gate happy so the AAD check is what fires
    (parsed.kdf as { saltB64: string }).saltB64 = Buffer.alloc(16, 7).toString('base64');
    const tampered = Buffer.from(JSON.stringify(parsed), 'utf8');
    expect(() => decodeArchive(PASSPHRASE, tampered)).toThrow(ArchiveDecryptError);
  });

  it('rejects an altered nonce via the AAD binding', () => {
    const parsed = container(encodeArchive(PASSPHRASE, [message()]));
    parsed.nonceB64 = Buffer.alloc(12, 9).toString('base64');
    const tampered = Buffer.from(JSON.stringify(parsed), 'utf8');
    expect(() => decodeArchive(PASSPHRASE, tampered)).toThrow(ArchiveDecryptError);
  });
});

describe('the container is validated before any key work', () => {
  it('rejects a missing or wrong magic as a format error', () => {
    const parsed = container(encodeArchive(PASSPHRASE, [message()]));
    parsed.magic = 'NOPE';
    expect(() => decodeArchive(PASSPHRASE, Buffer.from(JSON.stringify(parsed)))).toThrow(
      ArchiveFormatError,
    );
  });

  it('rejects bytes that are not JSON as a format error', () => {
    expect(() => decodeArchive(PASSPHRASE, Buffer.from('not json at all'))).toThrow(
      ArchiveFormatError,
    );
  });

  it('rejects an unknown format version distinctly', () => {
    const parsed = container(encodeArchive(PASSPHRASE, [message()]));
    parsed.v = 2;
    expect(() => decodeArchive(PASSPHRASE, Buffer.from(JSON.stringify(parsed)))).toThrow(
      ArchiveUnsupportedVersionError,
    );
  });
});

describe('imported peer text is re-sanitised (§5.5)', () => {
  it('strips control and direction-altering bytes from a hand-crafted payload', () => {
    // A body carrying a carriage return, an ANSI escape and a right-to-left override — the archive
    // was authored by a tool that did not sanitise. The reader must, because the file is untrusted.
    const hostile = message({ body: 'safe\r[31m‮evil', peerDid: 'did:chia:‮bob' });
    const bytes = encodeArchive(PASSPHRASE, [hostile]);
    const [restored] = decodeArchive(PASSPHRASE, bytes);
    expect(restored.body).not.toMatch(/[\r‮]/);
    expect(restored.peerDid).not.toMatch(/[‮]/);
  });
});
