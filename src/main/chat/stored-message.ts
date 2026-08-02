/**
 * The one shape-check for a persisted or imported message.
 *
 * Every place that reads a {@link ChatMessage} back from an untrusted source — the sealed history file,
 * a passphrase archive, a merge — must reject an entry that another process tampered into the wrong
 * shape. That check lived in three modules; it lives here once, so the definition of "a well-formed
 * stored message" cannot drift between the readers that all depend on it.
 */

// TODO(#2020/#2021): archive size-cap + finite-timestamp guard (scaffolding anchor).
import type { ChatMessage, Direction } from './conversation';

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
    typeof at === 'number'
  );
}
