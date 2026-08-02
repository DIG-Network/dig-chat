import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { SUPPORTED_LOCALES } from '../../shared/locales';
import { changeLocale, type AppDispatch, type RootState } from '../store';

/**
 * The language control: pick any of the supported locales; the choice is applied immediately and
 * persisted by the main process across restarts.
 *
 * # Why a native `<select>`
 *
 * A native select is keyboard-operable, screen-reader-announced, and mobile-friendly for free —
 * `professional-ui`'s "reuse the platform before inventing" rule applied to what is a plain choice
 * of one option from a short list. Each option is labelled with the language's ENDONYM (its name in
 * its own script), so a user who cannot read the current UI language can still find their own.
 *
 * The visible control needs its own accessible name — the surrounding heading is not programmatically
 * associated — so the `<select>` carries an `aria-label`, itself localized.
 */
export function LocaleSelector(): JSX.Element {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const locale = useSelector((state: RootState) => state.ui.locale);

  return (
    <select
      className="locale-selector"
      data-testid="locale-select"
      aria-label={intl.formatMessage({ id: 'locale.label' })}
      value={locale}
      onChange={(event) => void dispatch(changeLocale(event.target.value))}
    >
      {SUPPORTED_LOCALES.map((entry) => (
        <option key={entry.code} value={entry.code}>
          {entry.endonym}
        </option>
      ))}
    </select>
  );
}
