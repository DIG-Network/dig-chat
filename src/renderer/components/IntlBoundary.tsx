import { useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import { useSelector } from 'react-redux';

import { messagesFor } from '../i18n/catalog';
import { DEFAULT_LOCALE } from '../../shared/locales';
import type { RootState } from '../store';

/**
 * Wraps the app in the `IntlProvider` for the locale currently in the store.
 *
 * This is a separate component rather than a fixed provider in the entry point for one reason: the
 * locale is state that the selector changes at runtime, so the provider has to RE-RENDER when it
 * does. Reading `state.ui.locale` here means a `changeLocale` dispatch re-localizes the whole tree
 * with no reload — the selector, every screen, every error message — from one place.
 *
 * English is always the `defaultLocale`, so any id a translated catalog somehow lacked falls back to
 * its English string rather than rendering the raw id.
 */
export function IntlBoundary({ children }: { children: React.ReactNode }): JSX.Element {
  const locale = useSelector((state: RootState) => state.ui.locale);

  // Keep the document's language in step with the UI locale. `index.html` ships `lang="en"`; without
  // this a screen reader would announce a translated page in English (failing WCAG 3.1.1 / 3.1.2).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider locale={locale} defaultLocale={DEFAULT_LOCALE} messages={messagesFor(locale)}>
      {children}
    </IntlProvider>
  );
}
