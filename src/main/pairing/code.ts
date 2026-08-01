/**
 * The pairing code as dig-chat receives it: eight Crockford base32 symbols the user read off the DIG
 * App window and typed here.
 *
 * # Why dig-chat normalises at all
 *
 * dig-app normalises the candidate itself before comparing (`pairing_code.rs` `normalize`), so
 * sending the raw typed string would work. Normalising HERE as well buys one specific thing: a code
 * that cannot possibly be right — six symbols, or a `?` the user's keyboard inserted — is caught
 * before it is spent. Every redemption dig-app refuses costs one of the FIVE attempts an issued code
 * survives, and the fifth destroys it. Catching a typo locally means a person who mistypes twice
 * still has a live code rather than a dead one and no explanation.
 *
 * The folding rules are transcribed from dig-app, not invented: `I` and `L` read as `1`, `O` reads
 * as `0`, everything outside the alphabet is dropped. Folding removes no entropy — none of those
 * letters is IN the generated alphabet — it only rescues a person who wrote down what they saw.
 */

/** Crockford's base32 alphabet: digits and uppercase letters minus `I`, `L`, `O`, `U`. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** How many symbols a complete code carries (dig-app `CODE_SYMBOLS`). */
export const CODE_SYMBOLS = 8;

/** How long dig-app keeps an issued code redeemable, in seconds (dig-app `CODE_TTL_SECS`). */
export const CODE_TTL_SECS = 120;

/** Why a typed code was not worth sending. */
export type CodeProblem = 'empty' | 'too-short' | 'too-long';

/** A typed code that is at least the right SHAPE. Being well-formed says nothing about being right. */
export interface WellFormedCode {
  readonly ok: true;
  /** The canonical, ungrouped symbols to put on the wire. */
  readonly symbols: string;
}

/** A typed code that cannot be the one the user was shown. */
export interface MalformedCode {
  readonly ok: false;
  readonly problem: CodeProblem;
  /** How many usable symbols were actually recognised — what the UI counts out for the user. */
  readonly symbolsFound: number;
}

/** The result of reading what the user typed. */
export type ParsedCode = WellFormedCode | MalformedCode;

/**
 * Reduce a typed code to its canonical symbols: uppercase, confusable letters folded onto the digits
 * they are read as, everything else dropped.
 *
 * Mirrors dig-app's `normalize` exactly, so `abcd-efgh`, `ABCD EFGH` and `ABCDEFGH` are one code on
 * both sides of the channel.
 */
export function normalizeCode(typed: string): string {
  let symbols = '';
  for (const character of typed) {
    const upper = character.toUpperCase();
    if (upper === 'I' || upper === 'L') symbols += '1';
    else if (upper === 'O') symbols += '0';
    else if (ALPHABET.includes(upper)) symbols += upper;
  }
  return symbols;
}

/**
 * Read what the user typed, refusing anything that cannot be a complete code before it is spent
 * against dig-app's five-attempt budget.
 */
export function parseCode(typed: string): ParsedCode {
  const symbols = normalizeCode(typed);
  if (symbols.length === 0) return { ok: false, problem: 'empty', symbolsFound: 0 };
  if (symbols.length < CODE_SYMBOLS) {
    return { ok: false, problem: 'too-short', symbolsFound: symbols.length };
  }
  if (symbols.length > CODE_SYMBOLS) {
    return { ok: false, problem: 'too-long', symbolsFound: symbols.length };
  }
  return { ok: true, symbols };
}

/** Group the symbols the way the DIG App window shows them, `ABCD-EFGH`, for an echo back to the user. */
export function displayCode(symbols: string): string {
  if (symbols.length !== CODE_SYMBOLS) return symbols;
  return `${symbols.slice(0, CODE_SYMBOLS / 2)}-${symbols.slice(CODE_SYMBOLS / 2)}`;
}
