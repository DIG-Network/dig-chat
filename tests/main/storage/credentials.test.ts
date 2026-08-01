import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CREDENTIAL_FILE,
  CredentialStorageUnavailableError,
  CredentialStore,
  type SecretSealer,
} from '../../../src/main/storage/credentials';
import type { PairingCredential } from '../../../src/main/pairing/client';
import { toBase64 } from '../../../src/main/pairing/frame';

const SECRET = toBase64(new Uint8Array(32).fill(0x5a));

const CREDENTIAL: PairingCredential = {
  pairingId: 'pairing-1',
  channelTokenB64: SECRET,
  grantedCapabilities: ['identity.attest', 'identity.seal', 'identity.unseal'],
  pairedAt: 1_800_000_000,
};

/**
 * A sealer double that really transforms the bytes.
 *
 * A double that returned the plaintext unchanged would make the "is it ciphertext at rest" test pass
 * for a store that never encrypted anything — the assertion would be about the double, not the code.
 * XOR is not encryption, but it is enough to prove the store PUT the sealer's output on disk rather
 * than the plaintext.
 */
function xorSealer(available = true): SecretSealer {
  const mask = 0x5c;
  return {
    isEncryptionAvailable: () => available,
    encryptString: (plaintext) =>
      Buffer.from([...Buffer.from(plaintext, 'utf8')].map((byte) => byte ^ mask)),
    decryptString: (ciphertext) =>
      Buffer.from([...ciphertext].map((byte) => byte ^ mask)).toString('utf8'),
  };
}

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'dig-chat-credentials-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('the credential at rest', () => {
  it('round-trips through the OS sealer', async () => {
    const store = new CredentialStore(directory, xorSealer());
    await store.save(CREDENTIAL);
    expect(await store.load()).toEqual(CREDENTIAL);
  });

  it('never writes the channel secret in the clear', async () => {
    // THE assertion. The fixture is a real transformation (above) so this cannot pass for a store
    // that skipped the sealer.
    const store = new CredentialStore(directory, xorSealer());
    await store.save(CREDENTIAL);

    const onDisk = await readFile(join(directory, CREDENTIAL_FILE));
    expect(onDisk.includes(SECRET)).toBe(false);
    expect(onDisk.toString('utf8')).not.toContain('pairing-1');
    expect(onDisk.toString('base64')).not.toContain(SECRET);
  });

  it('refuses to store anything when the OS offers no encryption', async () => {
    // Refusing is the behaviour, not falling back to plaintext. A store that "helpfully" degraded
    // would leave a channel secret in a home directory and say nothing.
    const store = new CredentialStore(directory, xorSealer(false));
    await expect(store.save(CREDENTIAL)).rejects.toBeInstanceOf(CredentialStorageUnavailableError);

    await expect(readFile(join(directory, CREDENTIAL_FILE))).rejects.toThrow();
    expect(await store.load()).toBeNull();
  });

  it.runIf(process.platform !== 'win32')('writes the file 0600', async () => {
    // POSIX only: Windows does not carry these mode bits, and asserting them there would be a test
    // that passes by accident.
    const store = new CredentialStore(directory, xorSealer());
    await store.save(CREDENTIAL);
    const mode = (await stat(join(directory, CREDENTIAL_FILE))).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it.runIf(process.platform !== 'win32')(
    'keeps 0600 when an existing file is overwritten',
    async () => {
      // `writeFile`'s `mode` is IGNORED for a file that already exists, so a store that relied on it
      // alone would be 0600 on the first save and whatever the umask allowed on the second.
      const store = new CredentialStore(directory, xorSealer());
      await writeFile(join(directory, CREDENTIAL_FILE), 'stale', { mode: 0o644 });
      await store.save(CREDENTIAL);
      expect((await stat(join(directory, CREDENTIAL_FILE))).mode & 0o777).toBe(0o600);
    },
  );
});

describe('loading something that is not a usable credential', () => {
  it('returns null rather than throwing, for every unusable case', async () => {
    // A corrupt credential file must not be a launch failure. Each of these means one thing to the
    // app — there is no pairing — so each must produce the same, quiet answer.
    const store = new CredentialStore(directory, xorSealer());
    const path = join(directory, CREDENTIAL_FILE);

    expect(await store.load()).toBeNull(); // no file at all

    await writeFile(path, Buffer.from('not sealed json at all'));
    expect(await store.load()).toBeNull(); // decrypts to garbage

    const sealer = xorSealer();
    await writeFile(path, sealer.encryptString('{"v":1}')); // right shape, missing fields
    expect(await store.load()).toBeNull();

    await writeFile(path, sealer.encryptString(JSON.stringify({ ...CREDENTIAL, v: 99 })));
    expect(await store.load()).toBeNull(); // a version this build does not know
  });

  it('returns null when encryption became unavailable after the file was written', async () => {
    const store = new CredentialStore(directory, xorSealer());
    await store.save(CREDENTIAL);

    const degraded = new CredentialStore(directory, xorSealer(false));
    expect(await degraded.load()).toBeNull();
  });

  it('drops non-string entries from a tampered capability list', async () => {
    const sealer = xorSealer();
    await writeFile(
      join(directory, CREDENTIAL_FILE),
      sealer.encryptString(
        JSON.stringify({ ...CREDENTIAL, v: 1, grantedCapabilities: ['identity.seal', 7, null] }),
      ),
    );
    const store = new CredentialStore(directory, sealer);
    expect((await store.load())?.grantedCapabilities).toEqual(['identity.seal']);
  });
});

describe('clear and exists', () => {
  it('forgets the pairing and is idempotent', async () => {
    const store = new CredentialStore(directory, xorSealer());
    await store.save(CREDENTIAL);
    expect(await store.exists()).toBe(true);

    await store.clear();
    expect(await store.exists()).toBe(false);
    expect(await store.load()).toBeNull();
    await store.clear(); // clearing what is already gone is a success
  });
});
