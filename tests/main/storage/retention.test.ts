import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_RETENTION_DAYS,
  RETENTION_FILE,
  RetentionStore,
} from '../../../src/main/storage/retention';

/**
 * The retention preference at rest (SPEC §5.8). Like the locale preference, this is a setting rather
 * than a secret — plain JSON, no `safeStorage` — so the test's focus is the DISCIPLINE around reading
 * an untrusted file back: a missing, malformed, non-number or out-of-range value coerces to the
 * default (0 = disabled) rather than crashing, and a set request is clamped before it touches disk.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dig-chat-retention-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('load', () => {
  it('defaults to 0 (disabled) when the user has made no choice', async () => {
    expect(await new RetentionStore(dir).load()).toBe(0);
  });

  it('round-trips a saved choice', async () => {
    const store = new RetentionStore(dir);
    await store.save(30);
    expect(await store.load()).toBe(30);
  });

  it('coerces a malformed file to the default', async () => {
    await writeFile(join(dir, RETENTION_FILE), 'not json', 'utf8');
    expect(await new RetentionStore(dir).load()).toBe(0);
  });

  it('coerces a non-number stored value to the default', async () => {
    await writeFile(join(dir, RETENTION_FILE), JSON.stringify({ v: 1, maxAgeDays: 'lots' }), 'utf8');
    expect(await new RetentionStore(dir).load()).toBe(0);
  });

  it('coerces an out-of-range stored value to the default', async () => {
    await writeFile(
      join(dir, RETENTION_FILE),
      JSON.stringify({ v: 1, maxAgeDays: MAX_RETENTION_DAYS + 1 }),
      'utf8',
    );
    expect(await new RetentionStore(dir).load()).toBe(0);
  });

  it('coerces a negative stored value to the default', async () => {
    await writeFile(join(dir, RETENTION_FILE), JSON.stringify({ v: 1, maxAgeDays: -5 }), 'utf8');
    expect(await new RetentionStore(dir).load()).toBe(0);
  });

  it('coerces an unknown format version to the default', async () => {
    await writeFile(join(dir, RETENTION_FILE), JSON.stringify({ v: 2, maxAgeDays: 30 }), 'utf8');
    expect(await new RetentionStore(dir).load()).toBe(0);
  });
});

describe('save', () => {
  it('persists an in-range value and returns it', async () => {
    const store = new RetentionStore(dir);
    expect(await store.save(90)).toBe(90);
    const raw = JSON.parse(await readFile(join(dir, RETENTION_FILE), 'utf8'));
    expect(raw).toEqual({ v: 1, maxAgeDays: 90 });
  });

  it('clamps a value above the maximum to the maximum', async () => {
    const store = new RetentionStore(dir);
    expect(await store.save(MAX_RETENTION_DAYS + 1000)).toBe(MAX_RETENTION_DAYS);
    expect(await store.load()).toBe(MAX_RETENTION_DAYS);
  });

  it('clamps a negative request to 0 (disabled)', async () => {
    const store = new RetentionStore(dir);
    expect(await store.save(-10)).toBe(0);
  });

  it('coerces a non-integer request to a whole number of days', async () => {
    const store = new RetentionStore(dir);
    expect(await store.save(7.9)).toBe(7);
  });
});
