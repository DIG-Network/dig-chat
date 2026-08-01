/**
 * The NORMATIVE reference implementation of the `DIGCHAT1` suite-1 seal — the executable half of
 * `SPEC.md` §3, published so a second implementation (dig-app's `identity.seal` / `identity.unseal`,
 * or a future `dig-chat-protocol` crate) has something to be checked against rather than a prose
 * description to interpret.
 *
 * # This is NOT how dig-chat encrypts your messages
 *
 * dig-chat does not hold the user's identity key and must never derive one. The production path is
 * {@link ../identity/agent.PairedIdentityAgent}, which asks the DIG App to seal and unseal because
 * the DIG App is where the key lives. This module exists for two things and no others:
 *
 * 1. Known-answer tests, so the format is pinned by vectors rather than by whichever implementation
 *    was written first.
 * 2. A conformance harness for whoever implements the other side.
 *
 * `tests/main/identity/conformance-is-not-production.test.ts` asserts that nothing under
 * `src/main` outside this file and the tests imports it. That test is the guard rail: without it,
 * "just call the reference sealer with a locally generated key" is a two-line change that would
 * quietly give dig-chat its own identity keys and defeat the entire pairing boundary.
 *
 * # The composition, and why each piece was not invented here
 *
 * Ephemeral-static X25519 → HKDF-SHA256 → XChaCha20-Poly1305. It is the NaCl sealed-box shape with
 * an explicit KDF and an AEAD whose nonce is large enough to be chosen at random without a counter.
 * Every primitive is standard and taken from `@noble/*`; nothing about the arrangement is novel,
 * which is the point (§5.4: never invent primitives).
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';

import {
  EPK_LEN,
  MAGIC,
  MAX_PLAINTEXT_BYTES,
  NONCE_LEN,
  SUITE_X25519_XCHACHA20POLY1305,
  VERSION,
  associatedData,
  decodeEnvelope,
  encodeEnvelope,
  EnvelopeError,
  type Envelope,
} from './envelope';

/** The HKDF `info` string. Domain separation: these keys are for this format and this suite only. */
export const KDF_INFO = new TextEncoder().encode('DIGCHAT1 suite1 message key');

/** The content-encryption key length, in bytes. */
const KEY_LEN = 32;

/** What a caller must supply to seal: randomness and an ephemeral key pair are derived from it. */
export interface SealInputs {
  readonly senderDid: string;
  readonly recipientDid: string;
  /** The recipient's X25519 sealing public key, as `identity.attest` publishes it. */
  readonly recipientSealingPublicKey: Uint8Array;
  readonly plaintext: Uint8Array;
  /** The sender's ephemeral X25519 secret. Supplied so known-answer vectors are reproducible. */
  readonly ephemeralSecretKey: Uint8Array;
  /** The 24-byte AEAD nonce. Supplied for the same reason. */
  readonly nonce: Uint8Array;
}

/**
 * Derive the content-encryption key for one envelope.
 *
 * The ephemeral and static public keys are mixed into the HKDF input alongside the shared secret, so
 * the key is bound to the exact pair of keys that produced it — the standard guard against an
 * attacker who can substitute one of them.
 */
export function deriveKey(
  sharedSecret: Uint8Array,
  ephemeralPublicKey: Uint8Array,
  recipientPublicKey: Uint8Array,
): Uint8Array {
  const ikm = new Uint8Array(sharedSecret.length + ephemeralPublicKey.length + recipientPublicKey.length);
  ikm.set(sharedSecret, 0);
  ikm.set(ephemeralPublicKey, sharedSecret.length);
  ikm.set(recipientPublicKey, sharedSecret.length + ephemeralPublicKey.length);
  return hkdf(sha256, ikm, MAGIC, KDF_INFO, KEY_LEN);
}

/**
 * Seal `plaintext` into a `DIGCHAT1` envelope. The reference implementation of the format.
 *
 * @throws {EnvelopeError} if the plaintext exceeds {@link MAX_PLAINTEXT_BYTES} or a key is the wrong
 * length.
 */
export function sealReference(inputs: SealInputs): Uint8Array {
  if (inputs.plaintext.length > MAX_PLAINTEXT_BYTES) {
    throw new EnvelopeError(
      `a message may carry at most ${MAX_PLAINTEXT_BYTES} bytes, got ${inputs.plaintext.length}`,
    );
  }
  if (inputs.recipientSealingPublicKey.length !== EPK_LEN) {
    throw new EnvelopeError(`the recipient sealing key must be ${EPK_LEN} bytes`);
  }
  if (inputs.nonce.length !== NONCE_LEN) {
    throw new EnvelopeError(`the nonce must be ${NONCE_LEN} bytes`);
  }

  const epk = x25519.getPublicKey(inputs.ephemeralSecretKey);
  const shared = x25519.getSharedSecret(inputs.ephemeralSecretKey, inputs.recipientSealingPublicKey);
  const key = deriveKey(shared, epk, inputs.recipientSealingPublicKey);

  const header = {
    version: VERSION,
    suite: SUITE_X25519_XCHACHA20POLY1305,
    senderDid: inputs.senderDid,
    recipientDid: inputs.recipientDid,
    epk,
  };
  const ciphertext = xchacha20poly1305(key, inputs.nonce, associatedData(header)).encrypt(
    inputs.plaintext,
  );

  return encodeEnvelope({ ...header, nonce: inputs.nonce, ciphertext });
}

/**
 * Open a `DIGCHAT1` envelope with the recipient's X25519 sealing SECRET key.
 *
 * @throws {EnvelopeError} if the bytes are not a well-formed envelope, or if the AEAD rejects them —
 * which is what a tampered header, a re-addressed message, or a wrong key all look like, and
 * deliberately look alike.
 */
export function openReference(
  envelopeBytes: Uint8Array,
  recipientSealingSecretKey: Uint8Array,
): { envelope: Envelope; plaintext: Uint8Array } {
  const envelope = decodeEnvelope(envelopeBytes);
  const recipientPublicKey = x25519.getPublicKey(recipientSealingSecretKey);
  const shared = x25519.getSharedSecret(recipientSealingSecretKey, envelope.epk);
  const key = deriveKey(shared, envelope.epk, recipientPublicKey);

  try {
    const plaintext = xchacha20poly1305(key, envelope.nonce, associatedData(envelope)).decrypt(
      envelope.ciphertext,
    );
    return { envelope, plaintext };
  } catch {
    throw new EnvelopeError('the envelope did not authenticate under this key');
  }
}
