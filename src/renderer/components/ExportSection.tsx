import { useState, type FormEvent } from 'react';
import { FormattedMessage } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { exportHistory, type AppDispatch, type RootState } from '../store';

/**
 * Export the whole history to a passphrase-sealed file.
 *
 * The passphrase is entered TWICE and the two must match before anything is sealed — a mistyped
 * passphrase on a one-way seal is unrecoverable, so the confirmation is a guard, not ceremony. The
 * match check is client-side and local to this component; only a matching passphrase ever crosses to
 * the main process, which owns the file dialog and the bytes.
 */
export function ExportSection(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector((state: RootState) => state.ui.busy);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const exporting = busy === 'exporting';
  const canSubmit = passphrase.length > 0 && !exporting;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSavedPath(null);
    if (passphrase !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const action = await dispatch(exportHistory(passphrase));
    if (exportHistory.fulfilled.match(action) && action.payload.saved) {
      setSavedPath(action.payload.path ?? '');
      setPassphrase('');
      setConfirm('');
    }
  }

  return (
    <section className="settings-section" aria-labelledby="export-heading">
      <h2 id="export-heading">
        <FormattedMessage id="settings.export.heading" />
      </h2>
      <p>
        <FormattedMessage id="settings.export.body" />
      </p>

      <form onSubmit={submit} noValidate>
        <label htmlFor="export-passphrase">
          <FormattedMessage id="settings.export.passphraseLabel" />
        </label>
        <input
          id="export-passphrase"
          data-testid="export-passphrase"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          autoComplete="new-password"
        />

        <label htmlFor="export-confirm">
          <FormattedMessage id="settings.export.confirmLabel" />
        </label>
        <input
          id="export-confirm"
          data-testid="export-confirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />

        {mismatch && (
          <p className="problem" role="alert" data-testid="export-mismatch">
            <FormattedMessage id="settings.export.mismatch" />
          </p>
        )}

        <button type="submit" disabled={!canSubmit} data-testid="export-submit">
          <FormattedMessage id={exporting ? 'settings.export.exporting' : 'settings.export.submit'} />
        </button>
      </form>

      {savedPath !== null && (
        <p className="notice" role="status" data-testid="export-success">
          <FormattedMessage id="settings.export.success" values={{ path: savedPath }} />
        </p>
      )}
    </section>
  );
}
