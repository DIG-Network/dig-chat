import { describe, expect, it } from 'vitest';
import { x25519 } from '@noble/curves/ed25519';

import {
  EnvelopeError,
  MAGIC,
  MAX_PLAINTEXT_BYTES,
  associatedData,
  decodeEnvelope,
  encodeEnvelope,
} from '../../../src/main/identity/envelope';
import { openReference, sealReference } from '../../../src/main/identity/conformance';

const ALICE = 'did:chia:alice';
const BOB = 'did:chia:bob';

/** Deterministic key material, so a failure is reproducible rather than a one-in-a-run event. */
function key(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

const BOB_SECRET = key(0xb0);
const BOB_PUBLIC = x25519.getPublicKey(BOB_SECRET);
const EVE_SECRET = key(0xe4);
const EPHEMERAL = key(0x0e);
const NONCE = new Uint8Array(24).fill(0x11);

function seal(plaintext: Uint8Array, over: Partial<Parameters<typeof sealReference>[0]> = {}) {
  return sealReference({
    senderDid: ALICE,
    recipientDid: BOB,
    recipientSealingPublicKey: BOB_PUBLIC,
    plaintext,
    ephemeralSecretKey: EPHEMERAL,
    nonce: NONCE,
    ...over,
  });
}

describe('NC-1: what travels is ciphertext', () => {
  it('carries no byte of the plaintext anywhere in the envelope', () => {
    // THE NC-1 assertion. The fixture is a distinctive, long-enough plaintext with no short
    // substrings that could appear in the header or the key material by chance — a three-letter
    // message could collide with random bytes and make this test flaky in the direction of passing.
    const secret = 'meet me at the bridge at nine, bring the ledger — Alice';
    const plaintext = new TextEncoder().encode(secret);

    const wire = seal(plaintext);
    const asText = new TextDecoder('utf-8', { fatal: false }).decode(wire);

    expect(asText).not.toContain(secret);
    expect(asText).not.toContain('bridge');
    expect(asText).not.toContain('ledger');
    expect(indexOfBytes(wire, plaintext)).toBe(-1);
    // …and it is not merely absent because the message was mangled: the recipient gets it back.
    expect(openReference(wire, BOB_SECRET).plaintext).toEqual(plaintext);
  });

  it('leaves the routing header readable and the body not — the honest limit of the format', () => {
    // A relay MUST be able to route, so the DIDs are in the clear by design. Stating that as a test
    // keeps a later reader from assuming the envelope hides more than it does.
    const wire = seal(new TextEncoder().encode('body text that a relay must not see'));
    const asText = new TextDecoder().decode(wire);
    expect(asText).toContain(ALICE);
    expect(asText).toContain(BOB);
    expect(asText).not.toContain('body text');
  });

  it('is unreadable to a third party who holds a different identity key', () => {
    // The relay's position, modelled: it has the whole envelope and a key of its own.
    const wire = seal(new TextEncoder().encode('for Bob only'));
    expect(() => openReference(wire, EVE_SECRET)).toThrow(EnvelopeError);
  });

  it('refuses a message a relay re-addressed to someone else', () => {
    // Vary ONE actor and keep a truthful control: the same envelope opens for Bob, and stops
    // opening the moment the recipient DID in the header is changed — which is what binding the
    // header into the AEAD's associated data buys, and what an implementation that authenticated
    // only the body would fail.
    const wire = seal(new TextEncoder().encode('for Bob only'));
    expect(openReference(wire, BOB_SECRET).plaintext).toBeDefined();

    const readdressed = rewriteRecipient(wire, 'did:chia:eve');
    expect(() => openReference(readdressed, BOB_SECRET)).toThrow(EnvelopeError);
  });

  it('refuses a message whose sender a relay rewrote', () => {
    const wire = seal(new TextEncoder().encode('for Bob only'));
    const decoded = decodeEnvelope(wire);
    const forged = encodeEnvelope({ ...decoded, senderDid: 'did:chia:mallory' });
    expect(() => openReference(forged, BOB_SECRET)).toThrow(EnvelopeError);
  });

  it('refuses a flipped bit in the body', () => {
    const wire = seal(new TextEncoder().encode('for Bob only'));
    const tampered = Uint8Array.from(wire);
    const last = tampered.length - 1;
    tampered[last] = (tampered[last] ?? 0) ^ 0x01;
    expect(() => openReference(tampered, BOB_SECRET)).toThrow(EnvelopeError);
  });

  it('produces a different envelope for the same plaintext under a different ephemeral key', () => {
    const plaintext = new TextEncoder().encode('the same words twice');
    const first = seal(plaintext);
    const second = seal(plaintext, { ephemeralSecretKey: key(0x0f) });
    expect(first).not.toEqual(second);
    expect(openReference(second, BOB_SECRET).plaintext).toEqual(plaintext);
  });
});

describe('the plaintext bound', () => {
  it('accepts a message at the bound and refuses one byte over it', () => {
    // Pinned from BOTH sides. A bound tested only from below can only confirm itself; and the value
    // is taken from the transport's 64 KiB frame ceiling rather than chosen for looking round.
    expect(() => seal(new Uint8Array(MAX_PLAINTEXT_BYTES).fill(0x41))).not.toThrow();
    expect(() => seal(new Uint8Array(MAX_PLAINTEXT_BYTES + 1).fill(0x41))).toThrow(EnvelopeError);
  });

  it('round-trips a message at the bound rather than merely accepting it', () => {
    const plaintext = new Uint8Array(MAX_PLAINTEXT_BYTES).fill(0x41);
    expect(openReference(seal(plaintext), BOB_SECRET).plaintext).toEqual(plaintext);
  });
});

describe('decodeEnvelope on untrusted bytes', () => {
  it('round-trips what encodeEnvelope wrote', () => {
    const wire = seal(new TextEncoder().encode('hello'));
    const decoded = decodeEnvelope(wire);
    expect(decoded.senderDid).toBe(ALICE);
    expect(decoded.recipientDid).toBe(BOB);
    expect(encodeEnvelope(decoded)).toEqual(wire);
  });

  it('refuses bytes that are not an envelope', () => {
    expect(() => decodeEnvelope(new Uint8Array(0))).toThrow(EnvelopeError);
    expect(() => decodeEnvelope(new Uint8Array(64))).toThrow(/not a DIGCHAT1 envelope/);
  });

  it('refuses a truncation at every field boundary rather than reading past the buffer', () => {
    // The property a parser of hostile input has to have: no length is trusted before it is checked.
    // Truncating at EVERY offset, not just one, is what makes that a proof rather than a spot check.
    const wire = seal(new TextEncoder().encode('hello'));
    for (let cut = 0; cut < wire.length; cut += 1) {
      expect(() => decodeEnvelope(wire.subarray(0, cut))).toThrow(EnvelopeError);
    }
    expect(() => decodeEnvelope(wire)).not.toThrow();
  });

  it('refuses trailing bytes appended after a valid envelope', () => {
    const wire = seal(new TextEncoder().encode('hello'));
    const padded = new Uint8Array(wire.length + 4);
    padded.set(wire);
    expect(() => decodeEnvelope(padded)).toThrow(/trailing bytes/);
  });

  it('refuses a version or suite it does not implement', () => {
    const wire = seal(new TextEncoder().encode('hello'));
    const futureVersion = Uint8Array.from(wire);
    futureVersion[MAGIC.length] = 2;
    expect(() => decodeEnvelope(futureVersion)).toThrow(/unsupported envelope version 2/);

    const futureSuite = Uint8Array.from(wire);
    futureSuite[MAGIC.length + 1] = 9;
    expect(() => decodeEnvelope(futureSuite)).toThrow(/unsupported cipher suite 9/);
  });

  it('refuses a DID that is not valid UTF-8', () => {
    // A peer chooses these bytes. Decoding them leniently would put a replacement-character DID into
    // the app's own state, where it would be compared against real DIDs and rendered to the user.
    const wire = seal(new TextEncoder().encode('hello'));
    const broken = Uint8Array.from(wire);
    broken[MAGIC.length + 4] = 0xff;
    expect(() => decodeEnvelope(broken)).toThrow(/not valid UTF-8/);
  });

  it('refuses a ciphertext length that claims more than the envelope holds', () => {
    // The classic hostile-length read. A parser that allocated or sliced on this number would either
    // throw somewhere unhelpful or hand back a short buffer that decrypts to nothing.
    const wire = seal(new TextEncoder().encode('hello'));
    const lying = Uint8Array.from(wire);
    const lengthAt = wire.length - 5 - new TextEncoder().encode('hello').length - 16 + 1;
    new DataView(lying.buffer).setUint32(lengthAt - 1, 0xffff, false);
    expect(() => decodeEnvelope(lying)).toThrow(EnvelopeError);
  });
});

describe('encodeEnvelope', () => {
  it('refuses an empty or oversized DID', () => {
    const decoded = decodeEnvelope(seal(new TextEncoder().encode('hello')));
    expect(() => encodeEnvelope({ ...decoded, senderDid: '' })).toThrow(/empty/);
    expect(() => encodeEnvelope({ ...decoded, senderDid: 'd'.repeat(513) })).toThrow(/longer than/);
  });

  it('refuses a key or nonce of the wrong length', () => {
    const decoded = decodeEnvelope(seal(new TextEncoder().encode('hello')));
    expect(() => encodeEnvelope({ ...decoded, epk: new Uint8Array(31) })).toThrow(/must be 32/);
    expect(() => encodeEnvelope({ ...decoded, nonce: new Uint8Array(23) })).toThrow(/must be 24/);
  });
});

describe('associatedData', () => {
  it('differs whenever any addressed field differs', () => {
    const base = {
      version: 1,
      suite: 1,
      senderDid: ALICE,
      recipientDid: BOB,
      epk: BOB_PUBLIC,
    };
    const of = (over: Partial<typeof base>) => associatedData({ ...base, ...over }).toString();
    expect(of({ senderDid: 'did:chia:mallory' })).not.toBe(of({}));
    expect(of({ recipientDid: 'did:chia:eve' })).not.toBe(of({}));
    expect(of({ epk: key(1) })).not.toBe(of({}));
    // The length prefixes make the two DIDs unambiguous: "ab"+"c" must not equal "a"+"bc".
    expect(of({ senderDid: 'ab', recipientDid: 'c' })).not.toBe(
      of({ senderDid: 'a', recipientDid: 'bc' }),
    );
  });
});

/** Where `needle` first occurs in `haystack`, or -1. */
function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    for (let i = 0; i < needle.length; i += 1) {
      if (haystack[start + i] !== needle[i]) continue outer;
    }
    return start;
  }
  return -1;
}

/** Rewrite the recipient DID in place, keeping its length, the way a relay with a byte editor would. */
function rewriteRecipient(wire: Uint8Array, replacement: string): Uint8Array {
  const decoded = decodeEnvelope(wire);
  expect(replacement.length).toBe(decoded.recipientDid.length);
  const rewritten = Uint8Array.from(wire);
  const at = indexOfBytes(rewritten, new TextEncoder().encode(decoded.recipientDid));
  rewritten.set(new TextEncoder().encode(replacement), at);
  return rewritten;
}
