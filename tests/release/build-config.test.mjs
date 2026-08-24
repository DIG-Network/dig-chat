import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import Ajv from 'ajv';

import { describe, expect, it } from 'vitest';

import { PUBLISHED_PLATFORMS, builderArtifactName } from '../../scripts/artifact-names.mjs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

/**
 * The naming module states what the beacon expects; the packaging config decides what is actually
 * emitted. Testing them separately leaves the join untested — and the join is where a rename lands
 * that keeps every other test green while the release stops resolving.
 */
describe('the electron-builder configuration', () => {
  it('emits, for every published platform, the name the staging step goes looking for', () => {
    for (const platform of PUBLISHED_PLATFORMS) {
      const key = platform.os === 'windows' ? 'win' : platform.os;
      const template = pkg.build[key].artifactName;
      const rendered = template
        .replace('${version}', pkg.version)
        .replace('${ext}', platform.builderExt);
      expect(rendered).toBe(builderArtifactName(pkg.version, platform.os, platform.arch));
    }
  });

  it('configures exactly the single-file targets, on exactly the published architectures', () => {
    // A target swap is the failure this catches: `nsis` or `deb` would build, upload, and install
    // nothing the beacon can swap in place, because neither is one self-contained file.
    expect(pkg.build.win.target).toEqual([{ target: 'portable', arch: ['x64'] }]);
    expect(pkg.build.linux.target).toEqual([{ target: 'AppImage', arch: ['x64'] }]);
  });

  it('names the Linux executable without the npm scope', () => {
    // electron-builder derives `executableName` from the package name, and dig-chat's is SCOPED —
    // `@dignetwork/dig-chat` sanitises to `@dignetworkdig-chat`, whose `@` it then refuses as unsafe
    // in a file path. The AppImage build fails outright, so this is a real, previously-hit break
    // rather than a cosmetic preference.
    expect(pkg.name).toMatch(/^@/);
    expect(pkg.build.linux.executableName).toBe('dig-chat');
    expect(pkg.build.linux.executableName).not.toContain('@');
  });

  it('builds from the electron-vite output, so a stale tree cannot be packaged as the app', () => {
    expect(pkg.main).toBe('out/main/index.js');
    expect(pkg.build.files).toContain('out/**/*');
  });
});

describe("the build configuration, against electron-builder's own schema", () => {
  // The schema shipped by the INSTALLED electron-builder, so the answer comes from the version that
  // will actually run rather than from a table someone maintains by hand.
  const schema = createRequire(import.meta.url)('app-builder-lib/scheme.json');
  const ajv = new Ajv({ strict: false, allowUnionTypes: true, validateFormats: false });
  // The definitions cross-reference each other (`#/definitions/AsarOptions` and friends), so the
  // WHOLE document has to be registered; compiling one definition in isolation cannot resolve them.
  ajv.addSchema(schema, 'electron-builder');

  const validate = (definition, value) => {
    const check = ajv.compile({ $ref: `electron-builder#/definitions/${definition}` });
    return check(value) ? [] : check.errors.map((e) => `${e.instancePath} ${e.message}`);
  };

  it('accepts the linux section', () => {
    // electron-builder validates the whole config at BUILD time and rejects an unknown key outright.
    // `linux.desktopName` — which belongs at the ROOT, not under `linux` — failed a packaging run
    // exactly this way, after the config had already been pushed.
    expect(validate('LinuxConfiguration', pkg.build.linux)).toEqual([]);
  });

  it('accepts the windows section', () => {
    expect(validate('WindowsConfiguration', pkg.build.win)).toEqual([]);
  });

  it('rejects a key that is not in the schema, so the check is not vacuous', () => {
    // Ajv only reports an unknown property when the schema forbids extras. If this passed, every
    // assertion above would be green for any configuration at all.
    expect(
      validate('LinuxConfiguration', { ...pkg.build.linux, desktopName: 'x.desktop' }),
    ).not.toEqual([]);
  });
});
