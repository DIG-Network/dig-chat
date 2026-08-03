import { Component, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';

/**
 * The last line of defence: a render that throws anywhere below here shows an apology instead of a
 * white screen.
 *
 * React only lets a CLASS component catch a descendant's render error (there is no hook equivalent of
 * `getDerivedStateFromError`), so this is the one place in the renderer that is a class rather than a
 * function. It sits INSIDE the intl provider, so its fallback is localized like everything else; a
 * reload is offered because a thrown render is not something the user can fix in place.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  private reload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="screen" role="alert" data-testid="error-boundary">
        <h1>
          <FormattedMessage id="error.boundary.heading" />
        </h1>
        <p>
          <FormattedMessage id="error.unknown" />
        </p>
        <button type="button" onClick={this.reload} data-testid="error-boundary-reload">
          <FormattedMessage id="error.boundary.reload" />
        </button>
      </div>
    );
  }
}
