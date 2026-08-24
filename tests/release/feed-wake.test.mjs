import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const workflow = (name) =>
  readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8');

/**
 * A release is invisible to every beacon until the update feed is re-signed, and the feed's own cron
 * is six-hourly. Without the wake dispatch a dig-chat release looks perfectly green — tag live,
 * marked latest, every asset present — while nobody can receive it for hours. Nothing downstream
 * reports that, so the only place it can be caught is here.
 */
describe('every release channel wakes the update feed', () => {
  // BOTH channels, because the feed resolves both and a stable-only wake would leave every nightly
  // waiting on the cron. Naming them in a table is what makes a channel added later fail loudly
  // rather than inherit silence.
  const channels = [
    ['release.yml', 'stable'],
    ['nightly-release.yml', 'nightly'],
  ];

  it.each(channels)('%s (%s) dispatches to dig-updater', (file) => {
    const yaml = workflow(file);
    expect(yaml).toContain('repos/DIG-Network/dig-updater/dispatches');
    // The exact event type the feed listens for. A near-miss here fails silently: GitHub accepts
    // any event_type and simply matches no workflow.
    expect(yaml).toContain('event_type=component-released');
    // The component name must match `feed-config.json`'s entry, or the feed wakes for a component
    // it does not track.
    expect(yaml).toContain("client_payload[component]=dig-chat'");
  });

  it.each(channels)('%s (%s) sends the version it just published', (file, channel) => {
    const yaml = workflow(file);
    // Not a hardcoded literal: a stamped version would drift from the release the moment either
    // changed, and the feed would be told about a version that does not exist.
    const expected =
      channel === 'stable'
        ? 'client_payload[version]=${{ needs.cut.outputs.version }}'
        : 'client_payload[version]=${NIGHTLY_VERSION}';
    expect(yaml).toContain(expected);
  });

  it('wakes the feed only AFTER the release is publishable', () => {
    // Ordering is the property. Waking the feed before the assets are attached and verified would
    // have the signer resolve a release that is still a draft or still assetless — the failure the
    // whole draft-then-publish sequence exists to prevent.
    const yaml = workflow('release.yml');
    expect(yaml.indexOf('wake the update feed')).toBeGreaterThan(
      yaml.indexOf('verify-release-assets-cli.mjs'),
    );
    expect(yaml.indexOf('wake the update feed')).toBeGreaterThan(yaml.indexOf('--draft=false'));
  });
});
