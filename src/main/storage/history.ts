/**
 * Where decrypted message history lives at rest — the decision `SPEC.md` §6 had left open.
 *
 * # History is a secret, and is stored like one
 *
 * A message body is plaintext that a peer sealed to this user's identity: the whole point of the
 * envelope (§4) is that only they can read it. Persisting that plaintext to disk would undo it unless
 * the file itself is protected, so history is treated exactly the way the pairing credential is
 * (`./credentials`) and not the way a settings file is:
 *
 * - **Encrypted at rest** through Electron's `safeStorage` (Keychain / DPAPI / desktop keyring). When
 *   the OS offers no backend, dig-chat REFUSES to write history rather than leaving decrypted chat in
 *   a home directory — the caller then runs the session in memory only and tells the user so.
 * - **Written 0600**, in a directory 0700, and **written atomically** (temp file + rename) so a crash
 *   mid-write can never leave a half-seal that reads as corruption on next launch.
 * - **Bounded** (`boundHistory`) so the sealed blob cannot grow without limit.
 * - **Main-process only.** Nothing here crosses to the renderer; the renderer is told only that
 *   history changed, never handed the file or the key.
 *
 * This encrypts history at rest through the OS keystore — the same interim measure §5.2 uses for the
 * credential — and stores it under `userData`. It is a step toward, but does NOT yet fully satisfy,
 * the ecosystem at-rest contract: NC-2 requires sealing to the user's IDENTITY KEYPAIR (dig-keystore
 * DIGOP1), which binds the ciphertext to the DID rather than to this OS user/machine and so survives a
 * profile restore. dig-chat holds no identity key — it lives behind the paired DIG App — so
 * keypair-sealed at-rest is pending a DIG App data-seal capability, tracked as dig_ecosystem#2004.
 */

import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ChatMessage } from '../chat/conversation';
import { boundHistory } from '../chat/conversation';
import { sanitizeIdentifier, sanitizePeerText } from '../chat/peer-text';
import { isStoredMessage } from '../chat/stored-message';
import type { SecretSealer } from './credentials';

/** The file name inside the app's userData directory. */
export const HISTORY_FILE = 'history.enc';

/** The at-rest form. A version tag so a later format change is read rather than guessed at. */
interface StoredHistory {
  v: 1;
  messages: ChatMessage[];
}

/**
 * Reads and writes the sealed message history.
 *
 * Save is a hard failure when the OS has no encryption backend — the caller degrades to in-memory
 * only; it never falls back to plaintext. Load is total: any missing, unreadable, undecryptable or
 * malformed file yields an empty history, because none of those is worth failing a launch over.
 */
export class HistoryStore {
  private readonly path: string;

  constructor(
    userDataDir: string,
    private readonly sealer: SecretSealer,
  ) {
    this.path = join(userDataDir, HISTORY_FILE);
  }

  /** Whether history CAN be persisted right now — false means the session runs in memory only. */
  isAvailable(): boolean {
    return this.sealer.isEncryptionAvailable();
  }

  /**
   * Persist `messages`, bounded and sealed, replacing whatever was there.
   *
   * @throws {HistoryStorageUnavailableError} when the OS has no encryption backend. Deliberately a
   * hard failure so the caller runs in memory only rather than this module writing decrypted chat in
   * the clear and saying nothing.
   */
  async save(messages: readonly ChatMessage[]): Promise<void> {
    if (!this.sealer.isEncryptionAvailable()) throw new HistoryStorageUnavailableError();

    const stored: StoredHistory = { v: 1, messages: boundHistory(messages) };
    const sealed = this.sealer.encryptString(JSON.stringify(stored));

    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    // Write to a sibling temp file then rename: rename is atomic on the same filesystem, so a reader
    // sees either the whole old file or the whole new one, never a torn write.
    const temp = `${this.path}.tmp`;
    await writeFile(temp, sealed, { mode: 0o600, flag: 'w' });
    await chmod(temp, 0o600).catch(() => undefined);
    await rename(temp, this.path);
    // `writeFile`'s mode is masked by umask and ignored for an existing file, so re-assert 0600 on
    // the destination the way the credential store does.
    await chmod(this.path, 0o600).catch(() => undefined);
  }

  /**
   * Load the stored history, oldest first, or an empty array when there is none to read.
   *
   * Never throws. Every message is re-sanitised and the whole list re-bounded on the way out, so a
   * file another process tampered with cannot reintroduce raw peer bytes (§5.4) or an unbounded log.
   */
  async load(): Promise<ChatMessage[]> {
    let sealed: Buffer;
    try {
      sealed = await readFile(this.path);
    } catch {
      return [];
    }
    if (!this.sealer.isEncryptionAvailable()) return [];

    try {
      const stored = JSON.parse(this.sealer.decryptString(sealed)) as Partial<StoredHistory>;
      if (stored.v !== 1 || !Array.isArray(stored.messages)) return [];
      const clean = stored.messages.filter(isStoredMessage).map((message) => ({
        id: message.id,
        direction: message.direction,
        peerDid: sanitizeIdentifier(message.peerDid),
        body: sanitizePeerText(message.body),
        at: message.at,
      }));
      return boundHistory(clean);
    } catch {
      return [];
    }
  }

  /** Forget the stored history. Idempotent — clearing what is already gone is a success. */
  async clear(): Promise<void> {
    await rm(this.path, { force: true });
    await rm(`${this.path}.tmp`, { force: true });
  }
}

/** Thrown when history cannot be stored safely. Storing it UNSAFELY is not the alternative. */
export class HistoryStorageUnavailableError extends Error {
  readonly messageId = 'error.historyStorageUnavailable';

  constructor() {
    super('this system offers no OS-backed encryption for storing message history');
    this.name = 'HistoryStorageUnavailableError';
  }
}
