import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { clearAllHistory, clearConversation, type AppDispatch, type RootState } from '../store';
import { ConfirmDialog } from './ConfirmDialog';

/** A pending destructive action, held until the user confirms or dismisses it. */
type Pending = { kind: 'conversation'; peerDid: string } | { kind: 'all' };

/**
 * The delete controls: forget one conversation, or forget everything.
 *
 * # Nothing deletes without a confirm (professional-ui)
 *
 * Deleting history is irreversible and local, so every button here opens a {@link ConfirmDialog} rather
 * than acting on the first click. The pending action is held in state until the dialog resolves; the
 * dialog itself owns the escape hatches (Cancel, Escape, backdrop). The distinct peers are derived from
 * the current message log, so the list is exactly the conversations there are something to delete for.
 */
export function HistoryDangerZone(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const messages = useSelector((state: RootState) => state.ui.messages);
  const [pending, setPending] = useState<Pending | null>(null);

  const peers = [...new Set(messages.map((message) => message.peerDid))];

  function confirm(): void {
    if (pending?.kind === 'conversation') void dispatch(clearConversation(pending.peerDid));
    if (pending?.kind === 'all') void dispatch(clearAllHistory());
    setPending(null);
  }

  return (
    <section className="settings-section settings-section--danger" aria-labelledby="danger-heading">
      <h3 id="danger-heading">
        <FormattedMessage id="settings.danger.heading" />
      </h3>
      <p>
        <FormattedMessage id="settings.danger.body" />
      </p>

      {peers.length === 0 ? (
        <p className="empty" data-testid="danger-empty">
          <FormattedMessage id="settings.danger.empty" />
        </p>
      ) : (
        <ul className="danger-list">
          {peers.map((peerDid) => (
            <li key={peerDid}>
              <button
                type="button"
                className="button--danger"
                data-testid="clear-conversation"
                aria-label={intl.formatMessage(
                  { id: 'settings.danger.clearConversation' },
                  { did: peerDid },
                )}
                onClick={() => setPending({ kind: 'conversation', peerDid })}
              >
                <FormattedMessage
                  id="settings.danger.clearConversation"
                  values={{ did: peerDid }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="button--danger"
        data-testid="clear-all"
        disabled={peers.length === 0}
        onClick={() => setPending({ kind: 'all' })}
      >
        <FormattedMessage id="settings.danger.clearAll" />
      </button>

      {pending && (
        <ConfirmDialog
          heading="settings.danger.confirmHeading"
          body={<FormattedMessage id="settings.danger.confirmBody" />}
          confirmLabel="settings.danger.confirm"
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
