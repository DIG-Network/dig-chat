/**
 * The renderer entry point. Mount the app inside the intl and store providers, and nothing else —
 * every decision worth testing lives in a module this file merely wires together.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';

import { App } from './components/App';
import { messagesFor } from './i18n/en';
import { createAppStore } from './store';
import { publishAppVersion } from './version';
import './styles.css';

publishAppVersion();

const locale = navigator.language || 'en';
const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <Provider store={createAppStore()}>
        <IntlProvider locale={locale} defaultLocale="en" messages={messagesFor(locale)}>
          <App />
        </IntlProvider>
      </Provider>
    </StrictMode>,
  );
}
