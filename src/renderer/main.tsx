/**
 * The renderer entry point. Mount the app inside the intl and store providers, and nothing else —
 * every decision worth testing lives in a module this file merely wires together.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { App } from './components/App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IntlBoundary } from './components/IntlBoundary';
import { createAppStore } from './store';
import { publishAppVersion } from './version';
import './styles.css';

publishAppVersion();

// The locale is resolved asynchronously from the persisted choice / browser preference (App dispatches
// `initLocale` on mount) and lives in the store, so the provider that consumes it is `IntlBoundary`
// inside the store — not a fixed locale computed here.
const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <Provider store={createAppStore()}>
        <IntlBoundary>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </IntlBoundary>
      </Provider>
    </StrictMode>,
  );
}
