import { assertReleaseAssets } from './verify-release-assets.mjs';

/**
 * `gh release view vX.Y.Z --json assets | node scripts/verify-release-assets-cli.mjs <version>`
 *
 * Exits non-zero when the release does not carry a usable artifact for every published platform.
 */
const version = process.argv[2];
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const { assets } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
assertReleaseAssets(assets, version);
process.stdout.write(`dig-chat v${version} carries every expected asset\n`);
