import { describe, expect, it, vi } from 'vitest';

import type { Channel, RequestFrame } from '../../../src/main/pairing/channel';
import {
  APP_ID,
  PairedChannel,
  REQUESTED_CAPABILITIES,
  pair,
  readCredential,
  type PairingCredential,
} from '../../../src/main/pairing/client';
import { ChannelError, ChannelUnreachableError } from '../../../src/main/pairing/errors';
import { fromBase64, frameMac, toBase64, type JsonValue } from '../../../src/main/pairing/frame';

/** A pinned instant, so nothing here is measured against a clock that moved mid-test. */
const NOW = 1_800_000_000;

const TOKEN = toBase64(new Uint8Array(32).fill(3));

/**
 * A channel double that records every frame and can answer each call DIFFERENTLY.
 *
 * Scripted per call rather than fixed: a double that could only give one answer could not express
 * "the pairing succeeded and then the identity call was refused", which is the sequence the
 * capability tests are about.
 */
class FakeChannel implements Channel {
  readonly sent: RequestFrame[] = [];
  closed = false;

  constructor(private readonly script: Array<JsonValue | Error>) {}

  async request(frame: RequestFrame): Promise<JsonValue> {
    this.sent.push(frame);
    const next = this.script.shift();
    if (next instanceof Error) throw next;
    return next ?? null;
  }

  close(): void {
    this.closed = true;
  }
}

function credential(overrides: Partial<PairingCredential> = {}): PairingCredential {
  return {
    pairingId: 'pairing-1',
    channelTokenB64: TOKEN,
    grantedCapabilities: ['identity.attest', 'identity.seal', 'identity.unseal'],
    pairedAt: NOW,
    ...overrides,
  };
}

describe('pair', () => {
  it('redeems the code and keeps the credential dig-app returned', async () => {
    const channel = new FakeChannel([
      {
        pairing_id: 'pairing-1',
        channel_token_b64: TOKEN,
        granted_capabilities: ['identity.attest', 'identity.seal', 'identity.unseal'],
      },
    ]);

    const result = await pair(channel, 'ABCDEFGH', NOW);

    expect(result.pairingId).toBe('pairing-1');
    expect(result.grantedCapabilities).toEqual([
      'identity.attest',
      'identity.seal',
      'identity.unseal',
    ]);
    expect(result.pairedAt).toBe(NOW);
  });

  it('sends the code and the identity capabilities, and never asks to sign', async () => {
    // The capability boundary at its source. A request that included `sign.request` would be a chat
    // client asking for the power to move money, which no user approving "let DIG Chat use my
    // identity" has consented to.
    const channel = new FakeChannel([{ pairing_id: 'p', channel_token_b64: TOKEN }]);
    await pair(channel, 'ABCDEFGH', NOW);

    const params = channel.sent[0]!.params as Record<string, JsonValue>;
    expect(params.ext_id).toBe(APP_ID);
    expect(params.pairing_code).toBe('ABCDEFGH');
    expect(params.requested_capabilities).toEqual([
      'identity.attest',
      'identity.seal',
      'identity.unseal',
    ]);
    expect(REQUESTED_CAPABILITIES).not.toContain('sign.request');
    expect(JSON.stringify(params)).not.toContain('sign');
    // …and `pair.begin` carries no auth: there is no pairing yet to authenticate against.
    expect(channel.sent[0]!.auth).toBeUndefined();
  });

  it('lets a pairing refusal through with the wire symbol intact', async () => {
    const refusal = new ChannelError('PAIR_CODE_REJECTED', -33012, 'error.pairCodeRejected');
    const channel = new FakeChannel([refusal]);
    await expect(pair(channel, 'ABCDEFGH', NOW)).rejects.toBe(refusal);
  });
});

describe('readCredential', () => {
  it('reads a DIG App that granted nothing as granting nothing', () => {
    // The state of every shipped DIG App: it does not know the field, so it does not send it.
    // Reading absence as "everything" would have dig-chat call identity methods that cannot work
    // and report the failure as a bug rather than as a missing capability.
    expect(
      readCredential({ pairing_id: 'p', channel_token_b64: TOKEN }, NOW).grantedCapabilities,
    ).toEqual([]);
  });

  it('refuses a reply it cannot use', () => {
    // Each of these would otherwise be stored and produce AUTH_BAD_MAC on every later frame, with
    // nothing at the failure site to explain why.
    expect(() => readCredential(null, NOW)).toThrow(ChannelUnreachableError);
    expect(() => readCredential({ channel_token_b64: TOKEN }, NOW)).toThrow(
      ChannelUnreachableError,
    );
    expect(() => readCredential({ pairing_id: '', channel_token_b64: TOKEN }, NOW)).toThrow(
      ChannelUnreachableError,
    );
    expect(() => readCredential({ pairing_id: 'p', channel_token_b64: 'AAAA' }, NOW)).toThrow(
      ChannelUnreachableError,
    );
    expect(() => readCredential({ pairing_id: 'p' }, NOW)).toThrow(ChannelUnreachableError);
  });

  it('keeps only the string entries of a capability list', () => {
    const read = readCredential(
      {
        pairing_id: 'p',
        channel_token_b64: TOKEN,
        granted_capabilities: ['identity.seal', 7, null, 'identity.attest'],
      },
      NOW,
    );
    expect(read.grantedCapabilities).toEqual(['identity.seal', 'identity.attest']);
  });
});

describe('PairedChannel', () => {
  it('authenticates every frame with a MAC dig-app can verify', async () => {
    const channel = new FakeChannel([null]);
    const paired = new PairedChannel(channel, credential(), () => NOW);

    await paired.call('identity.attest', {});

    const auth = channel.sent[0]!.auth!;
    expect(auth.pairing_id).toBe('pairing-1');
    // Recomputed independently from the frame's own fields — asserting merely that a MAC is present
    // would pass for a constant string.
    expect(auth.mac_b64).toBe(
      frameMac(fromBase64(TOKEN), auth.nonce, 'identity.attest', channel.sent[0]!.params),
    );
  });

  it('never sends a nonce dig-app would reject as a replay', async () => {
    // dig-app requires each nonce to be STRICTLY greater than the last it accepted, and it restores
    // that high-water mark across its own restarts. A per-launch counter starting at 1 satisfies
    // "increases within a session" and is refused after the first restart — so the fixture is a
    // clock that stands still, which is exactly when a naive `Date.now()` nonce repeats.
    const channel = new FakeChannel([null, null, null]);
    const stoppedClock = () => NOW;
    const paired = new PairedChannel(channel, credential(), stoppedClock);

    await paired.call('identity.attest', {});
    await paired.call('identity.attest', {});
    await paired.call('identity.attest', {});

    const nonces = channel.sent.map((frame) => frame.auth!.nonce);
    expect(nonces[0]).toBe(NOW);
    expect(nonces[1]).toBeGreaterThan(nonces[0]!);
    expect(nonces[2]).toBeGreaterThan(nonces[1]!);
  });

  it('starts above the wall clock so a restart cannot reuse a nonce', async () => {
    // The half a stopped clock cannot see: after a restart the counter is fresh, and only the clock
    // seed keeps the new session above the old one's high-water mark.
    const first = new FakeChannel([null]);
    const second = new FakeChannel([null]);
    await new PairedChannel(first, credential(), () => NOW).call('identity.attest', {});
    await new PairedChannel(second, credential(), () => NOW + 5).call('identity.attest', {});

    expect(second.sent[0]!.auth!.nonce).toBeGreaterThan(first.sent[0]!.auth!.nonce);
  });

  it('survives a clock that steps backwards', async () => {
    const channel = new FakeChannel([null, null]);
    const clock = vi
      .fn()
      .mockReturnValueOnce(NOW)
      .mockReturnValueOnce(NOW - 10_000);
    const paired = new PairedChannel(channel, credential(), clock);

    await paired.call('identity.attest', {});
    await paired.call('identity.attest', {});

    expect(channel.sent[1]!.auth!.nonce).toBeGreaterThan(channel.sent[0]!.auth!.nonce);
  });

  it('refuses to put sign.request on the wire at all', async () => {
    // Not a policy check duplicating dig-app's — a structural one. dig-app would refuse this with
    // CAP_NOT_GRANTED anyway; the point is that a bug or a compromised dependency inside dig-chat
    // cannot cause a money-moving request to be SENT under a pairing the user approved for chat.
    const channel = new FakeChannel([null]);
    const paired = new PairedChannel(channel, credential(), () => NOW);

    await expect(paired.call('sign.request', {})).rejects.toBeInstanceOf(ChannelError);
    expect(channel.sent).toHaveLength(0);
  });

  it('reports which capabilities it holds', () => {
    const paired = new PairedChannel(new FakeChannel([]), credential({ grantedCapabilities: [] }));
    expect(paired.grants('identity.seal')).toBe(false);
    expect(paired.capabilities).toEqual([]);

    const granted = new PairedChannel(new FakeChannel([]), credential());
    expect(granted.grants('identity.seal')).toBe(true);
  });
});
