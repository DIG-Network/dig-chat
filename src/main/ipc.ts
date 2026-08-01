/**
 * The renderer↔main boundary: the complete, closed list of things the UI may ask the main process to
 * do, and the validation every one of those requests passes through.
 *
 * # The renderer is not trusted, even though we wrote it
 *
 * The renderer displays text a stranger sent. If that ever turns into script execution, the attacker
 * is on the other side of this boundary calling these handlers with arguments of their choosing. So
 * every payload is validated here as untrusted input — not because the UI might send the wrong
 * shape, but because the caller might not be the UI.
 *
 * That is also why the API is a fixed list of verbs rather than anything general. There is no
 * "call this channel", no "read this file", no way to ask for the pairing credential. The strongest
 * thing a compromised renderer can do through this surface is send a chat message, which is the
 * least authority the app can function with.
 */

import type { ChatMessage } from './chat/conversation';
import type { SessionStatus } from './session';

/** Every channel the renderer may invoke. A closed set — anything else has no handler. */
export const CHANNELS = {
  /** What the session state is right now, without probing. */
  sessionStatus: 'dig-chat:session:status',
  /** Re-probe the DIG App and report the state that results. */
  sessionRefresh: 'dig-chat:session:refresh',
  /** Redeem a typed pairing code. */
  sessionPair: 'dig-chat:session:pair',
  /** Forget the stored pairing on this side. */
  sessionForget: 'dig-chat:session:forget',
  /** The conversation so far. */
  chatHistory: 'dig-chat:chat:history',
  /** Seal and send a message. */
  chatSend: 'dig-chat:chat:send',
  /** What the app is, for the about/version surface. */
  appInfo: 'dig-chat:app:info',
} as const;

/** Events the main process pushes to the renderer. */
export const EVENTS = {
  /** The session state changed underneath the UI. */
  sessionChanged: 'dig-chat:session:changed',
  /** The conversation changed — a message arrived, or one was sent. */
  chatChanged: 'dig-chat:chat:changed',
} as const;

/** What a send request must look like. */
export interface SendRequest {
  readonly recipientDid: string;
  readonly body: string;
}

/** Static facts about this build, for the version surface (§6.7). */
export interface AppInfo {
  readonly version: string;
  /** Whether the transport in use can reach another machine. `false` today — the UI says so. */
  readonly reachesOtherMachines: boolean;
  /** The transport's own name, so a bug report says which one was in use. */
  readonly transport: string;
}

/** Thrown when a renderer request is not one this process will act on. */
export class InvalidRequestError extends Error {
  constructor(channel: string, reason: string) {
    // The offending VALUE is deliberately not interpolated: it may be peer-influenced, and this
    // message reaches a log.
    super(`refused ${channel}: ${reason}`);
    this.name = 'InvalidRequestError';
  }
}

/**
 * The longest pairing code this process will look at.
 *
 * Eight symbols, plus room for the grouping the user pasted and a little slack. A code cannot be
 * longer than this and a caller sending a megabyte is not typing.
 */
export const MAX_CODE_INPUT = 64;

/** The longest message body accepted across the boundary, before the conversation's own bound. */
export const MAX_BODY_INPUT = 64 * 1024;

/** The longest DID accepted across the boundary. */
export const MAX_DID_INPUT = 512;

/**
 * Validate a pairing-code argument.
 *
 * @throws {InvalidRequestError} when it is not a bounded string.
 */
export function validateCode(raw: unknown): string {
  if (typeof raw !== 'string') throw new InvalidRequestError(CHANNELS.sessionPair, 'not a string');
  if (raw.length === 0) throw new InvalidRequestError(CHANNELS.sessionPair, 'empty');
  if (raw.length > MAX_CODE_INPUT) {
    throw new InvalidRequestError(CHANNELS.sessionPair, 'longer than a pairing code can be');
  }
  return raw;
}

/**
 * Validate a send request.
 *
 * Every field is checked for type AND bound. An unbounded string across an IPC boundary is a memory
 * amplification primitive; a missing type check is how `undefined` reaches a cipher.
 *
 * @throws {InvalidRequestError} for anything that is not a well-formed request.
 */
export function validateSendRequest(raw: unknown): SendRequest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new InvalidRequestError(CHANNELS.chatSend, 'not an object');
  }
  const { recipientDid, body } = raw as Record<string, unknown>;
  if (typeof recipientDid !== 'string' || recipientDid.length === 0) {
    throw new InvalidRequestError(CHANNELS.chatSend, 'no recipient');
  }
  if (recipientDid.length > MAX_DID_INPUT) {
    throw new InvalidRequestError(CHANNELS.chatSend, 'the recipient is too long to be a DID');
  }
  if (typeof body !== 'string') throw new InvalidRequestError(CHANNELS.chatSend, 'no body');
  if (body.length > MAX_BODY_INPUT) {
    throw new InvalidRequestError(CHANNELS.chatSend, 'the body is too long');
  }
  return { recipientDid, body };
}

/** The bare shape of `ipcMain` this module uses — a seam, so the wiring is testable without Electron. */
export interface IpcHost {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

/** What the IPC layer calls into. Deliberately narrow: no store, no channel, no credential. */
export interface IpcServices {
  status(): SessionStatus;
  refresh(): Promise<SessionStatus>;
  pair(code: string): Promise<SessionStatus>;
  forget(): Promise<SessionStatus>;
  history(): readonly ChatMessage[];
  send(request: SendRequest): Promise<ChatMessage>;
  info(): AppInfo;
}

/**
 * Register every handler.
 *
 * Registration is a plain loop over a table rather than seven `handle` calls, so a channel that
 * exists in {@link CHANNELS} but has no handler is visible as a missing table entry rather than as a
 * silently unanswered request.
 */
export function registerIpcHandlers(host: IpcHost, services: IpcServices): void {
  host.handle(CHANNELS.sessionStatus, () => services.status());
  host.handle(CHANNELS.sessionRefresh, () => services.refresh());
  host.handle(CHANNELS.sessionPair, (_event, code) => services.pair(validateCode(code)));
  host.handle(CHANNELS.sessionForget, () => services.forget());
  host.handle(CHANNELS.chatHistory, () => services.history());
  host.handle(CHANNELS.chatSend, (_event, request) =>
    services.send(validateSendRequest(request)),
  );
  host.handle(CHANNELS.appInfo, () => services.info());
}
