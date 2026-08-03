/**
 * The one shape-check for a persisted or imported message.
 *
 * Every place that reads a {@link ChatMessage} back from an untrusted source — the sealed history file,
 * a passphrase archive, a merge — must reject an entry that another process tampered into the wrong
 * shape. That check lived in three modules; it lives here once, so the definition of "a well-formed
 * stored message" cannot drift between the readers that all depend on it.
 */

import type { ChatMessage, Direction } from './conversation';
import { sanitizeIdentifier, sanitizePeerText } from './peer-text';

/** The two directions a stored message may carry, so an unknown value is rejected on load. */
const DIRECTIONS: readonly Direction[] = ['sent', 'received'];

/** Whether a decoded value has the exact shape of a stored message, so a tampered one is dropped. */
export function isStoredMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { id, direction, peerDid, body, at } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    typeof direction === 'string' &&
    DIRECTIONS.includes(direction as Direction) &&
    typeof peerDid === 'string' &&
    typeof body === 'string' &&
    // `at` is the sort key (history is ordered by `(at, id)`) and the retention cut-off: a non-finite
    // timestamp (NaN/±Infinity) sorts unstably and is silently pruned, so it is rejected here rather
    // than admitted as a "number" (#2021). Real messages always carry a finite epoch-millis stamp.
    Number.isFinite(at)
  );
}

/**
 * Re-neutralise the peer-chosen text on a stored message, returning a fresh copy.
 *
 * A stored message's `peerDid` and `body` are whatever the other end chose, read back from a file
 * another process could have edited — so every reader (sealed history, passphrase archive, merge, the
 * conversation restore) must scrub them again on the way in, not trust the form on disk. That scrub
 * lived copied verbatim in four modules; it lives here once, beside {@link isStoredMessage}, so the
 * neutralisation cannot drift between the readers that all depend on it. The `id`, `direction` and
 * `at` fields are shape-checked (never rendered as peer text) and pass through unchanged.
 */
export function sanitizeStoredMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    peerDid: sanitizeIdentifier(message.peerDid),
    body: sanitizePeerText(message.body),
  };
}
