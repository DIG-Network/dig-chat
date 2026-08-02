/**
 * Where the user's chosen locale lives at rest.
 *
 * # A locale is a preference, not a secret
 *
 * Unlike the pairing credential and the message history (`./credentials`, `./history`), the chosen
 * language reveals nothing worth protecting: it is a display preference. So it is stored the way a
 * setting is — a small plain-JSON file under `userData` — rather than sealed through `safeStorage`.
 * What it shares with the secrets is the DISCIPLINE around reading it back: the value on disk is
 * treated as untrusted (a hand-edited or corrupt file is possible), so it is validated against the
 * supported-locale allowlist on load and coerced to the default if it is anything else. A bad value
 * can only ever land on English, never crash the launch.
 *
 * Nothing here is exposed to the renderer directly; the renderer reaches it only through the two
 * validated IPC verbs (`locale:get` / `locale:set`), never as a file handle or a channel.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { coerceSupportedLocale, isSupportedLocale } from '../../shared/locales';

/** The file name inside the app's userData directory. */
export const LOCALE_FILE = 'locale.json';

/** The at-rest form. A version tag so a later format change is read rather than guessed at. */
interface StoredLocale {
  v: 1;
  locale: string;
}

/** Reads and writes the user's chosen locale. */
export class LocaleStore {
  private readonly path: string;

  constructor(userDataDir: string) {
    this.path = join(userDataDir, LOCALE_FILE);
  }

  /**
   * The persisted locale, or `null` when the user has made no explicit choice.
   *
   * Returns `null` — never throws — for a missing, unreadable or malformed file, and coerces an
   * unsupported stored value to `null` so the caller falls back to detection. None of those is worth
   * failing a launch over.
   */
  async load(): Promise<string | null> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch {
      return null;
    }
    try {
      const stored = JSON.parse(raw) as Partial<StoredLocale>;
      return stored.v === 1 && isSupportedLocale(stored.locale) ? stored.locale : null;
    } catch {
      return null;
    }
  }

  /**
   * Persist `locale`, coerced to a supported code. Returns the value actually stored, so the caller
   * (and, through it, the renderer) always learns which locale took effect rather than assuming its
   * request was honoured verbatim.
   */
  async save(locale: string): Promise<string> {
    const accepted = coerceSupportedLocale(locale);
    const stored: StoredLocale = { v: 1, locale: accepted };
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    await writeFile(this.path, JSON.stringify(stored), { mode: 0o600, flag: 'w' });
    return accepted;
  }
}
