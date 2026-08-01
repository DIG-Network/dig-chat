import { describe, expect, it } from 'vitest';

import {
  canonicalJson,
  frameMac,
  frameMacInput,
  CanonicalJsonError,
} from '../../../src/main/pairing/frame';

/**
 * The MAC layer is a BYTE-IDENTICAL cross-repo contract with dig-app's
 * `crates/dig-app-core/src/pairing.rs` (`canonical_json` / `frame_mac_input`). Every fixture here is
 * chosen to distinguish this implementation from a plausible-but-wrong one, because a divergence
 * does not fail loudly — it fails as `AUTH_BAD_MAC` on a channel that looks correctly configured.
 */
describe('canonicalJson', () => {
  it('sorts object keys at every level and emits no insignificant whitespace', () => {
    const a = { b: 1, a: { y: 2, x: [3, { n: 4, m: 5 }] } };
    const b = { a: { x: [3, { m: 5, n: 4 }], y: 2 }, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    // The literal is dig-app's own assertion, transcribed.
    expect(canonicalJson(a)).toBe('{"a":{"x":[3,{"m":5,"n":4}],"y":2},"b":1}');
  });

  it('sorts by UNICODE CODEPOINT, not by UTF-16 code unit', () => {
    // THE fixture that separates this from `Object.keys().sort()`, which is the nearest wrong
    // implementation and passes every ASCII test. U+FF00 sorts BEFORE U+10000 by codepoint (and by
    // UTF-8 bytes, which is what Rust's `sort_unstable` on `&String` does), but AFTER it by UTF-16
    // code unit, because U+10000 is stored as the surrogate pair D800 DC00.
    const supplementary = '\u{10000}';
    const bmp = '＀';
    expect(supplementary.localeCompare(bmp)).not.toBe(0);
    expect([supplementary, bmp].sort()).toEqual([supplementary, bmp]); // UTF-16 order — the trap
    expect(canonicalJson({ [supplementary]: 1, [bmp]: 2 })).toBe(
      `{${JSON.stringify(bmp)}:2,${JSON.stringify(supplementary)}:1}`,
    );
  });

  it('escapes control characters so no raw NUL can collide with the field separators', () => {
    // `frameMacInput` delimits its fields with 0x00 and relies on this: a params value that could
    // emit a raw NUL would make two distinct frames share MAC input bytes.
    const encoded = canonicalJson({ text: 'a\u0000b\nc' });
    expect(encoded).toBe('{"text":"a\\u0000b\\nc"}');
    expect(encoded).not.toContain('\u0000');
  });

  it('renders scalars the way serde_json does', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(true)).toBe('true');
    expect(canonicalJson(-17)).toBe('-17');
    expect(canonicalJson('hi')).toBe('"hi"');
    expect(canonicalJson([])).toBe('[]');
    expect(canonicalJson({})).toBe('{}');
  });

  it('refuses a value it cannot render identically to serde_json', () => {
    // A float is where the two renderings diverge (serde_json emits `1.0`, JSON.stringify emits `1`),
    // so a frame carrying one would MAC differently on the two sides. Refusing is the honest
    // behaviour: the alternative is a signature mismatch nobody can trace.
    expect(() => canonicalJson({ n: 1.5 })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ n: Number.NaN })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ n: Number.POSITIVE_INFINITY })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ big: 2n as unknown as number })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ when: new Date() as unknown as number })).toThrow(
      CanonicalJsonError,
    );
    // …and an integer, which both sides render identically, is accepted.
    expect(canonicalJson({ n: 1 })).toBe('{"n":1}');
  });

  it('drops nothing: a key whose value is undefined is a programming error, not a silent omission', () => {
    // JSON.stringify silently DELETES an undefined member. Silently dropping a field would produce a
    // MAC over bytes the caller did not intend to send.
    expect(() => canonicalJson({ a: undefined as unknown as number })).toThrow(CanonicalJsonError);
  });
});

describe('frameMacInput', () => {
  const params = {};

  it('is unambiguous across the method/params boundary', () => {
    expect(frameMacInput(1, 'a', params)).not.toEqual(frameMacInput(1, 'ab', params));
  });

  it('binds the nonce', () => {
    expect(frameMacInput(1, 'm', params)).not.toEqual(frameMacInput(2, 'm', params));
  });

  it('lays the bytes out as utf8(nonce) 0x00 method 0x00 canonical_json(params)', () => {
    const bytes = frameMacInput(42, 'pair.begin', { a: 1 });
    expect(new TextDecoder().decode(bytes)).toBe('42\u0000pair.begin\u0000{"a":1}');
  });
});

describe('frameMac', () => {
  /**
   * A KNOWN-ANSWER TEST against an independently-computed HMAC-SHA256. Asserting only that two calls
   * of our own code agree would pass for any deterministic function, including a wrong one.
   *
   * Vector: key = 32 bytes of 0x07, nonce = 1, method = "m", params = {} →
   * HMAC-SHA256(key, "1\0m\0{}"). Recomputed here with Node's own crypto, which is a genuinely
   * separate implementation from @noble/hashes.
   */
  it('matches an independently computed HMAC-SHA256 over the canonical input', async () => {
    const { createHmac } = await import('node:crypto');
    const key = new Uint8Array(32).fill(7);
    const expected = createHmac('sha256', key).update(frameMacInput(1, 'm', {})).digest('base64');
    expect(frameMac(key, 1, 'm', {})).toBe(expected);
  });

  it('changes when any bound field changes', () => {
    const key = new Uint8Array(32).fill(7);
    const base = frameMac(key, 1, 'm', { a: 1 });
    expect(frameMac(key, 2, 'm', { a: 1 })).not.toBe(base);
    expect(frameMac(key, 1, 'n', { a: 1 })).not.toBe(base);
    expect(frameMac(key, 1, 'm', { a: 2 })).not.toBe(base);
    expect(frameMac(new Uint8Array(32).fill(8), 1, 'm', { a: 1 })).not.toBe(base);
  });

  it('is insensitive to the key ORDER the caller happened to build params in', () => {
    // The whole point of canonicalisation: dig-app re-derives the bytes from a JSON value whose key
    // order the transport chose, so equal values must MAC equally.
    const key = new Uint8Array(32).fill(7);
    expect(frameMac(key, 1, 'm', { a: 1, b: 2 })).toBe(frameMac(key, 1, 'm', { b: 2, a: 1 }));
  });

  it('refuses a key that is not 32 bytes', () => {
    expect(() => frameMac(new Uint8Array(31), 1, 'm', {})).toThrow();
  });
});
