import { describe, expect, it, vi } from 'vitest';

import {
  IDENTITY_ATTEST,
  IDENTITY_SEAL,
  IDENTITY_UNSEAL,
  IdentityUnsupportedError,
  PairedIdentityAgent,
} from '../../../src/main/identity/agent';
import { ChannelError, ChannelUnreachableError } from '../../../src/main/pairing/errors';
import { toBase64, type JsonValue } from '../../../src/main/pairing/frame';
import type { PairedChannel } from '../../../src/main/pairing/client';

const DID = 'did:chia:me';
const SEALING_KEY = new Uint8Array(32).fill(7);

/**
 * A paired-channel double.
 *
 * It can answer each METHOD differently, which the capability tests need: "attest works but seal is
 * refused" is a real state (a DIG App that granted a partial set) and a double with one fixed answer
 * could not express it.
 */
function channelDouble(
  answers: Record<string, JsonValue | Error>,
  granted: string[] = [IDENTITY_ATTEST, IDENTITY_SEAL, IDENTITY_UNSEAL],
): PairedChannel & { calls: Array<{ method: string; params: JsonValue }> } {
  const calls: Array<{ method: string; params: JsonValue }> = [];
  return {
    calls,
    capabilities: granted,
    grants: (capability: string) => granted.includes(capability),
    call: vi.fn(async (method: string, params: JsonValue) => {
      calls.push({ method, params });
      const answer = answers[method];
      if (answer instanceof Error) throw answer;
      if (answer === undefined) {
        throw new ChannelError('METHOD_NOT_FOUND', -32601, 'error.identityUnsupported');
      }
      return answer;
    }),
  } as unknown as PairedChannel & { calls: Array<{ method: string; params: JsonValue }> };
}

describe('attest', () => {
  it('reads the DID, the sealing key and the attestation', async () => {
    const agent = new PairedIdentityAgent(
      channelDouble({
        [IDENTITY_ATTEST]: {
          did: DID,
          sealing_public_key_b64: toBase64(SEALING_KEY),
          attestation_b64: 'c2ln',
        },
      }),
    );

    const identity = await agent.attest();
    expect(identity.did).toBe(DID);
    expect(identity.sealingPublicKey).toEqual(SEALING_KEY);
    expect(identity.attestationB64).toBe('c2ln');
  });

  it('refuses a sealing key of the wrong length', async () => {
    // Base64 that decodes to 31 bytes is accepted by any decoder and only fails much later, inside a
    // cipher, where nothing names the cause.
    const agent = new PairedIdentityAgent(
      channelDouble({
        [IDENTITY_ATTEST]: {
          did: DID,
          sealing_public_key_b64: toBase64(new Uint8Array(31)),
          attestation_b64: 'c2ln',
        },
      }),
    );
    await expect(agent.attest()).rejects.toBeInstanceOf(ChannelUnreachableError);
  });

  it('refuses a reply missing a field, rather than carrying an empty identity forward', async () => {
    for (const partial of [
      { sealing_public_key_b64: toBase64(SEALING_KEY), attestation_b64: 'c2ln' },
      { did: DID, attestation_b64: 'c2ln' },
      { did: DID, sealing_public_key_b64: toBase64(SEALING_KEY) },
      { did: '', sealing_public_key_b64: toBase64(SEALING_KEY), attestation_b64: 'c2ln' },
    ]) {
      const agent = new PairedIdentityAgent(channelDouble({ [IDENTITY_ATTEST]: partial }));
      await expect(agent.attest()).rejects.toBeInstanceOf(ChannelUnreachableError);
    }
  });

  it('refuses a result that is not an object', async () => {
    const agent = new PairedIdentityAgent(channelDouble({ [IDENTITY_ATTEST]: ['not', 'an object'] }));
    await expect(agent.attest()).rejects.toBeInstanceOf(ChannelUnreachableError);
  });
});

describe('seal and unseal', () => {
  const identity = { did: DID, sealingPublicKey: SEALING_KEY, attestationB64: 'c2ln' };

  it('sends the recipient and the plaintext, and returns the envelope', async () => {
    const channel = channelDouble({ [IDENTITY_SEAL]: { envelope_b64: toBase64(new Uint8Array([1, 2, 3])) } });
    const agent = new PairedIdentityAgent(channel);

    const envelope = await agent.seal(identity, new TextEncoder().encode('hi'));

    expect(envelope).toEqual(new Uint8Array([1, 2, 3]));
    const params = channel.calls[0]!.params as Record<string, string>;
    expect(params.recipient_did).toBe(DID);
    expect(params.recipient_sealing_public_key_b64).toBe(toBase64(SEALING_KEY));
    expect(params.plaintext_b64).toBe(toBase64(new TextEncoder().encode('hi')));
  });

  it('returns the sender the DIG App authenticated, not one dig-chat guessed', async () => {
    const agent = new PairedIdentityAgent(
      channelDouble({
        [IDENTITY_UNSEAL]: {
          sender_did: 'did:chia:them',
          plaintext_b64: toBase64(new TextEncoder().encode('hello')),
        },
      }),
    );

    const opened = await agent.unseal(new Uint8Array([9]));
    expect(opened.senderDid).toBe('did:chia:them');
    expect(new TextDecoder().decode(opened.plaintext)).toBe('hello');
  });
});

describe('a DIG App that cannot do chat', () => {
  it('turns method-not-found into a capability gap, not a mysterious wire error', async () => {
    // The state of every shipped DIG App. Reported as itself, this sends the user to update the DIG
    // App; reported as a channel error it reads like a bug in dig-chat.
    const agent = new PairedIdentityAgent(channelDouble({}));
    await expect(agent.attest()).rejects.toBeInstanceOf(IdentityUnsupportedError);
  });

  it('turns CAP_NOT_GRANTED into the same fact', async () => {
    // The other shape of the same gap: the handler exists, this pairing was not granted it.
    const agent = new PairedIdentityAgent(
      channelDouble({
        [IDENTITY_ATTEST]: new ChannelError('CAP_NOT_GRANTED', -33050, 'error.capNotGranted'),
      }),
    );
    await expect(agent.attest()).rejects.toBeInstanceOf(IdentityUnsupportedError);
  });

  it('does NOT swallow an unrelated failure as a capability gap', async () => {
    // The control. A `catch` that translated everything would report a locked account, a revoked
    // pairing and a dropped socket all as "update your DIG App".
    const locked = new ChannelError('LOCKED', -33040, 'error.locked');
    const agent = new PairedIdentityAgent(channelDouble({ [IDENTITY_ATTEST]: locked }));
    await expect(agent.attest()).rejects.toBe(locked);
  });

  it('reports availability from the granted capability set', () => {
    expect(new PairedIdentityAgent(channelDouble({}, [])).available).toBe(false);
    expect(new PairedIdentityAgent(channelDouble({}, [IDENTITY_ATTEST])).available).toBe(false);
    expect(
      new PairedIdentityAgent(channelDouble({}, [IDENTITY_ATTEST, IDENTITY_SEAL, IDENTITY_UNSEAL]))
        .available,
    ).toBe(true);
  });
});
