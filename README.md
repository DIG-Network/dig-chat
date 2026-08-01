# DIG Chat

Private messages, signed by your DIG identity.

DIG Chat is a desktop application that sends and receives messages end-to-end encrypted to a
recipient's DID-anchored identity key. It **pairs** with your DIG App to use your identity, and it
**never holds your keys** — not your identity key, not your wallet key, not anything that could spend.

- The normative contract is [`SPEC.md`](./SPEC.md).
- How to run and deploy it is in [`runbooks/`](./runbooks).
- Durable lessons from building it are in [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md).

> The chat **protocol** — wire format, known-answer vectors, the Rust contract crate — lives in
> `dig-chat-protocol`. This repository is the **application**.

---

## How pairing works

1. Open the **DIG App** → **Security** → **Pair an app**.
2. The DIG App shows you an eight-character code, good for two minutes.
3. Type that code into DIG Chat.
4. The DIG App asks you to approve DIG Chat **by name**.

The direction matters and is not an accident: **the DIG App mints the code and you carry it to DIG
Chat**, never the reverse. An application that could ask for a code could put an approval window in
front of you and hope for a mis-click. DIG Chat has no way to request one.

You can revoke DIG Chat at any time from **Paired apps** in the DIG App. Revocation takes effect
immediately, not at the next restart.

## What DIG Chat is allowed to do

It asks for three capabilities, all in the identity class:

| capability        | what it does                                           |
| ----------------- | ------------------------------------------------------ |
| `identity.attest` | learn which DID you are, and the key others encrypt to |
| `identity.seal`   | encrypt a message to a recipient's DID                 |
| `identity.unseal` | decrypt a message that was sent to you                 |

It does **not** ask for `sign.request` — the capability that authorises spending — and it refuses to
send such a request even if something inside it tried. Encrypting a message and moving money are
different powers, and DIG Chat only ever needs one of them.

## Current state — read this before trying it

Two things are not built yet, and DIG Chat says so on screen rather than pretending otherwise:

1. **No released DIG App implements the identity capability.** DIG Chat will pair, and then report
   _"This DIG App cannot do chat yet"_. `SPEC.md` §7 lists exactly what the DIG App owes.
2. **There is no peer-to-peer transport.** A message you send is sealed for real by your DIG App and
   then delivered back to this application, and to nowhere else. A standing notice in the app says so
   while it is true.

Everything else works end to end: pairing, persistence across restarts, revocation handling, the
sealed envelope format, and the refusal to send anything that is not ciphertext.

## Developing

Node 20.11 or newer.

```bash
npm ci            # installs, and fetches the Electron binary
npm run dev       # run the app against a live DIG App
npm test          # the unit suite
npm run coverage  # the same, with the >=80% floor enforced
npm run lint      # eslint, warnings are errors
npm run typecheck # tsc --noEmit
npm run build     # typecheck + bundle main, preload and renderer
```

`npm ci --ignore-scripts` skips Electron's binary download — enough for tests, lint and typecheck,
not enough to launch the app.

## Reporting a bug

The in-app bug reporter files into this repository's issues, with the app version attached. The
version is also on screen in the footer, in a `<meta name="app-version">` tag, and on
`window.__APP_VERSION__`.

## Licence

MIT.
