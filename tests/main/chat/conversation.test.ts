import { describe, expect, it, vi } from 'vitest';
import { x25519 } from '@noble/curves/ed25519';

import { Conversation, SendError } from '../../../src/main/chat/conversation';
import { sealReference, openReference } from '../../../src/main/identity/conformance';
import { MAX_PLAINTEXT_BYTES, decodeEnvelope } from '../../../src/main/identity/envelope';
import type { IdentityAgent, IdentitySummary } from '../../../src/main/identity/agent';
import { LoopbackTransport } from '../../../src/main/transport/loopback';
import type { MessageTransport, OutboundEnvelope } from '../../../src/main/transport/types';

const AT = 1_800_000_000_000;

const ME_SECRET = new Uint8Array(32).fill(0xaa);
const THEM_SECRET = new Uint8Array(32).fill(0xbb);

const ME: IdentitySummary = {
  did: 'did:chia:me',
  sealingPublicKey: x25519.getPublicKey(ME_SECRET),
  attestationB64: 'c2ln',
};
const THEM: IdentitySummary = {
  did: 'did:chia:them',
  sealingPublicKey: x25519.getPublicKey(THEM_SECRET),
  attestationB64: 'c2ln',
};

/**
 * An identity agent that really seals and really unseals, standing in for the DIG App.
 *
 * A double that returned a fixed blob would let `assertSealed` and every NC-1 property in this file
 * pass without the crypto being exercised at all — so this one runs the actual reference
 * composition, which is also what dig-app must implement.
 */
function digAppDouble(ownSecret: Uint8Array, self: IdentitySummary): IdentityAgent {
  let ephemeral = 0;
  return {
    attest: async () => self,
    seal: async (recipient, plaintext) =>
      sealReference({
        senderDid: self.did,
        recipientDid: recipient.did,
        recipientSealingPublicKey: recipient.sealingPublicKey,
        plaintext,
        ephemeralSecretKey: new Uint8Array(32).fill((ephemeral += 1)),
        nonce: new Uint8Array(24).fill(ephemeral),
      }),
    unseal: async (envelope) => {
      const opened = openReference(envelope, ownSecret);
      return { senderDid: opened.envelope.senderDid, plaintext: opened.plaintext };
    },
  };
}

/** A transport that records what it was handed and delivers nothing. */
function recordingTransport(): MessageTransport & { sent: OutboundEnvelope[] } {
  const sent: OutboundEnvelope[] = [];
  return {
    kind: 'recording',
    reachesOtherMachines: false,
    sent,
    async send(outbound) {
      sent.push(outbound);
    },
    subscribe: () => () => undefined,
    close: () => undefined,
  };
}

function conversationWith(
  agent: IdentityAgent,
  transport: MessageTransport,
  self: IdentitySummary = ME,
) {
  return new Conversation({ agent, transport, self, clock: () => AT });
}

describe('sending', () => {
  it('hands the transport ciphertext and never the plaintext', async () => {
    // The NC-1 property at the seam where it could actually be violated: what a transport — and so
    // any relay behind it — is given. Asserting the envelope format alone would not catch a send
    // path that helpfully attached a plaintext copy.
    const transport = recordingTransport();
    const conversation = conversationWith(digAppDouble(ME_SECRET, ME), transport);

    const secret = 'the vault combination is not going in a log file';
    await conversation.send(THEM, secret);

    const [outbound] = transport.sent;
    expect(outbound!.recipientDid).toBe(THEM.did);
    expect(new TextDecoder().decode(outbound!.envelope)).not.toContain(secret);
    expect(decodeEnvelope(outbound!.envelope).recipientDid).toBe(THEM.did);
    // …and the intended recipient really can read it, so the absence above is encryption and not damage.
    expect(new TextDecoder().decode(openReference(outbound!.envelope, THEM_SECRET).plaintext)).toBe(
      secret,
    );
  });

  it('refuses to send if what came back is not a sealed envelope', async () => {
    // The backstop. A DIG App build, a misconfiguration or a bug that returned plaintext must not
    // result in plaintext on a wire — "it would never do that" is not a mechanism. The fixture is an
    // agent that returns exactly that, which is the only way to prove the guard runs.
    const transport = recordingTransport();
    const leaky: IdentityAgent = {
      ...digAppDouble(ME_SECRET, ME),
      seal: async (_recipient, plaintext) => plaintext,
    };
    const conversation = conversationWith(leaky, transport);

    await expect(conversation.send(THEM, 'in the clear')).rejects.toBeInstanceOf(SendError);
    expect(transport.sent).toHaveLength(0);
  });

  it('refuses to send an envelope addressed to someone else', async () => {
    // The second half of the backstop, and a genuinely different failure: these bytes ARE a sealed
    // envelope, so a guard that only checked "is this an envelope" would pass them straight through
    // to a recipient who cannot read them, and report success.
    const transport = recordingTransport();
    const misdirecting: IdentityAgent = {
      ...digAppDouble(ME_SECRET, ME),
      seal: async (_recipient, plaintext) =>
        sealReference({
          senderDid: ME.did,
          recipientDid: 'did:chia:somebody-else',
          recipientSealingPublicKey: THEM.sealingPublicKey,
          plaintext,
          ephemeralSecretKey: new Uint8Array(32).fill(7),
          nonce: new Uint8Array(24).fill(7),
        }),
    };

    await expect(conversationWith(misdirecting, transport).send(THEM, 'hello')).rejects.toThrow(
      /addressed elsewhere/,
    );
    expect(transport.sent).toHaveLength(0);
  });

  it('records the message only after the transport took it', async () => {
    // A message shown in the log as sent, that was not sent, is the one lie a chat client must not
    // tell. The fixture is a transport that fails.
    const failing: MessageTransport = {
      ...recordingTransport(),
      send: async () => {
        throw new Error('the network is gone');
      },
    };
    const conversation = conversationWith(digAppDouble(ME_SECRET, ME), failing);

    await expect(conversation.send(THEM, 'did this send?')).rejects.toThrow();
    expect(conversation.history()).toHaveLength(0);
  });

  it('refuses an empty body before it seals anything', async () => {
    const seal = vi.fn();
    const conversation = conversationWith(
      { ...digAppDouble(ME_SECRET, ME), seal },
      recordingTransport(),
    );
    await expect(conversation.send(THEM, '   ')).rejects.toBeInstanceOf(SendError);
    expect(seal).not.toHaveBeenCalled();
  });

  it('refuses a body over the transport bound, and accepts one at it', async () => {
    // Pinned from both sides, against the size the framing layer actually allows.
    const conversation = conversationWith(digAppDouble(ME_SECRET, ME), recordingTransport());
    await expect(conversation.send(THEM, 'a'.repeat(MAX_PLAINTEXT_BYTES + 1))).rejects.toThrow(
      /messageTooLong|bytes/,
    );
    await expect(conversation.send(THEM, 'a'.repeat(MAX_PLAINTEXT_BYTES))).resolves.toBeDefined();
  });
});

describe('receiving', () => {
  it('completes the loop: sealed, delivered, unsealed, shown', async () => {
    // Every leg genuine except the machine boundary — which is exactly what the loopback transport
    // is, and exactly what the UI tells the user.
    const transport = new LoopbackTransport();
    // The agent seals to ME and opens with ME's key, so a message sent to myself comes back.
    const conversation = conversationWith(digAppDouble(ME_SECRET, ME), transport);

    await conversation.send(ME, 'a note to myself');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const history = conversation.history();
    expect(history.map((m) => m.direction)).toEqual(['sent', 'received']);
    expect(history[1]!.body).toBe('a note to myself');
    expect(history[1]!.peerDid).toBe(ME.did);
    conversation.close();
  });

  it('neutralises a hostile sender DID and body rather than storing them', async () => {
    // A peer chooses both of these. Storing them raw puts a log-forging newline and a
    // direction-reversing override into the app's own state, where every later consumer inherits them.
    const transport = new LoopbackTransport();
    const hostile: IdentityAgent = {
      ...digAppDouble(ME_SECRET, ME),
      unseal: async () => ({
        senderDid: 'did:chia:evil\nFAKE LOG LINE',
        plaintext: new TextEncoder().encode('body\u001B[2J\u202Ereversed'),
      }),
    };
    const conversation = conversationWith(hostile, transport);

    await conversation.send(ME, 'trigger a delivery');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const received = conversation.history().find((m) => m.direction === 'received')!;
    expect(received.peerDid).not.toContain('\n');
    expect(received.body).not.toContain('\u001B');
    expect(received.body).not.toContain('\u202E');
    expect(received.body).toBe('body[2Jreversed');
    conversation.close();
  });

  it('drops an envelope it cannot open and keeps running', async () => {
    // A stranger sending garbage must not be able to stop the app receiving. The control is that a
    // GOOD message still arrives afterwards — without it, an implementation that stopped listening
    // on the first failure would pass.
    const transport = new LoopbackTransport();
    const conversation = conversationWith(digAppDouble(ME_SECRET, ME), transport);

    await transport.send({ recipientDid: ME.did, envelope: new Uint8Array(80) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(conversation.history()).toHaveLength(0);
    expect(conversation.unreadable).toBe(1);

    await conversation.send(ME, 'still working');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(conversation.history().some((m) => m.direction === 'received')).toBe(true);
    conversation.close();
  });

  it('stops listening once closed', async () => {
    const transport = new LoopbackTransport();
    const conversation = conversationWith(digAppDouble(ME_SECRET, ME), transport);
    conversation.close();

    await transport.send({ recipientDid: ME.did, envelope: new Uint8Array(80) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(conversation.unreadable).toBe(0);
  });

  it('notifies a watcher when the history changes', async () => {
    const watcher = vi.fn();
    const conversation = conversationWith(digAppDouble(ME_SECRET, ME), recordingTransport());
    conversation.watch(watcher);

    await conversation.send(THEM, 'hello');
    expect(watcher).toHaveBeenCalled();
  });
});

describe('LoopbackTransport', () => {
  it('is honest that it reaches no other machine', () => {
    // The flag the UI reads. A person who cannot tell whether a message left the machine will assume
    // it did, so this value is load-bearing rather than informational.
    expect(new LoopbackTransport().reachesOtherMachines).toBe(false);
  });

  it('hands the receiver a copy, not the sender’s buffer', async () => {
    const transport = new LoopbackTransport();
    const received: Uint8Array[] = [];
    transport.subscribe((envelope) => received.push(envelope));

    const envelope = new Uint8Array([1, 2, 3]);
    await transport.send({ recipientDid: 'did:chia:x', envelope });
    envelope[0] = 99;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received[0]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('refuses to send once closed, and delivers nothing after', async () => {
    const transport = new LoopbackTransport();
    const received: Uint8Array[] = [];
    transport.subscribe((envelope) => received.push(envelope));
    transport.close();

    await expect(transport.send({ recipientDid: 'x', envelope: new Uint8Array(1) })).rejects.toThrow();
    expect(received).toHaveLength(0);
  });

  it('unsubscribes', async () => {
    const transport = new LoopbackTransport();
    const received: Uint8Array[] = [];
    const stop = transport.subscribe((envelope) => received.push(envelope));
    stop();
    await transport.send({ recipientDid: 'x', envelope: new Uint8Array(1) });
    expect(received).toHaveLength(0);
  });
});
