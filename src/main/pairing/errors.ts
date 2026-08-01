/**
 * The error vocabulary of the dig-app loopback channel, and — the point of this file — the sentence
 * dig-chat shows a person for each one.
 *
 * # Why a translation table rather than the wire string
 *
 * `CAP_NOT_GRANTED` is a true and useless thing to put in front of a user. Every code here is
 * mapped to a specific, actionable message id, because the difference between "your DIG App does not
 * support chat yet" and "you typed the code wrong" is the difference between a person who knows
 * what to do next and a person who tries the same thing again.
 *
 * # What dig-chat may NOT claim to know
 *
 * dig-app deliberately collapses every pairing-code failure — no code outstanding, expired, wrong,
 * budget exhausted — into ONE `PAIR_CODE_REJECTED`. That is an anti-oracle measure: distinguishing
 * them would tell a local process racing to redeem someone else's code whether a human is mid-pairing.
 * dig-chat therefore CANNOT say which of those happened, and does not pretend to: it names expiry as
 * the most likely cause and says what to do. The one case it CAN name exactly is a code that never
 * reached the wire because it was not eight symbols (see `./code`), and that case is reported
 * precisely.
 */

/** Symbols dig-app puts in the JSON-RPC error `message` (dig-app `SignErrorCode::symbol`). */
export type WireErrorSymbol =
  | 'AUTH_REQUIRED'
  | 'AUTH_BAD_MAC'
  | 'AUTH_REPLAY'
  | 'PAIR_DENIED'
  | 'PAIR_TIMEOUT'
  | 'PAIR_CODE_REJECTED'
  | 'CONNECT_REQUIRED'
  | 'CONNECT_DENIED'
  | 'CONNECT_TIMEOUT'
  | 'SIGN_DENIED'
  | 'SIGN_TIMEOUT'
  | 'SIGN_UNKNOWN_TYPE'
  | 'SIGN_BAD_PAYLOAD'
  | 'SIGN_NO_CONFIRMER'
  | 'LOCKED'
  | 'CAP_NOT_GRANTED';

/** The JSON-RPC "method not found" code, which is what an un-implemented `identity.*` call returns. */
export const METHOD_NOT_FOUND = -32601;

/**
 * A failure returned BY dig-app, as opposed to a failure reaching it.
 *
 * Carries the wire symbol so the caller can branch on the specific case (notably `CAP_NOT_GRANTED`
 * and `METHOD_NOT_FOUND`, which together mean "this DIG App cannot do chat yet") and a message id
 * the UI resolves through react-intl.
 */
export class ChannelError extends Error {
  /** The `message` string dig-app sent, when it was one this build knows. */
  readonly symbol: WireErrorSymbol | 'METHOD_NOT_FOUND' | 'UNKNOWN';
  /** The numeric JSON-RPC code, kept verbatim for the log. */
  readonly code: number;
  /** The react-intl id of the sentence to show a person. */
  readonly messageId: string;

  constructor(
    symbol: WireErrorSymbol | 'METHOD_NOT_FOUND' | 'UNKNOWN',
    code: number,
    messageId: string,
  ) {
    super(`${symbol} (${code})`);
    this.name = 'ChannelError';
    this.symbol = symbol;
    this.code = code;
    this.messageId = messageId;
  }
}

/** Raised when the channel itself could not be used — dig-app not running, socket dropped, timeout. */
export class ChannelUnreachableError extends Error {
  readonly messageId = 'error.appUnreachable';

  constructor(cause?: unknown) {
    super('the DIG App identity channel could not be reached');
    this.name = 'ChannelUnreachableError';
    this.cause = cause;
  }
}

/** The message id for each wire symbol. */
const MESSAGE_IDS: Record<WireErrorSymbol | 'METHOD_NOT_FOUND' | 'UNKNOWN', string> = {
  AUTH_REQUIRED: 'error.authRequired',
  AUTH_BAD_MAC: 'error.authBadMac',
  AUTH_REPLAY: 'error.authReplay',
  PAIR_DENIED: 'error.pairDenied',
  PAIR_TIMEOUT: 'error.pairTimeout',
  PAIR_CODE_REJECTED: 'error.pairCodeRejected',
  CONNECT_REQUIRED: 'error.connectRequired',
  CONNECT_DENIED: 'error.connectDenied',
  CONNECT_TIMEOUT: 'error.connectTimeout',
  SIGN_DENIED: 'error.signDenied',
  SIGN_TIMEOUT: 'error.signTimeout',
  SIGN_UNKNOWN_TYPE: 'error.signUnknownType',
  SIGN_BAD_PAYLOAD: 'error.signBadPayload',
  SIGN_NO_CONFIRMER: 'error.signNoConfirmer',
  LOCKED: 'error.locked',
  CAP_NOT_GRANTED: 'error.capNotGranted',
  METHOD_NOT_FOUND: 'error.identityUnsupported',
  UNKNOWN: 'error.unknown',
};

const KNOWN_SYMBOLS = new Set(Object.keys(MESSAGE_IDS));

/**
 * Turn a JSON-RPC error object into a typed {@link ChannelError}.
 *
 * The `message` field is dig-app-supplied and is matched against a CLOSED set before it is used —
 * an unrecognised string becomes `UNKNOWN` and is never used to select or build a display sentence.
 * It reaches the UI only as a message id, so a hostile or garbled value cannot become text on the
 * screen.
 */
export function toChannelError(error: { code?: unknown; message?: unknown }): ChannelError {
  const code = typeof error.code === 'number' ? error.code : 0;
  const raw = typeof error.message === 'string' ? error.message : '';
  const symbol =
    code === METHOD_NOT_FOUND
      ? 'METHOD_NOT_FOUND'
      : KNOWN_SYMBOLS.has(raw) && raw !== 'UNKNOWN'
        ? (raw as WireErrorSymbol)
        : 'UNKNOWN';
  return new ChannelError(symbol, code, MESSAGE_IDS[symbol]);
}

/**
 * Whether this failure means "the DIG App on this machine cannot do chat yet" — as opposed to
 * something the user can fix.
 *
 * Two wire outcomes mean it, and they are NOT the same shape of gap:
 *
 * - `METHOD_NOT_FOUND` — the running DIG App has no `identity.*` handler at all (the state of every
 *   shipped build as of dig-app 5.4.0).
 * - `CAP_NOT_GRANTED` — the handler exists, but this pairing was not granted the identity capability.
 */
export function meansIdentityCapabilityMissing(error: unknown): boolean {
  return (
    error instanceof ChannelError &&
    (error.symbol === 'METHOD_NOT_FOUND' || error.symbol === 'CAP_NOT_GRANTED')
  );
}
