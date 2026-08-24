import { expectedAssetNames } from './artifact-names.mjs';
import { MIN_ARTIFACT_BYTES } from './stage-artifact.mjs';

/**
 * Checking the RELEASE, not the build that fed it.
 *
 * A green build step and an attached asset are different facts. An upload can fail after the job
 * that produced the file has already succeeded, and GitHub creates an asset ROW before its bytes
 * land — so a release can list an artifact of size zero and read, to anything that only checks
 * presence, as a complete release. The beacon would then resolve a name, download nothing usable and
 * report an update it cannot install. Assert names AND sizes.
 */

/**
 * @param {{name: string, size: number}[]} assets the release's own asset list
 * @param {string} version
 * @param {number} [minBytes]
 * @throws {Error} listing every missing or undersized asset at once, so one run reports the whole gap
 */
export function assertReleaseAssets(assets, version, minBytes = MIN_ARTIFACT_BYTES) {
  const problems = expectedAssetNames(version).flatMap((name) => {
    const asset = assets.find((a) => a.name === name);
    if (!asset) return [`missing: ${name}`];
    if (asset.size < minBytes) return [`too small (${asset.size} bytes): ${name}`];
    return [];
  });

  if (problems.length > 0) {
    const listing = assets.map((a) => `${a.name} (${a.size})`).join(', ') || '<no assets>';
    throw new Error(
      `dig-chat v${version} is not shippable — ${problems.join('; ')}. The release carries: ${listing}`,
    );
  }
}
