/**
 * The assembled message catalog: every supported locale, keyed by its BCP-47 code.
 *
 * A locale is added by writing a sibling of `en.ts` (typed {@link Catalog}, so the compiler rejects a
 * missing or stray key) and listing it here. Nothing else in the app hardcodes the set of catalogs —
 * the selector, the resolver, and the completeness test all read it from {@link SUPPORTED_LOCALES}.
 */

import { DEFAULT_LOCALE, isSupportedLocale } from '../../shared/locales';
import { de } from './de';
import { en, type Catalog } from './en';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { id } from './id';
import { ja } from './ja';
import { ko } from './ko';
import { ptBR } from './pt-BR';
import { ru } from './ru';
import { tr } from './tr';
import { vi } from './vi';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';

/** Every catalog, keyed by canonical BCP-47 code — the keys match {@link SUPPORTED_LOCALES}. */
export const CATALOGS: Readonly<Record<string, Catalog>> = Object.freeze({
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ko,
  ja,
  ru,
  es,
  'pt-BR': ptBR,
  fr,
  de,
  tr,
  vi,
  id,
  hi,
});

/**
 * The messages for a locale. The locale is expected to be a canonical supported code (the store
 * resolves it before it reaches here); an unsupported one falls back to the default catalog so a bad
 * value degrades to English rather than to a blank UI.
 */
export function messagesFor(locale: string): Catalog {
  return (isSupportedLocale(locale) ? CATALOGS[locale] : CATALOGS[DEFAULT_LOCALE]) ?? en;
}
