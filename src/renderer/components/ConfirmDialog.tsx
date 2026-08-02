import { useEffect, useRef, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';

import type { MessageId } from '../i18n/en';

/**
 * A modal that stands between a click and a destructive action.
 *
 * # Never trap the user (professional-ui)
 *
 * Every path out is present and equal: a Cancel button, the Escape key, and a click on the backdrop
 * all dismiss without acting. The dialog is focus-managed — focus moves to the safe (cancel) control on
 * open and is trapped inside while it is up — so keyboard and assistive-technology users are never left
 * tabbing into the page behind a modal, and the DEFAULT action of pressing Enter on open is to cancel,
 * not to delete. The confirm button is the only way the destructive action fires.
 */
export function ConfirmDialog({
  heading,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  readonly heading: MessageId;
  readonly body: ReactNode;
  readonly confirmLabel: MessageId;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Land focus on the safe control, so Enter-on-open backs out rather than deletes.
  useEffect(() => cancelRef.current?.focus(), []);

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape') {
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    // Keep focus inside the modal: wrap from the last focusable to the first and back.
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel} data-testid="confirm-backdrop">
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-heading"
        onKeyDown={onKeyDown}
        // A click inside the dialog must not bubble to the backdrop's dismiss handler.
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-heading">
          <FormattedMessage id={heading} />
        </h2>
        <p>{body}</p>
        <div className="modal__actions">
          <button type="button" ref={cancelRef} onClick={onCancel} data-testid="confirm-no">
            <FormattedMessage id="settings.danger.cancel" />
          </button>
          <button
            type="button"
            className="button--danger"
            onClick={onConfirm}
            data-testid="confirm-yes"
          >
            <FormattedMessage id={confirmLabel} />
          </button>
        </div>
      </div>
    </div>
  );
}
