import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  coerceSupportedLocale,
  isSupportedLocale,
  resolveInitialLocale,
  resolveLocale,
  resolveOne,
} from '../../src/shared/locales';

/**
 * The locale contract, tested in isolation — no DOM, no store, no Electron. The resolver is the piece
 * that decides which of fourteen languages a raw browser/OS tag or a persisted choice becomes, so its
 * fallback behaviour is asserted exhaustively: exact match, region/script override, primary-language
 * fallback, and the English default when nothing matches.
 */

describe('the supported set', () => {
  it('is the ecosystem 14-locale baseline, English first', () => {
    expect(SUPPORTED_LOCALES.map((l) => l.code)).toEqual([
      'en',
      'zh-CN',
      'zh-TW',
      'ko',
      'ja',
      'ru',
      'es',
      'pt-BR',
      'fr',
      'de',
      'tr',
      'vi',
      'id',
      'hi',
    ]);
  });

  it('defaults to English', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(isSupportedLocale(DEFAULT_LOCALE)).toBe(true);
  });
});

describe('isSupportedLocale', () => {
  it('accepts an exact canonical code and rejects anything else', () => {
    expect(isSupportedLocale('pt-BR')).toBe(true);
    expect(isSupportedLocale('pt')).toBe(false);
    expect(isSupportedLocale('sw')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});

describe('resolveOne', () => {
  it('resolves an exact canonical match', () => {
    expect(resolveOne('en')).toBe('en');
    expect(resolveOne('zh-CN')).toBe('zh-CN');
    expect(resolveOne('pt-BR')).toBe('pt-BR');
  });

  it('is case- and separator-insensitive', () => {
    expect(resolveOne('zh-cn')).toBe('zh-CN');
    expect(resolveOne('PT_br')).toBe('pt-BR');
  });

  it('maps Traditional-script Chinese regions to zh-TW', () => {
    expect(resolveOne('zh-TW')).toBe('zh-TW');
    expect(resolveOne('zh-HK')).toBe('zh-TW');
    expect(resolveOne('zh-MO')).toBe('zh-TW');
    expect(resolveOne('zh-Hant')).toBe('zh-TW');
    expect(resolveOne('zh-Hant-TW')).toBe('zh-TW');
  });

  it('falls a region back to its primary language', () => {
    expect(resolveOne('en-GB')).toBe('en');
    expect(resolveOne('pt-PT')).toBe('pt-BR');
    expect(resolveOne('es-419')).toBe('es');
    expect(resolveOne('zh-SG')).toBe('zh-CN');
  });

  it('returns null for an unsupported or empty tag', () => {
    expect(resolveOne('sw')).toBeNull();
    expect(resolveOne('')).toBeNull();
    expect(resolveOne(null)).toBeNull();
    expect(resolveOne(undefined)).toBeNull();
  });
});

describe('resolveLocale', () => {
  it('returns the first supported tag in a preference list', () => {
    expect(resolveLocale(['sw', 'xx', 'fr-CA', 'de'])).toBe('fr');
  });

  it('falls back to the default when nothing is supported', () => {
    expect(resolveLocale(['sw', 'xx'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
    expect(resolveLocale(null)).toBe('en');
  });
});

describe('resolveInitialLocale', () => {
  it('prefers a valid persisted choice over browser detection', () => {
    expect(resolveInitialLocale('ja', ['de-DE', 'en'])).toBe('ja');
  });

  it('ignores an unsupported persisted value and detects instead', () => {
    expect(resolveInitialLocale('sw', ['de-DE', 'en'])).toBe('de');
    expect(resolveInitialLocale(null, ['ko'])).toBe('ko');
  });

  it('lands on English when neither the persisted value nor detection matches', () => {
    expect(resolveInitialLocale(null, ['sw'])).toBe('en');
  });
});

describe('coerceSupportedLocale', () => {
  it('passes a supported code through and coerces anything else to the default', () => {
    expect(coerceSupportedLocale('ru')).toBe('ru');
    expect(coerceSupportedLocale('pt')).toBe('en');
    expect(coerceSupportedLocale('')).toBe('en');
  });
});
