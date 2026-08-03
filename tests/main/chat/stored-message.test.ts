import { describe, expect, it } from 'vitest';

import { isStoredMessage } from '../../../src/main/chat/stored-message';

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
