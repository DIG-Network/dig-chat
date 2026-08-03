import { useEffect, useState, type KeyboardEvent } from 'react';
import { FormattedMessage } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { changeRetention, loadRetention, type AppDispatch, type RootState } from '../store';

/** The window the toggle switches TO when it is turned on, if no other value has been chosen. */
const DEFAULT_ENABLED_DAYS = 30;

/**
 * The automatic clean-up control: keep everything (off), or forget messages older than N days.
 *
 * Retention is off by default (SPEC §5.8), so the toggle and the day field are two facets of one
 * number: zero is "off, keep everything", any positive value is "on, keep this many days". The main
 * process clamps and persists; this component reads the persisted window on mount.
 *
 * # The day field is a DRAFT, committed deliberately
 *
 * The field is local state that only writes through on blur or Enter, never on each keystroke. Writing
 * per keystroke made a half-typed value the truth for an instant — clearing the field parsed to `0`,
 * which is "off", which unmounts the very field being edited. A draft that commits on a definite
 * gesture keeps the control stable while typing, and an empty field commits nothing (keep the previous
 * window) rather than collapsing to off.
 */
export function RetentionSection(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const days = useSelector((state: RootState) => state.ui.retentionDays);
  const enabled = days > 0;
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void dispatch(loadRetention());
  }, [dispatch]);

  // Mirror the committed window into the draft so the field always shows what actually took effect —
  // after load, after the toggle turns it on, and after a commit is clamped by the main process.
  useEffect(() => {
    setDraft(days > 0 ? String(days) : '');
  }, [days]);

  function toggle(next: boolean): void {
    void dispatch(changeRetention(next ? DEFAULT_ENABLED_DAYS : 0));
  }

  function commitDays(): void {
    const parsed = Number.parseInt(draft.trim(), 10);
    // An empty or non-positive draft keeps the previous window rather than disabling retention.
    if (Number.isNaN(parsed) || parsed < 1) {
      setDraft(String(days));
      return;
    }
    void dispatch(changeRetention(parsed));
  }

  function onDaysKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDays();
    }
  }

  return (
    <section className="settings-section" aria-labelledby="retention-heading">
      <h3 id="retention-heading">
        <FormattedMessage id="settings.retention.heading" />
      </h3>
      <p>
        <FormattedMessage id="settings.retention.body" />
      </p>

      <label className="settings-toggle">
        <input
          type="checkbox"
          data-testid="retention-enable"
          checked={enabled}
          onChange={(event) => toggle(event.target.checked)}
        />
        <FormattedMessage id="settings.retention.enableLabel" />
      </label>

      {enabled && (
        <>
          <label htmlFor="retention-days">
            <FormattedMessage id="settings.retention.daysLabel" />
          </label>
          <input
            id="retention-days"
            data-testid="retention-days"
            type="number"
            min={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDays}
            onKeyDown={onDaysKeyDown}
          />
        </>
      )}
    </section>
  );
}
