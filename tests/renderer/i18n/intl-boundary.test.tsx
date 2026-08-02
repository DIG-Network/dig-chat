import { act, render, screen } from '@testing-library/react';
import { FormattedMessage } from 'react-intl';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import { IntlBoundary } from '../../../src/renderer/components/IntlBoundary';
import { changeLocale, createAppStore, type AppStore } from '../../../src/renderer/store';
import { de } from '../../../src/renderer/i18n/de';
import { en } from '../../../src/renderer/i18n/en';
import type { DigChatApi } from '../../../src/preload/index';

/**
 * IntlBoundary re-localizes the WHOLE tree from `state.ui.locale` with no reload (its reason for
 * existing). This proves it: a `FormattedMessage` renders the English string, a `changeLocale`
 * dispatch flips the store's locale, and the SAME message re-renders in the new language — the
 * provider re-mounts its messages because the boundary reads the locale from the store on every
 * render. If the boundary ever pinned the locale at mount, the second assertion would fail.
 */

/** The tagline is a plain, non-placeholder string that differs across en/de — an unambiguous probe. */
const TAGLINE_ID = 'app.tagline';

/**
 * `changeLocale` is a thunk that asks the main process (over the bridge) what locale actually took
 * effect and adopts its answer. The double echoes the request back, which is what a supported code
 * yields, so the dispatch drives the reducer exactly as production does.
 */
function installBridge(): void {
  window.digChat = {
    setLocale: vi.fn(async (locale: string) => locale),
  } as unknown as DigChatApi;
}

function renderBoundary(store: AppStore) {
  render(
    <Provider store={store}>
      <IntlBoundary>
        <FormattedMessage id={TAGLINE_ID} />
      </IntlBoundary>
    </Provider>,
  );
}

describe('IntlBoundary re-localizes the tree when the store locale changes', () => {
  it('renders English first, then German after a changeLocale dispatch — no reload', async () => {
    installBridge();
    const store = createAppStore({ locale: 'en' });
    renderBoundary(store);

    expect(screen.getByText(en[TAGLINE_ID])).toBeInTheDocument();

    await act(async () => {
      await store.dispatch(changeLocale('de'));
    });

    expect(screen.getByText(de[TAGLINE_ID])).toBeInTheDocument();
    expect(screen.queryByText(en[TAGLINE_ID])).not.toBeInTheDocument();
  });
});
