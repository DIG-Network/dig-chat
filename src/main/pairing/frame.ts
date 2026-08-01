/**
 * The pairing-channel frame codec — canonical JSON and the per-frame MAC.
 *
 * # Why this file is a contract, not an implementation detail
 *
 * dig-app authenticates every frame by recomputing `HMAC-SHA256(channel_secret, frame_mac_input)`
 * over bytes it derives independently, in Rust, from the JSON value its transport delivered
 * (`dig-app` `crates/dig-app-core/src/pairing.rs`). The two derivations MUST agree byte for byte.
 * They are not checked against each other at runtime: a divergence surfaces only as `AUTH_BAD_MAC`
 * on a channel that looks correctly paired, which is an expensive thing to debug. So every rule
 * below is transcribed from that file rather than re-derived, and the tests pin the fixtures where
 * a natural JavaScript implementation would drift.
 *
 * The two places it would drift, both covered by tests:
 *
 * 1. **Key order.** Rust sorts `&String` keys byte-lexicographically, which for UTF-8 is Unicode
 *    CODEPOINT order. JavaScript's default `Array.prototype.sort` compares UTF-16 code units, and
 *    the two disagree for supplementary-plane characters.
 * 2. **Number rendering.** `serde_json` writes `1.0` where `JSON.stringify` writes `1`. Rather than
 *    guess, this module REFUSES any number it cannot render identically — see
 *    {@link CanonicalJsonError}.
 */

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';

/** The channel secret length dig-app mints, in bytes (`CHANNEL_SECRET_LEN`). */
export const CHANNEL_SECRET_LEN = 32;

/** A JSON value this codec can render identically to `serde_json`. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/**
 * Thrown when a value cannot be canonicalised to bytes dig-app would derive identically.
 *
 * Refusing is deliberate. The alternative — rendering it our way and hoping — produces a MAC
 * mismatch at the far end with no local symptom at all.
 */
export class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanonicalJsonError';
  }
}

/**
 * Serialise `value` to the canonical JSON string dig-app's `canonical_json` produces: object keys
 * sorted by Unicode codepoint at every level, no insignificant whitespace, control characters
 * escaped.
 *
 * @throws {CanonicalJsonError} for any value whose rendering could differ from `serde_json`'s — a
 * non-integer or non-finite number, a `bigint`, a `Date`, a function, or an `undefined` member.
 */
export function canonicalJson(value: JsonValue): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return renderNumber(value);
    case 'string':
      return JSON.stringify(value);
    case 'object':
      return Array.isArray(value) ? renderArray(value) : renderObject(value);
    default:
      throw new CanonicalJsonError(`a ${typeof value} has no canonical JSON rendering`);
  }
}

/** `[` elements joined by `,` `]` — arrays keep their order, which is part of the value. */
function renderArray(items: JsonValue[]): string {
  return `[${items.map(canonicalJson).join(',')}]`;
}

/**
 * `{` codepoint-sorted `"key":value` pairs joined by `,` `}`.
 *
 * The sort compares by codepoint (`codePointAt` over the two strings) rather than with the default
 * comparator, which orders by UTF-16 code unit and puts every supplementary-plane key in the wrong
 * place relative to U+E000..U+FFFF.
 */
function renderObject(value: { [key: string]: JsonValue }): string {
  // A class instance is refused rather than rendered. `Object.keys(new Date())` is `[]`, so a Date
  // would otherwise canonicalise to `{}` — the value would vanish from the MAC input silently while
  // still travelling on the wire, which is the worst available failure.
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalJsonError(
      `only plain objects canonicalise; got an instance of ${value.constructor?.name ?? 'unknown'}`,
    );
  }
  const keys = Object.keys(value).sort(compareByCodepoint);
  const members = keys.map((key) => {
    const member = value[key];
    if (member === undefined) {
      throw new CanonicalJsonError(`the member "${key}" is undefined; JSON has no such value`);
    }
    return `${JSON.stringify(key)}:${canonicalJson(member)}`;
  });
  return `{${members.join(',')}}`;
}

/** Order two strings by Unicode codepoint, matching Rust's byte-lexicographic ordering of UTF-8. */
function compareByCodepoint(a: string, b: string): number {
  const left = Array.from(a);
  const right = Array.from(b);
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    const diff = (left[i] as string).codePointAt(0)! - (right[i] as string).codePointAt(0)!;
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

/**
 * Render a number the way `serde_json` renders it — which this module only attempts for SAFE
 * INTEGERS, the one class where the two renderings provably agree.
 */
function renderNumber(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new CanonicalJsonError(
      `${value} is not a safe integer; frame params carry integers only, because serde_json and ` +
        `JSON.stringify render other numbers differently and the MAC would not match`,
    );
  }
  return String(value);
}

/**
 * The exact bytes the frame MAC is computed over (dig-app `frame_mac_input`):
 *
 * ```text
 * utf8(nonce_decimal) ‖ 0x00 ‖ method ‖ 0x00 ‖ canonical_json(params)
 * ```
 *
 * The `0x00` separators make the three fields unambiguous: the nonce is decimal and therefore
 * NUL-free, and `canonicalJson` escapes control characters, so the rendered params can never carry
 * a raw NUL. No two distinct `(nonce, method, params)` triples can share these bytes.
 */
export function frameMacInput(nonce: number, method: string, params: JsonValue): Uint8Array {
  const encoder = new TextEncoder();
  const nonceBytes = encoder.encode(String(nonce));
  const methodBytes = encoder.encode(method);
  const paramsBytes = encoder.encode(canonicalJson(params));

  const input = new Uint8Array(
    nonceBytes.length + 1 + methodBytes.length + 1 + paramsBytes.length,
  );
  let at = 0;
  input.set(nonceBytes, at);
  at += nonceBytes.length;
  input[at] = 0x00;
  at += 1;
  input.set(methodBytes, at);
  at += methodBytes.length;
  input[at] = 0x00;
  at += 1;
  input.set(paramsBytes, at);
  return input;
}

/**
 * The base64 `mac_b64` for one request frame, under the 32-byte `channelSecret` dig-app minted at
 * pairing time.
 *
 * @throws {RangeError} if the secret is not {@link CHANNEL_SECRET_LEN} bytes — a short key would
 * still produce a MAC, and it would simply never verify.
 */
export function frameMac(
  channelSecret: Uint8Array,
  nonce: number,
  method: string,
  params: JsonValue,
): string {
  if (channelSecret.length !== CHANNEL_SECRET_LEN) {
    throw new RangeError(
      `the channel secret must be ${CHANNEL_SECRET_LEN} bytes, got ${channelSecret.length}`,
    );
  }
  return toBase64(hmac(sha256, channelSecret, frameMacInput(nonce, method, params)));
}

/** Standard (padded) base64 — the encoding dig-app's `mac_b64` and `channel_token_b64` use. */
export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/** Decode standard base64 to bytes. */
export function fromBase64(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, 'base64'));
}
