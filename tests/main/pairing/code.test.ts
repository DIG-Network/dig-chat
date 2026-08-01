import { describe, expect, it } from 'vitest';

import { displayCode, normalizeCode, parseCode } from '../../../src/main/pairing/code';

describe('normalizeCode', () => {
  it('accepts the code however the user typed what they saw', () => {
    // Transcribed from dig-app's own `the_typed_form_is_forgiving_…` test, because the two
    // normalisations must agree: a code dig-chat rewrites differently is a code that never redeems.
    expect(normalizeCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(normalizeCode('ABCD EFGH')).toBe('ABCDEFGH');
    expect(normalizeCode('A B\tC-D_E.F/G,H')).toBe('ABCDEFGH');
    expect(normalizeCode('lI0O')).toBe('1100');
    expect(normalizeCode('li0o')).toBe('1100');
  });

  it('drops U, which Crockford excludes', () => {
    expect(normalizeCode('UUUU1234')).toBe('1234');
  });
});

describe('parseCode', () => {
  it('accepts a complete code and hands back the ungrouped symbols', () => {
    expect(parseCode(' abcd-efgh ')).toEqual({ ok: true, symbols: 'ABCDEFGH' });
  });

  it('refuses a short code locally rather than spending an attempt on it', () => {
    // The property: dig-app destroys a code after FIVE refusals, so a typo that reaches the wire
    // costs the user a fifth of their code. A parser that let anything through would pass every
    // happy-path test and quietly burn codes in the field.
    expect(parseCode('ABCD-EF')).toEqual({ ok: false, problem: 'too-short', symbolsFound: 6 });
    expect(parseCode('')).toEqual({ ok: false, problem: 'empty', symbolsFound: 0 });
    expect(parseCode('---')).toEqual({ ok: false, problem: 'empty', symbolsFound: 0 });
    expect(parseCode('ABCD-EFGHI')).toEqual({ ok: false, problem: 'too-long', symbolsFound: 9 });
  });

  it('counts folded letters as the symbols they become', () => {
    // `l` is not in the alphabet but IS a symbol once folded; counting it as junk would tell a user
    // who typed all eight characters that they typed seven.
    expect(parseCode('lIlI0O0O')).toEqual({ ok: true, symbols: '11110000' });
  });
});

describe('displayCode', () => {
  it('groups a complete code the way the DIG App window shows it', () => {
    expect(displayCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('leaves an incomplete code ungrouped rather than inventing a hyphen', () => {
    expect(displayCode('ABC')).toBe('ABC');
  });
});
