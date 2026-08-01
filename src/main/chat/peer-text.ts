/**
 * Every string a peer chose — DIDs, display names, message bodies — passes through here before it
 * reaches state, a screen, or a log line.
 *
 * # Why a module, rather than "React escapes it"
 *
 * React does escape interpolated text, and that closes the HTML-injection half. It closes NOTHING
 * about the other half, which is the one this ecosystem has already paid for: a peer-controlled
 * string reaching a LOG line. A DID carrying `\n` forges a log record. A DID carrying ANSI escapes
 * repaints a terminal a person is reading logs in. A right-to-left override makes
 * `did:chia:‮eciovni` render as something else entirely to a human deciding whether to trust it.
 * None of those are HTML problems, so none of them are React's to solve.
 *
 * So the rule is: peer text is neutralised ONCE, at the boundary where it stops being bytes and
 * starts being a string the app uses — not at each of the places it might eventually be displayed,
 * because that list is never complete.
 */

/**
 * The longest peer string dig-chat keeps, in characters.
 *
 * A bound is required regardless of what the transport allows: a 48 KiB single-line "display name"
 * is not a display name, and unbounded peer text makes every downstream buffer the attacker's to
 * size.
 */
export const MAX_PEER_TEXT_CHARS = 4_000;

/**
 * Characters removed outright.
 *
 * - **C0 controls** (except `\n` and `\t`, which a message body legitimately contains) and **C1
 *   controls** — this is what removes `\r` and `ESC`, and with them log-record forgery and ANSI
 *   escape sequences.
 * - **Bidirectional overrides and isolates** (U+202A–U+202E, U+2066–U+2069) — the family that makes
 *   a string render in an order it is not stored in.
 * - **U+FEFF** — a zero-width no-break space that survives trimming and makes two visually identical
 *   DIDs unequal.
 */
const DISALLOWED =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * Neutralise a peer-supplied string: strip control and direction-altering characters, collapse it to
 * the length bound, and trim.
 *
 * Characters are REMOVED rather than escaped. Escaping preserves the hostile content for whatever
 * later decodes it; removal means the bytes are simply not there any more.
 */
export function sanitizePeerText(raw: string): string {
  return raw.replace(DISALLOWED, '').slice(0, MAX_PEER_TEXT_CHARS).trim();
}

/**
 * Neutralise a peer-supplied IDENTIFIER — a DID, a display name — which is additionally required to
 * be a single line.
 *
 * The difference from {@link sanitizePeerText} is exactly the newline, and it is the whole reason
 * both functions exist. A message BODY legitimately contains newlines and a sanitiser that removed
 * them would quietly destroy every multi-line message a person sends. An IDENTIFIER never does, and
 * one that carried a newline would forge a log record and could render as two separate-looking
 * identities on a screen.
 */
export function sanitizeIdentifier(raw: string): string {
  return sanitizePeerText(raw).replace(/[\n\t]+/g, '');
}

/**
 * Decode peer bytes to a string that is safe to hold.
 *
 * Non-fatal decoding: invalid UTF-8 becomes U+FFFD rather than throwing, because a message body with
 * one bad byte is still a message a person should see. The DIDs in an envelope HEADER are decoded
 * strictly instead (`decodeEnvelope`), since an identifier that is not valid UTF-8 is not an
 * identifier.
 */
export function decodePeerText(bytes: Uint8Array): string {
  return sanitizePeerText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
}

/**
 * Render a peer string for a LOG line: neutralised, truncated hard, and quoted.
 *
 * Separate from {@link sanitizePeerText} because a log has a tighter budget and a stricter need for
 * an unambiguous boundary — the quotes are what stop a value being read as the next field.
 */
export function forLog(raw: string, limit = 120): string {
  const safe = sanitizePeerText(raw).replace(/[\n\t]/g, ' ');
  const clipped = safe.length > limit ? `${safe.slice(0, limit)}…` : safe;
  return JSON.stringify(clipped);
}
