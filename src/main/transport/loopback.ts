/**
 * The only transport dig-chat has today: one that delivers an envelope back into this same process.
 *
 * # What it is for, stated so nobody mistakes it for a network
 *
 * It closes the loop end-to-end without inventing a peer connection. A message is sealed by the DIG
 * App to a real DID, encoded as a real `DIGCHAT1` envelope, handed to this transport, delivered, and
 * unsealed by the DIG App — every leg genuine except the one that would cross a machine boundary. So
 * the sealing and unsealing paths are exercised for real, and the missing piece is exactly one
 * clearly-labelled thing rather than a vague gap.
 *
 * {@link reachesOtherMachines} is `false`, and the UI shows a standing notice while it is. Replacing
 * this class with a peer transport is the whole of the remaining work on this leg.
 */

import type { InboundHandler, MessageTransport, OutboundEnvelope } from './types';

/**
 * Delivers envelopes to subscribers in this process.
 *
 * Delivery is scheduled on a LATER TURN of the event loop, not awaited inside `send`, and that is not
 * a detail. Delivering before `send` resolves lets a reply be recorded before the message that
 * prompted it — the caller's own message then appears BELOW the answer to it — and no real transport
 * behaves that way. Code written against a synchronous fake acquires ordering assumptions that break
 * the moment a network is underneath it.
 */
export class LoopbackTransport implements MessageTransport {
  readonly kind = 'loopback';
  readonly reachesOtherMachines = false;

  private readonly handlers = new Set<InboundHandler>();
  private closed = false;

  async send(outbound: OutboundEnvelope): Promise<void> {
    if (this.closed) throw new Error('the transport is closed');
    // A copy: handing the sender's own buffer to the receiver would let a later mutation on one side
    // change what the other side already received, which no transport does.
    const bytes = Uint8Array.from(outbound.envelope);
    setTimeout(() => {
      if (this.closed) return;
      for (const handler of [...this.handlers]) handler(bytes);
    }, 0);
  }

  subscribe(handler: InboundHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  close(): void {
    this.closed = true;
    this.handlers.clear();
  }
}
