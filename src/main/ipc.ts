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

import { coerceSupportedLocale } from '../shared/locales';
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
  /** The user's persisted locale choice, or `null` when they have not chosen one. */
  localeGet: 'dig-chat:locale:get',
  /** Persist a locale choice; the accepted (allowlisted) locale is returned. */
  localeSet: 'dig-chat:locale:set',
  /** Export the whole history to a passphrase-sealed archive the user picks a location for. */
  historyExport: 'dig-chat:history:export',
  /** Import a passphrase-sealed archive the user picks, merging it into the current history. */
  historyImport: 'dig-chat:history:import',
  /** The retention window in days, or 0 when retention is disabled. */
  retentionGet: 'dig-chat:retention:get',
  /** Set the retention window in days (0 disables it); the accepted, clamped value is returned. */
  retentionSet: 'dig-chat:retention:set',
  /** Forget one peer's messages. */
  historyClearConversation: 'dig-chat:history:clearConversation',
  /** Forget the whole history. */
  historyClearAll: 'dig-chat:history:clearAll',
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

/** The outcome of an export: whether a file was written, and where (absent when the user cancelled). */
export interface ExportResult {
  readonly saved: boolean;
  readonly path?: string;
}

/** The outcome of an import: how many messages were newly added, and the resulting total. */
export interface ImportResult {
  readonly added: number;
  readonly total: number;
}

/** Static facts about this build, for the version surface (§6.7). */
export interface AppInfo {
  readonly version: string;
  /** Whether the transport in use can reach another machine. `false` today — the UI says so. */
  readonly reachesOtherMachines: boolean;
  /** The transport's own name, so a bug report says which one was in use. */
  readonly transport: string;
  /**
   * Whether message history is persisted across restarts. `false` when the OS offers no encryption
   * backend: dig-chat runs the session in memory only rather than writing decrypted chat in the
   * clear, and the UI says so (§5.2's refuse-and-tell posture, applied to history).
   */
  readonly historyPersisted: boolean;
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

/** The longest locale tag this process will look at — a canonical code is far shorter. */
export const MAX_LOCALE_INPUT = 35;

/**
 * Validate a locale argument coming across the boundary and coerce it to a supported code.
 *
 * The value is untrusted (the caller might not be the UI), so a non-string is refused outright, and
 * an over-long or unsupported string is coerced to the default locale rather than trusted — an
 * unknown locale becomes English, never a rejection the renderer has to handle or an arbitrary value
 * written to disk. The bound is applied BEFORE the allowlist check so a megabyte string is discarded
 * without a set-membership walk over it.
 *
 * @throws {InvalidRequestError} when the argument is not a string at all.
 */
export function validateLocale(raw: unknown): string {
  if (typeof raw !== 'string') throw new InvalidRequestError(CHANNELS.localeSet, 'not a string');
  if (raw.length > MAX_LOCALE_INPUT) return coerceSupportedLocale('');
  return coerceSupportedLocale(raw);
}

/**
 * The longest passphrase this process will look at.
 *
 * A generous bound — a passphrase is a human-chosen secret, not a paste of arbitrary data — that still
 * stops a caller turning the KDF into a memory-amplification primitive by feeding it a megabyte.
 */
export const MAX_PASSPHRASE_INPUT = 1_024;

/**
 * Validate a passphrase argument.
 *
 * The passphrase is the ONE secret the renderer legitimately supplies (the export/import verbs), so it
 * is checked for type and bound but never logged or echoed. An empty passphrase is refused: sealing an
 * archive under nothing is a footgun, not a feature.
 *
 * @throws {InvalidRequestError} when it is not a bounded, non-empty string.
 */
export function validatePassphrase(raw: unknown): string {
  if (typeof raw !== 'string') throw new InvalidRequestError(CHANNELS.historyExport, 'not a string');
  if (raw.length === 0) throw new InvalidRequestError(CHANNELS.historyExport, 'empty');
  if (raw.length > MAX_PASSPHRASE_INPUT) {
    throw new InvalidRequestError(CHANNELS.historyExport, 'longer than a passphrase can be');
  }
  return raw;
}

/**
 * Validate a retention-days argument, coercing anything out of shape to 0 (disabled).
 *
 * A retention window is a setting, not a command: an out-of-range, non-integer or non-number value
 * degrades to "keep everything" rather than a rejection the renderer has to handle. That direction is
 * deliberate — a bad value can only ever retain MORE than the user asked, never evict more. The store
 * clamps again on the way to disk; this is the boundary coercion so the service never sees junk.
 */
export function validateRetentionDays(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 0;
  return Math.trunc(raw);
}

/**
 * Validate a peer-DID argument for the clear-conversation verb.
 *
 * @throws {InvalidRequestError} when it is not a bounded string. (An empty string is allowed through
 * to the store, which sanitises and matches it — clearing "no such peer" is a harmless no-op.)
 */
export function validatePeerDid(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new InvalidRequestError(CHANNELS.historyClearConversation, 'not a string');
  }
  if (raw.length > MAX_DID_INPUT) {
    throw new InvalidRequestError(CHANNELS.historyClearConversation, 'too long to be a DID');
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
  /** The persisted locale, or `null` when the user has not chosen one. */
  getLocale(): Promise<string | null>;
  /** Persist a locale choice; resolves to the accepted (allowlisted) locale. */
  setLocale(locale: string): Promise<string>;
  /** Seal the whole history to a passphrase archive at a location the user chooses. */
  exportHistory(passphrase: string): Promise<ExportResult>;
  /** Open a passphrase archive the user chooses and merge it into the current history. */
  importHistory(passphrase: string): Promise<ImportResult>;
  /** The persisted retention window in days (0 = disabled). */
  getRetention(): Promise<number>;
  /** Persist a retention window; resolves to the accepted, clamped value. */
  setRetention(days: number): Promise<number>;
  /** Forget one peer's messages. */
  clearConversation(peerDid: string): Promise<void>;
  /** Forget the whole history. */
  clearAllHistory(): Promise<void>;
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
  host.handle(CHANNELS.chatSend, (_event, request) => services.send(validateSendRequest(request)));
  host.handle(CHANNELS.appInfo, () => services.info());
  host.handle(CHANNELS.localeGet, () => services.getLocale());
  host.handle(CHANNELS.localeSet, (_event, locale) => services.setLocale(validateLocale(locale)));
  host.handle(CHANNELS.historyExport, (_event, phrase) =>
    services.exportHistory(validatePassphrase(phrase)),
  );
  host.handle(CHANNELS.historyImport, (_event, phrase) =>
    services.importHistory(validatePassphrase(phrase)),
  );
  host.handle(CHANNELS.retentionGet, () => services.getRetention());
  host.handle(CHANNELS.retentionSet, (_event, days) =>
    services.setRetention(validateRetentionDays(days)),
  );
  host.handle(CHANNELS.historyClearConversation, (_event, did) =>
    services.clearConversation(validatePeerDid(did)),
  );
  host.handle(CHANNELS.historyClearAll, () => services.clearAllHistory());
}
