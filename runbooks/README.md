# dig-chat runbooks

## Running it locally

**Prerequisites**

- Node 20.11 or newer (CI pins 20.19.4).
- A DIG App on the same machine. dig-chat pairs with it; without one there is nothing to pair with,
  and the app will say so rather than failing obscurely.

**Install and run**

```bash
npm ci
npm run dev
```

`npm ci` downloads the Electron binary in its postinstall step. If you install with
`--ignore-scripts` (which is necessary on some Windows setups where `node` is not reachable from
`cmd.exe` children), the binary is absent and `npm run dev` cannot start a window — every other
script (`test`, `lint`, `typecheck`, `build`) still works. Fetch the binary with:

```bash
node node_modules/electron/install.js
```

**Pairing it, the first time**

1. Open the DIG App and choose **Security → Pair an app**. It shows an eight-character code, good
   for two minutes, usable once.
2. Type that code into dig-chat and press Pair.
3. The DIG App asks you to approve **DIG Chat** by name. Approve it.

The pairing is stored encrypted (OS keychain / DPAPI / keyring) and survives a restart. To revoke it,
use **Paired apps** in the DIG App — that kills the channel immediately. "Forget this pairing" inside
dig-chat only removes dig-chat's copy, and the UI says so.

## Scripts

| command             | what it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Electron with hot reload                                 |
| `npm test`          | the unit suite                                           |
| `npm run coverage`  | the suite plus the ≥80% thresholds CI enforces           |
| `npm run lint`      | ESLint, warnings as errors                               |
| `npm run typecheck` | `tsc --noEmit`                                           |
| `npm run build`     | production main + preload + renderer bundles into `out/` |

## Releasing

Tag-driven, and the tag is cut by the workflow — never by hand.

1. Bump `version` in `package.json` in the PR, per SemVer. CI fails a PR whose version did not
   increase, and fails one where it went backwards.
2. Merge (squash) once every required check is green and every review thread is resolved.
3. Run the **Release** workflow (`workflow_dispatch`, channel `stable`). It builds, cuts `vX.Y.Z`,
   pushes the tag with `RELEASE_TOKEN`, and creates the GitHub release.

**Required repository secret:** `RELEASE_TOKEN`, a classic PAT with `repo` scope. `GITHUB_TOKEN` is
not a substitute — a tag it pushes does not fire tag-triggered workflows.

## Deploying

There is no server. dig-chat is a desktop application; a release is its artefacts. Installer
packaging (electron-builder, code signing, the auto-update feed) is not built yet — `SPEC.md` §6
lists it among the open edges.

## When something is wrong

| symptom                               | what it means                                               | what to do                                                                             |
| ------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "Your DIG App isn't running"          | Nothing answered on `127.0.0.1:9779` / `[::1]:9779`         | Start the DIG App. The pairing is intact — no new code needed.                         |
| "This DIG App can't do chat yet"      | The DIG App answered but has no `identity.*` handler        | Update the DIG App. As of dig-app 5.4.0 this is every build (`SPEC.md` §7).            |
| "The DIG App didn't accept that code" | Expired, already used, mistyped, or out of attempts         | Get a fresh code. The DIG App does not say which, deliberately.                        |
| Pairing is lost after restart         | The OS offered no encryption backend, so nothing was stored | Check the OS keyring is running. dig-chat refuses to store the credential unencrypted. |
