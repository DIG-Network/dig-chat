import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { BugReportButton } from '@dignetwork/components';

import { digChat } from '../bridge';
import type { AppInfo } from '../../main/ipc';
import type { ConnectionState } from '../../main/session';
import {
  chatChanged,
  errorDismissed,
  forgetPairing,
  initLocale,
  loadSession,
  refreshSession,
  sessionChanged,
  type AppDispatch,
  type RootState,
} from '../store';
import { ConversationScreen } from './ConversationScreen';
import { LocaleSelector } from './LocaleSelector';
import { PairingScreen } from './PairingScreen';

/**
 * The whole UI, which is one decision: which of the five session states are we in?
 *
 * # The four async states, and the fifth this app needs
 *
 * `professional-ui` asks every surface for loading / error / empty / success. dig-chat's session has
 * a fifth that none of those covers: PAIRED BUT UNREACHABLE — not loading, not an error the user
 * caused, not empty, and certainly not success. It gets its own panel and its own sentence, because
 * "your DIG App isn't running" is a different instruction from anything the other four would produce.
 *
 * There is no state in which the user is stuck: every panel offers either a retry or a way to start
 * over, and the pairing can always be forgotten.
 */
export function App(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((state: RootState) => state.ui.status);
  const errorId = useSelector((state: RootState) => state.ui.errorId);
  const appInfo = useSelector((state: RootState) => state.ui.appInfo);

  useEffect(() => {
    void dispatch(initLocale());
    void dispatch(loadSession());
    const stopSession = digChat().onSessionChanged((next) => dispatch(sessionChanged(next)));
    const stopChat = digChat().onChatChanged((messages) => dispatch(chatChanged(messages)));
    return () => {
      stopSession();
      stopChat();
    };
  }, [dispatch]);

  // `null` is the renderer not having heard yet; `checking` is the main process still probing. Both
  // render the same panel, and NEITHER renders as "you are not paired" — an unknown shown as a
  // definite negative is the mistake this app is written not to make.
  const state = status?.state ?? 'checking';

  // Before the first report, `status` is `null` and `errorId` can only come from `loadSession`
  // rejecting: the first load failed, so instead of an unrecoverable "Checking…" spinner the App
  // shows a retry panel. Its error is inside that panel, so the app-wide banner stays out of the way.
  const initialLoadFailed = status === null && errorId !== null;

  return (
    <div className="app">
      <header className="app__header">
        <LocaleSelector />
      </header>

      <TransportNotice appInfo={appInfo} />

      {initialLoadFailed ? null : <ErrorBanner errorId={errorId} />}

      <main>{initialLoadFailed ? <LoadFailed /> : <Panel state={state} />}</main>

      {state !== 'unpaired' ? (
        <footer className="app__footer">
          <button type="button" onClick={() => void dispatch(forgetPairing())} data-testid="forget">
            <FormattedMessage id="unpair.action" />
          </button>
          <p className="hint">
            <FormattedMessage id="unpair.explanation" />
          </p>
        </footer>
      ) : null}

      {appInfo ? (
        <p className="app__version" data-testid="app-version">
          <FormattedMessage id="app.version" values={{ version: appInfo.version }} />
        </p>
      ) : null}

      <BugReportButton repo="DIG-Network/dig-chat" />
    </div>
  );
}

/**
 * The standing notice that a sent message never leaves this computer, shown until a real peer-to-peer
 * transport exists. It renders nothing until the app info has arrived, so an unknown is never drawn as
 * the reassuring "it can reach other machines" absence of a notice.
 */
function TransportNotice({ appInfo }: { appInfo: AppInfo | null }): JSX.Element | null {
  if (!appInfo || appInfo.reachesOtherMachines) return null;
  return (
    <aside className="notice" role="note" data-testid="transport-notice">
      <p className="notice__title">
        <FormattedMessage id="transport.localOnly.heading" />
      </p>
      <p>
        <FormattedMessage id="transport.localOnly.body" />
      </p>
    </aside>
  );
}

/** The app-wide error banner: one dismissible message, never a trap (professional-ui). */
function ErrorBanner({ errorId }: { errorId: string | null }): JSX.Element | null {
  const dispatch = useDispatch<AppDispatch>();
  if (!errorId) return null;
  return (
    <div className="banner banner--error" role="alert" data-testid="error-banner">
      <FormattedMessage id={errorId} />
      <button type="button" onClick={() => dispatch(errorDismissed())}>
        <FormattedMessage id="error.dismiss" />
      </button>
    </div>
  );
}

/**
 * The one panel that matches the session state.
 *
 * A `switch` with no default, over an exhaustive union: adding a sixth state makes this fail to
 * compile rather than silently rendering nothing — which for a connection indicator would mean a
 * blank screen where a fact should be.
 */
function Panel({ state }: { state: ConnectionState }): JSX.Element {
  switch (state) {
    case 'checking':
      return <Checking />;
    case 'unpaired':
      return <PairingScreen />;
    case 'app-unreachable':
      return <Unreachable />;
    case 'identity-unsupported':
      return <Unsupported />;
    case 'connected':
      return <ConversationScreen />;
  }
}

/**
 * The first load never answered. It reuses the "DIG App is not running" wording because a rejected
 * `loadSession` means the bridge to the DIG App did not answer — the same fact, reached differently —
 * and its retry re-runs the load rather than leaving the user watching a spinner that cannot recover.
 */
function LoadFailed(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  // Dismiss the stale error before retrying, so a successful reload leaves no leftover banner behind;
  // a second failure sets it again through `loadSession.rejected`.
  function retry(): void {
    dispatch(errorDismissed());
    void dispatch(loadSession());
  }
  return (
    <section className="screen" data-testid="load-failed">
      <h1>
        <FormattedMessage id="state.appUnreachable.heading" />
      </h1>
      <p>
        <FormattedMessage id="state.appUnreachable.body" />
      </p>
      <button type="button" onClick={retry} data-testid="load-retry">
        <FormattedMessage id="state.appUnreachable.retry" />
      </button>
    </section>
  );
}

/** The unknown. Not a zero. */
function Checking(): JSX.Element {
  return (
    <section className="screen" aria-busy="true" data-testid="checking">
      <h1>
        <FormattedMessage id="state.checking.heading" />
      </h1>
      <p>
        <FormattedMessage id="state.checking.body" />
      </p>
    </section>
  );
}

/** Paired, but nothing answered. The DIG App is closed — the pairing is fine. */
function Unreachable(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  return (
    <section className="screen" data-testid="unreachable">
      <h1>
        <FormattedMessage id="state.appUnreachable.heading" />
      </h1>
      <p>
        <FormattedMessage id="state.appUnreachable.body" />
      </p>
      <button type="button" onClick={() => void dispatch(refreshSession())} data-testid="retry">
        <FormattedMessage id="state.appUnreachable.retry" />
      </button>
    </section>
  );
}

/** Paired and answering, but this DIG App has no identity capability. */
function Unsupported(): JSX.Element {
  return (
    <section className="screen" data-testid="unsupported">
      <h1>
        <FormattedMessage id="state.identityUnsupported.heading" />
      </h1>
      <p>
        <FormattedMessage id="state.identityUnsupported.body" />
      </p>
      <p className="hint">
        <FormattedMessage id="state.identityUnsupported.detail" />
      </p>
    </section>
  );
}
