/**
 * The Electron entry point: build the window, wire the session, hold nothing else.
 *
 * Every SECURITY DECISION this file applies is a constant from `./security`, and every DECISION about
 * pairing, identity or messages lives in the modules below it. What is left here is assembly — which
 * is why this one file is excluded from the coverage floor while everything it assembles is not.
 */

import { join } from 'node:path';

import { BrowserWindow, app, ipcMain, safeStorage, shell } from 'electron';

import { Conversation } from './chat/conversation';
import { LoopbackTransport } from './transport/loopback';
import { Session } from './session';
import { CredentialStore } from './storage/credentials';
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
      attachConversation(live);
      return status;
    },
    pair: async (code) => {
      const status = await live.pairWithCode(code);
      attachConversation(live);
      return status;
    },
    forget: async () => {
      conversation?.close();
      conversation = null;
      return live.forgetPairing();
    },
    history: () => conversation?.history() ?? [],
    send: async (request) => {
      const identity = live.currentIdentity();
      const active = conversation;
      if (!identity || !active) throw new Error('not connected');
      // The recipient's sealing key is not discoverable yet — the DIG App attests our own, and there
      // is no directory to look anyone else's up in. Sending to ourselves is the loop the MVP can
      // honestly close; `SPEC.md` §6 records the gap.
      return active.send({ ...identity, did: request.recipientDid }, request.body);
    },
    info: () => ({
      version,
      reachesOtherMachines: transport.reachesOtherMachines,
      transport: transport.kind,
    }),
  };
}

/** Build the conversation once the session is connected, and tell the renderer when it changes. */
function attachConversation(live: Session): void {
  const agent = live.identityAgent();
  const identity = live.currentIdentity();
  conversation?.close();
  conversation = null;
  if (!agent || !identity) return;

  conversation = new Conversation({ agent, transport, self: identity, clock: () => Date.now() });
  conversation.watch(() => {
    window?.webContents.send(EVENTS.chatChanged, conversation?.history() ?? []);
  });
}

void app.whenReady().then(async () => {
  session = new Session({
    channels: loopbackChannelFactory,
    credentials: new CredentialStore(app.getPath('userData'), safeStorage),
    now: () => Math.floor(Date.now() / 1000),
  });

  registerIpcHandlers(ipcMain, servicesFor(session));
  window = createWindow();
  await window.loadFile(join(__dirname, '../renderer/index.html'));

  const status = await session.refresh();
  attachConversation(session);
  window.webContents.send(EVENTS.sessionChanged, status);
});

app.on('window-all-closed', () => {
  conversation?.close();
  session?.close();
  transport.close();
  if (process.platform !== 'darwin') app.quit();
});
