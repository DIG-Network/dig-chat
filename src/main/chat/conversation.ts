/**
 * A conversation with one other DID: sending, receiving, and the record of what was said.
 *
 * # Where the encryption is, and where it is not
 *
 * Sealing and unsealing happen in the DIG App, through {@link IdentityAgent}. This module never sees
 * a key and never encrypts anything — it decides WHAT to seal, hands it over, and puts the resulting
 * envelope on the transport. That division is the reason a compromise of dig-chat costs the user
 * their message history and not their identity.
 *
 * # Peer text is untrusted, always
 *
 * A message body and a sender DID are chosen by whoever is at the other end. Both pass through
 * `./peer-text` at ONE choke point ({@link Conversation.record}) before they are stored, so control
 * characters, ANSI escapes and bidirectional overrides are gone before anything downstream — a
 * screen, a log line, an error message — can be surprised by them. React escaping closes the markup
 * half; it closes nothing about the log half, which is the half this ecosystem has already paid for.
 */

import type { IdentityAgent, IdentitySummary } from '../identity/agent';
import { EnvelopeError, MAX_PLAINTEXT_BYTES, decodeEnvelope } from '../identity/envelope';
import type { MessageTransport } from '../transport/types';
import { decodePeerText, sanitizeIdentifier, sanitizePeerText } from './peer-text';

/** Which way a message went. */
export type Direction = 'sent' | 'received';

/** One message, as the UI shows it. */
export interface ChatMessage {
  /** A stable id for React keys and for de-duplication. */
  readonly id: string;
  readonly direction: Direction;
  /** The other party's DID. Untrusted text. */
  readonly peerDid: string;
  /** The message body. Untrusted text. */
  readonly body: string;
  /** Unix-epoch milliseconds this app saw the message. Not a claim about when it was sent. */
  readonly at: number;
}

/** Thrown when a message cannot be sent, with a reason the UI can show. */
export class SendError extends Error {
  constructor(
    readonly messageId: string,
    message: string,
  ) {
    super(message);
    this.name = 'SendError';
  }
}

/** What a {@link Conversation} needs. */
export interface ConversationDependencies {
  readonly agent: IdentityAgent;
  readonly transport: MessageTransport;
  /** Our own attested identity — the `senderDid` on everything we send. */
  readonly self: IdentitySummary;
  /** Unix-epoch milliseconds. Injected so ordering is pinnable in tests. */
  readonly clock: () => number;
}

/**
 * The conversation log plus the two verbs that change it.
 *
 * Deliberately in-memory for the MVP, and the UI says so: message history is not persisted, so
 * closing dig-chat loses it. Persisting a decrypted history is a real decision about where plaintext
 * lives at rest, and it is not one to make in passing.
 */
export class Conversation {
  private readonly messages: ChatMessage[] = [];
  private readonly unsubscribe: () => void;
  private sequence = 0;
  private onChange: (() => void) | null = null;

  constructor(private readonly deps: ConversationDependencies) {
    this.unsubscribe = deps.transport.subscribe((envelope) => {
      void this.receive(envelope);
    });
  }

  /** Everything said so far, oldest first. */
  history(): readonly ChatMessage[] {
    return [...this.messages];
  }

  /** Call `listener` whenever the history changes, so the UI can re-render. */
  watch(listener: () => void): void {
    this.onChange = listener;
  }

  /**
   * Seal `body` to `recipient` and send it.
   *
   * The message is recorded only AFTER the transport has taken it. Recording first would show the
   * user their own message sitting in the log as though it had been sent, when it had not.
   *
   * @throws {SendError} for an empty or oversized body, or when sealing or sending failed.
   */
  async send(recipient: IdentitySummary, body: string): Promise<ChatMessage> {
    const trimmed = body.trim();
    if (trimmed.length === 0) throw new SendError('error.emptyMessage', 'nothing to send');

    const plaintext = new TextEncoder().encode(trimmed);
    if (plaintext.length > MAX_PLAINTEXT_BYTES) {
      throw new SendError('error.messageTooLong', `a message may carry ${MAX_PLAINTEXT_BYTES} bytes`);
    }

    const envelope = await this.deps.agent.seal(recipient, plaintext);
    assertSealed(envelope, recipient.did);
    await this.deps.transport.send({ recipientDid: recipient.did, envelope });

    return this.record('sent', recipient.did, trimmed);
  }

  /**
   * Handle one inbound envelope.
   *
   * Never throws: an envelope that cannot be opened is dropped and counted, because the sender of a
   * malformed envelope is by definition not someone whose input should be able to disturb this app.
   * The count is exposed so the UI can say "3 messages could not be read" rather than silently
   * showing nothing.
   */
  private async receive(envelope: Uint8Array): Promise<void> {
    try {
      const opened = await this.deps.agent.unseal(envelope);
      this.record('received', opened.senderDid, decodePeerText(opened.plaintext));
    } catch {
      this.unreadable += 1;
      this.onChange?.();
    }
  }

  /** How many inbound envelopes could not be opened. */
  unreadable = 0;

  /**
   * Append a message and notify the UI.
   *
   * THE choke point for peer text. Both strings are neutralised here rather than at each call site,
   * because a call site added later would otherwise have to remember — and the failure of
   * remembering is silent until something hostile arrives.
   */
  private record(direction: Direction, peerDid: string, body: string): ChatMessage {
    this.sequence += 1;
    const message: ChatMessage = {
      id: `${direction}-${this.sequence}`,
      direction,
      peerDid: sanitizeIdentifier(peerDid),
      body: sanitizePeerText(body),
      at: this.deps.clock(),
    };
    this.messages.push(message);
    this.onChange?.();
    return message;
  }

  /** Stop listening to the transport. */
  close(): void {
    this.unsubscribe();
    this.onChange = null;
  }
}

/**
 * Refuse to send anything that is not a `DIGCHAT1` envelope addressed where we asked.
 *
 * This is a check on our OWN side of the channel, and it is the NC-1 backstop: if a future DIG App
 * build, a misconfiguration, or a bug ever returned the plaintext — or an envelope addressed
 * somewhere else — this is what stops it reaching the transport. A relay must never have the
 * opportunity to see plaintext, and "the DIG App would never do that" is not a mechanism.
 *
 * @throws {SendError} when the bytes are not an envelope for `recipientDid`.
 */
function assertSealed(envelope: Uint8Array, recipientDid: string): void {
  let decoded;
  try {
    decoded = decodeEnvelope(envelope);
  } catch (failure) {
    throw new SendError(
      'error.sealFailed',
      `refusing to send: what came back is not a sealed envelope (${
        failure instanceof EnvelopeError ? failure.message : 'unreadable'
      })`,
    );
  }
  if (decoded.recipientDid !== recipientDid) {
    throw new SendError('error.sealFailed', 'refusing to send: the envelope is addressed elsewhere');
  }
}
