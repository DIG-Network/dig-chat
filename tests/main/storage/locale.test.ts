import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCALE_FILE, LocaleStore } from '../../../src/main/storage/locale';

/**
 * The locale preference at rest. Unlike the credential and history stores, there is no secret to
 * protect here — so the test's focus is the DISCIPLINE around reading an untrusted file back: a
 * missing, corrupt or unsupported value never crashes and never leaks through; it degrades to "no
 * choice", and a set request is coerced to a supported code before it touches disk.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dig-chat-locale-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('load', () => {
  it('returns null when the user has made no choice', async () => {
    expect(await new LocaleStore(dir).load()).toBeNull();
  });

  it('round-trips a saved choice', async () => {
    const store = new LocaleStore(dir);
    await store.save('ja');
    expect(await store.load()).toBe('ja');
  });

  it('returns null for a malformed file rather than throwing', async () => {
    await writeFile(join(dir, LOCALE_FILE), 'not json', 'utf8');
    expect(await new LocaleStore(dir).load()).toBeNull();
  });

  it('returns null for an unsupported stored locale, so the caller re-detects', async () => {
    await writeFile(join(dir, LOCALE_FILE), JSON.stringify({ v: 1, locale: 'sw' }), 'utf8');
    expect(await new LocaleStore(dir).load()).toBeNull();
  });

  it('returns null for an unknown format version', async () => {
    await writeFile(join(dir, LOCALE_FILE), JSON.stringify({ v: 2, locale: 'de' }), 'utf8');
    expect(await new LocaleStore(dir).load()).toBeNull();
  });
});

describe('save', () => {
  it('persists a supported locale and returns it', async () => {
    const store = new LocaleStore(dir);
    expect(await store.save('pt-BR')).toBe('pt-BR');
    const raw = JSON.parse(await readFile(join(dir, LOCALE_FILE), 'utf8'));
    expect(raw).toEqual({ v: 1, locale: 'pt-BR' });
  });

  it('coerces an unsupported request to the default before writing', async () => {
    const store = new LocaleStore(dir);
    expect(await store.save('sw')).toBe('en');
    expect(await store.load()).toBe('en');
  });

  it('replaces a previous choice', async () => {
    const store = new LocaleStore(dir);
    await store.save('fr');
    await store.save('ko');
    expect(await store.load()).toBe('ko');
  });
});
