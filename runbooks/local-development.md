# Runbook — running DIG Chat locally

## Prerequisites

- **Node 20.11+** and npm 10+.
- **The DIG App**, installed and running, for anything beyond the unit tests. DIG Chat has no
  identity of its own; without a DIG App it can reach `unpaired` and no further.

## Install

```bash
npm ci
```

`npm ci` runs Electron's postinstall, which downloads the Electron binary (~100 MB, cached in
`~/.cache/electron`). On a machine where that download is blocked:

```bash
npm ci --ignore-scripts
```

That is enough for `npm test`, `npm run lint` and `npm run typecheck`. It is **not** enough for
`npm run dev` or `npm run build`, which need the binary.

## Run

```bash
npm run dev
```

Opens the app with the renderer served by Vite and the main process rebuilt on change.

### What you should see, and what it means

| on screen                              | what happened                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "Looking for your DIG App…"            | the first probe has not returned yet                                                                                  |
| "Pair DIG Chat with your DIG identity" | no credential stored on this machine                                                                                  |
| "The DIG App is not running"           | a credential exists; nothing answered on port 9779                                                                    |
| "This DIG App cannot do chat yet"      | the DIG App answered, but has no `identity.*` handlers — **the expected result against every released DIG App today** |
| the conversation view                  | paired, reachable, and the identity capability answered                                                               |

## Pairing against a live DIG App

1. DIG App → **Security** → **Pair an app**. It shows an eight-character code.
2. Type it into DIG Chat within **two minutes**.
3. Approve DIG Chat in the DIG App's window.

The code works **once** and dies after **five** wrong attempts. DIG Chat refuses a code that is not
eight symbols before sending it, so a typo does not spend an attempt.

## Where the credential lives

| platform | path                                                    |
| -------- | ------------------------------------------------------- |
| Windows  | `%APPDATA%\dig-chat\pairing.sealed`                     |
| macOS    | `~/Library/Application Support/dig-chat/pairing.sealed` |
| Linux    | `~/.config/dig-chat/pairing.sealed`                     |

Encrypted with the OS keystore (DPAPI / Keychain / the desktop keyring), mode `0600`. Delete it to
force a re-pair. It is never readable by the renderer and never appears in a log.

On a system with no keystore backend — a headless Linux box with no keyring — DIG Chat refuses to
store the credential at all rather than write it in the clear, and says so. Pairing still works for
that session.

## Talking to the DIG App by hand

The identity channel is a WebSocket on `9779`. To confirm the DIG App is listening:

```bash
# Any of the three authorities the DIG App accepts.
curl -sv --http1.1 http://127.0.0.1:9779/ 2>&1 | head -5
```

A refused connection means the DIG App is not running. A `400` means it is listening and refused a
non-WebSocket request, which is the healthy answer.

**Do not send an `Origin` header.** The DIG App admits a native client precisely because a browser
would have attached one; adding it gets the connection refused.

## Tests

```bash
npm test              # the whole suite
npm run coverage      # with the >=80% floor
npx vitest run tests/main/identity   # one area
```

Two credential-permission tests are skipped on Windows, which has no POSIX mode bits.

## Troubleshooting

| symptom                                      | cause                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `AUTH_REPLAY` on every frame                 | the host clock stepped far backwards; the nonce is seeded from it                  |
| `AUTH_REQUIRED` right after pairing          | the pairing was revoked in the DIG App; pair again                                 |
| `PAIR_CODE_REJECTED` on a code you just read | it expired (2 minutes), was already used, or the wrong DIG App profile is unlocked |
| the window opens blank                       | the renderer bundle is missing — run `npm run build` first, or use `npm run dev`   |
