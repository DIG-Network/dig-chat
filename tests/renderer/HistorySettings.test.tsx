import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HistorySettingsScreen } from '../../src/renderer/components/HistorySettingsScreen';
import { messagesFor } from '../../src/renderer/i18n/catalog';
import { createAppStore, type UiState } from '../../src/renderer/store';
import type { ChatMessage } from '../../src/main/chat/conversation';
import type { DigChatApi } from '../../src/preload/index';

/**
 * The history settings surface. The tests drive it through the same preload bridge the app uses, so a
 * passing test exercises the real thunk → bridge → reducer path rather than a hand-set slice: export
 * shows success and error, import reports the merged count and surfaces each archive error id,
 * retention persists, and every destructive action is gated behind a dismissible confirm.
 */

function message(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'sent-1',
    direction: 'sent',
    peerDid: 'did:chia:bob',
    body: 'hello',
    at: 1,
    ...over,
  };
}

/** A bridge double; only the verbs this surface uses need real behaviour. */
function installBridge(over: Partial<DigChatApi> = {}): DigChatApi {
  const api = {
    getStatus: vi.fn(),
    refresh: vi.fn(),
    pair: vi.fn(),
    forgetPairing: vi.fn(),
    getHistory: vi.fn(async () => []),
    send: vi.fn(),
    getAppInfo: vi.fn(),
    getLocale: vi.fn(async () => null),
    setLocale: vi.fn(async (l: string) => l),
    exportHistory: vi.fn(async () => ({ saved: true, path: '/home/me/chat.digchat' })),
    importHistory: vi.fn(async () => ({ added: 2, total: 5 })),
    getRetention: vi.fn(async () => 0),
    setRetention: vi.fn(async (d: number) => d),
    clearConversation: vi.fn(async () => undefined),
    clearAllHistory: vi.fn(async () => undefined),
    onSessionChanged: vi.fn(() => () => undefined),
    onChatChanged: vi.fn(() => () => undefined),
    ...over,
  } as unknown as DigChatApi;
  window.digChat = api;
  return api;
}

function renderSettings(preloaded?: Partial<UiState>) {
  const store = createAppStore(preloaded);
  render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={messagesFor('en')}>
        <HistorySettingsScreen />
      </IntlProvider>
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  installBridge();
});

describe('export', () => {
  it('seals the history and reports where it was saved', async () => {
    const bridge = installBridge();
    renderSettings();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('export-passphrase'), 'correct horse');
    await user.type(screen.getByTestId('export-confirm'), 'correct horse');
    await user.click(screen.getByTestId('export-submit'));

    expect(bridge.exportHistory).toHaveBeenCalledWith('correct horse');
    expect(await screen.findByTestId('export-success')).toHaveTextContent('/home/me/chat.digchat');
  });

  it('refuses to export when the two passphrases differ, without calling the bridge', async () => {
    const bridge = installBridge();
    renderSettings();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('export-passphrase'), 'one thing');
    await user.type(screen.getByTestId('export-confirm'), 'another thing');
    await user.click(screen.getByTestId('export-submit'));

    expect(await screen.findByTestId('export-mismatch')).toBeInTheDocument();
    expect(bridge.exportHistory).not.toHaveBeenCalled();
  });
});

describe('import', () => {
  it('reports how many messages were added', async () => {
    installBridge({ importHistory: vi.fn(async () => ({ added: 2, total: 5 })) });
    renderSettings();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('import-passphrase'), 'correct horse');
    await user.click(screen.getByTestId('import-submit'));

    expect(await screen.findByTestId('import-success')).toHaveTextContent('2');
  });

  it('surfaces a wrong-passphrase failure with its specific message', async () => {
    installBridge({
      importHistory: vi.fn(async () => {
        throw new Error('error.archiveDecrypt: wrong');
      }),
    });
    renderSettings();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('import-passphrase'), 'wrong');
    await user.click(screen.getByTestId('import-submit'));

    expect(await screen.findByTestId('import-error')).toHaveTextContent(
      'did not open the file',
    );
  });

  it('surfaces a not-an-archive failure distinctly', async () => {
    installBridge({
      importHistory: vi.fn(async () => {
        throw new Error('error.archiveFormat: nope');
      }),
    });
    renderSettings();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('import-passphrase'), 'anything');
    await user.click(screen.getByTestId('import-submit'));

    expect(await screen.findByTestId('import-error')).toHaveTextContent(
      'not a DIG Chat history file',
    );
  });
});

describe('retention', () => {
  it('enables retention and persists the day count', async () => {
    const bridge = installBridge();
    renderSettings();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('retention-enable'));
    const days = screen.getByTestId('retention-days');
    await user.clear(days);
    await user.type(days, '30');

    await waitFor(() => expect(bridge.setRetention).toHaveBeenCalledWith(30));
  });

  it('reflects a persisted window on load', async () => {
    installBridge({ getRetention: vi.fn(async () => 14) });
    renderSettings();
    await waitFor(() =>
      expect(screen.getByTestId('retention-days')).toHaveValue(14),
    );
  });
});

describe('danger zone', () => {
  it('clears a single conversation only after a confirm', async () => {
    const bridge = installBridge();
    renderSettings({ messages: [message({ peerDid: 'did:chia:bob' })] });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('clear-conversation'));
    // The action has NOT fired yet — a confirm stands between the click and the delete.
    expect(bridge.clearConversation).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByTestId('confirm-yes'));
    expect(bridge.clearConversation).toHaveBeenCalledWith('did:chia:bob');
  });

  it('lets the user back out of a destructive confirm', async () => {
    const bridge = installBridge();
    renderSettings({ messages: [message({ peerDid: 'did:chia:bob' })] });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('clear-all'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByTestId('confirm-no'));

    expect(bridge.clearAllHistory).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('clears all history after a confirm', async () => {
    const bridge = installBridge();
    renderSettings({ messages: [message()] });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('clear-all'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByTestId('confirm-yes'));

    expect(bridge.clearAllHistory).toHaveBeenCalled();
  });
});
