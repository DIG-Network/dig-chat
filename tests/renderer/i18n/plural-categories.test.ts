import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { describe, expect, it } from 'vitest';

import { CATALOGS } from '../../../src/renderer/i18n/catalog';

/**
 * ICU plural-category validity (§6.6 guard). A translator authoring a `{count, plural, …}` block must
 * only spell the CLDR plural categories that EXIST in their language: writing a `one` branch in a
 * language that has no singular category (Chinese, Japanese, Korean, Vietnamese, Indonesian — all
 * `other`-only) is a silent bug, because `intl-messageformat` never selects that branch, so the
 * intended string never renders. The completeness test (catalog.test.ts) guarantees key parity and
 * non-empty values; it cannot see INSIDE a message. This one does.
 *
 * For every message in every locale it parses the ICU AST and, for each `plural`/`selectordinal`
 * argument, asserts every explicit named category (`zero`/`one`/`two`/`few`/`many`, ignoring exact
 * `=N` selectors) is one the locale actually has — the set from `Intl.PluralRules(locale)` — and that
 * the mandatory `other` fallback is present. The catalogs were authored correctly, so this passes
 * now; it is a tripwire for a future edit that adds an impossible branch.
 *
 * Approach: precise AST + CLDR-category assertion (not the weaker compile-no-throw form —
 * `new IntlMessageFormat` tolerates an unreachable `one` branch without throwing, so it would miss
 * exactly the bug this guards).
 */

/** The valid CARDINAL categories for a locale, e.g. `{ one, other }` for `en`, `{ other }` for `ja`. */
function cardinalCategoriesFor(locale: string): ReadonlySet<string> {
  return new Set(new Intl.PluralRules(locale).resolvedOptions().pluralCategories);
}

/** The valid ORDINAL categories for a locale — `selectordinal` selects on these instead. */
function ordinalCategoriesFor(locale: string): ReadonlySet<string> {
  return new Set(
    new Intl.PluralRules(locale, { type: 'ordinal' }).resolvedOptions().pluralCategories,
  );
}

/** One plural/selectordinal block found in a message: where it is and which categories it spells. */
interface PluralBlock {
  readonly ordinal: boolean;
  /** The explicit named categories the block spells (excludes `=N` exact matches and `other`). */
  readonly named: readonly string[];
  /** Whether the block spells the mandatory `other` fallback. */
  readonly hasOther: boolean;
}

/** Walk an ICU AST, collecting every plural/selectordinal block (including nested ones). */
function collectPluralBlocks(elements: readonly MessageFormatElement[]): PluralBlock[] {
  const blocks: PluralBlock[] = [];
  for (const element of elements) {
    if (element.type === TYPE.plural) {
      const selectors = Object.keys(element.options);
      blocks.push({
        ordinal: element.pluralType === 'ordinal',
        named: selectors.filter((key) => !key.startsWith('=') && key !== 'other'),
        hasOther: 'other' in element.options,
      });
    }
    // Recurse into every sub-message so nested plurals inside a branch are checked too.
    if ('options' in element && element.options) {
      for (const option of Object.values(element.options)) {
        blocks.push(...collectPluralBlocks(option.value));
      }
    }
  }
  return blocks;
}

describe.each(Object.entries(CATALOGS))(
  'the %s catalog spells only plural categories that exist in the locale',
  (locale, catalog) => {
    const cardinal = cardinalCategoriesFor(locale);
    const ordinal = ordinalCategoriesFor(locale);

    it.each(Object.entries(catalog))('%s uses valid plural categories', (id, message) => {
      const blocks = collectPluralBlocks(parse(message));
      for (const block of blocks) {
        const valid = block.ordinal ? ordinal : cardinal;
        for (const category of block.named) {
          expect(
            valid.has(category),
            `${locale}.${id}: "${category}" is not a ${block.ordinal ? 'selectordinal' : 'plural'} ` +
              `category for "${locale}" (valid: ${[...valid].join(', ')})`,
          ).toBe(true);
        }
        expect(
          block.hasOther,
          `${locale}.${id}: a plural block must always provide the "other" fallback`,
        ).toBe(true);
      }
    });
  },
);
