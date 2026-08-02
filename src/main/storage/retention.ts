/**
 * Where the user's retention window lives at rest.
 *
 * # A retention window is a preference, not a secret
 *
 * How many days of history to keep reveals nothing worth protecting, so — like the locale
 * (`./locale`) and unlike the credential and history — it is stored as small plain JSON under
 * `userData`, not sealed through `safeStorage`. What it shares with the secrets is the DISCIPLINE
 * around reading it back: the value on disk is untrusted (a hand-edited or corrupt file is possible),
 * so a non-number, out-of-range or malformed value is coerced to the default (0 = disabled = keep
 * everything) on load, and a set request is clamped to the allowed range before it touches disk. A bad
 * value can only ever land on "retain indefinitely", never crash the launch or evict more than asked.
 *
 * Nothing here is exposed to the renderer directly; it reaches this only through the two validated IPC
 * verbs (`retention:get` / `retention:set`), never as a file handle or a channel.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** The file name inside the app's userData directory. */
export const RETENTION_FILE = 'retention.json';

/**
 * The longest retention window the user may set, in days (ten years).
 *
 * A bound is required regardless of intent: an unbounded number of days is meaningless as a retention
 * policy and a hand-edited file could carry anything. Ten years is longer than any real "keep recent"
 * choice while still being a finite, sane clamp.
 */
export const MAX_RETENTION_DAYS = 3_650;

/** The default: retention disabled, history retained indefinitely. */
const DISABLED = 0;

/** The at-rest form. A version tag so a later format change is read rather than guessed at. */
interface StoredRetention {
  v: 1;
  maxAgeDays: number;
}

/** Reads and writes the user's retention window, in whole days. */
export class RetentionStore {
  private readonly path: string;

  constructor(userDataDir: string) {
    this.path = join(userDataDir, RETENTION_FILE);
  }

  /**
   * The persisted window in days, or 0 (disabled) when there is none to read.
   *
   * Never throws: a missing, unreadable, malformed, wrong-version, non-number or out-of-range file all
   * coerce to the default, because "retain indefinitely" is the safe fallback — it can only ever keep
   * MORE than the user asked for, never evict more.
   */
  async load(): Promise<number> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch {
      return DISABLED;
    }
    try {
      const stored = JSON.parse(raw) as Partial<StoredRetention>;
      if (stored.v !== 1) return DISABLED;
      return isAcceptable(stored.maxAgeDays) ? stored.maxAgeDays : DISABLED;
    } catch {
      return DISABLED;
    }
  }

  /**
   * Persist a retention window, clamped to a whole number of days in `[0, MAX_RETENTION_DAYS]`. Returns
   * the value actually stored, so the caller (and, through it, the renderer) always learns which window
   * took effect rather than assuming its request was honoured verbatim.
   */
  async save(days: number): Promise<number> {
    const accepted = clamp(days);
    const stored: StoredRetention = { v: 1, maxAgeDays: accepted };
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    await writeFile(this.path, JSON.stringify(stored), { mode: 0o600, flag: 'w' });
    return accepted;
  }
}

/** Whether a loaded value is a finite integer in range — anything else is coerced to the default. */
function isAcceptable(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= DISABLED &&
    value <= MAX_RETENTION_DAYS
  );
}

/** Coerce a set request to a whole number of days within `[0, MAX_RETENTION_DAYS]`. */
function clamp(days: number): number {
  if (!Number.isFinite(days)) return DISABLED;
  return Math.min(MAX_RETENTION_DAYS, Math.max(DISABLED, Math.trunc(days)));
}
