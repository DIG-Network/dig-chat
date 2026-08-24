import { describe, expect, it } from 'vitest';

import { MIN_ARTIFACT_BYTES } from '../../scripts/stage-artifact.mjs';
import { assertReleaseAssets } from '../../scripts/verify-release-assets.mjs';

const big = MIN_ARTIFACT_BYTES;
const complete = [
  { name: 'dig-chat-0.5.0-windows-x64.exe', size: big },
  { name: 'dig-chat-0.5.0-linux-x64', size: big },
];

describe('verifying a cut release', () => {
  it('accepts a release carrying both platforms at full size', () => {
    expect(() => assertReleaseAssets(complete, '0.5.0')).not.toThrow();
  });

  it('rejects a release that attached NOTHING, which is what a silent upload failure looks like', () => {
    expect(() => assertReleaseAssets([], '0.5.0')).toThrow(/<no assets>/);
  });

  it('rejects a release missing one platform while the other succeeded', () => {
    // The single-platform failure is the likelier one — one matrix leg fails, the other uploads —
    // and a check that stopped at "some asset exists" would pass it.
    const linuxOnly = complete.filter((a) => a.name.endsWith('-linux-x64'));
    expect(() => assertReleaseAssets(linuxOnly, '0.5.0')).toThrow(
      /missing: dig-chat-0\.5\.0-windows-x64\.exe/,
    );
  });

  it('rejects an asset ROW whose bytes never landed', () => {
    const empty = [complete[0], { name: 'dig-chat-0.5.0-linux-x64', size: 0 }];
    expect(() => assertReleaseAssets(empty, '0.5.0')).toThrow(/too small \(0 bytes\)/);
  });

  it('reports every problem in one run, not just the first', () => {
    const message = (() => {
      try {
        assertReleaseAssets([{ name: 'dig-chat-0.5.0-linux-x64', size: 1 }], '0.5.0');
        return '';
      } catch (error) {
        return error.message;
      }
    })();
    expect(message).toMatch(/missing: dig-chat-0\.5\.0-windows-x64\.exe/);
    expect(message).toMatch(/too small \(1 bytes\): dig-chat-0\.5\.0-linux-x64/);
  });

  it('rejects assets from a DIFFERENT version, which a name-agnostic check would accept', () => {
    // A re-run against a stale release is the shape here: the assets are real and full size, and
    // they belong to the previous version.
    const stale = complete.map((a) => ({ ...a, name: a.name.replace('0.5.0', '0.4.4') }));
    expect(() => assertReleaseAssets(stale, '0.5.0')).toThrow(/missing/);
  });
});
