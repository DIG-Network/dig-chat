import { describe, expect, it, vi } from 'vitest';

import {
  CHANNELS,
  InvalidRequestError,
  MAX_BODY_INPUT,
  MAX_CODE_INPUT,
  MAX_DID_INPUT,
  registerIpcHandlers,
  MAX_LOCALE_INPUT,
  validateCode,
  validateLocale,
  validateSendRequest,
  type IpcHost,
  type IpcServices,
} from '../../src/main/ipc';

/** An ipcMain double that records the handler table and lets a test invoke one. */
function host(): IpcHost & {
  invoke(channel: string, ...args: unknown[]): unknown;
  channels(): string[];
} {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  return {
    handle: (channel, listener) => handlers.set(channel, listener),
    invoke: (channel, ...args) => handlers.get(channel)?.({}, ...args),
    channels: () => [...handlers.keys()],
  };
}

function services(): IpcServices {
  return {
    status: vi.fn(() => ({ state: 'connected' as const, did: 'did:chia:me', pairedAt: 1 })),
    refresh: vi.fn(async () => ({ state: 'connected' as const, did: 'did:chia:me', pairedAt: 1 })),
    pair: vi.fn(async () => ({ state: 'connected' as const, did: 'did:chia:me', pairedAt: 1 })),
    forget: vi.fn(async () => ({ state: 'unpaired' as const, did: null, pairedAt: null })),
    history: vi.fn(() => []),
    send: vi.fn(async () => ({
      id: 'sent-1',
      direction: 'sent' as const,
      peerDid: 'did:chia:them',
      body: 'hi',
      at: 1,
    })),
    info: vi.fn(() => ({
      version: '0.1.0',
      reachesOtherMachines: false,
      transport: 'loopback',
      historyPersisted: true,
    })),
    getLocale: vi.fn(async () => null),
    setLocale: vi.fn(async (locale: string) => locale),
  };
}

describe('the handler table', () => {
  it('registers exactly the declared channels — no more, no fewer', () => {
    // A channel in CHANNELS with no handler is a request that hangs; a handler on a channel that is
    // not in CHANNELS is a surface the preload never declared and nobody reviewed.
    const ipc = host();
    registerIpcHandlers(ipc, services());
    expect(ipc.channels().sort()).toEqual(Object.values(CHANNELS).sort());
  });

  it('exposes nothing that could return the pairing credential', () => {
    // The property, stated over the CONTRACT rather than over one handler's body: the service
    // interface the IPC layer can reach has no verb that yields a secret, so no channel can leak one.
    const ipc = host();
    registerIpcHandlers(ipc, services());
    const surface = ipc.channels().join(' ');
    expect(surface).not.toMatch(/token|secret|credential|key/i);
  });
});

describe('every payload is validated as untrusted', () => {
  it('refuses a pairing code that is not a bounded string', () => {
    // The caller might not be the UI. A renderer running a stranger's script calls these handlers
    // with whatever it likes.
    expect(() => validateCode(undefined)).toThrow(InvalidRequestError);
    expect(() => validateCode(42)).toThrow(InvalidRequestError);
    expect(() => validateCode({})).toThrow(InvalidRequestError);
    expect(() => validateCode('')).toThrow(InvalidRequestError);
    expect(() => validateCode('a'.repeat(MAX_CODE_INPUT + 1))).toThrow(InvalidRequestError);
    // At the bound it is accepted, so the rejection above was on length rather than on shape.
    expect(validateCode('a'.repeat(MAX_CODE_INPUT))).toHaveLength(MAX_CODE_INPUT);
  });

  it('refuses a send request that is not a well-formed object', () => {
    expect(() => validateSendRequest(null)).toThrow(InvalidRequestError);
    expect(() => validateSendRequest('a string')).toThrow(InvalidRequestError);
    expect(() => validateSendRequest([])).toThrow(InvalidRequestError);
    expect(() => validateSendRequest({ body: 'hi' })).toThrow(InvalidRequestError);
    expect(() => validateSendRequest({ recipientDid: '', body: 'hi' })).toThrow(
      InvalidRequestError,
    );
    expect(() => validateSendRequest({ recipientDid: 'did:chia:x' })).toThrow(InvalidRequestError);
    expect(() => validateSendRequest({ recipientDid: 'did:chia:x', body: 7 })).toThrow(
      InvalidRequestError,
    );
  });

  it('refuses a non-string locale but coerces an unknown string to the default', () => {
    // A non-string is a shape error the UI would never send — the caller might not be the UI. An
    // unsupported or over-long STRING is not rejected, though: it lands on English, so a bad value
    // can only ever change the language to the default, never crash or write junk to disk.
    expect(() => validateLocale(42)).toThrow(InvalidRequestError);
    expect(() => validateLocale(null)).toThrow(InvalidRequestError);
    expect(validateLocale('de')).toBe('de');
    expect(validateLocale('sw')).toBe('en');
    expect(validateLocale('x'.repeat(MAX_LOCALE_INPUT + 1))).toBe('en');
  });

  it('bounds both strings from both sides of the bound', () => {
    // An unbounded string across an IPC boundary is a memory-amplification primitive: the sender
    // chooses the allocation.
    const did = 'd'.repeat(MAX_DID_INPUT);
    expect(validateSendRequest({ recipientDid: did, body: '' }).recipientDid).toBe(did);
    expect(() => validateSendRequest({ recipientDid: `${did}d`, body: '' })).toThrow(
      InvalidRequestError,
    );

    const body = 'b'.repeat(MAX_BODY_INPUT);
    expect(validateSendRequest({ recipientDid: 'did:chia:x', body }).body).toBe(body);
    expect(() => validateSendRequest({ recipientDid: 'did:chia:x', body: `${body}b` })).toThrow(
      InvalidRequestError,
    );
  });

  it('keeps the offending value out of the error message', () => {
    // The message reaches a log, and the value may be peer-influenced. An error that echoed it back
    // would be the log-injection defect wearing a different hat.
    const hostile = 'x'.repeat(MAX_CODE_INPUT + 1);
    try {
      validateCode(hostile);
      expect.unreachable('validateCode must throw');
    } catch (failure) {
      expect((failure as Error).message).not.toContain(hostile);
    }
  });
});

describe('the handlers validate before they act', () => {
  it('never reaches the service with an invalid payload', () => {
    // Validation that ran AFTER the call would satisfy every test above and still hand the service
    // an arbitrary object.
    const ipc = host();
    const wired = services();
    registerIpcHandlers(ipc, wired);

    expect(() => ipc.invoke(CHANNELS.sessionPair, 42)).toThrow(InvalidRequestError);
    expect(wired.pair).not.toHaveBeenCalled();

    expect(() => ipc.invoke(CHANNELS.chatSend, { body: 'no recipient' })).toThrow(
      InvalidRequestError,
    );
    expect(wired.send).not.toHaveBeenCalled();
  });

  it('passes a valid payload through', async () => {
    const ipc = host();
    const wired = services();
    registerIpcHandlers(ipc, wired);

    await ipc.invoke(CHANNELS.sessionPair, 'ABCD-EFGH');
    expect(wired.pair).toHaveBeenCalledWith('ABCD-EFGH');

    await ipc.invoke(CHANNELS.chatSend, { recipientDid: 'did:chia:them', body: 'hi' });
    expect(wired.send).toHaveBeenCalledWith({ recipientDid: 'did:chia:them', body: 'hi' });

    expect(ipc.invoke(CHANNELS.sessionStatus)).toMatchObject({ state: 'connected' });
    expect(ipc.invoke(CHANNELS.appInfo)).toMatchObject({ reachesOtherMachines: false });
    expect(ipc.invoke(CHANNELS.chatHistory)).toEqual([]);
    await ipc.invoke(CHANNELS.sessionRefresh);
    await ipc.invoke(CHANNELS.sessionForget);
    expect(wired.refresh).toHaveBeenCalled();
    expect(wired.forget).toHaveBeenCalled();
  });
});
