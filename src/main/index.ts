/**
 * The Electron entry point: build the window, wire the session, hold nothing else.
 *
 * Every SECURITY DECISION this file applies is a constant from `./security`, and every DECISION about
 * pairing, identity or messages lives in the modules below it. What is left here is assembly — which
 * is why this one file is excluded from the coverage floor while everything it assembles is not.
 */

import { chmod, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BrowserWindow, app, dialog, ipcMain, safeStorage, shell } from 'electron';

import { Conversation, SendError, type ChatMessage } from './chat/conversation';
import { countNewMessages, mergeHistories } from './chat/history-merge';
import { pruneAged } from './chat/retention';
import { LoopbackTransport } from './transport/loopback';
import { Session } from './session';
import { CredentialStore } from './storage/credentials';
import {
  ARCHIVE_MAX_BYTES,
  ArchiveTooLargeError,
  decodeArchive,
  encodeArchive,
} from './storage/archive';
import { HistoryStore } from './storage/history';
import { LocaleStore } from './storage/locale';
import { RetentionStore } from './storage/retention';
import { loopbackChannelFactory } from './pairing/channel';
import {
  CONTENT_SECURITY_POLICY,
  SECURE_WEB_PREFERENCES,
  isInternalNavigation,
  mayOpenExternally,
} from './security';
import { EVENTS, registerIpcHandlers, type IpcServices } from './ipc';
import { version } from '../../package.json';

const transport = new LoopbackTransport();

let window: BrowserWindow | null = null;
let session: Session | null = null;
let conversation: Conversation | null = null;
let history: HistoryStore | null = null;
let locale: LocaleStore | null = null;
let retention: RetentionStore | null = null;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

/** The clock, behind a seam so the retention sweep is pinnable rather than wall-clock bound. */
const now = (): number => Date.now();

/** Milliseconds in a day, the unit the retention window is stored in. */
const DAY_MS = 86_400_000;

/** How often the background retention sweep runs while the app is open. */
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1_000;

/** Build the one window, hardened, and load the renderer. */
function createWindow(): BrowserWindow {
  const created = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 480,
    minHeight: 480,
    show: false,
    title: 'DIG Chat',
    webPreferences: {
      ...SECURE_WEB_PREFERENCES,
      preload: join(__dirname, '../preload/index.js'),
    },
  });

  // Serve the CSP as a header rather than only as a meta tag: a header cannot be displaced by
  // injected markup that appears earlier in the document than the tag does.
  created.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CONTENT_SECURITY_POLICY],
      },
    });
  });

  // A link in a stranger's message must not be able to navigate the app window or open a second one.
  created.webContents.on('will-navigate', (event, url) => {
    if (!isInternalNavigation(url, created.webContents.getURL())) event.preventDefault();
  });
  created.webContents.setWindowOpenHandler(({ url }) => {
    if (mayOpenExternally(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  created.once('ready-to-show', () => created.show());
  return created;
}

/** Everything the renderer may ask for, backed by the live session. */
function servicesFor(live: Session): IpcServices {
  return {
    status: () => live.status(),
    refresh: async () => {
      const status = await live.refresh();
      await attachConversation(live);
      return status;
    },
    pair: async (code) => {
      const status = await live.pairWithCode(code);
      await attachConversation(live);
      return status;
    },
    forget: async () => {
      conversation?.close();
      conversation = null;
      // Forgetting the pairing forgets the conversation it protected: the credential is gone, so
      // keeping its decrypted history would outlive the identity that justified storing it.
      await history?.clear();
      return live.forgetPairing();
    },
    history: () => conversation?.history() ?? [],
    send: async (request) => {
      const identity = live.currentIdentity();
      const active = conversation;
      if (!identity || !active) throw new SendError('error.notConnected', 'not connected');
      // The recipient's sealing key is not discoverable yet — the DIG App attests our own, and there
      // is no directory to look anyone else's up in. Sending to ourselves is the loop the MVP can
      // honestly close; `SPEC.md` §6 records the gap.
      return active.send({ ...identity, did: request.recipientDid }, request.body);
    },
    info: () => ({
      version,
      reachesOtherMachines: transport.reachesOtherMachines,
      transport: transport.kind,
      historyPersisted: history?.isAvailable() ?? false,
    }),
    getLocale: () => locale?.load() ?? Promise.resolve(null),
    setLocale: (chosen) => locale?.save(chosen) ?? Promise.resolve(chosen),
    exportHistory: (passphrase) => exportHistoryTo(passphrase),
    importHistory: (passphrase) => importHistoryFrom(live, passphrase),
    getRetention: () => retention?.load() ?? Promise.resolve(0),
    setRetention: async (days) => {
      const accepted = (await retention?.save(days)) ?? 0;
      await sweep(live);
      return accepted;
    },
    clearConversation: async (peerDid) => {
      await history?.clearConversation(peerDid);
      await attachConversation(live);
    },
    clearAllHistory: async () => {
      await history?.clear();
      await attachConversation(live);
    },
  };
}

/**
 * Seal the current history to a passphrase archive at a location the user chooses.
 *
 * The renderer never sees the file path until AFTER the write, and never sees the bytes at all: the
 * save dialog, the encryption and the 0600 write all happen here in the main process. A cancelled
 * dialog is an honest `{ saved: false }`, not an error.
 */
async function exportHistoryTo(passphrase: string): Promise<{ saved: boolean; path?: string }> {
  const messages = conversation?.history() ?? (await history?.load()) ?? [];
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export DIG Chat history',
    defaultPath: 'dig-chat-history.digchat',
    filters: [{ name: 'DIG Chat archive', extensions: ['digchat'] }],
  });
  if (canceled || !filePath) return { saved: false };

  await writeFile(filePath, encodeArchive(passphrase, messages), { mode: 0o600, flag: 'w' });
  await chmod(filePath, 0o600).catch(() => undefined);
  return { saved: true, path: filePath };
}

/**
 * Open a passphrase archive the user chooses and merge it into the current history.
 *
 * The merge, the sanitising and the bounding all happen in {@link mergeHistories}; a decode failure
 * (wrong passphrase, corrupt file, unsupported version) propagates as its typed error so the renderer
 * can show the specific message. On success the in-memory conversation is rebuilt from the saved
 * result, so the log the user sees is the merged one.
 */
async function importHistoryFrom(
  live: Session,
  passphrase: string,
): Promise<{ added: number; total: number }> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import DIG Chat history',
    properties: ['openFile'],
    filters: [{ name: 'DIG Chat archive', extensions: ['digchat'] }],
  });
  const chosen = filePaths[0];
  const current = conversation?.history() ?? (await history?.load()) ?? [];
  if (canceled || !chosen) return { added: 0, total: current.length };

  // Reject an over-cap file by its `stat` size BEFORE reading it, so a hostile multi-gigabyte
  // `.digchat` is never pulled into memory at all (#2020). `decodeArchive` re-checks the same bound on
  // the raw bytes; this stat-guard is the earlier, cheaper line that avoids the read entirely.
  const { size } = await stat(chosen);
  if (size > ARCHIVE_MAX_BYTES) throw new ArchiveTooLargeError(size);

  const imported = decodeArchive(passphrase, await readFile(chosen));
  const added = countNewMessages(current, imported);
  const merged = mergeHistories(current, imported);
  await history?.save(merged);
  await attachConversation(live);
  return { added, total: merged.length };
}

/**
 * Build the conversation once the session is connected, restore its history, and tell the renderer
 * when it changes.
 *
 * History is loaded from and sealed to {@link history} only when the OS offers an encryption backend;
 * otherwise `initialHistory`/`persist` are omitted and the conversation runs in memory only.
 */
async function attachConversation(live: Session): Promise<void> {
  const agent = live.identityAgent();
  const identity = live.currentIdentity();
  conversation?.close();
  conversation = null;
  if (!agent || !identity) return;

  const persists = history?.isAvailable() ?? false;
  const initialHistory = persists ? await pruneOnLoad(await history!.load()) : undefined;

  conversation = new Conversation({
    agent,
    transport,
    self: identity,
    clock: () => Date.now(),
    initialHistory,
    persist: persists
      ? (messages) => {
          // Fire-and-forget: a message must appear even if it cannot be saved, and a failed seal is
          // not something to surface mid-conversation. The refuse-and-tell notice covers the honest case.
          void history!.save(messages).catch(() => undefined);
        }
      : undefined,
  });
  conversation.watch(() => {
    window?.webContents.send(EVENTS.chatChanged, conversation?.history() ?? []);
  });
}

/**
 * Apply the retention window to freshly-loaded history, persisting the result if anything was dropped.
 *
 * Retention is enforced at the moment history is read (SPEC §5.8), so an app opened after a long gap
 * forgets aged messages immediately rather than only on the next periodic sweep. When retention is
 * off (window 0) this is a no-op that returns the input untouched.
 */
async function pruneOnLoad(loaded: ChatMessage[]): Promise<ChatMessage[]> {
  const days = (await retention?.load()) ?? 0;
  const pruned = pruneAged(loaded, days * DAY_MS, now());
  if (pruned.length !== loaded.length) await history?.save(pruned);
  return pruned;
}

/**
 * The periodic retention sweep: reload, prune, save-if-changed, and tell the renderer.
 *
 * Called on a timer and whenever the window changes, so a long-running app enforces retention without
 * a restart. It rebuilds the in-memory conversation from the pruned result so the open UI reflects the
 * deletion, not just the file.
 */
async function sweep(live: Session): Promise<void> {
  if (!(history?.isAvailable() ?? false)) return;
  const days = (await retention?.load()) ?? 0;
  const loaded = await history!.load();
  const pruned = pruneAged(loaded, days * DAY_MS, now());
  if (pruned.length === loaded.length) return;
  await history!.save(pruned);
  await attachConversation(live);
}

void app.whenReady().then(async () => {
  const userData = app.getPath('userData');
  history = new HistoryStore(userData, safeStorage);
  locale = new LocaleStore(userData);
  retention = new RetentionStore(userData);
  session = new Session({
    channels: loopbackChannelFactory,
    credentials: new CredentialStore(userData, safeStorage),
    now: () => Math.floor(Date.now() / 1000),
  });

  registerIpcHandlers(ipcMain, servicesFor(session));
  window = createWindow();
  await window.loadFile(join(__dirname, '../renderer/index.html'));

  const status = await session.refresh();
  await attachConversation(session);
  window.webContents.send(EVENTS.sessionChanged, status);

  // Enforce retention on a timer so a long-running app forgets aged messages without a restart.
  sweepTimer = setInterval(() => void sweep(session!), SWEEP_INTERVAL_MS);
});

app.on('window-all-closed', () => {
  if (sweepTimer) clearInterval(sweepTimer);
  sweepTimer = null;
  conversation?.close();
  session?.close();
  transport.close();
  if (process.platform !== 'darwin') app.quit();
});
