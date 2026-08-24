import { describe, expect, it } from 'vitest';

import {
  ASSET_PREFIX,
  EXEMPT_PLATFORMS,
  PUBLISHED_PLATFORMS,
  assetName,
  builderArtifactName,
  expectedAssetNames,
  platformFor,
} from '../../scripts/artifact-names.mjs';

/**
 * These assertions are literal on purpose. The names are a contract with a DIFFERENT repository —
 * dig-updater reconstructs them in `resolve.rs` and matches by exact string — so the only useful
 * test is one that fails when this side drifts, which means the expected value has to be written out
 * rather than derived from the code under test.
 */
describe('the release-asset naming contract', () => {
  it('names the Windows artifact exactly as the beacon reconstructs it', () => {
    expect(assetName('0.5.0', 'windows', 'x64')).toBe('dig-chat-0.5.0-windows-x64.exe');
  });

  it('names the Linux artifact with NO extension', () => {
    // The nearest wrong implementation appends the electron-builder target extension. An
    // `.AppImage` suffix resolves to nothing in the feed and the component silently never updates.
    expect(assetName('0.5.0', 'linux', 'x64')).toBe('dig-chat-0.5.0-linux-x64');
  });

  it('uses the manifest OS vocabulary, not electron-builder platform tokens', () => {
    // electron-builder calls these `win` and `mac`; the feed's vocabulary is `windows` and `macos`.
    for (const name of expectedAssetNames('1.2.3')) {
      expect(name).not.toMatch(/-win-|-mac-/);
    }
    expect(assetName('1.2.3', 'macos', 'arm64')).toBe('dig-chat-1.2.3-macos-arm64');
  });

  it('carries the arch token, so two architectures cannot collide on one name', () => {
    expect(assetName('1.2.3', 'linux', 'x64')).not.toBe(assetName('1.2.3', 'linux', 'arm64'));
  });

  it('publishes exactly the two single-file platforms', () => {
    expect(expectedAssetNames('0.5.0')).toEqual([
      'dig-chat-0.5.0-windows-x64.exe',
      'dig-chat-0.5.0-linux-x64',
    ]);
  });

  it('does not publish any platform it declares exempt', () => {
    // The two lists disagreeing in EITHER direction is a defect: a published-and-exempt platform
    // makes the feed skip an artifact that exists, and the audit would flag the exemption as
    // over-broad only after a release had already shipped.
    for (const exempt of EXEMPT_PLATFORMS) {
      expect(PUBLISHED_PLATFORMS.some((p) => p.os === exempt.os && p.arch === exempt.arch)).toBe(
        false,
      );
    }
    expect(EXEMPT_PLATFORMS).toHaveLength(3);
  });

  it('covers all five platforms the beacon ships to, as published or exempt', () => {
    // resolve.rs's PLATFORMS set, verbatim. A platform in neither list is one the feed would expect
    // and never find. Note there is no windows/arm64 row — the beacon does not ship one.
    const beaconPlatforms = ['linux/x64', 'linux/arm64', 'macos/arm64', 'macos/x64', 'windows/x64'];
    const accountedFor = [...PUBLISHED_PLATFORMS, ...EXEMPT_PLATFORMS].map(
      (p) => `${p.os}/${p.arch}`,
    );
    expect([...accountedFor].sort()).toEqual([...beaconPlatforms].sort());
  });

  it('carries a NIGHTLY prerelease version through unchanged', () => {
    // The nightly channel's version is a semver prerelease, and it reaches the feed ONLY through
    // the asset name — the rolling tag says `nightly` and carries no version at all, so the feed
    // recovers it by stripping the fixed prefix and suffix. A name that dropped, truncated or
    // sanitised the `-nightly.DATE.SHA` segment would resolve to a different version than the one
    // that was built, and nothing downstream could notice.
    const nightly = '0.5.0-nightly.20260824.abc1234';
    expect(assetName(nightly, 'linux', 'x64')).toBe(
      'dig-chat-0.5.0-nightly.20260824.abc1234-linux-x64',
    );
    expect(assetName(nightly, 'windows', 'x64')).toBe(
      'dig-chat-0.5.0-nightly.20260824.abc1234-windows-x64.exe',
    );
    // Recovering the version the way the feed does must return exactly what went in — including
    // the hyphens inside the prerelease, which a naive split on `-` would tear apart.
    const recovered = assetName(nightly, 'linux', 'x64').slice(
      `${ASSET_PREFIX}-`.length,
      -'-linux-x64'.length,
    );
    expect(recovered).toBe(nightly);
  });

  it('uses the same prefix the feed declares as asset_prefix', () => {
    expect(ASSET_PREFIX).toBe('dig-chat');
    expect(assetName('9.9.9', 'linux', 'x64').startsWith(`${ASSET_PREFIX}-`)).toBe(true);
  });
});

describe('the electron-builder output name', () => {
  it('differs from the asset name only on Linux, where the extension is stripped', () => {
    expect(builderArtifactName('0.5.0', 'windows', 'x64')).toBe(
      assetName('0.5.0', 'windows', 'x64'),
    );
    expect(builderArtifactName('0.5.0', 'linux', 'x64')).toBe('dig-chat-0.5.0-linux-x64.AppImage');
  });

  it('refuses a platform dig-chat does not publish, rather than inventing a name', () => {
    expect(() => platformFor('macos', 'arm64')).toThrow(/publishes no artifact for macos\/arm64/);
    expect(() => builderArtifactName('0.5.0', 'linux', 'arm64')).toThrow(/linux\/arm64/);
  });
});
