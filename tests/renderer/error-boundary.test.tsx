import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '../../src/renderer/components/ErrorBoundary';
import { messagesFor } from '../../src/renderer/i18n/catalog';

/**
 * The renderer's last line of defence. A child that throws during render must yield a localized
 * apology, not a white screen — and the offered reload must actually reload.
 */

function Boom(): JSX.Element {
  throw new Error('render exploded');
}

function renderBoundary(children: JSX.Element) {
  render(
    <IntlProvider locale="en" messages={messagesFor('en')}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </IntlProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    renderBoundary(<p data-testid="child">all good</p>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
  });

  it('shows a localized fallback when a child throws', () => {
    // React logs the caught error to console.error; silence it so the caught throw is not mistaken
    // for a test failure.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderBoundary(<Boom />);
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText(/hit a problem/i)).toBeInTheDocument();
  });

  it('reloads when the reload button is pressed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      configurable: true,
    });
    renderBoundary(<Boom />);

    await userEvent.click(screen.getByTestId('error-boundary-reload'));
    expect(reload).toHaveBeenCalled();
  });
});
