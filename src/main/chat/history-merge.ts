/**
 * Combining an imported archive with the history already on this machine.
 *
 * # A message id is its identity
 *
 * The merge dedupes on {@link ChatMessage.id}: an id names ONE message across every device, so
 * importing the same archive twice — or importing an archive that overlaps the current history — adds
 * nothing the second time. When an id is present on both sides the EXISTING copy wins, which makes the
 * operation idempotent and keeps a restore from silently rewriting a message body under a colliding id.
 *
 * # Deterministic, order-independent, and bounded
 *
 * The result is sorted by timestamp then id, so `merge(A, B)` and `merge(B, A)` are the same log and a
 * restore is reproducible. Every entry is re-sanitised on the way through — the archive is an untrusted
 * file (§5.5) — and the whole result is re-bounded by {@link boundHistory}, so a merge cannot push the
 * stored log past the size limit the store writes.
 */

import type { ChatMessage } from './conversation';
import { boundHistory } from './conversation';
import { sanitizeIdentifier, sanitizePeerText } from './peer-text';
import { isStoredMessage } from './stored-message';

/**
 * Merge `imported` into `existing`, existing copies winning on an id conflict.
 *
 * Pure and total: malformed imported entries are dropped, peer text is re-neutralised, and the result
 * is sorted by (timestamp ascending, then id lexicographic) and bounded. Both inputs are left
 * untouched.
 */
export function mergeHistories(
  existing: readonly ChatMessage[],
  imported: readonly ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  // Existing first so it wins the id conflict: a later `set` for an id already present is skipped.
  for (const message of existing)
    if (isStoredMessage(message)) byId.set(message.id, clean(message));
  for (const message of imported) {
    if (isStoredMessage(message) && !byId.has(message.id)) byId.set(message.id, clean(message));
  }

  const merged = [...byId.values()].sort(byTimeThenId);
  return boundHistory(merged);
}

/** Re-neutralise a message's peer text: the imported half came from an untrusted file. */
function clean(message: ChatMessage): ChatMessage {
  return {
    ...message,
    peerDid: sanitizeIdentifier(message.peerDid),
    body: sanitizePeerText(message.body),
  };
}

/** Order by timestamp ascending, breaking ties by id so the sort is total and reproducible. */
function byTimeThenId(a: ChatMessage, b: ChatMessage): number {
  if (a.at !== b.at) return a.at - b.at;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
