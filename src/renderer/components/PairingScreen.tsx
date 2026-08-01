import { useState, type FormEvent } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { parseCode, CODE_SYMBOLS } from '../../main/pairing/code';
import { pairWithCode, type AppDispatch, type RootState } from '../store';

/**
 * First run: where to get a code, and somewhere to type it.
 *
 * # Why the code is checked here before it is sent
 *
 * The DIG App destroys a code after five wrong attempts, so a typo that reaches the wire costs a
 * fifth of the user's code and tells them nothing useful in return. A local shape check turns "the
 * DIG App didn't accept that code" — which could mean four different things — into "that's 6 of 8
 * characters", which means exactly one thing and is fixable on the spot.
 *
 * What it does NOT do is guess. Once eight well-formed symbols go to the DIG App and come back
 * refused, dig-chat says the code was not accepted and names expiry as the likely cause, because the
 * DIG App deliberately does not distinguish expired from wrong from already-used, and inventing a
 * reason would be worse than naming the possibilities.
 */
export function PairingScreen(): JSX.Element {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector((state: RootState) => state.ui.busy);
  const serverErrorId = useSelector((state: RootState) => state.ui.errorId);

  const [typed, setTyped] = useState('');
  const [localProblem, setLocalProblem] = useState<{ id: string; found: number } | null>(null);

  const pairing = busy === 'pairing';

  function submit(event: FormEvent): void {
    event.preventDefault();
    const parsed = parseCode(typed);
    if (!parsed.ok) {
      setLocalProblem({
        id:
          parsed.problem === 'empty'
            ? 'pairing.problem.empty'
            : parsed.problem === 'too-short'
              ? 'pairing.problem.tooShort'
              : 'pairing.problem.tooLong',
        found: parsed.symbolsFound,
      });
      return;
    }
    setLocalProblem(null);
    void dispatch(pairWithCode(parsed.symbols));
  }

  // A local shape problem takes precedence: it is the more specific of the two, and it is the one
  // the user can act on without going back to the DIG App for another code.
  const problemId = localProblem?.id ?? serverErrorId;

  return (
    <section className="screen" aria-labelledby="pair-heading">
      <h1 id="pair-heading">
        <FormattedMessage id="state.unpaired.heading" />
      </h1>
      <p>
        <FormattedMessage id="state.unpaired.body" />
      </p>

      <ol className="steps">
        <li>
          <FormattedMessage id="state.unpaired.step1" />
        </li>
        <li>
          <FormattedMessage id="state.unpaired.step2" />
        </li>
        <li>
          <FormattedMessage id="state.unpaired.step3" />
        </li>
      </ol>

      <form onSubmit={submit} noValidate>
        <label htmlFor="pairing-code">
          <FormattedMessage id="state.unpaired.codeLabel" />
        </label>
        <input
          id="pairing-code"
          name="pairing-code"
          data-testid="pairing-code"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="ABCD-EFGH"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={CODE_SYMBOLS * 4}
          disabled={pairing}
          aria-describedby="pairing-code-hint"
          aria-invalid={problemId !== null && problemId !== undefined}
          aria-errormessage={problemId ? 'pairing-problem' : undefined}
        />
        <p id="pairing-code-hint" className="hint">
          <FormattedMessage id="state.unpaired.codeHint" />
        </p>

        <button type="submit" disabled={pairing} data-testid="pair-submit">
          <FormattedMessage id={pairing ? 'state.unpaired.pairing' : 'state.unpaired.submit'} />
        </button>
      </form>

      {problemId ? (
        <p id="pairing-problem" role="alert" className="problem" data-testid="pairing-problem">
          {intl.formatMessage({ id: problemId }, { found: localProblem?.found ?? 0 })}
        </p>
      ) : null}
    </section>
  );
}
