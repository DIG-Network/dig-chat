# Contributing to DIG Chat

Thanks for your interest in improving DIG Chat. It is a desktop application that sends and receives
messages end-to-end encrypted to a recipient's DID-anchored identity key. It **pairs** with the DIG
App to use your identity, and it **never holds your keys** — not your identity key, not your wallet
key, not anything that could spend. Please read this before opening a PR.

## Reporting an issue

File at [github.com/DIG-Network/dig-chat/issues](https://github.com/DIG-Network/dig-chat/issues).
Include: what you observed, what you expected, and a minimal repro. The running app also has a
built-in bug reporter that files into the same place with the app version attached — use it instead
if the app is misbehaving in front of you.

## Prerequisites

- **Node >= 20.11** (`package.json` `engines`). CI pins `20.19.4` (`.github/workflows/ci.yml`).
- `npm ci` runs Electron's postinstall, which downloads the Electron 33 binary (~100 MB, cached in
  `~/.cache/electron`). If that download is blocked, `npm ci --ignore-scripts` skips it — enough for
  `lint`, `typecheck`, and `test`/`coverage`, but not for `npm run dev`, `npm run build`, or
  `npm run dist`, which need the binary. Fetch it later with `node node_modules/electron/install.js`.
- **No live DIG App is required to develop or test.** The unit suite drives the identity/pairing
  transport through a mock rather than a real WebSocket peer (see `tests/main/pairing/client.test.ts`
  and `tests/main/security.test.ts`), so every branch — paired, unpaired, revoked, an old DIG App with
  no `identity.*` handlers — is exercised without a running DIG App. `npm run dev` against a real one
  is only needed to see the paired UI end to end; `runbooks/local-development.md` covers that.

## Build & test

```bash
npm ci

npm run typecheck   # tsc --noEmit
npm run lint        # eslint . --max-warnings 0
npm run format:check
npm test            # vitest run
npm run coverage    # same, gated at the >=80% floor (vitest.config.ts)
npm run build       # typecheck + electron-vite build (main, preload, renderer -> out/)
npm run dev         # run the app against a live DIG App
```

## The gate (must pass before a PR is merged)

CI (`.github/workflows/ci.yml`) runs four jobs on every PR:

- **`quality`** — `format:check`, `lint` (warnings are errors), `typecheck`, `test + coverage`
  (the >=80% lines/branches/functions/statements floor lives in `vitest.config.ts`), and `build`.
- **`package`** — packages a linux/x64 artifact with `electron-builder` and asserts one usable file
  lands under the exact name the update beacon expects (`scripts/stage-artifact-cli.mjs`), so a
  packaging regression reds here instead of at release time.
- **`commitlint`** — lints the **PR title** against
  [Conventional Commits](https://www.conventionalcommits.org/) (`commitlint.config.cjs`). The title
  is what lands on `main`: this repo squash-merges.
- **`version`** — `package.json` `version` on your branch must be strictly greater than on the PR's
  base commit (a plain string diff would accept a decrease; the check sorts both with SemVer
  ordering). Bump it as the last step before opening the PR — patch for a compatible fix, minor for a
  compatible new capability, major for a breaking change.

## Pull requests

`main` is protected: PRs only, every check above green, and every review thread (including any
GitHub Advanced Security / CodeQL finding) resolved, before a squash-merge.

1. Branch from `main`.
2. Make the gate green locally (the `Build & test` commands above).
3. Bump `package.json` `version`.
4. Open a PR with a clear description of the change and its rationale, and a Conventional Commit
   title. Keep the diff focused.

Merging does not release. DIG Chat is in the ecosystem's `modules/apps` nightly group
(`.github/workflows/nightly-release.yml`): a midnight-UTC cron builds `main` HEAD and publishes a
pre-release under a rolling `nightly` tag (needed so the update feed can resolve this component on
the nightly channel at all — it is never something anyone is asked to run). A stable `vX.Y.Z` is cut
only by a maintainer manually dispatching `.github/workflows/release.yml` with channel `stable`; the
cron never cuts one. `runbooks/release.md` has the full mechanics.

## Where things live

| Path            | Responsibility                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| `src/main/`     | Electron main process — pairing, the identity WebSocket client, storage                  |
| `src/preload/`  | The preload bridge exposed to the renderer                                               |
| `src/renderer/` | The React UI (conversation view, pairing flow)                                           |
| `src/shared/`   | Types and logic shared between main and renderer                                         |
| `tests/`        | The Vitest suite, mirroring `src/` (`tests/main`, `tests/renderer`, …)                    |
| `scripts/`      | Release tooling — artifact naming/staging and release-asset verification, shared by `ci.yml`, `release.yml`, and `nightly-release.yml` |

The chat **protocol** — wire format, known-answer vectors, the Rust contract crate — lives in a
separate `dig-chat-protocol` repository. This repository is the application, and its own normative
contract is [`SPEC.md`](./SPEC.md).
