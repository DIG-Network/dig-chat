/**
 * Where the pairing credential lives at rest.
 *
 * # The credential is not a preference
 *
 * The channel secret authenticates every frame dig-chat sends to the DIG App. Anything that can read
 * it can speak on the channel as dig-chat, under a pairing the user approved. So it gets treated the
 * way a credential is treated and not the way a settings file is:
 *
 * - **Encrypted at rest** through Electron's `safeStorage`, which is the OS keychain on macOS, DPAPI
 *   on Windows, and the desktop keyring on Linux. When the OS offers no backend, dig-chat REFUSES to
 *   store the credential rather than writing it in the clear — the user re-pairs on next launch,
 *   which is a small cost against a plaintext secret sitting in a home directory.
 * - **Written 0600**, and the containing directory 0700, so "encrypted" is not the only thing
 *   standing between the file and another account on the machine.
 * - **Never logged.** {@link PairingCredential} has no `toJSON`, and nothing in this module formats it.
 * - **Never sent to the renderer.** The renderer is told whether a pairing EXISTS; it is never given
 *   the secret, because a renderer that holds a credential is one content-injection away from
 *   leaking it.
 */

import { constants } from 'node:fs';
import { mkdir, chmod, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { PairingCredential } from '../pairing/client';

/** The file name inside the app's userData directory. */
export const CREDENTIAL_FILE = 'pairing.sealed';

/** The at-rest encryption seam — Electron's `safeStorage`, or a double in tests. */
export interface SecretSealer {
  /** Whether the OS offers a real encryption backend right now. */
  isEncryptionAvailable(): boolean;
  encryptString(plaintext: string): Buffer;
  decryptString(ciphertext: Buffer): string;
}

/** Thrown when the credential cannot be stored safely. Storing it UNSAFELY is not the alternative. */
export class CredentialStorageUnavailableError extends Error {
  readonly messageId = 'error.credentialStorageUnavailable';

  constructor() {
    super('this system offers no OS-backed encryption for storing the pairing credential');
    this.name = 'CredentialStorageUnavailableError';
  }
}

/** The at-rest form. A version tag so a later format change can be read rather than guessed at. */
interface StoredCredential {
  v: 1;
  pairingId: string;
  channelTokenB64: string;
  grantedCapabilities: string[];
  pairedAt: number;
}

/** Reads and writes the sealed pairing credential. */
export class CredentialStore {
  private readonly path: string;

  constructor(
    userDataDir: string,
    private readonly sealer: SecretSealer,
  ) {
    this.path = join(userDataDir, CREDENTIAL_FILE);
  }

  /**
   * Persist `credential`, replacing whatever was there.
   *
   * @throws {CredentialStorageUnavailableError} when the OS has no encryption backend. Deliberately
   * a hard failure: the caller reports "pairing could not be saved on this system" and the user
   * pairs again next launch, rather than dig-chat writing the secret in the clear and never
   * mentioning it.
   */
  async save(credential: PairingCredential): Promise<void> {
    if (!this.sealer.isEncryptionAvailable()) throw new CredentialStorageUnavailableError();

    const stored: StoredCredential = {
      v: 1,
      pairingId: credential.pairingId,
      channelTokenB64: credential.channelTokenB64,
      grantedCapabilities: [...credential.grantedCapabilities],
      pairedAt: credential.pairedAt,
    };
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    // Write to a sibling temp file then rename: rename is atomic on the same filesystem, so a reader
    // sees either the whole old credential or the whole new one, never a torn write — the same
    // discipline {@link HistoryStore.save} uses.
    const temp = `${this.path}.tmp`;
    await writeFile(temp, this.sealer.encryptString(JSON.stringify(stored)), {
      mode: 0o600,
      flag: 'w',
    });
    await chmod(temp, 0o600).catch(() => undefined);
    await rename(temp, this.path);
    // Re-applied explicitly: `mode` on `writeFile` is masked by the process umask and is ignored
    // outright when the file already exists, so the first save could be 0600 and a later one 0644.
    await chmod(this.path, 0o600).catch(() => undefined);
  }

  /**
   * Load the stored credential, or `null` when there is none.
   *
   * Returns `null` — never throws — for a missing, unreadable, undecryptable or malformed file. All
   * of those mean the same thing to the app: there is no usable pairing, so ask the user for a code.
   * A corrupt credential file must not be a launch failure.
   */
  async load(): Promise<PairingCredential | null> {
    let sealed: Buffer;
    try {
      sealed = await readFile(this.path);
    } catch {
      return null;
    }
    if (!this.sealer.isEncryptionAvailable()) return null;

    try {
      const stored = JSON.parse(this.sealer.decryptString(sealed)) as Partial<StoredCredential>;
      if (
        stored.v !== 1 ||
        typeof stored.pairingId !== 'string' ||
        typeof stored.channelTokenB64 !== 'string' ||
        typeof stored.pairedAt !== 'number'
      ) {
        return null;
      }
      return {
        pairingId: stored.pairingId,
        channelTokenB64: stored.channelTokenB64,
        grantedCapabilities: Array.isArray(stored.grantedCapabilities)
          ? stored.grantedCapabilities.filter((entry): entry is string => typeof entry === 'string')
          : [],
        pairedAt: stored.pairedAt,
      };
    } catch {
      return null;
    }
  }

  /** Forget the pairing. Idempotent — unpairing something already gone is a success. */
  async clear(): Promise<void> {
    await rm(this.path, { force: true });
  }

  /** Whether a credential file exists, without decrypting it. */
  async exists(): Promise<boolean> {
    try {
      const { access } = await import('node:fs/promises');
      await access(this.path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
