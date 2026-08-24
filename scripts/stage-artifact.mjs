import { readdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { assetName, builderArtifactName } from './artifact-names.mjs';

/**
 * Turning an electron-builder output directory into the ONE file a release should attach.
 *
 * "The build was green" and "a usable artifact exists" are different facts, and the gap between them
 * is where an unshippable release hides: a target that emitted nothing, a target that emitted a
 * DIRECTORY (`win-unpacked/`) where a single file was expected, or a truncated file that uploads
 * fine and installs into a broken app. None of those turn a build red. So the shape is asserted
 * here, before anything is attached, and a violation stops the release.
 */

/**
 * The smallest plausible size for a packaged Electron artifact, in bytes.
 *
 * Chosen FROM the payload rather than as a round number: an Electron 33 runtime alone is ~80 MB
 * unpacked and compresses to roughly 60-90 MB in a portable exe or AppImage. 20 MB therefore sits
 * far below any real build while remaining far above every failure this catches — an empty file, a
 * stub, a half-written upload, or a launcher script mistaken for the app.
 */
export const MIN_ARTIFACT_BYTES = 20 * 1024 * 1024;

/**
 * Assert that `entries` contains the expected build output, and return it.
 *
 * Pure, so the shape rules can be exercised against sizes and file kinds that no test could
 * plausibly produce on disk.
 *
 * @param {{name: string, isFile: boolean, size: number}[]} entries directory listing
 * @param {string} expected the file name electron-builder was configured to emit
 * @param {number} [minBytes]
 * @returns {{name: string, isFile: boolean, size: number}}
 */
export function selectArtifact(entries, expected, minBytes = MIN_ARTIFACT_BYTES) {
  const found = entries.find((e) => e.name === expected);
  if (!found) {
    const listing = entries.map((e) => e.name).join(', ') || '<empty>';
    throw new Error(`the build produced no "${expected}" — the output directory holds: ${listing}`);
  }
  if (!found.isFile) {
    throw new Error(
      `"${expected}" is not a regular file — a raw-binary component must be one file`,
    );
  }
  if (found.size < minBytes) {
    throw new Error(
      `"${expected}" is ${found.size} bytes, below the ${minBytes}-byte floor for a packaged ` +
        `Electron build — the artifact is truncated or is not the application`,
    );
  }
  return found;
}

/**
 * Read `dir` into the shape {@link selectArtifact} consumes.
 *
 * @param {string} dir
 */
export function listDirectory(dir) {
  return readdirSync(dir).map((name) => {
    const stat = statSync(join(dir, name));
    return { name, isFile: stat.isFile(), size: stat.size };
  });
}

/**
 * Validate the build output in `dir` and rename it to the release-asset name for `(os, arch)`.
 *
 * @param {{dir: string, version: string, os: string, arch: string, minBytes?: number}} options
 * @returns {string} the absolute path of the staged asset
 */
export function stageArtifact({ dir, version, os, arch, minBytes = MIN_ARTIFACT_BYTES }) {
  const built = builderArtifactName(version, os, arch);
  selectArtifact(listDirectory(dir), built, minBytes);

  const staged = assetName(version, os, arch);
  const stagedPath = join(dir, staged);
  if (staged !== built) {
    renameSync(join(dir, built), stagedPath);
  }
  return stagedPath;
}
