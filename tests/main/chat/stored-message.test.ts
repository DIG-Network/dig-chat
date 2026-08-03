import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '../../../src/main/chat/conversation';
import { isStoredMessage, sanitizeStoredMessage } from '../../../src/main/chat/stored-message';

/**
 * The one shape-check every untrusted reader (sealed history, passphrase archive, merge) runs.
 *
 * A stored message's `at` is a sort key: history is ordered by `(at, id)` and pruned by age, so a
 * NON-FINITE timestamp (`NaN`/`±Infinity`) is not merely odd — it sorts unstably and is silently
 * evicted the moment retention is on (#2021). A finite number is the contract; anything else is
 * malformed or hostile input and is rejected here, before it can reach the log.
 */
function wellFormed(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sent-1',
    direction: 'sent',
    peerDid: 'did:chia:bob',
    body: 'hello',
    at: 1_800_000_000_000,
    ...over,
  };
}

describe('isStoredMessage', () => {
  it('accepts a well-formed message with a finite timestamp', () => {
    expect(isStoredMessage(wellFormed())).toBe(true);
  });

  it('rejects a NaN timestamp — it would sort unstably and be silently pruned (#2021)', () => {
    expect(isStoredMessage(wellFormed({ at: Number.NaN }))).toBe(false);
  });

  it('rejects a +Infinity timestamp', () => {
    expect(isStoredMessage(wellFormed({ at: Number.POSITIVE_INFINITY }))).toBe(false);
  });

  it('rejects a -Infinity timestamp', () => {
    expect(isStoredMessage(wellFormed({ at: Number.NEGATIVE_INFINITY }))).toBe(false);
  });

  it('still rejects a non-number timestamp', () => {
    expect(isStoredMessage(wellFormed({ at: '1800000000000' }))).toBe(false);
  });
});

/**
 * The shared re-neutralisation the four untrusted readers route through, so a scrub cannot drift
 * between them. `‮` is a right-to-left override (a bidi character removed outright); `\n` is a
 * newline an identifier must never carry (it forges a log record and splits one DID into two).
 */
describe('sanitizeStoredMessage', () => {
  const base: ChatMessage = {
    id: 'received-1',
    direction: 'received',
    peerDid: 'did:chia:bob',
    body: 'hello',
    at: 1_800_000_000_000,
  };

  it('strips control and direction-altering characters from the untrusted body', () => {
    const dirty: ChatMessage = { ...base, body: 'hello‮' };
    expect(sanitizeStoredMessage(dirty).body).toBe('hello');
  });

  it('neutralises the peer DID as an identifier, removing an embedded newline', () => {
    const dirty: ChatMessage = { ...base, peerDid: 'did:chia:\nbob‮' };
    expect(sanitizeStoredMessage(dirty).peerDid).toBe('did:chia:bob');
  });

  it('passes the shape-checked fields through unchanged', () => {
    const clean = sanitizeStoredMessage(base);
    expect(clean.id).toBe('received-1');
    expect(clean.direction).toBe('received');
    expect(clean.at).toBe(1_800_000_000_000);
  });

  it('leaves already-clean peer text byte-identical', () => {
    expect(sanitizeStoredMessage(base)).toEqual(base);
  });
});
