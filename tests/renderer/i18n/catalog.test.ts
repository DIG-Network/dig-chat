import { describe, expect, it } from 'vitest';

import { CATALOGS, messagesFor } from '../../../src/renderer/i18n/catalog';
import { en } from '../../../src/renderer/i18n/en';
import { SUPPORTED_LOCALES } from '../../../src/shared/locales';

/**
 * The completeness gate (§6.6): every locale ships EXACTLY the keys English does — no missing id, no
 * stray id, no empty string — so a new string added to `en` cannot silently ship untranslated in the
 * thirteen other languages, and a rename cannot leave a dead key behind. TypeScript already enforces
 * key parity by typing each catalog as `Catalog`; this asserts it at runtime AND catches the empty
 * value the type system cannot see.
 */

const EN_KEYS = Object.keys(en).sort();

describe('every supported locale has a catalog', () => {
  it('ships one catalog per entry in the registry, and no orphan catalogs', () => {
    expect(Object.keys(CATALOGS).sort()).toEqual(SUPPORTED_LOCALES.map((l) => l.code).sort());
  });
});

describe.each(Object.entries(CATALOGS))('the %s catalog', (code, catalog) => {
  it('has EXACTLY the English key set — nothing missing, nothing extra', () => {
    expect(Object.keys(catalog).sort()).toEqual(EN_KEYS);
  });

  it('has no empty or whitespace-only value', () => {
    for (const [key, value] of Object.entries(catalog)) {
      expect(value.trim().length, `${code}.${key} is empty`).toBeGreaterThan(0);
    }
  });

  it('preserves the {version} placeholder in the version string', () => {
    expect(catalog['app.version'], `${code}.app.version`).toContain('{version}');
  });

  it('keeps the DIG Chat wordmark verbatim in the app name', () => {
    expect(catalog['app.name']).toBe('DIG Chat');
  });
});

describe('messagesFor', () => {
  it('returns the requested catalog for a supported locale', () => {
    expect(messagesFor('de')).toBe(CATALOGS.de);
    expect(messagesFor('pt-BR')).toBe(CATALOGS['pt-BR']);
  });

  it('falls back to English for an unsupported locale rather than a blank map', () => {
    expect(messagesFor('xx-not-a-locale')).toBe(en);
  });
});
