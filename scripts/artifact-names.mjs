/**
 * The release-asset naming contract dig-chat shares with the update beacon.
 *
 * These names are NOT a local convention. `dig-updater` resolves a component's artifact by
 * reconstructing the file name it expects and looking for exactly that string in the GitHub release
 * (`dig-updater/crates/dig-updater-feedsign/src/resolve.rs`, `asset_name_parts`). A release that
 * publishes a differently-named file is, to the beacon, a release that published nothing — and it
 * says so by silently resolving no artifact rather than by failing. That silence is why the rule
 * lives here in one place, is asserted by tests, and is quoted verbatim below:
 *
 *   raw binary  ->  `{prefix}-{version}-{os}-{arch}`, with `.exe` appended on Windows
 *
 * dig-chat ships as a raw binary (a single file the beacon swaps in place), matching dig-app.
 */

/** The asset-name prefix every dig-chat artifact carries. Must equal the feed's `asset_prefix`. */
export const ASSET_PREFIX = 'dig-chat';

/**
 * The `(os, arch)` pairs dig-chat publishes an artifact for.
 *
 * Windows gets electron-builder's `portable` target and Linux its `AppImage` target, both of which
 * emit ONE self-contained file — which is the whole reason dig-chat can be a raw-binary component.
 */
export const PUBLISHED_PLATFORMS = Object.freeze([
  Object.freeze({ os: 'windows', arch: 'x64', target: 'portable', builderExt: 'exe' }),
  Object.freeze({ os: 'linux', arch: 'x64', target: 'AppImage', builderExt: 'AppImage' }),
]);

/**
 * The platforms dig-chat deliberately does NOT publish, and why. The feed declares each of these as
 * an `exempt_platforms` entry; dropping an exemption here without publishing the artifact would red
 * the feed's completeness gate rather than produce an update.
 */
export const EXEMPT_PLATFORMS = Object.freeze([
  // Unsigned macOS builds fail Gatekeeper, so shipping one would deliver an app that cannot open.
  // Blocked on a Developer ID certificate.
  Object.freeze({ os: 'macos', arch: 'x64' }),
  Object.freeze({ os: 'macos', arch: 'arm64' }),
  // No arm64 Linux runner, and cross-building an AppImage needs an arm64 Electron runtime.
  Object.freeze({ os: 'linux', arch: 'arm64' }),
]);

/**
 * The exact release-asset file name for `(os, arch)` at `version` — the string the beacon looks for.
 *
 * @param {string} version semver, without a leading `v`
 * @param {string} os manifest OS token: `windows`, `linux`, `macos`
 * @param {string} arch manifest arch token: `x64`, `arm64`
 * @returns {string}
 */
export function assetName(version, os, arch) {
  const suffix = os === 'windows' ? '.exe' : '';
  return `${ASSET_PREFIX}-${version}-${os}-${arch}${suffix}`;
}

/**
 * The name electron-builder emits BEFORE staging, per its `artifactName` template.
 *
 * It differs from {@link assetName} on Linux only: electron-builder always appends the target's
 * extension, and an `.AppImage` suffix is not the name the beacon resolves. Keeping both names in
 * one module is what lets the staging step rename deterministically instead of globbing.
 *
 * @param {string} version
 * @param {string} os
 * @param {string} arch
 * @returns {string}
 */
export function builderArtifactName(version, os, arch) {
  const platform = platformFor(os, arch);
  return `${ASSET_PREFIX}-${version}-${os}-${arch}.${platform.builderExt}`;
}

/**
 * The published-platform record for `(os, arch)`.
 *
 * @param {string} os
 * @param {string} arch
 * @throws {Error} when dig-chat does not publish that platform — an exempt platform reaching a build
 *   step is a configuration error, not something to paper over with a default.
 */
export function platformFor(os, arch) {
  const found = PUBLISHED_PLATFORMS.find((p) => p.os === os && p.arch === arch);
  if (!found) {
    const known = PUBLISHED_PLATFORMS.map((p) => `${p.os}/${p.arch}`).join(', ');
    throw new Error(`dig-chat publishes no artifact for ${os}/${arch} (published: ${known})`);
  }
  return found;
}

/**
 * Every asset name a dig-chat release at `version` must carry, in published-platform order.
 *
 * @param {string} version
 * @returns {string[]}
 */
export function expectedAssetNames(version) {
  return PUBLISHED_PLATFORMS.map((p) => assetName(version, p.os, p.arch));
}
