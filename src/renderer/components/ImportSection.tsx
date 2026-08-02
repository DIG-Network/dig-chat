import { useState, type FormEvent } from 'react';
import { FormattedMessage } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { importHistory, type AppDispatch, type RootState } from '../store';

/**
 * Import a passphrase-sealed archive and merge it into the current history.
 *
 * Success and failure are BOTH shown here rather than only through the app-wide error banner, because
 * the outcome the user needs is specific: "added N messages", or exactly which of the three archive
 * failures happened (wrong passphrase / not an archive / newer version). The reducer already maps a
 * rejection to its `error.archive*` id; this component reads that id off the settled action so the
 * message sits next to the control that produced it.
 */
export function ImportSection(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector((state: RootState) => state.ui.busy);
  const [passphrase, setPassphrase] = useState('');
  const [added, setAdded] = useState<{ added: number; total: number } | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const importing = busy === 'importing';
  const canSubmit = passphrase.length > 0 && !importing;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setAdded(null);
    setErrorId(null);
    const action = await dispatch(importHistory(passphrase));
    if (importHistory.fulfilled.match(action)) {
      setAdded(action.payload.result);
      setPassphrase('');
    } else {
      setErrorId((action.payload as string | undefined) ?? 'error.unknown');
    }
  }

  return (
    <section className="settings-section" aria-labelledby="import-heading">
      <h2 id="import-heading">
        <FormattedMessage id="settings.import.heading" />
      </h2>
      <p>
        <FormattedMessage id="settings.import.body" />
      </p>

      <form onSubmit={submit} noValidate>
        <label htmlFor="import-passphrase">
          <FormattedMessage id="settings.import.passphraseLabel" />
        </label>
        <input
          id="import-passphrase"
          data-testid="import-passphrase"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          autoComplete="off"
        />

        <button type="submit" disabled={!canSubmit} data-testid="import-submit">
          <FormattedMessage id={importing ? 'settings.import.importing' : 'settings.import.submit'} />
        </button>
      </form>

      {added && (
        <p className="notice" role="status" data-testid="import-success">
          <FormattedMessage
            id="settings.import.success"
            values={{ added: added.added, total: added.total }}
          />
        </p>
      )}
      {errorId && (
        <p className="problem" role="alert" data-testid="import-error">
          <FormattedMessage id={errorId} />
        </p>
      )}
    </section>
  );
}
