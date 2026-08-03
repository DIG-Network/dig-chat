import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  changeLocale,
  changeRetention,
  clearAllHistory,
  clearConversation,
  createAppStore,
  exportHistory,
  forgetPairing,
  importHistory,
  loadRetention,
  loadSession,
} from '../../src/renderer/store';
import type { DigChatApi } from '../../src/preload/index';

/**
 * The reducer's error handling, driven through the real thunks. The audit found several rejections
 * going nowhere — a failed first load left the "Checking…" spinner forever, and the destructive /
 * retention thunks failed silently. Each test here rejects one bridge call and asserts the store now
 * carries a message id a surface can render, and that export/import DON'T raise the app-wide error
 * (they report inline instead).
 */

/** A bridge whose every verb throws, so any dispatched thunk takes its rejection path. */
function installFailingBridge(over: Partial<DigChatApi> = {}): void {
  const reject = vi.fn(async () => {
    throw new Error('boom');
  });
  window.digChat = {
    getStatus: reject,
    refresh: reject,
    pair: reject,
    forgetPairing: reject,
    getHistory: reject,
    send: reject,
    getAppInfo: reject,
    getLocale: reject,
    setLocale: reject,
    exportHistory: reject,
    importHistory: reject,
    getRetention: reject,
    setRetention: reject,
    clearConversation: reject,
    clearAllHistory: reject,
    onSessionChanged: vi.fn(() => () => undefined),
    onChatChanged: vi.fn(() => () => undefined),
    ...over,
  } as unknown as DigChatApi;
}

beforeEach(() => {
  installFailingBridge();
});

describe('a failed first load surfaces an error instead of a hung spinner', () => {
  it('sets an errorId when loadSession rejects, leaving status null for the retry panel', async () => {
    const store = createAppStore();
    await store.dispatch(loadSession());
    expect(store.getState().ui.status).toBeNull();
    expect(store.getState().ui.errorId).not.toBeNull();
  });
});

describe('the once-silent thunks now report their failures', () => {
  it.each([
    ['forgetPairing', () => forgetPairing()],
    ['changeLocale', () => changeLocale('de')],
    ['loadRetention', () => loadRetention()],
    ['changeRetention', () => changeRetention(30)],
    ['clearConversation', () => clearConversation('did:chia:bob')],
    ['clearAllHistory', () => clearAllHistory()],
  ])('%s raises an errorId on rejection', async (_name, dispatchThunk) => {
    const store = createAppStore();
    // The tuple mixes thunks of different arg types, so their union is not one dispatchable type;
    // each is individually dispatchable, which `never` lets the compiler accept.
    await store.dispatch(dispatchThunk() as never);
    expect(store.getState().ui.errorId).not.toBeNull();
  });
});

describe('export and import report failures inline, not on the app-wide banner', () => {
  it('leaves errorId null when exportHistory rejects', async () => {
    const store = createAppStore();
    await store.dispatch(exportHistory('secret'));
    expect(store.getState().ui.errorId).toBeNull();
  });

  it('leaves errorId null when importHistory rejects', async () => {
    const store = createAppStore();
    await store.dispatch(importHistory('secret'));
    expect(store.getState().ui.errorId).toBeNull();
  });
});
