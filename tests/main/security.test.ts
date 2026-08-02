import { describe, expect, it } from 'vitest';

import {
  CONTENT_SECURITY_POLICY,
  SECURE_WEB_PREFERENCES,
  isInternalNavigation,
  mayOpenExternally,
} from '../../src/main/security';
import {
  CHANNELS,
  InvalidRequestError,
  MAX_BODY_INPUT,
  MAX_CODE_INPUT,
  MAX_DID_INPUT,
  registerIpcHandlers,
  validateCode,
  validateSendRequest,
  type IpcHost,
  type IpcServices,
} from '../../src/main/ipc';

describe('the renderer is confined', () => {
  it('runs with no Node, an isolated context, and the OS sandbox', () => {
    // This app talks to a custody surface and renders text a stranger wrote. Each of these three is
    // the difference between "an injection shows the wrong words" and "an injection owns the machine".
    expect(SECURE_WEB_PREFERENCES.contextIsolation).toBe(true);
    expect(SECURE_WEB_PREFERENCES.nodeIntegration).toBe(false);
    expect(SECURE_WEB_PREFERENCES.sandbox).toBe(true);
    expect(SECURE_WEB_PREFERENCES.nodeIntegrationInWorker).toBe(false);
    expect(SECURE_WEB_PREFERENCES.nodeIntegrationInSubFrames).toBe(false);
    expect(SECURE_WEB_PREFERENCES.webSecurity).toBe(true);
    expect(SECURE_WEB_PREFERENCES.webviewTag).toBe(false);
  });
});

describe('the content security policy', () => {
  it('permits no remote code and no string execution', () => {
    // `unsafe-eval` or a remote script host would each turn an injected string into running code,
    // which is the whole thing the policy exists to prevent.
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src[^;]*https?:/);
  });

  it('lets the renderer reach exactly one remote origin', () => {
    // The bug-report API and nothing else. Notably NOT the identity loopback: that is spoken by the
    // main process, so a renderer that tried would be doing something it has no business doing.
    expect(CONTENT_SECURITY_POLICY).toContain('connect-src https://api.bugreport.dig.net');
    expect(CONTENT_SECURITY_POLICY).not.toContain('9779');
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/connect-src[^;]*\*/);
  });

  it('cannot be framed and cannot navigate itself away', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });
});

describe('navigation', () => {
  const APP = 'app://dig-chat/index.html';

  it('refuses to navigate the window anywhere but the app itself', () => {
    // A stranger's message can contain a link. Navigating the window would replace dig-chat's UI
    // with their page, inside a frame the user believes is dig-chat.
    expect(isInternalNavigation('app://dig-chat/index.html', APP)).toBe(true);
    expect(isInternalNavigation('https://evil.example/login', APP)).toBe(false);
    expect(isInternalNavigation('file:///etc/passwd', APP)).toBe(false);
    expect(isInternalNavigation('not a url', APP)).toBe(false);
  });

  it('hands only https links to the OS browser', () => {
    // An allowlist, not a blocklist: `file:` opens a local file and the platform handler schemes
    // have each been an execution vector. A peer supplies these strings.
    expect(mayOpenExternally('https://docs.dig.net')).toBe(true);
    expect(mayOpenExternally('http://insecure.example')).toBe(false);
    expect(mayOpenExternally('file:///C:/Windows/System32/calc.exe')).toBe(false);
    expect(mayOpenExternally('ms-msdt:/id PCWDiagnostic')).toBe(false);
    expect(mayOpenExternally('javascript:alert(1)')).toBe(false);
    expect(mayOpenExternally('')).toBe(false);
  });
});

describe('IPC payloads are untrusted input', () => {
  it('refuses a pairing code that is not a bounded string', () => {
    // The caller might not be our UI. If a rendered message ever becomes script execution, this is
    // the surface it calls, with arguments of its choosing.
    expect(() => validateCode('ABCD-EFGH')).not.toThrow();
    expect(() => validateCode(undefined)).toThrow(InvalidRequestError);
    expect(() => validateCode(42)).toThrow(InvalidRequestError);
    expect(() => validateCode({ toString: () => 'ABCDEFGH' })).toThrow(InvalidRequestError);
    expect(() => validateCode('')).toThrow(InvalidRequestError);
    expect(() => validateCode('A'.repeat(MAX_CODE_INPUT + 1))).toThrow(InvalidRequestError);
    // Pinned from both sides: at the bound it is accepted.
    expect(() => validateCode('A'.repeat(MAX_CODE_INPUT))).not.toThrow();
  });

  it('refuses a malformed send request', () => {
    expect(validateSendRequest({ recipientDid: 'did:chia:bob', body: 'hi' })).toEqual({
      recipientDid: 'did:chia:bob',
      body: 'hi',
    });
    expect(() => validateSendRequest(null)).toThrow(InvalidRequestError);
    expect(() => validateSendRequest([])).toThrow(InvalidRequestError);
    expect(() => validateSendRequest('did:chia:bob')).toThrow(InvalidRequestError);
    expect(() => validateSendRequest({ body: 'hi' })).toThrow(InvalidRequestError);
    expect(() => validateSendRequest({ recipientDid: '', body: 'hi' })).toThrow(
      InvalidRequestError,
    );
    expect(() => validateSendRequest({ recipientDid: 'did:chia:bob' })).toThrow(
      InvalidRequestError,
    );
    expect(() => validateSendRequest({ recipientDid: 'did:chia:bob', body: 7 })).toThrow(
      InvalidRequestError,
    );
  });

  it('bounds both strings, so neither is a memory amplifier', () => {
    expect(() =>
      validateSendRequest({ recipientDid: 'd'.repeat(MAX_DID_INPUT + 1), body: 'hi' }),
    ).toThrow(InvalidRequestError);
    expect(() =>
      validateSendRequest({ recipientDid: 'did:chia:bob', body: 'x'.repeat(MAX_BODY_INPUT + 1) }),
    ).toThrow(InvalidRequestError);
    // …and at each bound it is accepted, so the bounds are real rather than "anything long fails".
    expect(() =>
      validateSendRequest({
        recipientDid: 'd'.repeat(MAX_DID_INPUT),
        body: 'x'.repeat(MAX_BODY_INPUT),
      }),
    ).not.toThrow();
  });

  it('keeps the refusal message free of the value it refused', () => {
    // The message reaches a log, and the value may be peer-influenced. Echoing it back would be the
    // log-injection defect wearing an error message.
    const failure = (() => {
      try {
        validateSendRequest({ recipientDid: 'did:chia:evil\nFAKE LOG', body: 'x'.repeat(999_999) });
      } catch (error) {
        return error as Error;
      }
      throw new Error('expected a refusal');
    })();
    expect(failure.message).not.toContain('FAKE LOG');
    expect(failure.message).not.toContain('\n');
  });
});

describe('the exposed surface is a closed list', () => {
  it('registers a handler for every channel and nothing else', () => {
    // A channel with no handler is a request that hangs; a handler with no channel is a surface
    // nobody reviewed. The table is checked against itself rather than trusted.
    const registered = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
    const host: IpcHost = { handle: (channel, listener) => void registered.set(channel, listener) };

    registerIpcHandlers(host, services());

    expect([...registered.keys()].sort()).toEqual([...Object.values(CHANNELS)].sort());
  });

  it('validates at the handler, not merely in a helper nobody calls', () => {
    // The failure this catches is real: exported validators that the registration forgot to use.
    const registered = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
    const host: IpcHost = { handle: (channel, listener) => void registered.set(channel, listener) };
    const calls: string[] = [];

    registerIpcHandlers(host, {
      ...services(),
      pair: async (code) => {
        calls.push(code);
        return services().status();
      },
    });

    expect(() => registered.get(CHANNELS.sessionPair)!({}, 12345)).toThrow(InvalidRequestError);
    expect(() => registered.get(CHANNELS.chatSend)!({}, { body: 'no recipient' })).toThrow(
      InvalidRequestError,
    );
    expect(calls).toHaveLength(0);
  });
});

function services(): IpcServices {
  const status = { state: 'unpaired' as const, did: null, pairedAt: null };
  return {
    status: () => status,
    refresh: async () => status,
    pair: async () => status,
    forget: async () => status,
    history: () => [],
    send: async () => ({
      id: 'sent-1',
      direction: 'sent' as const,
      peerDid: 'did:chia:bob',
      body: 'hi',
      at: 0,
    }),
    info: () => ({
      version: '0.1.0',
      reachesOtherMachines: false,
      transport: 'loopback',
      historyPersisted: true,
    }),
  };
}
