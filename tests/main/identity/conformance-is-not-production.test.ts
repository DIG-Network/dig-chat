import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ChannelError } from '../../../src/main/pairing/errors';
import { PairedChannel, REQUESTED_CAPABILITIES } from '../../../src/main/pairing/client';
import { toBase64, type JsonValue } from '../../../src/main/pairing/frame';
import type { Channel, RequestFrame } from '../../../src/main/pairing/channel';

const SOURCE_ROOT = join(__dirname, '../../../src');

/** Every `.ts`/`.tsx` file under `src`, as paths relative to `src`. */
async function sourceFiles(directory = SOURCE_ROOT): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (/\.tsx?$/.test(entry.name)) found.push(relative(SOURCE_ROOT, path));
  }
  return found;
}

describe('the reference sealer is not a production path', () => {
  it('is imported by nothing in src', async () => {
    // THE guard rail on INV-1. `conformance.ts` can seal with any key you hand it, so
    // "just generate a local key and call it" is a two-line change that would give dig-chat its own
    // identity keys and dissolve the entire pairing boundary. Nothing in the app may reach it; the
    // tests and a future conformance harness may.
    const files = await sourceFiles();
    const offenders: string[] = [];

    for (const file of files) {
      if (file.replace(/\\/g, '/') === 'main/identity/conformance.ts') continue;
      const source = await readFile(join(SOURCE_ROOT, file), 'utf8');
      if (/from\s+['"][^'"]*conformance['"]/.test(source)) offenders.push(file);
    }

    expect(offenders).toEqual([]);
    // The scan is real: it found the files it was meant to scan.
    expect(files.length).toBeGreaterThan(10);
    expect(files.map((f) => f.replace(/\\/g, '/'))).toContain('main/identity/conformance.ts');
  });

  it('finds an import when there is one — the scan is not vacuous', async () => {
    // A regex that matched nothing would pass the test above forever. This proves it matches the
    // shape it is looking for.
    const pattern = /from\s+['"][^'"]*conformance['"]/;
    expect(pattern.test("import { sealReference } from './conformance';")).toBe(true);
    expect(pattern.test('import x from "../identity/conformance";')).toBe(true);
    expect(pattern.test("import { agent } from './agent';")).toBe(false);
  });
});

describe('dig-chat never reaches for the money power', () => {
  it('asks for no capability outside the identity class', () => {
    for (const capability of REQUESTED_CAPABILITIES) {
      expect(capability.startsWith('identity.')).toBe(true);
    }
    expect(REQUESTED_CAPABILITIES).not.toContain('sign.request');
  });

  it('refuses to put a sign.request frame on the wire, whoever asks', async () => {
    // Structural, not policy: the DIG App would refuse it anyway. The property is that a bug or a
    // compromised dependency INSIDE dig-chat cannot cause a money-moving request to be sent under a
    // pairing the user approved for chat.
    const sent: RequestFrame[] = [];
    const channel: Channel = {
      request: async (frame) => {
        sent.push(frame);
        return null as JsonValue;
      },
      close: () => undefined,
    };
    const paired = new PairedChannel(
      channel,
      {
        pairingId: 'p',
        channelTokenB64: toBase64(new Uint8Array(32)),
        // Even a pairing that somehow HELD the capability is refused locally — the fixture that
        // separates a structural refusal from one that merely mirrors the granted set.
        grantedCapabilities: ['identity.attest', 'sign.request'],
        pairedAt: 1,
      },
      () => 1_800_000_000,
    );

    await expect(paired.call('sign.request', {})).rejects.toBeInstanceOf(ChannelError);
    expect(sent).toHaveLength(0);

    // …and the control: an identity call DOES go out, so the refusal above is about the method and
    // not about a channel that refuses everything.
    await paired.call('identity.attest', {});
    expect(sent).toHaveLength(1);
  });
});
