import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/renderer/components/App';
import { messagesFor } from '../../src/renderer/i18n/en';
import { createAppStore, type UiState } from '../../src/renderer/store';
import type { DigChatApi } from '../../src/preload/index';
import type { SessionStatus } from '../../src/main/session';

/**
 * The shared bug-report widget is stubbed here, and the reason is a defect rather than convenience.
 *
 * `@dignetwork/components@0.2.0` patches `console.error` to capture it, and its handler calls
 * `setState`. React's dev build reports state updates through `console.error`, so ONE React warning
 * becomes warning -> capture -> setState -> warning, until the stack is gone. The app still embeds
 * the real widget (§6.7); the stub keeps that upstream loop out of this suite, and the finding is
 * reported upstream rather than absorbed silently.
 */
vi.mock('@dignetwork/components', () => ({
  BugReportButton: ({ repo }: { repo: string }) => (
    <button type="button" data-testid="bug-report" data-repo={repo}>
      Report a bug
    </button>
  ),
}));

/** The bridge double. Every test installs one; nothing here touches Electron. */
function installBridge(over: Partial<DigChatApi> = {}): DigChatApi {
  const api: DigChatApi = {
    getStatus: vi.fn(async () => unpaired),
    refresh: vi.fn(async () => unpaired),
    pair: vi.fn(async () => connected),
    forgetPairing: vi.fn(async () => unpaired),
    getHistory: vi.fn(async () => []),
    send: vi.fn(async () => ({
      id: 'sent-1',
      direction: 'sent' as const,
      peerDid: 'did:chia:bob',
      body: 'hi',
      at: 0,
    })),
    getAppInfo: vi.fn(async () => ({
      version: '0.1.0',
      reachesOtherMachines: false,
      transport: 'loopback',
    })),
    onSessionChanged: vi.fn(() => () => undefined),
    onChatChanged: vi.fn(() => () => undefined),
    ...over,
  };
  window.digChat = api;
  return api;
}

const unpaired: SessionStatus = { state: 'unpaired', did: null, pairedAt: null };
const connected: SessionStatus = { state: 'connected', did: 'did:chia:me', pairedAt: 1 };

/**
 * Render and let the mount effect settle.
 *
 * `App` dispatches `loadSession` on mount, so the store updates one microtask after render. Awaiting
 * inside `act` is what makes the assertions see a settled tree instead of racing the effect — and it
 * keeps the suite's stderr clean, which matters because a wall of act() warnings is where a REAL
 * warning goes to hide.
 */
async function renderApp(preloaded?: Partial<UiState>) {
  // The bridge answers with whatever the test set up, because `App` loads the real status on mount
  // and would otherwise immediately overwrite a preloaded one. Driving the test through the BRIDGE
  // rather than through preloaded state also exercises the path the app actually takes.
  if (preloaded?.status) {
    installBridge({
      getStatus: vi.fn(async () => preloaded.status!),
      getAppInfo: vi.fn(
        async () =>
          preloaded.appInfo ?? { version: '0.1.0', reachesOtherMachines: false, transport: 'loopback' },
      ),
      getHistory: vi.fn(async () => [...(preloaded.messages ?? [])]),
    });
  }
  const store = createAppStore(preloaded);
  await act(async () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={messagesFor('en')}>
          <App />
        </IntlProvider>
      </Provider>,
    );
  });
  return store;
}

beforeEach(() => {
  installBridge();
});

describe('the connection state is reported honestly', () => {
  it('shows CHECKING before the main process has answered — never "not paired"', async () => {
    // The load-bearing one. An unknown rendered as a definite negative would flash "pair your app"
    // at a user who is already paired, and send them to spend a code they did not need. The fixture
    // is a main process that has NOT answered yet — a promise that never settles — which is the only
    // fixture in which "we do not know" is distinguishable from any settled answer.
    installBridge({ getStatus: vi.fn(() => new Promise<SessionStatus>(() => undefined)) });
    await renderApp({ status: null });
    expect(screen.getByTestId('checking')).toBeInTheDocument();
    expect(screen.queryByTestId('pairing-code')).not.toBeInTheDocument();
  });

  it('distinguishes an unreachable DIG App from an unpaired one', async () => {
    // Two states, two different instructions: "open your DIG App" versus "pair it". A UI that
    // collapsed them would send a paired user to redo a pairing that is perfectly fine.
    await renderApp({
      status: { state: 'app-unreachable', did: null, pairedAt: 1 },
      appInfo: { version: '0.1.0', reachesOtherMachines: false, transport: 'loopback' },
    });

    expect(screen.getByTestId('unreachable')).toBeInTheDocument();
    expect(screen.getByText(/is not running/i)).toBeInTheDocument();
    expect(screen.queryByTestId('pairing-code')).not.toBeInTheDocument();
  });

  it('names the missing identity capability rather than blaming the connection', async () => {
    await renderApp({ status: { state: 'identity-unsupported', did: null, pairedAt: 1 } });
    expect(screen.getByTestId('unsupported')).toBeInTheDocument();
    expect(screen.getByText(/cannot do chat yet/i)).toBeInTheDocument();
    // …and it says what dig-chat asked for, so the gap is nameable in a bug report.
    expect(screen.getByText(/identity\.attest/)).toBeInTheDocument();
  });

  it('offers a way out of every state — no dead ends', async () => {
    // professional-ui's never-trap-the-user rule, checked rather than assumed.
    await renderApp({ status: { state: 'app-unreachable', did: null, pairedAt: 1 } });
    expect(screen.getByTestId('retry')).toBeEnabled();
    expect(screen.getByTestId('forget')).toBeEnabled();
  });
});

describe('the transport notice', () => {
  it('tells the user their messages stay on this computer', async () => {
    // The honesty requirement for the stubbed leg. A person who cannot tell whether a message left
    // the machine will assume it did.
    await renderApp({
      status: connected,
      appInfo: { version: '0.1.0', reachesOtherMachines: false, transport: 'loopback' },
    });
    expect(screen.getByTestId('transport-notice')).toHaveTextContent(/stay on this computer/i);
  });

  it('disappears once a transport can reach other machines', async () => {
    // The control. A notice hardcoded on would pass the test above while lying the day a real
    // transport lands — and nobody would notice, because the notice would still read plausibly.
    await renderApp({
      status: connected,
      appInfo: { version: '0.1.0', reachesOtherMachines: true, transport: 'peer' },
    });
    expect(screen.queryByTestId('transport-notice')).not.toBeInTheDocument();
  });
});

describe('the pairing screen', () => {
  it('says where to get a code', async () => {
    await renderApp({ status: unpaired });
    expect(screen.getByText(/Security → Pair an app/)).toBeInTheDocument();
  });

  it('refuses an incomplete code locally and says how many characters are missing', async () => {
    // Every refusal the DIG App issues costs one of five attempts, and the fifth destroys the code.
    // A local shape check turns a wasted attempt into a fixable sentence.
    await renderApp({ status: unpaired });
    const api = window.digChat!;

    await userEvent.type(screen.getByTestId('pairing-code'), 'ABC');
    await userEvent.click(screen.getByTestId('pair-submit'));

    expect(screen.getByTestId('pairing-problem')).toHaveTextContent('3 characters');
    expect(api.pair).not.toHaveBeenCalled();
  });

  it('sends a well-formed code, normalised the way the DIG App expects', async () => {
    await renderApp({ status: unpaired });
    const api = window.digChat!;

    await userEvent.type(screen.getByTestId('pairing-code'), 'abcd-efgh');
    await userEvent.click(screen.getByTestId('pair-submit'));

    await waitFor(() => expect(api.pair).toHaveBeenCalledWith('ABCDEFGH'));
  });

  it('says a refused code may have expired, without claiming to know which', async () => {
    // The DIG App collapses "expired", "wrong", "already used" and "out of attempts" into ONE
    // response on purpose — telling them apart would say whether a human is mid-pairing. dig-chat
    // must therefore not assert one of them; it names the possibilities and what to do.
    await renderApp({ status: unpaired, errorId: 'error.pairCodeRejected' });
    const banner = screen.getByTestId('error-banner');
    expect(banner).toHaveTextContent(/did not accept that code/i);
    expect(banner).toHaveTextContent(/may have expired or already been used/i);
  });

  it('says plainly when the user declined the pairing', async () => {
    await renderApp({ status: unpaired, errorId: 'error.pairDenied' });
    expect(screen.getByTestId('error-banner')).toHaveTextContent(/declined/i);
  });
});

describe('peer text on screen', () => {
  it('renders a hostile DID and body as text, never as markup', async () => {
    // React escapes children, and this asserts it holds for the two strings a stranger controls.
    // The fixture is a payload that WOULD execute if it were ever interpolated as HTML.
    await renderApp({
      status: connected,
      messages: [
        {
          id: 'received-1',
          direction: 'received',
          peerDid: 'did:chia:<img src=x onerror=alert(1)>',
          body: '<script>alert(2)</script>',
          at: 0,
        },
      ],
    });

    expect(screen.getByText(/<script>alert\(2\)<\/script>/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('the version is exposed three ways (§6.7)', () => {
  it('shows the build version on screen', async () => {
    await renderApp({
      status: connected,
      appInfo: { version: '1.2.3', reachesOtherMachines: false, transport: 'loopback' },
    });
    expect(screen.getByTestId('app-version')).toHaveTextContent('1.2.3');
  });
});
