import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  HISTORY_FILE,
  HistoryStorageUnavailableError,
  HistoryStore,
} from '../../../src/main/storage/history';
import { MAX_HISTORY_MESSAGES } from '../../../src/main/chat/conversation';
import type { ChatMessage } from '../../../src/main/chat/conversation';
import type { SecretSealer } from '../../../src/main/storage/credentials';

/**
 * A sealer double that really transforms the bytes, so "is it ciphertext at rest" asserts about the
 * store and not about a passthrough double. XOR is not encryption, but it proves the sealer's output —
 * not the plaintext — reached disk. Mirrors the credential-store test's double.
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

function message(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'sent-1',
    direction: 'sent',
    peerDid: 'did:chia:bob',
    body: 'the vault combination is not going in a log file',
    at: 1_800_000_000_000,
    ...over,
  };
}

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'dig-chat-history-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('history at rest', () => {
  it('round-trips the whole conversation through the OS sealer', async () => {
    const store = new HistoryStore(directory, xorSealer());
    const history = [
      message({ id: 'sent-1', direction: 'sent', body: 'hello' }),
      message({ id: 'received-2', direction: 'received', peerDid: 'did:chia:alice', body: 'hi' }),
    ];
    await store.save(history);
    expect(await store.load()).toEqual(history);
  });

  it('never writes a message body in the clear', async () => {
    // THE at-rest assertion. The double is a real transformation, so this cannot pass for a store
    // that skipped the sealer.
    const secret = 'the vault combination is not going in a log file';
    const store = new HistoryStore(directory, xorSealer());
    await store.save([message({ body: secret })]);

    const onDisk = await readFile(join(directory, HISTORY_FILE));
    expect(onDisk.toString('utf8')).not.toContain(secret);
    expect(onDisk.toString('utf8')).not.toContain('did:chia:bob');
  });

  it('refuses to store anything when the OS offers no encryption, and writes no file', async () => {
    // The refuse-and-tell degrade: no cleartext file, and the caller learns it must run in memory.
    const store = new HistoryStore(directory, xorSealer(false));
    expect(store.isAvailable()).toBe(false);
    await expect(store.save([message()])).rejects.toBeInstanceOf(HistoryStorageUnavailableError);

    await expect(readFile(join(directory, HISTORY_FILE))).rejects.toThrow();
    expect(await store.load()).toEqual([]);
  });

  it('bounds the stored history, evicting the oldest beyond the count', async () => {
    const store = new HistoryStore(directory, xorSealer());
    const many = Array.from({ length: MAX_HISTORY_MESSAGES + 25 }, (_unused, index) =>
      message({ id: `sent-${index}`, body: `message ${index}` }),
    );
    await store.save(many);

    const loaded = await store.load();
    expect(loaded).toHaveLength(MAX_HISTORY_MESSAGES);
    // The newest survive; the oldest 25 are gone.
    expect(loaded[0]!.id).toBe('sent-25');
    expect(loaded.at(-1)!.id).toBe(`sent-${MAX_HISTORY_MESSAGES + 24}`);
  });

  it('re-sanitises peer text on load, so a tampered file cannot reintroduce raw bytes', async () => {
    // The store is a file another process could edit. A hostile DID/body written straight into it must
    // still be neutralised on the way back in, exactly as if it had just arrived from a peer (§5.4).
    const sealer = xorSealer();
    const ESC = String.fromCharCode(0x1b);
    const OVERRIDE = String.fromCharCode(0x202e);
    const tampered = {
      v: 1,
      messages: [
        {
          id: 'received-1',
          direction: 'received',
          peerDid: 'did:chia:evil\nFAKE LOG LINE',
          body: `body${ESC}[2J${OVERRIDE}reversed`,
          at: 1,
        },
      ],
    };
    await writeFile(join(directory, HISTORY_FILE), sealer.encryptString(JSON.stringify(tampered)));

    const [loaded] = await new HistoryStore(directory, sealer).load();
    expect(loaded!.peerDid).not.toContain('\n');
    expect(loaded!.body).not.toContain(ESC);
    expect(loaded!.body).not.toContain(OVERRIDE);
    expect(loaded!.body).toBe('body[2Jreversed');
  });

  it('drops entries that are not well-formed messages', async () => {
    const sealer = xorSealer();
    await writeFile(
      join(directory, HISTORY_FILE),
      sealer.encryptString(
        JSON.stringify({
          v: 1,
          messages: [message(), { id: 'x', direction: 'sideways' }, 7, null, { body: 'no id' }],
        }),
      ),
    );
    expect(await new HistoryStore(directory, sealer).load()).toEqual([message()]);
  });

  it('returns an empty history for every unreadable case, never throwing', async () => {
    const store = new HistoryStore(directory, xorSealer());
    const path = join(directory, HISTORY_FILE);

    expect(await store.load()).toEqual([]); // no file at all

    await writeFile(path, Buffer.from('not sealed json at all'));
    expect(await store.load()).toEqual([]); // decrypts to garbage

    const sealer = xorSealer();
    await writeFile(path, sealer.encryptString(JSON.stringify({ v: 99, messages: [] })));
    expect(await new HistoryStore(directory, sealer).load()).toEqual([]); // unknown version

    await writeFile(path, sealer.encryptString(JSON.stringify({ v: 1, messages: 'nope' })));
    expect(await new HistoryStore(directory, sealer).load()).toEqual([]); // messages not an array
  });

  it('returns empty when encryption became unavailable after the file was written', async () => {
    const store = new HistoryStore(directory, xorSealer());
    await store.save([message()]);
    expect(await new HistoryStore(directory, xorSealer(false)).load()).toEqual([]);
  });

  it.runIf(process.platform !== 'win32')('writes the file 0600, atomically', async () => {
    const store = new HistoryStore(directory, xorSealer());
    await store.save([message()]);
    expect((await stat(join(directory, HISTORY_FILE))).mode & 0o777).toBe(0o600);
    // The temp file must not be left behind.
    await expect(stat(join(directory, `${HISTORY_FILE}.tmp`))).rejects.toThrow();
  });

  it.runIf(process.platform !== 'win32')(
    'keeps 0600 when an existing file is overwritten',
    async () => {
      const store = new HistoryStore(directory, xorSealer());
      await writeFile(join(directory, HISTORY_FILE), 'stale', { mode: 0o644 });
      await store.save([message()]);
      expect((await stat(join(directory, HISTORY_FILE))).mode & 0o777).toBe(0o600);
    },
  );

  it('clears the stored history and is idempotent', async () => {
    const store = new HistoryStore(directory, xorSealer());
    await store.save([message()]);
    await store.clear();
    expect(await store.load()).toEqual([]);
    await store.clear(); // clearing what is already gone is a success
  });
});

describe('clearConversation', () => {
  it('removes only the messages of the named peer, keeping the rest', async () => {
    const store = new HistoryStore(directory, xorSealer());
    await store.save([
      message({ id: 'a', peerDid: 'did:chia:bob' }),
      message({ id: 'b', peerDid: 'did:chia:alice' }),
      message({ id: 'c', peerDid: 'did:chia:bob' }),
    ]);

    await store.clearConversation('did:chia:bob');

    const remaining = await store.load();
    expect(remaining.map((m) => m.id)).toEqual(['b']);
  });

  it('matches on the sanitised form of the argument, not the raw bytes', async () => {
    const store = new HistoryStore(directory, xorSealer());
    await store.save([message({ id: 'a', peerDid: 'did:chia:bob' })]);
    // A caller passing a DID with a stray control byte still clears the stored (sanitised) peer.
    await store.clearConversation('did:chia:bob\n');
    expect(await store.load()).toEqual([]);
  });

  it('is a no-op for a peer with no messages', async () => {
    const store = new HistoryStore(directory, xorSealer());
    await store.save([message({ id: 'a', peerDid: 'did:chia:bob' })]);
    await store.clearConversation('did:chia:nobody');
    expect((await store.load()).map((m) => m.id)).toEqual(['a']);
  });
});
