/**
 * The frozen locale registry + BCP-47 resolution — the LOCALE CONTRACT, shared by both processes.
 *
 * This is the single source of truth for "which languages DIG Chat speaks, and how a raw locale tag
 * (from `navigator.languages` or a persisted choice) maps onto one of them". It is pure and
 * side-effect free — no DOM, no Electron, no store — so it is exhaustively unit-testable and can be
 * imported by BOTH the renderer (to drive the selector and pick the startup locale) and the main
 * process (to validate an untrusted locale coming across the IPC boundary against the same allowlist).
 *
 * The 14-locale set matches the ecosystem baseline (frontend-baseline skill;
 * `hub.dig.net/apps/web/i18n/locales.ts`) so DIG Chat speaks exactly the languages every other DIG
 * surface does, and resolves tags the same deterministic way (`zh → zh-CN`, `pt → pt-BR`).
 *
 * AGENT-FRIENDLY: {@link SUPPORTED_LOCALES} is a frozen, ordered, self-describing table — code +
 * endonym (native name) + English name — so a tool can enumerate the supported set without reading
 * prose.
 */

/** One supported locale: its BCP-47 code and its native + English display names. */
export interface LocaleEntry {
  /** The canonical BCP-47 tag DIG Chat ships a catalog for (e.g. `en`, `zh-CN`, `pt-BR`). */
  readonly code: string;
  /** The language's own name in its own script — how it is listed in the language selector. */
  readonly endonym: string;
  /** The English name, for tooltips / accessibility labels / agent output. */
  readonly englishName: string;
}

/**
 * The 14 languages DIG Chat ships, in selector display order (English first, then by rough global
 * reach). `en` is the default and the base catalog every other locale falls back to per missing key.
 */
export const SUPPORTED_LOCALES: readonly LocaleEntry[] = Object.freeze([
  { code: 'en', endonym: 'English', englishName: 'English' },
  { code: 'zh-CN', endonym: '简体中文', englishName: 'Chinese (Simplified)' },
  { code: 'zh-TW', endonym: '繁體中文', englishName: 'Chinese (Traditional)' },
  { code: 'ko', endonym: '한국어', englishName: 'Korean' },
  { code: 'ja', endonym: '日本語', englishName: 'Japanese' },
  { code: 'ru', endonym: 'Русский', englishName: 'Russian' },
  { code: 'es', endonym: 'Español', englishName: 'Spanish' },
  { code: 'pt-BR', endonym: 'Português (Brasil)', englishName: 'Portuguese (Brazil)' },
  { code: 'fr', endonym: 'Français', englishName: 'French' },
  { code: 'de', endonym: 'Deutsch', englishName: 'German' },
  { code: 'tr', endonym: 'Türkçe', englishName: 'Turkish' },
  { code: 'vi', endonym: 'Tiếng Việt', englishName: 'Vietnamese' },
  { code: 'id', endonym: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { code: 'hi', endonym: 'हिन्दी', englishName: 'Hindi' },
] as const);

/** The default locale — also the base catalog every other locale falls back to per missing key. */
export const DEFAULT_LOCALE = 'en';

/** The supported codes, for O(1) membership checks. */
const SUPPORTED_CODES: ReadonlySet<string> = new Set(SUPPORTED_LOCALES.map((l) => l.code));

/** Is `code` one of the exact canonical codes DIG Chat ships a catalog for? */
export function isSupportedLocale(code: string | null | undefined): code is string {
  return code !== null && code !== undefined && SUPPORTED_CODES.has(code);
}

/**
 * Primary-language fallbacks: when a tag's language subtag matches but the exact region does not,
 * pick the DIG Chat locale that best serves that language. Explicit rather than "first catalog whose
 * language matches" so the choice is deterministic and documents its intent (`pt-PT → pt-BR`).
 */
const LANGUAGE_FALLBACK: Readonly<Record<string, string>> = Object.freeze({
  en: 'en',
  zh: 'zh-CN', // Simplified is the larger audience; Traditional regions override below.
  pt: 'pt-BR',
  ko: 'ko',
  ja: 'ja',
  ru: 'ru',
  es: 'es',
  fr: 'fr',
  de: 'de',
  tr: 'tr',
  vi: 'vi',
  id: 'id',
  hi: 'hi',
});

/** Region/script overrides that must NOT collapse to the language default (Traditional Chinese). */
const REGION_OVERRIDE: Readonly<Record<string, string>> = Object.freeze({
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-TW',
  'zh-MO': 'zh-TW',
  'zh-Hant': 'zh-TW',
});

/** Normalize a raw tag to the `lang` and `lang-REGION`/`lang-Script` forms fallbacks key on. */
function normalizeTag(raw: string): { lang: string; langRegion: string | null } {
  const parts = raw.trim().split(/[-_]/);
  const primary = parts[0];
  if (!primary) return { lang: '', langRegion: null };
  const lang = primary.toLowerCase();
  // The second subtag is either a script (4 letters, e.g. Hant) or a region (2 letters / 3 digits).
  // Titlecase a script and upper-case a region so both match the override keys.
  const second = parts[1];
  let sub: string | null = null;
  if (second) {
    sub =
      second.length === 4
        ? second.charAt(0).toUpperCase() + second.slice(1).toLowerCase()
        : second.toUpperCase();
  }
  return { lang, langRegion: sub ? `${lang}-${sub}` : null };
}

/**
 * Resolve a SINGLE raw BCP-47 tag to a supported locale, or `null` if the language is unsupported.
 * Order for one tag:
 *   1. exact canonical match (`zh-CN` → `zh-CN`, `en` → `en`);
 *   2. region/script override (`zh-HK` → `zh-TW`, `zh-Hant-TW` → `zh-TW`);
 *   3. primary-language fallback (`en-GB` → `en`, `pt-PT` → `pt-BR`, `es-419` → `es`).
 */
export function resolveOne(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const { lang, langRegion } = normalizeTag(raw);
  if (!lang) return null;
  if (langRegion && isSupportedLocale(langRegion)) return langRegion;
  if (langRegion && REGION_OVERRIDE[langRegion]) return REGION_OVERRIDE[langRegion];
  return LANGUAGE_FALLBACK[lang] ?? null;
}

/**
 * Resolve the preferred locale from an ordered list of BCP-47 tags (`navigator.languages`), returning
 * the FIRST tag that resolves to a supported locale. Falls back to {@link DEFAULT_LOCALE} only when
 * none of the tags is supported.
 */
export function resolveLocale(preferred: readonly string[] | null | undefined): string {
  for (const tag of preferred ?? []) {
    const hit = resolveOne(tag);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

/**
 * Pick the locale to start in: a valid PERSISTED choice always wins (the user chose it and it
 * outlives detection); otherwise fall back to detecting from the browser/OS preference list.
 */
export function resolveInitialLocale(
  persisted: string | null | undefined,
  preferred: readonly string[] | null | undefined,
): string {
  if (isSupportedLocale(persisted)) return persisted;
  return resolveLocale(preferred);
}

/**
 * Coerce an untrusted locale to a supported one: the exact tag if supported, else the DEFAULT. Used
 * on the main-process side of the IPC boundary, where the incoming value is untrusted input — an
 * unknown locale is a no-op that lands on English rather than a rejection the UI has to handle.
 */
export function coerceSupportedLocale(raw: string): string {
  return isSupportedLocale(raw) ? raw : DEFAULT_LOCALE;
}
