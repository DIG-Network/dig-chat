/**
 * The preload: the ONLY thing the renderer can reach outside its own sandbox.
 *
 * # What is exposed, and what deliberately is not
 *
 * Nine functions and two subscriptions. No `ipcRenderer`, no `invoke(channel, …)`, no `require`, no
 * `process` — because a bridge that exposes a general "send on this channel" function has exposed
 * every channel there will ever be, including the ones added by someone who never read this file.
 *
 * Above all: there is NO way to read the pairing credential. The renderer learns whether a pairing
 * exists and what state it is in. The channel secret stays in the main process, where a rendering
 * bug cannot reach it.
 *
 * Each exposed function is a thin, named wrapper. The channel strings are not parameters, so nothing
 * the renderer computes can select which handler runs.
 */

import { contextBridge, ipcRenderer } from 'electron';

import {
  CHANNELS,
  EVENTS,
  type AppInfo,
  type ExportResult,
  type ImportResult,
  type SendRequest,
} from '../main/ipc';
import type { ChatMessage } from '../main/chat/conversation';
import type { SessionStatus } from '../main/session';

/** The API the renderer sees on `window.digChat`. */
export interface DigChatApi {
  /** The session state as the main process last established it. */
  getStatus(): Promise<SessionStatus>;
  /** Re-probe the DIG App. */
  refresh(): Promise<SessionStatus>;
  /** Redeem a typed pairing code. */
  pair(code: string): Promise<SessionStatus>;
  /** Forget the pairing on this side. */
  forgetPairing(): Promise<SessionStatus>;
  /** The conversation so far. */
  getHistory(): Promise<ChatMessage[]>;
  /** Seal and send a message. */
  send(request: SendRequest): Promise<ChatMessage>;
  /** Static facts about this build. */
  getAppInfo(): Promise<AppInfo>;
  /** The user's persisted locale choice, or `null` when they have not chosen one. */
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
  /** Subscribe to session changes; returns an unsubscribe function. */
  onSessionChanged(listener: (status: SessionStatus) => void): () => void;
  /** Subscribe to conversation changes; returns an unsubscribe function. */
  onChatChanged(listener: (messages: ChatMessage[]) => void): () => void;
}

const api: DigChatApi = {
  getStatus: () => ipcRenderer.invoke(CHANNELS.sessionStatus) as Promise<SessionStatus>,
  refresh: () => ipcRenderer.invoke(CHANNELS.sessionRefresh) as Promise<SessionStatus>,
  pair: (code) => ipcRenderer.invoke(CHANNELS.sessionPair, code) as Promise<SessionStatus>,
  forgetPairing: () => ipcRenderer.invoke(CHANNELS.sessionForget) as Promise<SessionStatus>,
  getHistory: () => ipcRenderer.invoke(CHANNELS.chatHistory) as Promise<ChatMessage[]>,
  send: (request) => ipcRenderer.invoke(CHANNELS.chatSend, request) as Promise<ChatMessage>,
  getAppInfo: () => ipcRenderer.invoke(CHANNELS.appInfo) as Promise<AppInfo>,
  getLocale: () => ipcRenderer.invoke(CHANNELS.localeGet) as Promise<string | null>,
  setLocale: (locale) => ipcRenderer.invoke(CHANNELS.localeSet, locale) as Promise<string>,
  exportHistory: (passphrase) =>
    ipcRenderer.invoke(CHANNELS.historyExport, passphrase) as Promise<ExportResult>,
  importHistory: (passphrase) =>
    ipcRenderer.invoke(CHANNELS.historyImport, passphrase) as Promise<ImportResult>,
  getRetention: () => ipcRenderer.invoke(CHANNELS.retentionGet) as Promise<number>,
  setRetention: (days) => ipcRenderer.invoke(CHANNELS.retentionSet, days) as Promise<number>,
  clearConversation: (peerDid) =>
    ipcRenderer.invoke(CHANNELS.historyClearConversation, peerDid) as Promise<void>,
  clearAllHistory: () => ipcRenderer.invoke(CHANNELS.historyClearAll) as Promise<void>,

  onSessionChanged: (listener) => subscribe(EVENTS.sessionChanged, listener),
  onChatChanged: (listener) => subscribe(EVENTS.chatChanged, listener),
};

/**
 * Bridge one main→renderer event.
 *
 * The listener the renderer supplies is wrapped rather than registered directly, so the Electron
 * `IpcRendererEvent` — which carries `sender` and other main-process handles — never reaches renderer
 * code. Only the payload crosses.
 */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_event: unknown, payload: T): void => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

contextBridge.exposeInMainWorld('digChat', api);
