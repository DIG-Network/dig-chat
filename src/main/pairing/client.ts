/**
 * Pairing dig-chat with the DIG App, and speaking on the channel afterwards.
 *
 * # The direction of the flow, restated because it is easy to erode
 *
 * The DIG App mints the code and shows it to the USER; the user carries it here. dig-chat has no way
 * to ask for a code and must not acquire one — an app that could cause a pairing prompt to exist
 * could put a window in front of someone and hope for a mis-click. Everything dig-chat does starts
 * with a person typing eight symbols they were shown somewhere else.
 *
 * # The capability dig-chat asks for, and the one it must never ask for
 *
 * `sign.request` is the MONEY power and dig-chat never requests it, never calls it, and refuses to
 * carry it (see {@link REQUESTED_CAPABILITIES}). Chat needs the IDENTITY power — sealing to a
 * recipient's DID-anchored key, unsealing what was sealed to ours, and attesting which DID we are.
 * Those are named for what they do, so a second app wanting the same power asks for the same
 * capability instead of impersonating chat (dig_ecosystem#1913).
 */

import { ChannelError, ChannelUnreachableError } from './errors';
import type { Channel } from './channel';
import { CHANNEL_SECRET_LEN, fromBase64, frameMac, type JsonValue } from './frame';

/** The app id dig-chat identifies as on the channel. Not a secret and not an authenticator. */
export const APP_ID = 'net.dig.chat';

/** The display name dig-chat offers. dig-app treats it as untrusted and shows the id beside it. */
export const APP_LABEL = 'DIG Chat';

/**
 * The capability set dig-chat asks for at pairing time — the identity class, and nothing else.
 *
 * `sign.request` is deliberately absent, and its absence is asserted by a test. A future edit that
 * added it would hand a chat client the power to move money, which is the exact boundary
 * dig_ecosystem#1848 established and dig_ecosystem#1913 refused to dissolve.
 */
export const REQUESTED_CAPABILITIES = ['identity.attest', 'identity.seal', 'identity.unseal'] as const;

/** What dig-chat keeps after a successful pairing. The secret in it is a credential. */
export interface PairingCredential {
  /** The opaque pairing id echoed in every frame's `auth`. */
  readonly pairingId: string;
  /** The 32-byte channel secret, base64. NEVER logged, never sent to the renderer. */
  readonly channelTokenB64: string;
  /** The capabilities dig-app says it granted. Empty when this DIG App has no identity capability. */
  readonly grantedCapabilities: readonly string[];
  /** Unix-epoch seconds when the pairing was made — shown to the user, not used for anything. */
  readonly pairedAt: number;
}

/** dig-app's `pair.begin` result, before it is validated. */
interface PairBeginResult {
  pairing_id?: unknown;
  channel_token_b64?: unknown;
  granted_capabilities?: unknown;
  may_sign?: unknown;
}

/**
 * Redeem a pairing code and establish a credential.
 *
 * @param channel an open channel to dig-app.
 * @param codeSymbols the eight canonical symbols (see `./code`), already known to be well-formed.
 * @param now Unix-epoch seconds, passed in so the stored `pairedAt` is pinnable in tests.
 * @throws {ChannelError} `PAIR_CODE_REJECTED` (wrong, expired, used, or exhausted — dig-app does not
 * say which, on purpose), `PAIR_DENIED`, `PAIR_TIMEOUT`, or `LOCKED`.
 * @throws {ChannelUnreachableError} if the DIG App is not running or the reply was unusable.
 */
export async function pair(
  channel: Channel,
  codeSymbols: string,
  now: number,
): Promise<PairingCredential> {
  const result = (await channel.request({
    method: 'pair.begin',
    params: {
      ext_id: APP_ID,
      ext_label: APP_LABEL,
      pairing_code: codeSymbols,
      // Additive: a DIG App that predates the identity capability ignores this field and answers
      // without `granted_capabilities`, which reads below as "granted nothing".
      requested_capabilities: [...REQUESTED_CAPABILITIES],
    },
  })) as PairBeginResult | null;

  return readCredential(result, now);
}

/**
 * Validate dig-app's pairing reply into a credential.
 *
 * The reply is another process's output and is treated as untrusted: the id must be a string, the
 * token must decode to exactly 32 bytes, and the capability list must be an array of strings. A
 * reply that fails any of those is a broken channel, not a pairing — storing a malformed credential
 * would produce `AUTH_BAD_MAC` on every later frame with nothing to explain it.
 */
export function readCredential(result: PairBeginResult | null, now: number): PairingCredential {
  if (!result || typeof result !== 'object') {
    throw new ChannelUnreachableError('pair.begin returned no result');
  }
  const { pairing_id: pairingId, channel_token_b64: token } = result;
  if (typeof pairingId !== 'string' || pairingId.length === 0) {
    throw new ChannelUnreachableError('pair.begin returned no pairing id');
  }
  if (typeof token !== 'string' || fromBase64(token).length !== CHANNEL_SECRET_LEN) {
    throw new ChannelUnreachableError('pair.begin returned an unusable channel token');
  }
  return {
    pairingId,
    channelTokenB64: token,
    grantedCapabilities: readCapabilities(result.granted_capabilities),
    pairedAt: now,
  };
}

/**
 * Read the granted capability list, defaulting to EMPTY.
 *
 * Absent means "this DIG App does not know about capabilities", and the safe reading of that is that
 * it granted none — dig-chat then reports honestly that identity operations are unavailable instead
 * of calling them and failing later with a wire error the user cannot act on.
 */
function readCapabilities(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * A paired channel: every frame carries the `auth` object dig-app authenticates, with a nonce that
 * only ever increases.
 *
 * # Why the nonce is seeded from the clock
 *
 * dig-app rejects any nonce that is not STRICTLY GREATER than the last one it accepted for this
 * pairing, and it re-seeds that high-water mark from disk when it restarts. A counter that started
 * at 1 each time dig-chat launched would therefore have every frame after the first restart refused
 * as `AUTH_REPLAY`. Seeding from the epoch-millisecond clock makes the sequence monotonic across
 * restarts without dig-chat persisting anything, and `Math.max` keeps it monotonic even if the host
 * clock steps backwards mid-session.
 */
export class PairedChannel {
  private lastNonce: number;

  constructor(
    private readonly channel: Channel,
    private readonly credential: PairingCredential,
    private readonly clock: () => number = Date.now,
  ) {
    this.lastNonce = 0;
  }

  /** The capabilities this pairing holds. */
  get capabilities(): readonly string[] {
    return this.credential.grantedCapabilities;
  }

  /** Whether dig-app granted `capability` to this pairing. */
  grants(capability: string): boolean {
    return this.credential.grantedCapabilities.includes(capability);
  }

  /**
   * Call an authenticated method.
   *
   * @throws {ChannelError} with the wire symbol dig-app returned.
   * @throws {ChannelUnreachableError} if the channel dropped.
   */
  async call(method: string, params: JsonValue): Promise<JsonValue> {
    if (method === 'sign.request') {
      // Structural, not a policy check. dig-chat has no legitimate reason to reach the signing
      // oracle, and a bug or a compromised dependency that tried would be a money-moving request
      // going out under a pairing the user approved for chat.
      throw new ChannelError('CAP_NOT_GRANTED', -33050, 'error.capNotGranted');
    }
    const nonce = this.nextNonce();
    const secret = fromBase64(this.credential.channelTokenB64);
    return this.channel.request({
      method,
      params,
      auth: {
        pairing_id: this.credential.pairingId,
        nonce,
        mac_b64: frameMac(secret, nonce, method, params),
      },
    });
  }

  /** The next strictly-increasing nonce. */
  private nextNonce(): number {
    this.lastNonce = Math.max(this.lastNonce + 1, this.clock());
    return this.lastNonce;
  }
}
