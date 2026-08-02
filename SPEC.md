# dig-chat — normative specification

This document is the contract an independent implementation of DIG Chat could be built against. It
states what IS, what MUST hold, and what MUST NOT happen. It is not a guide and not a roadmap.

Cross-references: `SYSTEM.md` (the ecosystem interaction map), dig-app's `SPEC.md` §5.6 (the identity
loopback channel), NC-1 (the `normative-contract` skill), dig_ecosystem#1848 (pairing) and
dig_ecosystem#1913 (the identity capability decision).

---

## 1. What dig-chat is

dig-chat is a desktop application. It sends and receives messages that are end-to-end encrypted to a
recipient's DID-anchored identity key.

dig-chat is a **third-party paired app**. It is not part of the DIG App and not part of dig-node. It
obtains identity operations exclusively through the DIG App's pairing channel.

### 1.1 Invariants

- **INV-1.** dig-chat MUST NOT hold, derive, generate or persist any private key belonging to the
  user's DIG identity or wallet.
- **INV-2.** dig-chat MUST NOT request, send or accept the `sign.request` capability. That capability
  authorises spending; chat has no use for it.
- **INV-3.** Every directed message MUST be sealed to the recipient's DID-anchored identity key
  before it is handed to any transport (NC-1). An intermediary that terminates TLS MUST see
  ciphertext only.
- **INV-4.** dig-chat MUST NOT cause a pairing prompt to exist. A pairing begins only with a code the
  user generated in the DIG App and carried to dig-chat.
- **INV-5.** The pairing credential MUST NOT be readable by the renderer process, MUST NOT appear in
  any log, and MUST NOT be written unencrypted to disk.

---

## 2. Pairing

### 2.1 The channel

dig-chat connects to the DIG App identity loopback channel: a WebSocket carrying JSON-RPC 2.0 text
frames.

| property            | value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| port                | `9779`                                                                                      |
| endpoints, in order | `ws://[::1]:9779`, then `ws://127.0.0.1:9779`                                               |
| `Host` header       | the endpoint's authority verbatim — one of `[::1]:9779`, `127.0.0.1:9779`, `localhost:9779` |
| `Origin` header     | ABSENT                                                                                      |

The `Origin` header MUST be absent. The DIG App admits a caller that sends no `Origin` on the
inference that browsers always attach one, so its absence identifies a native client. It follows that
the channel MUST be opened from the main process; a renderer's WebSocket would attach an `Origin` and
be refused.

IPv6 is tried first (ecosystem §5.2). A connection failure on one family MUST fall through to the
other; both failing means the DIG App is not running.

### 2.2 The pairing code

The DIG App mints the code and displays it to the user. dig-chat MUST NOT have any way to request
one.

| property     | value                                                |
| ------------ | ---------------------------------------------------- |
| alphabet     | Crockford base32: `0123456789ABCDEFGHJKMNPQRSTVWXYZ` |
| length       | 8 symbols                                            |
| time to live | 120 seconds from issue                               |
| attempts     | 5; the fifth failure DESTROYS the code               |
| uses         | 1                                                    |

Before sending, dig-chat normalises what the user typed: uppercase; `I` and `L` fold to `1`; `O`
folds to `0`; every character outside the alphabet is dropped. A candidate that does not normalise to
exactly 8 symbols MUST be refused locally and MUST NOT be sent, because each refused redemption
consumes one of the five attempts.

### 2.3 `pair.begin`

Sent without an `auth` object — there is no pairing yet to authenticate against.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "pair.begin",
  "params": {
    "ext_id": "net.dig.chat",
    "ext_label": "DIG Chat",
    "pairing_code": "ABCDEFGH",
    "requested_capabilities": ["identity.attest", "identity.seal", "identity.unseal"]
  }
}
```

`requested_capabilities` MUST NOT contain `sign.request` (INV-2).

The result:

```json
{
  "pairing_id": "<uuid>",
  "channel_token_b64": "<base64 of 32 bytes>",
  "granted_capabilities": ["identity.attest", "identity.seal", "identity.unseal"]
}
```

- `channel_token_b64` MUST decode to exactly 32 bytes. Anything else is a broken channel, not a
  pairing, and MUST NOT be stored.
- An ABSENT `granted_capabilities` MUST be read as the empty set. A DIG App that predates the
  capability model does not send the field, and reading absence permissively would have dig-chat
  attempt operations that cannot succeed.

### 2.4 Per-frame authentication

Every frame after `pair.begin` carries:

```json
"auth": { "pairing_id": "<uuid>", "nonce": <u64>, "mac_b64": "<base64>" }
```

`mac_b64` is `HMAC-SHA256(channel_secret, M)` where

```text
M = utf8(decimal(nonce)) ‖ 0x00 ‖ utf8(method) ‖ 0x00 ‖ utf8(canonical_json(params))
```

`canonical_json` is defined by:

1. Object keys sorted by **Unicode codepoint** — NOT by UTF-16 code unit. The two orderings differ
   for supplementary-plane characters.
2. No insignificant whitespace.
3. Control characters escaped, so a rendered value can never contain a raw `0x00` and collide with
   the field separators.
4. Scalars rendered as `serde_json` renders them. dig-chat therefore restricts `params` numbers to
   safe INTEGERS and refuses any other numeric value, because `serde_json` writes `1.0` where
   `JSON.stringify` writes `1`.

The nonce MUST be strictly greater than the last nonce the DIG App accepted for this pairing, ACROSS
RESTARTS — the DIG App restores its high-water mark from disk. dig-chat therefore seeds its nonce
from the epoch-millisecond clock and takes `max(previous + 1, clock())` for each frame.

### 2.5 Errors

| symbol               | code   | meaning                                                          |
| -------------------- | ------ | ---------------------------------------------------------------- |
| `AUTH_REQUIRED`      | -33001 | no live pairing for this `pairing_id` — revoked, or never paired |
| `AUTH_BAD_MAC`       | -33002 | MAC mismatch                                                     |
| `AUTH_REPLAY`        | -33003 | nonce not strictly greater                                       |
| `PAIR_DENIED`        | -33010 | the user declined                                                |
| `PAIR_TIMEOUT`       | -33011 | the user did not answer                                          |
| `PAIR_CODE_REJECTED` | -33012 | the code was not accepted                                        |
| `LOCKED`             | -33040 | the DIG Account is locked                                        |
| `CAP_NOT_GRANTED`    | -33050 | authenticated, but this pairing lacks the capability             |
| (JSON-RPC)           | -32601 | the method does not exist in this DIG App                        |

`PAIR_CODE_REJECTED` is ONE code for four distinct causes — no code outstanding, expired, wrong,
budget exhausted. This is deliberate on the DIG App's side: distinguishing them would reveal whether a
human is mid-pairing. **dig-chat MUST NOT claim to know which cause applied.** It states the
possibilities and the remedy.

---

## 3. The identity capability

### 3.1 Why it is a distinct capability

`sign.request` is the power to move money. Chat needs the power to prove identity and to read what
was written to you. These are different powers and are granted separately (dig_ecosystem#1913).

The capability is named for what it DOES — `identity.*`, not `chat.*` — so a second application
needing the same power requests the same capability rather than presenting itself as chat.

### 3.2 `identity.attest`

Params: `{}`. Result:

```json
{
  "did": "did:chia:…",
  "sealing_public_key_b64": "<base64 of 32 bytes, X25519>",
  "attestation_b64": "<base64, the DID identity key's signature over the sealing key>"
}
```

The sealing key MUST be an X25519 public key derived deterministically from the profile's identity
key material, so a restored profile reproduces the same sealing key and previously-sealed messages
remain readable.

`attestation_b64` binds the sealing key to the DID. dig-chat carries it and **does not verify it** —
verification requires the on-chain DID document, which is dig-node's responsibility. §6 records this
as an open edge.

### 3.3 `identity.seal`

```json
{
  "recipient_did": "did:chia:…",
  "recipient_sealing_public_key_b64": "<base64>",
  "plaintext_b64": "<base64>"
}
```

Result: `{ "envelope_b64": "<base64 of a DIGCHAT1 envelope>" }`.

The DIG App performs the sealing; the plaintext MUST NOT be retained by it.

### 3.4 `identity.unseal`

```json
{ "envelope_b64": "<base64>" }
```

Result: `{ "sender_did": "did:chia:…", "plaintext_b64": "<base64>" }`.

`sender_did` is the DID the envelope header carries. Under **DIGCHAT1 suite 1** it is bound into the
AEAD's associated data (§4.3) for transit integrity — a relay cannot re-address or re-attribute the
envelope without breaking decryption — but it is an **UNVERIFIED claim about who sent the message**.
Suite 1 is a NaCl sealed box (ephemeral-static X25519), which authenticates the recipient's key, not
the sender's: anyone holding the recipient's published sealing key can seal a message carrying any
`sender_did`. A consumer MUST NOT attribute identity or trust to `sender_did`. Sender authentication
is a future **DIGCHAT1 suite 2** (tracked as dig_ecosystem #1940); until it ships, treat `sender_did`
as an unverified label only.

### 3.5 Refusals

A pairing holding only identity capabilities MUST be refused `sign.request` with `CAP_NOT_GRANTED`.
dig-chat additionally refuses to place `sign.request` on the wire at all.

---

## 4. The `DIGCHAT1` envelope

### 4.1 Byte layout

All integers are big-endian.

```text
offset  size  field
  0      8    magic       "DIGCHAT1"  (44 49 47 43 48 41 54 31)
  8      1    version     0x01
  9      1    suite       0x01
 10      2    sender_did_len       u16
 12      n    sender_did           UTF-8
  …      2    recipient_did_len    u16
  …      m    recipient_did        UTF-8
  …     32    epk                  X25519 ephemeral public key
  …     24    nonce                XChaCha20-Poly1305 nonce
  …      4    ct_len               u32
  …      k    ciphertext           AEAD output, 16-byte tag included
```

Bounds: a DID MUST be 1..=512 bytes. The plaintext MUST be at most **49,152 bytes (48 KiB)**, chosen
so that a sealed envelope with two maximal DIDs fits inside the DIG peer layer's 64 KiB decoded-frame
ceiling.

A decoder MUST check every length against the bytes remaining before it reads. A decoder MUST reject
trailing bytes after a complete envelope, a DID that is not valid UTF-8, an unknown version, and an
unknown suite.

### 4.2 Suite 1

- Key agreement: **X25519**, ephemeral-static.
- Key derivation: **HKDF-SHA256**, `salt = "DIGCHAT1"` (the 8 magic bytes),
  `info = "DIGCHAT1 suite1 message key"`, `L = 32`, and
  `IKM = shared_secret ‖ epk ‖ recipient_sealing_public_key`.
- AEAD: **XChaCha20-Poly1305**, 24-byte nonce drawn at random.

The reference implementation is `src/main/identity/conformance.ts`. It is the executable form of this
section and exists for known-answer tests and for conformance-checking a second implementation. It is
NOT a production code path: dig-chat does not hold identity keys (INV-1).

### 4.3 Associated data

```text
AAD = magic ‖ version ‖ suite ‖ sender_did_len ‖ sender_did ‖ recipient_did_len ‖ recipient_did ‖ epk
```

Binding these means a relay that re-addresses, re-attributes or replays an envelope under a different
header produces a decryption failure rather than a delivered message. This is transit integrity, not
sender authentication: it stops a relay altering `sender_did` in flight, but the original sealer chose
`sender_did` freely and suite 1 does not prove it (§3.4, §6).

### 4.4 What the format does and does not hide

The two DIDs and the ephemeral public key travel in the clear, because a relay must read them to
route. **Message content is never visible to a relay.** Routing metadata is; this is stated rather
than implied.

---

## 5. The application

### 5.1 Connection state

dig-chat MUST distinguish five states and MUST NOT collapse them:

| state                  | fact                                                    |
| ---------------------- | ------------------------------------------------------- |
| `checking`             | not yet determined — an unknown, not a negative         |
| `unpaired`             | no pairing exists on this machine                       |
| `app-unreachable`      | a pairing exists; nothing answered on the identity port |
| `identity-unsupported` | the DIG App answered but offers no identity capability  |
| `connected`            | paired, reachable, and `identity.attest` succeeded      |

`connected` MUST NOT be reported on the strength of an opened socket. The probe is `identity.attest`,
which establishes all three facts at once.

A pairing refused with `AUTH_REQUIRED` has been revoked. The stored credential MUST be cleared and
the state reported as `unpaired`.

### 5.2 Credential storage

The credential is stored encrypted through the OS keystore (Electron `safeStorage`: Keychain, DPAPI,
or the desktop keyring), in the app's `userData` directory, mode `0600` in a directory of mode `0700`.

Where no OS encryption backend exists, dig-chat MUST refuse to store the credential rather than write
it in the clear, and MUST tell the user that the pairing was not saved.

### 5.3 Renderer isolation

| setting                                   | value   |
| ----------------------------------------- | ------- |
| `contextIsolation`                        | `true`  |
| `nodeIntegration`                         | `false` |
| `nodeIntegrationInWorker` / `InSubFrames` | `false` |
| `sandbox`                                 | `true`  |
| `webSecurity`                             | `true`  |
| `allowRunningInsecureContent`             | `false` |
| `webviewTag`                              | `false` |
| `experimentalFeatures`                    | `false` |

The Content-Security-Policy is served as a response HEADER and starts `default-src 'none'`. No remote
origin appears in any directive. `style-src` permits `'unsafe-inline'` for React's inline styles and
nothing else is relaxed.

The preload exposes a fixed list of named functions over `contextBridge`. `ipcRenderer` MUST NOT be
exposed. No channel returns the pairing credential.

Every IPC payload is validated in the main process as untrusted input: type-checked and
length-bounded.

### 5.4 Peer text

A DID, a display name and a message body are chosen by a peer. All of them pass through one
neutralisation function before dig-chat stores them: C0 and C1 control characters, the Unicode
bidirectional overrides and isolates, and U+FEFF are REMOVED, and the result is length-bounded.
Newlines survive in a message body and are removed from an identifier.

Peer text MUST NOT be interpolated into markup or written to a log without passing through that
function.

---

## 6. Open edges

Stated here rather than implied by their absence.

1. **The DID-to-DID transport does not exist.** The only transport delivers within the running
   process. `MessageTransport.reachesOtherMachines` is `false`, and the UI shows a standing notice
   while it is. Peer discovery, mTLS transport and relay fallback belong to the DIG peer stack and
   reach dig-chat through `dig-chat-protocol`.
2. **No shipped DIG App implements `identity.*`.** As of dig-app 5.4.0 the frame router dispatches
   `connect.request`, `connect.revoke` and `sign.request` and answers anything else `-32601`. dig-chat
   reports this as `identity-unsupported`.
3. **There is no directory of sealing keys.** `identity.attest` returns the local profile's key; there
   is no way to look up another DID's. Sending to an arbitrary DID therefore cannot work until the
   DID document is resolvable through dig-node.
4. **The attestation is not verified.** dig-chat carries `attestation_b64` and does not check it.
5. **History is not persisted.** Message history lives in memory for the session. Where decrypted
   plaintext may live at rest is a decision that has not been made.
6. **The sender is not authenticated.** DIGCHAT1 suite 1 provides confidentiality to the recipient
   only. `sender_did` travels in the header, bound into the AEAD for transit integrity (§4.3), but it
   is an unverified claim: anyone with the recipient's published sealing key can seal a message under
   any `sender_did`, so the field is impersonable. dig-chat therefore treats it as untrusted peer
   text and never presents it as a verified identity. Sender authentication is a future **DIGCHAT1
   suite 2** (dig_ecosystem #1940).

---

## 7. What the DIG App owes

For dig-chat to reach `connected` and exchange a message, the DIG App must add:

1. `identity.attest`, `identity.seal`, `identity.unseal` in the frame router (§3), each dispatched
   only when the authenticated pairing's capability set contains it.
2. A capability set on the pairing record, sealed with it, honoured across restart, and returned as
   `granted_capabilities` from `pair.begin`.
3. `requested_capabilities` honoured on `pair.begin`.
4. A consent window naming the capability in the user's terms — "let DIG Chat use your DIG identity
   to encrypt messages" is a different sentence from "let DIG Chat spend", and the user must see which
   one they are approving.
5. A deterministic X25519 sealing key derived from the profile's identity material, and an attestation
   over it.
6. A test asserting that a pairing holding only identity capabilities is refused `sign.request` with
   `CAP_NOT_GRANTED`.
