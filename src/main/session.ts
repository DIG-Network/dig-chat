/**
 * The session: what dig-chat knows about its link to the DIG App, and how it came to know it.
 *
 * # Five states, because there are five different facts
 *
 * This is the file that exists to stop dig-chat lying about its own connection. Collapsing these
 * into "connected / not connected" would report a person's DIG App as broken when it is merely
 * closed, and would report an unpaired install as a failure when nothing has failed yet.
 *
 * | state                  | the fact                                                            | what the user can do |
 * |------------------------|---------------------------------------------------------------------|----------------------|
 * | `checking`             | dig-chat has not established anything yet — an UNKNOWN, not a zero   | wait                 |
 * | `unpaired`             | there is no pairing on this machine                                  | pair                 |
 * | `app-unreachable`      | there IS a pairing; nothing answered on the identity port            | start the DIG App    |
 * | `identity-unsupported` | the DIG App answered, but offers no identity capability              | update the DIG App   |
 * | `connected`            | paired, reachable, and the identity capability answered              | chat                 |
 *
 * `checking` is the one an implementation naturally omits, and omitting it is the specific mistake
 * this ecosystem has paid for before: an unknown rendered as a zero reads as a definite negative
 * fact. Until the first probe returns, dig-chat does not know, and says it does not know.
 *
 * A pairing that has been REVOKED from the DIG App's menu shows up as `app-unreachable` on the next
 * frame — the DIG App answers `AUTH_REQUIRED` for a pairing it no longer holds, and
 * {@link Session.refresh} clears the stored credential so the user is asked to pair again rather
 * than left staring at an app that silently does nothing.
 */

import { PairedIdentityAgent, type IdentityAgent, type IdentitySummary } from './identity/agent';
import { PairedChannel, pair, type PairingCredential } from './pairing/client';
import type { Channel, ChannelFactory } from './pairing/channel';
import { ChannelError, ChannelUnreachableError } from './pairing/errors';
import { IdentityUnsupportedError } from './identity/agent';
import type { CredentialStore } from './storage/credentials';

/** The five facts. */
export type ConnectionState =
  | 'checking'
  | 'unpaired'
  | 'app-unreachable'
  | 'identity-unsupported'
  | 'connected';

/** Everything the renderer is allowed to know about the session. Carries NO secret. */
export interface SessionStatus {
  readonly state: ConnectionState;
  /** The user's DID, once `connected`. */
  readonly did: string | null;
  /** Unix-epoch seconds the pairing was made, when there is one. */
  readonly pairedAt: number | null;
}

/** What {@link Session} needs from the outside world. */
export interface SessionDependencies {
  readonly channels: ChannelFactory;
  readonly credentials: CredentialStore;
  /** Unix-epoch seconds. Injected so `pairedAt` is pinnable in tests. */
  readonly now: () => number;
  /** Builds the identity agent over a paired channel. Injected so the session is testable alone. */
  readonly agentFor?: (channel: PairedChannel) => IdentityAgent;
}

/**
 * The live session. One instance per app run, owned by the main process.
 *
 * Every method leaves the session in a state it can honestly report, including after a failure —
 * there is no path that returns an error while leaving `state` saying `connected`.
 */
export class Session {
  private state: ConnectionState = 'checking';
  private credential: PairingCredential | null = null;
  private channel: Channel | null = null;
  private agent: IdentityAgent | null = null;
  private identity: IdentitySummary | null = null;

  constructor(private readonly deps: SessionDependencies) {}

  /** What the renderer is told. */
  status(): SessionStatus {
    return {
      state: this.state,
      did: this.identity?.did ?? null,
      pairedAt: this.credential?.pairedAt ?? null,
    };
  }

  /** The identity agent, or `null` when the session is not `connected`. */
  identityAgent(): IdentityAgent | null {
    return this.state === 'connected' ? this.agent : null;
  }

  /** The attested identity, or `null` when the session is not `connected`. */
  currentIdentity(): IdentitySummary | null {
    return this.state === 'connected' ? this.identity : null;
  }

  /**
   * Establish, or re-establish, what state we are in — the one method that decides it.
   *
   * Called at launch, after pairing, and whenever the renderer asks. Cheap enough to call often: it
   * opens a socket and sends one `identity.attest`.
   */
  async refresh(): Promise<SessionStatus> {
    this.dropChannel();
    this.identity = null;

    const credential = this.credential ?? (await this.deps.credentials.load());
    if (!credential) {
      this.credential = null;
      this.state = 'unpaired';
      return this.status();
    }
    this.credential = credential;
    return this.connectWith(credential);
  }

  /**
   * Redeem a pairing code the user typed.
   *
   * The code is spent whatever happens next — that is the DIG App's design, and it is the right way
   * round, since a pairing the user declined is exactly when a code should stop working.
   *
   * @throws {ChannelError} the wire refusal, so the UI can distinguish "you declined" from "that
   * code was not accepted".
   * @throws {ChannelUnreachableError} when the DIG App is not running.
   * @throws {CredentialStorageUnavailableError} when the pairing succeeded but cannot be stored.
   */
  async pairWithCode(codeSymbols: string): Promise<SessionStatus> {
    this.dropChannel();

    const channel = await this.deps.channels.open();
    let credential: PairingCredential;
    try {
      credential = await pair(channel, codeSymbols, this.deps.now());
    } finally {
      channel.close();
    }

    // Store BEFORE reporting success. A pairing that worked and was not saved would come back
    // `unpaired` at the next launch with no explanation, and the user would burn another code.
    await this.deps.credentials.save(credential);
    this.credential = credential;
    return this.connectWith(credential);
  }

  /**
   * Forget the pairing on this side.
   *
   * Honest about its limit, and the UI says so: this removes dig-chat's credential. The AUTHORITATIVE
   * revocation is in the DIG App's own "Paired apps" menu, which kills the channel immediately. A
   * button here that claimed to revoke would be claiming a power dig-chat does not have.
   */
  async forgetPairing(): Promise<SessionStatus> {
    this.dropChannel();
    await this.deps.credentials.clear();
    this.credential = null;
    this.identity = null;
    this.state = 'unpaired';
    return this.status();
  }

  /** Close the channel. Called on app quit. */
  close(): void {
    this.dropChannel();
  }

  /**
   * Open a channel with `credential` and find out what it can do.
   *
   * The probe is `identity.attest`, deliberately: it is the cheapest call that proves all three
   * things at once — the DIG App is running, the pairing still authenticates, and the identity
   * capability is really there. Inferring "connected" from a socket that merely opened would report
   * a connection that cannot do anything.
   */
  private async connectWith(credential: PairingCredential): Promise<SessionStatus> {
    let channel: Channel;
    try {
      channel = await this.deps.channels.open();
    } catch {
      this.state = 'app-unreachable';
      return this.status();
    }
    this.channel = channel;

    const paired = new PairedChannel(channel, credential);
    const agent = this.deps.agentFor?.(paired) ?? new PairedIdentityAgent(paired);
    try {
      this.identity = await agent.attest();
      this.agent = agent;
      this.state = 'connected';
    } catch (failure) {
      this.dropChannel();
      this.state = await this.explain(failure);
    }
    return this.status();
  }

  /**
   * Turn a failed probe into the state that names it.
   *
   * A revoked pairing is the interesting case: the DIG App is running and answering, so calling it
   * unreachable is not quite true — but the credential is dead and the only way forward is a new
   * code, so the credential is cleared and the session reports `unpaired`, which IS true and is
   * actionable. Leaving a dead credential in place would loop the user through an app that responds
   * to nothing.
   */
  private async explain(failure: unknown): Promise<ConnectionState> {
    if (failure instanceof IdentityUnsupportedError) return 'identity-unsupported';
    if (failure instanceof ChannelError && failure.symbol === 'AUTH_REQUIRED') {
      await this.deps.credentials.clear();
      this.credential = null;
      return 'unpaired';
    }
    if (failure instanceof ChannelUnreachableError) return 'app-unreachable';
    // An unrecognised failure is reported as unreachable rather than as connected. Guessing
    // optimistically here would be the one direction of error that produces a lying green light.
    return 'app-unreachable';
  }

  /** Close and forget the channel and the agent, so no stale handle can be used. */
  private dropChannel(): void {
    this.channel?.close();
    this.channel = null;
    this.agent = null;
  }
}
