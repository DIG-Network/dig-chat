import { useEffect } from 'react';
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
 * process clamps and persists; this component reads the persisted window on mount and writes every
 * change straight through, so the control always reflects what actually took effect.
 */
export function RetentionSection(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const days = useSelector((state: RootState) => state.ui.retentionDays);
  const enabled = days > 0;

  useEffect(() => {
    void dispatch(loadRetention());
  }, [dispatch]);

  function toggle(next: boolean): void {
    void dispatch(changeRetention(next ? DEFAULT_ENABLED_DAYS : 0));
  }

  function setDays(value: string): void {
    const parsed = Number.parseInt(value, 10);
    void dispatch(changeRetention(Number.isNaN(parsed) ? 0 : parsed));
  }

  return (
    <section className="settings-section" aria-labelledby="retention-heading">
      <h2 id="retention-heading">
        <FormattedMessage id="settings.retention.heading" />
      </h2>
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
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </>
      )}
    </section>
  );
}
