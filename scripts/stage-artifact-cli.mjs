import { stageArtifact } from './stage-artifact.mjs';

/**
 * `node scripts/stage-artifact-cli.mjs <dir> <version> <os> <arch>`
 *
 * Prints the staged asset path so a workflow step can capture it, and exits non-zero with the
 * shape violation on its stderr when the build did not produce a single usable file.
 */
const [dir, version, os, arch] = process.argv.slice(2);
if (!dir || !version || !os || !arch) {
  process.stderr.write('usage: stage-artifact-cli.mjs <dir> <version> <os> <arch>\n');
  process.exit(2);
}
process.stdout.write(`${stageArtifact({ dir, version, os, arch })}\n`);
