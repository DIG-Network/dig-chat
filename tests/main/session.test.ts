import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Session, type ConnectionState } from '../../src/main/session';
import type { Channel, ChannelFactory, RequestFrame } from '../../src/main/pairing/channel';
import type { PairingCredential } from '../../src/main/pairing/client';
import { ChannelError, ChannelUnreachableError } from '../../src/main/pairing/errors';
import { IdentityUnsupportedError, type IdentityAgent } from '../../src/main/identity/agent';
import type { CredentialStore } from '../../src/main/storage/credentials';
import { toBase64, type JsonValue } from '../../src/main/pairing/frame';

const NOW = 1_800_000_000;
const TOKEN = toBase64(new Uint8Array(32).fill(4));

const IDENTITY = {
  did: 'did:chia:me',
  sealingPublicKey: new Uint8Array(32).fill(9),
  attestationB64: 'c2ln',
};

function credential(over: Partial<PairingCredential> = {}): PairingCredential {
  return {
    pairingId: 'pairing-1',
    channelTokenB64: TOKEN,
    grantedCapabilities: ['identity.attest', 'identity.seal', 'identity.unseal'],
    pairedAt: NOW,
    ...over,
  };
}

/** A credential store double backed by one in-memory slot. */
function credentialStore(initial: PairingCredential | null = null) {
  let held = initial;
  return {
    load: vi.fn(async () => held),
    save: vi.fn(async (value: PairingCredential) => {
      held = value;
    }),
    clear: vi.fn(async () => {
      held = null;
    }),
    exists: vi.fn(async () => held !== null),
    get held() {
      return held;
    },
  } as unknown as CredentialStore & { held: PairingCredential | null };
}

class FakeChannel implements Channel {
  readonly sent: RequestFrame[] = [];
  closed = false;

  constructor(private readonly script: Array<JsonValue | Error> = []) {}

  async request(frame: RequestFrame): Promise<JsonValue> {
    this.sent.push(frame);
    const next = this.script.shift();
    if (next instanceof Error) throw next;
    return next ?? null;
  }

  close(): void {
    this.closed = true;
  }
}

/** A channel factory that hands out a scripted channel, or refuses to open at all. */
function channels(...opened: Array<Channel | Error>): ChannelFactory & { opens: number } {
  let opens = 0;
  return {
    get opens() {
      return opens;
    },
    async open() {
      const next = opened[opens++] ?? new ChannelUnreachableError('no more channels');
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

/** An identity agent double whose `attest` can succeed or fail per test. */
function agent(attest: () => Promise<typeof IDENTITY>): IdentityAgent {
  return {
    attest,
    seal: vi.fn(async () => new Uint8Array()),
    unseal: vi.fn(async () => ({ senderDid: 'did:chia:them', plaintext: new Uint8Array() })),
  };
}

function sessionWith(over: {
  channels: ChannelFactory;
  credentials: CredentialStore;
  attest?: () => Promise<typeof IDENTITY>;
}) {
  return new Session({
    channels: over.channels,
    credentials: over.credentials,
    now: () => NOW,
    agentFor: () => agent(over.attest ?? (async () => IDENTITY)),
  });
}

describe('the five states are five different facts', () => {
  it('starts as checking, not as unpaired', () => {
    // The state an implementation naturally omits. Before the first probe returns, dig-chat does not
    // KNOW whether it is paired — reporting `unpaired` would render an unknown as a definite fact,
    // and would flash "you are not paired" at a user who is.
    const session = sessionWith({ channels: channels(), credentials: credentialStore() });
    expect(session.status().state).toBe<ConnectionState>('checking');
    expect(session.status().did).toBeNull();
  });

  it('is unpaired when there is no stored credential', async () => {
    const store = credentialStore(null);
    const factory = channels(new FakeChannel());
    const session = sessionWith({ channels: factory, credentials: store });

    expect((await session.refresh()).state).toBe<ConnectionState>('unpaired');
    // …and it did not dial: there is nothing to authenticate with, so opening a socket would be
    // noise that could only report a misleading failure.
    expect(factory.opens).toBe(0);
  });

  it('is app-unreachable — not unpaired — when a pairing exists but nothing answers', async () => {
    // The distinction the whole file exists for. "Your DIG App is not running" and "you have never
    // paired" send a person to two completely different actions.
    const store = credentialStore(credential());
    const session = sessionWith({
      channels: channels(new ChannelUnreachableError('nothing listening')),
      credentials: store,
    });

    const status = await session.refresh();
    expect(status.state).toBe<ConnectionState>('app-unreachable');
    expect(status.pairedAt).toBe(NOW);
    // The credential SURVIVES: a DIG App that is merely closed must not cost the user their pairing.
    expect(store.clear).not.toHaveBeenCalled();
  });

  it('is identity-unsupported when the DIG App answers but has no identity capability', async () => {
    // Today's reality against every shipped DIG App: the channel is fine, the pairing is fine, and
    // `identity.attest` comes back as method-not-found. Reporting that as "unreachable" would send
    // the user to restart an app that is already running.
    const session = sessionWith({
      channels: channels(new FakeChannel()),
      credentials: credentialStore(credential()),
      attest: async () => {
        throw new IdentityUnsupportedError('identity.attest');
      },
    });

    expect((await session.refresh()).state).toBe<ConnectionState>('identity-unsupported');
  });

  it('is connected only once the identity capability has actually answered', async () => {
    // The nearest wrong implementation calls a session connected because a SOCKET opened. That
    // reports a link that cannot do anything, so the fixture is a channel that opens perfectly and
    // an attest that fails.
    const openedFine = new FakeChannel();
    const optimistic = sessionWith({
      channels: channels(openedFine),
      credentials: credentialStore(credential()),
      attest: async () => {
        throw new ChannelUnreachableError('the socket dropped mid-probe');
      },
    });
    expect((await optimistic.refresh()).state).not.toBe<ConnectionState>('connected');

    const working = sessionWith({
      channels: channels(new FakeChannel()),
      credentials: credentialStore(credential()),
    });
    const status = await working.refresh();
    expect(status.state).toBe<ConnectionState>('connected');
    expect(status.did).toBe('did:chia:me');
  });

  it('reports unreachable rather than connected for a failure it does not recognise', async () => {
    // The one direction of error that must never happen is a lying green light.
    const session = sessionWith({
      channels: channels(new FakeChannel()),
      credentials: credentialStore(credential()),
      attest: async () => {
        throw new Error('something nobody anticipated');
      },
    });
    expect((await session.refresh()).state).toBe<ConnectionState>('app-unreachable');
  });
});

describe('a revoked pairing', () => {
  it('clears the dead credential and asks for a new code', async () => {
    // Revocation from the DIG App's menu kills the channel immediately; the next frame comes back
    // AUTH_REQUIRED. Keeping the credential would loop the user through an app that answers nothing,
    // so the honest result is `unpaired` — which is both true and actionable.
    const store = credentialStore(credential());
    const session = sessionWith({
      channels: channels(new FakeChannel()),
      credentials: store,
      attest: async () => {
        throw new ChannelError('AUTH_REQUIRED', -33001, 'error.authRequired');
      },
    });

    expect((await session.refresh()).state).toBe<ConnectionState>('unpaired');
    expect(store.clear).toHaveBeenCalled();
    expect(store.held).toBeNull();
  });

  it('does NOT clear the credential when the app is merely closed', async () => {
    // The control for the test above. A single `catch` that cleared on every failure would satisfy
    // the revocation test and quietly unpair everyone whose DIG App was not running.
    const store = credentialStore(credential());
    const session = sessionWith({
      channels: channels(new ChannelUnreachableError('closed')),
      credentials: store,
    });

    await session.refresh();
    expect(store.held).not.toBeNull();
  });
});

describe('pairWithCode', () => {
  let store: ReturnType<typeof credentialStore>;

  beforeEach(() => {
    store = credentialStore(null);
  });

  it('stores the credential before it reports success', async () => {
    // A pairing that worked and was not saved comes back `unpaired` next launch with no
    // explanation, and the user spends another code to find out.
    const pairing = new FakeChannel([
      {
        pairing_id: 'pairing-1',
        channel_token_b64: TOKEN,
        granted_capabilities: ['identity.attest', 'identity.seal', 'identity.unseal'],
      },
    ]);
    const session = sessionWith({
      channels: channels(pairing, new FakeChannel()),
      credentials: store,
    });

    const status = await session.pairWithCode('ABCDEFGH');

    expect(store.save).toHaveBeenCalled();
    expect(store.held?.pairingId).toBe('pairing-1');
    expect(status.state).toBe<ConnectionState>('connected');
  });

  it('closes the pairing channel whether pairing succeeded or was refused', async () => {
    // A socket left open on the failure path leaks a handle per attempt, and a person who mistypes
    // gets several attempts.
    const refused = new FakeChannel([
      new ChannelError('PAIR_CODE_REJECTED', -33012, 'error.pairCodeRejected'),
    ]);
    const session = sessionWith({ channels: channels(refused), credentials: store });

    await expect(session.pairWithCode('ABCDEFGH')).rejects.toBeInstanceOf(ChannelError);
    expect(refused.closed).toBe(true);
    expect(store.save).not.toHaveBeenCalled();
  });

  it('lets the DIG App not being open surface as unreachable rather than as a bad code', async () => {
    const session = sessionWith({
      channels: channels(new ChannelUnreachableError('nothing listening')),
      credentials: store,
    });
    await expect(session.pairWithCode('ABCDEFGH')).rejects.toBeInstanceOf(ChannelUnreachableError);
  });
});

describe('forgetPairing', () => {
  it('clears the credential and returns to unpaired', async () => {
    const store = credentialStore(credential());
    const session = sessionWith({ channels: channels(new FakeChannel()), credentials: store });
    await session.refresh();

    expect((await session.forgetPairing()).state).toBe<ConnectionState>('unpaired');
    expect(store.held).toBeNull();
    expect(session.identityAgent()).toBeNull();
    expect(session.currentIdentity()).toBeNull();
  });
});

describe('the identity agent is only offered when it can be used', () => {
  it('is null unless the session is connected', async () => {
    const unreachable = sessionWith({
      channels: channels(new ChannelUnreachableError('closed')),
      credentials: credentialStore(credential()),
    });
    await unreachable.refresh();
    expect(unreachable.identityAgent()).toBeNull();

    const connected = sessionWith({
      channels: channels(new FakeChannel()),
      credentials: credentialStore(credential()),
    });
    await connected.refresh();
    expect(connected.identityAgent()).not.toBeNull();
    connected.close();
  });
});
