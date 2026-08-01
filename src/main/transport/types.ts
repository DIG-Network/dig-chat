/**
 * How a sealed envelope gets from one DID to another.
 *
 * # This is the leg the MVP does not have
 *
 * The DID-to-DID transport — peer discovery, an mTLS connection to the holder, relay fallback for
 * NAT traversal — lives in the DIG peer stack, not here, and dig-chat cannot reach it until the
 * `dig-chat-protocol` crate exposes it. Rather than fake a send, this interface exists with ONE
 * implementation ({@link ../transport/loopback.LoopbackTransport}) that is explicit about delivering
 * only within this process, and a {@link MessageTransport.reachesOtherMachines} flag the UI reads to
 * tell the user exactly that.
 *
 * The flag is not decoration. A person who cannot tell whether their message left the machine will
 * assume it did.
 */

/** A sealed envelope on its way somewhere. */
export interface OutboundEnvelope {
  /** The DID it is addressed to. Routing metadata — the relay sees this and nothing else useful. */
  readonly recipientDid: string;
  /** The `DIGCHAT1` bytes. Ciphertext (NC-1). */
  readonly envelope: Uint8Array;
}

/** Called with each envelope that arrives for us. */
export type InboundHandler = (envelope: Uint8Array) => void;

/** A way to move sealed envelopes between DIDs. */
export interface MessageTransport {
  /** A stable identifier for what this transport IS, so the UI never has to guess. */
  readonly kind: string;
  /**
   * Whether an envelope handed to {@link send} can reach a different machine.
   *
   * `false` for every transport dig-chat currently has. The UI shows a standing notice while this is
   * false, because "sent" that means "sent to myself" is the kind of half-truth that turns into a
   * support ticket about lost messages.
   */
  readonly reachesOtherMachines: boolean;
  /** Hand an envelope to the transport. */
  send(outbound: OutboundEnvelope): Promise<void>;
  /** Register `handler` for inbound envelopes; the returned function unregisters it. */
  subscribe(handler: InboundHandler): () => void;
  /** Release anything the transport holds. */
  close(): void;
}
