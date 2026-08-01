import { describe, expect, it, vi } from 'vitest';

import { LoopbackTransport } from '../../../src/main/transport/loopback';

/** Let the transport's scheduled delivery run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('LoopbackTransport', () => {
  it('says plainly that it does not reach another machine', () => {
    // The flag the UI reads. A transport that claimed otherwise would let dig-chat report "sent" for
    // a message that went nowhere — the specific half-truth this whole seam exists to avoid.
    const transport = new LoopbackTransport();
    expect(transport.reachesOtherMachines).toBe(false);
    expect(transport.kind).toBe('loopback');
  });

  it('delivers to every subscriber', async () => {
    const transport = new LoopbackTransport();
    const first = vi.fn();
    const second = vi.fn();
    transport.subscribe(first);
    transport.subscribe(second);

    await transport.send({ recipientDid: 'did:chia:me', envelope: new Uint8Array([1, 2, 3]) });
    await settle();

    expect(first).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(second).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
  });

  it('does not deliver before send resolves', async () => {
    // No real transport calls back inside `send`. Code written against a synchronous fake acquires
    // an ordering assumption — a reply recorded before the message that prompted it — that breaks
    // the moment a network is underneath.
    const transport = new LoopbackTransport();
    const handler = vi.fn();
    transport.subscribe(handler);

    await transport.send({ recipientDid: 'did:chia:me', envelope: new Uint8Array([1]) });
    expect(handler).not.toHaveBeenCalled();

    await settle();
    expect(handler).toHaveBeenCalled();
  });

  it('hands the receiver a copy, not the sender’s buffer', async () => {
    // A shared buffer lets a later mutation on one side change what the other side already received,
    // which no transport does and which would make a test of message content meaningless.
    const transport = new LoopbackTransport();
    let received: Uint8Array | null = null;
    transport.subscribe((envelope) => {
      received = envelope;
    });

    const sent = new Uint8Array([1, 2, 3]);
    await transport.send({ recipientDid: 'did:chia:me', envelope: sent });
    await settle();
    sent[0] = 0xff;

    expect(received).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('stops delivering to a handler that unsubscribed', async () => {
    const transport = new LoopbackTransport();
    const handler = vi.fn();
    const unsubscribe = transport.subscribe(handler);
    unsubscribe();

    await transport.send({ recipientDid: 'did:chia:me', envelope: new Uint8Array([1]) });
    await settle();
    expect(handler).not.toHaveBeenCalled();
  });

  it('delivers nothing after close, and refuses a later send', async () => {
    // A delivery arriving after teardown reaches a conversation that has already been closed.
    const transport = new LoopbackTransport();
    const handler = vi.fn();
    transport.subscribe(handler);

    await transport.send({ recipientDid: 'did:chia:me', envelope: new Uint8Array([1]) });
    transport.close();
    await settle();
    expect(handler).not.toHaveBeenCalled();

    await expect(
      transport.send({ recipientDid: 'did:chia:me', envelope: new Uint8Array([1]) }),
    ).rejects.toThrow();
  });
});
