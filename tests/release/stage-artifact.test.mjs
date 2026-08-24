import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  MIN_ARTIFACT_BYTES,
  selectArtifact,
  stageArtifact,
} from '../../scripts/stage-artifact.mjs';

/**
 * The property under test is that a release cannot attach something that is not a single usable
 * file. Every case below is a build outcome that leaves CI green.
 */
describe('selecting the build output', () => {
  const ok = (over = {}) => ({
    name: 'dig-chat-0.5.0-windows-x64.exe',
    isFile: true,
    size: MIN_ARTIFACT_BYTES,
    ...over,
  });

  it('accepts the expected file', () => {
    const entries = [ok()];
    expect(selectArtifact(entries, 'dig-chat-0.5.0-windows-x64.exe')).toBe(entries[0]);
  });

  it('rejects a build that emitted nothing, naming what it did find', () => {
    // The real shape of this failure: the unpacked tree is there, the packaged file is not.
    expect(() =>
      selectArtifact(
        [{ name: 'win-unpacked', isFile: false, size: 4096 }],
        'dig-chat-0.5.0-windows-x64.exe',
      ),
    ).toThrow(/produced no "dig-chat-0.5.0-windows-x64.exe".*win-unpacked/s);
  });

  it('reports an empty output directory rather than a confusing empty list', () => {
    expect(() => selectArtifact([], 'dig-chat-0.5.0-linux-x64.AppImage')).toThrow(/<empty>/);
  });

  it('rejects a DIRECTORY that happens to carry the expected name', () => {
    // A raw-binary component is one file. A directory of the right name uploads as nothing at all,
    // and matching on the name alone would call that a success.
    expect(() => selectArtifact([ok({ isFile: false })], ok().name)).toThrow(/not a regular file/);
  });

  it('rejects a file one byte below the floor', () => {
    expect(() => selectArtifact([ok({ size: MIN_ARTIFACT_BYTES - 1 })], ok().name)).toThrow(
      /below the .* floor/,
    );
  });

  it('accepts a file exactly at the floor', () => {
    // Pinning the bound from both sides: a floor tested only from below can only confirm itself.
    expect(() => selectArtifact([ok({ size: MIN_ARTIFACT_BYTES })], ok().name)).not.toThrow();
  });

  it('rejects an empty file, which is what a truncated upload looks like', () => {
    expect(() => selectArtifact([ok({ size: 0 })], ok().name)).toThrow(/0 bytes/);
  });

  it('ignores same-extension siblings and matches the expected name exactly', () => {
    // electron-builder writes helpers beside the artifact; a glob over `*.exe` would pick one.
    const entries = [{ name: 'elevate.exe', isFile: true, size: MIN_ARTIFACT_BYTES * 2 }, ok()];
    expect(selectArtifact(entries, ok().name).name).toBe(ok().name);
  });
});

describe('staging the artifact on disk', () => {
  const dirs = [];
  const makeDir = () => {
    const dir = mkdtempSync(join(tmpdir(), 'dig-chat-stage-'));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => dirs.splice(0, dirs.length));

  const writeBuilt = (dir, name, size) => writeFileSync(join(dir, name), Buffer.alloc(size));

  it('strips the .AppImage extension the beacon would not resolve', () => {
    const dir = makeDir();
    writeBuilt(dir, 'dig-chat-0.5.0-linux-x64.AppImage', 64);
    const staged = stageArtifact({ dir, version: '0.5.0', os: 'linux', arch: 'x64', minBytes: 1 });

    expect(staged).toBe(join(dir, 'dig-chat-0.5.0-linux-x64'));
    // The ORIGINAL must be gone, not merely copied: two files, one of them ending `.AppImage`,
    // is exactly the ambiguity a later "attach everything" step resolves wrongly.
    expect(readdirSync(dir)).toEqual(['dig-chat-0.5.0-linux-x64']);
  });

  it('leaves the Windows artifact named as built, since it is already correct', () => {
    const dir = makeDir();
    writeBuilt(dir, 'dig-chat-0.5.0-windows-x64.exe', 64);
    const staged = stageArtifact({
      dir,
      version: '0.5.0',
      os: 'windows',
      arch: 'x64',
      minBytes: 1,
    });

    expect(staged).toBe(join(dir, 'dig-chat-0.5.0-windows-x64.exe'));
    expect(readdirSync(dir)).toEqual(['dig-chat-0.5.0-windows-x64.exe']);
  });

  it('refuses to stage an unpacked directory, leaving the tree untouched', () => {
    const dir = makeDir();
    mkdirSync(join(dir, 'linux-unpacked'));
    expect(() =>
      stageArtifact({ dir, version: '0.5.0', os: 'linux', arch: 'x64', minBytes: 1 }),
    ).toThrow(/produced no/);
    expect(readdirSync(dir)).toEqual(['linux-unpacked']);
  });

  it('applies the real size floor when none is given', () => {
    // The default is what CI runs with; a test that always overrides it never exercises the guard.
    const dir = makeDir();
    writeBuilt(dir, 'dig-chat-0.5.0-windows-x64.exe', 1024);
    expect(() => stageArtifact({ dir, version: '0.5.0', os: 'windows', arch: 'x64' })).toThrow(
      /below the/,
    );
  });
});
