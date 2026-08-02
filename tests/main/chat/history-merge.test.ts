import { describe, expect, it } from 'vitest';

import { countNewMessages, mergeHistories } from '../../../src/main/chat/history-merge';
import { MAX_HISTORY_MESSAGES } from '../../../src/main/chat/conversation';
import type { ChatMessage } from '../../../src/main/chat/conversation';

/**
 * Merging an imported archive into the current history (SPEC §5.7).
 *
 * The merge is the ONE place two histories combine, so its contract is pinned as laws rather than
 * examples: a message id is a stable identity (existing copy wins, so re-import is idempotent), the
 * result is deterministic and order-independent, imported peer text is re-sanitised defensively, and
 * the combined log still obeys the same size bound the store writes.
 */

function message(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'sent-1',
    direction: 'sent',
    peerDid: 'did:chia:bob',
    body: 'hello',
    at: 1_800_000_000_000,
    ...over,
  };
}

describe('dedupe by id', () => {
  it('keeps the existing copy when an imported message shares its id', () => {
    const existing = [message({ id: 'x', body: 'the original' })];
    const imported = [message({ id: 'x', body: 'a different body, same id' })];
    expect(mergeHistories(existing, imported)).toEqual([
      message({ id: 'x', body: 'the original' }),
    ]);
  });

  it('adds imported messages whose ids are absent', () => {
    const existing = [message({ id: 'a', at: 1 })];
    const imported = [message({ id: 'b', at: 2 })];
    const merged = mergeHistories(existing, imported);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('determinism', () => {
  it('sorts by timestamp ascending, then by id lexicographically', () => {
    const existing = [message({ id: 'b', at: 200 }), message({ id: 'a', at: 100 })];
    const imported = [message({ id: 'c', at: 100 })];
    const merged = mergeHistories(existing, imported);
    expect(merged.map((m) => `${m.at}:${m.id}`)).toEqual(['100:a', '100:c', '200:b']);
  });

  it('is order-independent: merge(A, B) deep-equals merge(B, A) after sort', () => {
    const a = [message({ id: 'a', at: 1 }), message({ id: 'b', at: 3 })];
    const b = [message({ id: 'c', at: 2 })];
    expect(mergeHistories(a, b)).toEqual(mergeHistories(b, a));
  });

  it('is idempotent: re-importing the same set changes nothing', () => {
    const existing = [message({ id: 'a', at: 1 }), message({ id: 'b', at: 2 })];
    const once = mergeHistories(existing, [message({ id: 'b', at: 2 })]);
    const twice = mergeHistories(once, [message({ id: 'b', at: 2 })]);
    expect(twice).toEqual(once);
  });
});

describe('defensive re-sanitising', () => {
  it('strips control and direction-altering bytes from imported peer text', () => {
    const imported = [message({ id: 'z', body: 'safe\revil', peerDid: 'did:chia:‮bob' })];
    const [merged] = mergeHistories([], imported);
    expect(merged!.body).not.toMatch(/[\r]/);
    expect(merged!.peerDid).not.toMatch(/[‮]/);
  });

  it('drops an imported entry that is not a well-formed message', () => {
    const imported = [{ id: 'bad' } as unknown as ChatMessage, message({ id: 'ok', at: 5 })];
    const merged = mergeHistories([], imported);
    expect(merged.map((m) => m.id)).toEqual(['ok']);
  });
});

describe('countNewMessages (the honest "added" count)', () => {
  it('counts only imported ids that existing does not already hold', () => {
    const existing = [message({ id: 'a' }), message({ id: 'b' })];
    const imported = [message({ id: 'b' }), message({ id: 'c' }), message({ id: 'd' })];
    expect(countNewMessages(existing, imported)).toBe(2);
  });

  it('counts a repeated imported id once', () => {
    const imported = [message({ id: 'x' }), message({ id: 'x' })];
    expect(countNewMessages([], imported)).toBe(1);
  });

  it('ignores imported entries that are not well-formed messages', () => {
    const imported = [{ id: 'bad' } as unknown as ChatMessage, message({ id: 'ok' })];
    expect(countNewMessages([], imported)).toBe(1);
  });

  it('never goes negative when bounding evicts existing to make room for newer imports', () => {
    const existing = Array.from({ length: MAX_HISTORY_MESSAGES }, (_, i) =>
      message({ id: `e-${i}`, at: i }),
    );
    const imported = [message({ id: 'newest', at: MAX_HISTORY_MESSAGES + 1 })];
    // merged.length - existing.length would be 0 here even though a message was genuinely added.
    expect(countNewMessages(existing, imported)).toBe(1);
    expect(mergeHistories(existing, imported)).toHaveLength(MAX_HISTORY_MESSAGES);
  });
});

describe('bounding', () => {
  it('keeps the newest when the combined log exceeds the message bound', () => {
    const existing = Array.from({ length: MAX_HISTORY_MESSAGES }, (_, i) =>
      message({ id: `e-${i}`, at: i }),
    );
    const imported = [message({ id: 'newest', at: MAX_HISTORY_MESSAGES + 1 })];
    const merged = mergeHistories(existing, imported);
    expect(merged).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(merged.at(-1)?.id).toBe('newest');
    expect(merged.some((m) => m.id === 'e-0')).toBe(false);
  });
});
