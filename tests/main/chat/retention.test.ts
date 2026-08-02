import { describe, expect, it } from 'vitest';

import { pruneAged } from '../../../src/main/chat/retention';
import type { ChatMessage } from '../../../src/main/chat/conversation';

/**
 * Age-based retention (SPEC §5.8): drop messages older than the user's chosen window.
 *
 * The rule is pure and the clock is injected, so "older than N" is pinnable rather than wall-clock
 * dependent. Retention defaults OFF — a window of zero (or negative) keeps everything — so the tests
 * anchor both the pruning and the disabled case.
 */

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

function message(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'sent-1',
    direction: 'sent',
    peerDid: 'did:chia:bob',
    body: 'hello',
    at: NOW,
    ...over,
  };
}

describe('pruneAged', () => {
  it('drops messages older than the window and keeps fresher ones', () => {
    const messages = [
      message({ id: 'old', at: NOW - 8 * DAY }),
      message({ id: 'edge', at: NOW - 7 * DAY }),
      message({ id: 'fresh', at: NOW - 1 * DAY }),
    ];
    const kept = pruneAged(messages, 7 * DAY, NOW);
    expect(kept.map((m) => m.id)).toEqual(['edge', 'fresh']);
  });

  it('keeps a message exactly at the boundary (age === window)', () => {
    const messages = [message({ id: 'edge', at: NOW - 7 * DAY })];
    expect(pruneAged(messages, 7 * DAY, NOW)).toHaveLength(1);
  });

  it('returns the input unchanged when the window is zero (retention disabled)', () => {
    const messages = [message({ id: 'ancient', at: 0 })];
    expect(pruneAged(messages, 0, NOW)).toEqual(messages);
  });

  it('returns the input unchanged for a negative window', () => {
    const messages = [message({ id: 'ancient', at: 0 })];
    expect(pruneAged(messages, -1, NOW)).toEqual(messages);
  });

  it('leaves the original array untouched', () => {
    const messages = [message({ id: 'old', at: 0 }), message({ id: 'fresh', at: NOW })];
    pruneAged(messages, DAY, NOW);
    expect(messages.map((m) => m.id)).toEqual(['old', 'fresh']);
  });
});
