import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleSelector } from '../../src/renderer/components/LocaleSelector';
import { messagesFor } from '../../src/renderer/i18n/catalog';
import { createAppStore } from '../../src/renderer/store';
import { SUPPORTED_LOCALES } from '../../src/shared/locales';
import type { DigChatApi } from '../../src/preload/index';

/**
 * The language control. The behaviour that matters: it lists every supported language by its native
 * name, and changing it both re-localizes the UI and persists the choice through the bridge — the
 * value the store adopts is the one the MAIN process returns, never the raw request.
 */

function installBridge(over: Partial<DigChatApi> = {}): DigChatApi {
  const api = {
    getLocale: vi.fn(async () => null),
    setLocale: vi.fn(async (locale: string) => locale),
    ...over,
  } as unknown as DigChatApi;
  window.digChat = api;
  return api;
}

function renderSelector() {
  const store = createAppStore();
  render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={messagesFor('en')}>
        <LocaleSelector />
      </IntlProvider>
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  installBridge();
});

describe('the locale selector', () => {
  it('offers every supported language by its endonym', () => {
    renderSelector();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(SUPPORTED_LOCALES.length);
    for (const entry of SUPPORTED_LOCALES) {
      expect(screen.getByRole('option', { name: entry.endonym })).toBeInTheDocument();
    }
  });

  it('has an accessible name so a screen reader announces its purpose', () => {
    renderSelector();
    // "Language" is the English label; the control carries it as an aria-label.
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
  });

  it('starts on the store locale', () => {
    renderSelector();
    expect(screen.getByTestId('locale-select')).toHaveValue('en');
  });

  it('persists a change through the bridge and adopts the accepted locale', async () => {
    const api = installBridge();
    const store = renderSelector();

    await userEvent.selectOptions(screen.getByTestId('locale-select'), 'de');

    await waitFor(() => expect(api.setLocale).toHaveBeenCalledWith('de'));
    await waitFor(() => expect(store.getState().ui.locale).toBe('de'));
    expect(screen.getByTestId('locale-select')).toHaveValue('de');
  });
});
