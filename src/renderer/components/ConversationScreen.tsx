import { useState, type FormEvent } from 'react';
import { FormattedMessage } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { sendMessage, type AppDispatch, type RootState } from '../store';

/**
 * The conversation: the log, and the box to add to it.
 *
 * # Peer text reaches this component as text, and only as text
 *
 * Every DID and body here was chosen by someone else. They are interpolated as JSX CHILDREN, which
 * React escapes; there is no `dangerouslySetInnerHTML` in this app and no path that builds markup
 * from a string. They have also already been neutralised in the main process, so the control
 * characters that would break a log line are gone before they arrive. Two layers, because the
 * failure modes are different: React handles markup, the main process handles logs, and neither
 * covers the other.
 */
export function ConversationScreen(): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.ui.messages);
  const busy = useSelector((state: RootState) => state.ui.busy);
  const did = useSelector((state: RootState) => state.ui.status?.did ?? null);

  const [recipient, setRecipient] = useState(did ?? '');
  const [body, setBody] = useState('');
  const sending = busy === 'sending';

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (body.trim().length === 0) return;
    void dispatch(sendMessage({ recipientDid: recipient, body })).then(() => setBody(''));
  }

  return (
    <section className="screen" aria-labelledby="chat-heading">
      <h1 id="chat-heading">
        <FormattedMessage id="chat.heading" />
      </h1>

      {messages.length === 0 ? (
        <p className="empty" data-testid="chat-empty">
          <FormattedMessage id="chat.empty" />
        </p>
      ) : (
        <ol className="messages" data-testid="chat-messages">
          {messages.map((message) => (
            <li key={message.id} className={`message message--${message.direction}`}>
              <span className="message__peer">
                <FormattedMessage
                  id={message.direction === 'sent' ? 'chat.to' : 'chat.from'}
                  values={{ did: message.peerDid }}
                />
              </span>
              <span className="message__body">{message.body}</span>
              <time dateTime={new Date(message.at).toISOString()}>
                {new Date(message.at).toLocaleTimeString()}
              </time>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submit} noValidate>
        <label htmlFor="recipient">
          <FormattedMessage id="chat.recipientLabel" />
        </label>
        <input
          id="recipient"
          data-testid="recipient"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          aria-describedby="recipient-hint"
          spellCheck={false}
          autoComplete="off"
        />
        <p id="recipient-hint" className="hint">
          <FormattedMessage id="chat.recipientHint" />
        </p>

        <label htmlFor="body">
          <FormattedMessage id="chat.bodyLabel" />
        </label>
        <textarea
          id="body"
          data-testid="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          disabled={sending}
        />

        <button type="submit" disabled={sending || body.trim().length === 0} data-testid="send">
          <FormattedMessage id={sending ? 'chat.sending' : 'chat.send'} />
        </button>
      </form>
    </section>
  );
}
