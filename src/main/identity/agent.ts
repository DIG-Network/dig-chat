/**
 * The identity capability — dig-chat's only access to the user's DID, and the reason it needs no key
 * of its own.
 *
 * # The capability, named for what it does
 *
 * Three operations, decided on dig_ecosystem#1913 and named `identity.*` rather than `chat.*` so a
 * second app wanting the same power requests the same capability instead of impersonating chat:
 *
 * | method            | what it does                                                     |
 * |-------------------|------------------------------------------------------------------|
 * | `identity.attest` | which DID this profile is, and the X25519 key others seal to it   |
 * | `identity.seal`   | seal a plaintext to a recipient DID, returning a `DIGCHAT1` envelope |
 * | `identity.unseal` | open an envelope sealed to this profile                            |
 *
 * None of them is `sign.request`. `sign.request` is the power to move money; this is the power to
 * prove who you are and to read what was written to you. Conflating them was only ever an accident
 * of both ending in a signature.
 *
 * # Why the sealing happens in the DIG App and not here
 *
 * Because that is where the key is. dig-chat asking the DIG App to seal is the whole point of the
 * arrangement: a chat client that held identity key material would be a chat client whose compromise
 * costs the user their identity. The cost is a round trip per message, which is nothing next to what
 * it buys.
 *
 * # What is NOT true yet
 *
 * No shipped DIG App implements these methods. dig-app 5.4.0's frame router dispatches
 * `connect.request`, `connect.revoke` and `sign.request`, and answers anything else with JSON-RPC
 * `-32601`. dig-chat therefore treats "method not found" and `CAP_NOT_GRANTED` as the same
 * user-visible fact — this DIG App cannot do chat yet — and says so plainly instead of failing in a
 * way that reads like a bug in dig-chat.
 */

import type { PairedChannel } from '../pairing/client';
import { ChannelUnreachableError, meansIdentityCapabilityMissing } from '../pairing/errors';
import { EPK_LEN } from './envelope';
import { fromBase64, toBase64, type JsonValue } from '../pairing/frame';

/** The capability names dig-chat uses. */
export const IDENTITY_ATTEST = 'identity.attest';
export const IDENTITY_SEAL = 'identity.seal';
export const IDENTITY_UNSEAL = 'identity.unseal';

/** Who the user is, as the DIG App attests it. */
export interface IdentitySummary {
  /** The profile's DID. */
  readonly did: string;
  /** The X25519 public key others seal messages to. */
  readonly sealingPublicKey: Uint8Array;
  /**
   * The DIG App's signature over the sealing key, binding it to the DID.
   *
   * dig-chat stores and forwards this; it does NOT verify it. Verification needs the DID document
   * from chain, which is dig-node's job and not dig-chat's, and claiming a check that is not
   * happening would be worse than saying so. `SPEC.md` §4.4 records this as the open edge.
   */
  readonly attestationB64: string;
}

/** A message dig-chat received, once the DIG App has opened it. */
export interface OpenedMessage {
  /**
   * The DID the envelope claims sent it — an UNVERIFIED claim, not an authenticated identity.
   *
   * Under DIGCHAT1 suite 1 (a NaCl sealed box) this is bound into the AEAD's associated data for
   * transit integrity — a relay cannot re-address the envelope — but a sealed box authenticates the
   * recipient's key, not the sender's: anyone holding the recipient's published sealing key can seal
   * a message carrying any `senderDid`. Consumers MUST NOT attribute identity or trust from it; it is
   * handled as untrusted peer text (see `../chat/conversation.ts`). Sender authentication is a future
   * DIGCHAT1 suite 2 (dig_ecosystem #1940). `SPEC.md` §3.4 and §6 record this.
   */
  readonly senderDid: string;
  /** The plaintext. Untrusted text: it came from another person's keyboard. */
  readonly plaintext: Uint8Array;
}

/** Thrown when the running DIG App has no identity capability to offer. */
export class IdentityUnsupportedError extends Error {
  readonly messageId = 'error.identityUnsupported';

  constructor(
    readonly method: string,
    cause?: unknown,
  ) {
    super(`this DIG App does not offer ${method}`);
    this.name = 'IdentityUnsupportedError';
    this.cause = cause;
  }
}

/** dig-chat's access to the user's identity. A seam, so the app above it is testable without a DIG App. */
export interface IdentityAgent {
  attest(): Promise<IdentitySummary>;
  seal(recipient: IdentitySummary, plaintext: Uint8Array): Promise<Uint8Array>;
  unseal(envelope: Uint8Array): Promise<OpenedMessage>;
}

/** The production agent: every operation is a frame on the paired channel. */
export class PairedIdentityAgent implements IdentityAgent {
  constructor(private readonly channel: PairedChannel) {}

  /** Whether the pairing holds every capability chat needs. */
  get available(): boolean {
    return [IDENTITY_ATTEST, IDENTITY_SEAL, IDENTITY_UNSEAL].every((capability) =>
      this.channel.grants(capability),
    );
  }

  async attest(): Promise<IdentitySummary> {
    const result = await this.call(IDENTITY_ATTEST, {});
    const did = readString(result, 'did');
    const sealingPublicKey = readBytes(result, 'sealing_public_key_b64', EPK_LEN);
    return { did, sealingPublicKey, attestationB64: readString(result, 'attestation_b64') };
  }

  async seal(recipient: IdentitySummary, plaintext: Uint8Array): Promise<Uint8Array> {
    const result = await this.call(IDENTITY_SEAL, {
      recipient_did: recipient.did,
      recipient_sealing_public_key_b64: toBase64(recipient.sealingPublicKey),
      plaintext_b64: toBase64(plaintext),
    });
    return readBytes(result, 'envelope_b64');
  }

  async unseal(envelope: Uint8Array): Promise<OpenedMessage> {
    const result = await this.call(IDENTITY_UNSEAL, { envelope_b64: toBase64(envelope) });
    return {
      senderDid: readString(result, 'sender_did'),
      plaintext: readBytes(result, 'plaintext_b64'),
    };
  }

  /**
   * One identity frame, with the "this DIG App cannot do chat" case translated at the boundary.
   *
   * Translating HERE rather than in each caller is what keeps the distinction from being lost: every
   * call site would otherwise have to remember that two unrelated-looking wire errors mean the same
   * actionable thing.
   */
  private async call(method: string, params: JsonValue): Promise<Record<string, unknown>> {
    try {
      const result = await this.channel.call(method, params);
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new ChannelUnreachableError(`${method} returned no result object`);
      }
      return result as Record<string, unknown>;
    } catch (failure) {
      if (meansIdentityCapabilityMissing(failure)) {
        throw new IdentityUnsupportedError(method, failure);
      }
      throw failure;
    }
  }
}

/** Read a non-empty string field from an untrusted result object. */
function readString(result: Record<string, unknown>, field: string): string {
  const value = result[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new ChannelUnreachableError(`the identity reply had no usable "${field}"`);
  }
  return value;
}

/**
 * Read a base64 field as bytes, optionally checking its exact length.
 *
 * The length check matters for keys: base64 that decodes to the wrong size would be accepted by the
 * decoder and then fail much later inside a cipher, with nothing at the failure site naming the
 * cause.
 */
function readBytes(
  result: Record<string, unknown>,
  field: string,
  expectedLength?: number,
): Uint8Array {
  const encoded = result[field];
  if (typeof encoded !== 'string') {
    throw new ChannelUnreachableError(`the identity reply had no "${field}"`);
  }
  const bytes = fromBase64(encoded);
  if (bytes.length === 0) {
    throw new ChannelUnreachableError(`the identity reply's "${field}" decoded to nothing`);
  }
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new ChannelUnreachableError(
      `the identity reply's "${field}" is ${bytes.length} bytes, expected ${expectedLength}`,
    );
  }
  return bytes;
}
