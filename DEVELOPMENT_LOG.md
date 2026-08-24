# Development log

Durable realizations, with the context that makes them useful. Not a change diary.

## The pairing MAC is a byte-identical cross-repo contract

dig-app recomputes `HMAC-SHA256(channel_secret, frame_mac_input)` in Rust from the JSON value its
transport delivered. Two places where a natural JavaScript implementation diverges, and neither fails
loudly — both surface as `AUTH_BAD_MAC` on a channel that looks correctly paired:

- **Key order.** Rust sorts `&String` byte-lexicographically, which for UTF-8 is Unicode CODEPOINT
  order. JavaScript's default `Array.prototype.sort` compares UTF-16 code units. They disagree for
  supplementary-plane characters: U+FF00 sorts before U+10000 by codepoint and after it by code unit.
- **Number rendering.** `serde_json` writes `1.0` where `JSON.stringify` writes `1`. `canonicalJson`
  refuses any number that is not a safe integer rather than guessing.

## `Object.keys(new Date())` is `[]`

A canonicaliser that switches on `typeof value === 'object'` renders a `Date` as `{}` — the value
disappears from the MAC input while still travelling on the wire. Caught by a test; fixed by refusing
anything whose prototype is not `Object.prototype`.

## `URL.origin` is the string `"null"` for every non-special scheme

`new URL('app://dig-chat/x').origin === new URL('file:///etc/passwd').origin` is TRUE, because the
WHATWG spec gives both an opaque origin. A navigation guard written as an origin comparison therefore
reports a `file:` navigation as internal to an `app:` window — failing in the one direction a
security guard must not. Compare `protocol` and `host` field by field.

## A message body and an identifier need different sanitisers

Both are peer-supplied, and the neutralisation differs by exactly the newline. A body legitimately
contains one; an identifier never does, and a DID carrying `\n` forges a log record. One function for
both has to choose, and either choice is wrong for the other caller — hence `sanitizePeerText` and
`sanitizeIdentifier`.

## A loopback transport that delivers inside `send` reorders the conversation

Delivering synchronously (or on a microtask awaited by `send`) lets the echo be recorded before the
message that produced it, so a user's own message appears below the reply. No real transport calls
back inside `send`. Schedule delivery on a later turn, and code written against the fake keeps
working when a network arrives.

## `@dignetwork/components@0.2.0` can loop the renderer to death

`BugReportButton` patches `console.error` to capture it, and the capture calls `setState`. React's
development build reports state-update problems THROUGH `console.error`, so one React warning becomes
warning → capture → setState → warning until the stack is exhausted. It reproduces in any embedding
app, not just tests. Filed upstream; stubbed in this repo's suite.

## The DIG App will not tell you why a pairing code failed

`PAIR_CODE_REJECTED` covers no-code-outstanding, expired, wrong, and attempt-budget-exhausted, on
purpose: distinguishing them tells a local process racing to redeem someone else's code whether a
human is mid-pairing. A client must not claim to know which. What a client CAN do is check the
SHAPE locally first — an issued code survives only five wrong attempts, and the fifth destroys it, so
sending a six-character typo costs the user a fifth of their code for nothing.

## A sent message cannot be recovered from its own envelope — persist plaintext, protect the file

dig-chat seals each outbound message to the RECIPIENT's key, so it holds no key that can reopen its
own sent envelopes. Persisting history therefore cannot mean "store the sealed envelopes and reopen
them on load" for the sent half — the sender's copy has to be stored as plaintext, and the at-rest
confidentiality comes entirely from the `safeStorage` (OS-keystore) layer, exactly as it does for the
pairing credential (§5.2). The store re-sanitises peer text on LOAD too: the history file is just a
file another process can edit, so its contents are untrusted peer bytes again on the way back in.

## ICU plural categories differ per locale — an `{n, plural, …}` MUST match the locale's CLDR set

react-intl validates a plural argument against the locale's CLDR categories, so a message cannot just
copy English's `one`/`other` into every catalog. The 14-locale set splits three ways: `zh-CN`, `zh-TW`,
`ko`, `ja`, `vi`, `id` have NO grammatical plural (`other` only — `one` there throws); `ru` needs
`one`/`few`/`many`/`other`; the rest (`en`, `es`, `de`, `tr`, `pt-BR`, `fr`, `hi`) use `one`/`other`.
Author each translated plural in the target locale's categories, not English's. (The completeness test
checks key parity, not plural shape — the categories are a translation-correctness concern.)

## noUncheckedIndexedAccess makes array/record indexing return `T | undefined`

dig-chat's tsconfig has `noUncheckedIndexedAccess`, so `parts[0]`, `record[key]` and a
`Record<string, Catalog>` lookup are all `… | undefined`. The locale resolver has to bind the indexed
value to a local and guard it (`const primary = parts[0]; if (!primary) …`) rather than indexing
twice, and `messagesFor` needs a `?? en` fallback even after an `isSupportedLocale` guard, because the
guard narrows the KEY but not the record's value type. Straight ports of code from a repo without this
flag (e.g. hub's `locales.ts`) will not typecheck until these guards are added.

## Electron CAN produce a single-file artifact on Windows and Linux — `portable` and `AppImage`

The premise that "Electron cannot ship one file, so dig-chat needs a native installer" is false on the
two platforms that matter. electron-builder's `portable` target emits one self-extracting `.exe`
(measured: 73,980,702 bytes for dig-chat 0.5.0, Electron 33.4.11), and `AppImage` emits one executable
file. Only macOS genuinely cannot, and macOS is separable through the feed's `exempt_platforms`
mechanism. This is what lets dig-chat be a **raw-binary** beacon component like dig-app, rather than
the three-pipeline native-package shape dig-node needs because it is a machine service.

A native package would also install a PER-USER GUI machine-wide and elevated, and an unsigned macOS
`.pkg` still fails Gatekeeper — so it buys nothing on the only platform it was chosen for.

## electron-builder ALWAYS appends the target's extension, so the Linux asset needs a rename

`artifactName` renders `${ext}` from the target, and the beacon's raw-binary convention has NO
extension outside Windows. So `AppImage` necessarily produces `dig-chat-0.5.0-linux-x64.AppImage`
while the feed looks for `dig-chat-0.5.0-linux-x64`, and the release must rename before attaching. The
staging step therefore knows both names, and it selects the built file by EXACT name rather than by
globbing an extension: `release/` also holds `builder-debug.yml`, a `win-unpacked/` directory and (on
Windows) `resources/elevate.exe`, so a `*.exe` glob has more than one candidate.

## `${name}` in an artifactName is the package name INCLUDING its npm scope

dig-chat's `package.json` name is `@dignetwork/dig-chat`, so `${name}-${version}…` would render a
slash into the file name. The prefix is written out literally instead, and a test pins it to the
`asset_prefix` the feed declares.

The scope leaks a second way, and this one is fatal rather than cosmetic: electron-builder derives
`executableName` from the package name, sanitising `@dignetwork/dig-chat` to `@dignetworkdig-chat`,
and then REFUSES it — _"executableName contains characters that cannot be safely used in file
paths"_. The AppImage build fails outright while the Windows `portable` build, which does not use
`executableName`, succeeds. Any scoped Electron package therefore has to set `linux.executableName`
explicitly.

## An UNANCHORED `release/` in `.gitignore` also matches `tests/release/`

A gitignore pattern with a trailing slash and no LEADING slash matches a directory of that name at
ANY depth. Ignoring electron-builder's output as `release/` therefore also excluded
`tests/release/` — the entire test directory for the release tooling — and the four test files were
never committed, while every local run and every CI run reported green.

Nothing catches this. `git status` is silent by design, `git commit -A` adds nothing, and the CI
suite passes because it is simply smaller. The only signal is the TEST COUNT, which is why a pass
count is worth reading and a bare `pass` is not: locally the suite ran 1736 tests, and CI ran fewer.

Anchor an output directory as `/release/`. The same trap applies to `dist/`, `out/` and `coverage/`
in any repo whose tests are organised by feature.

`.prettierignore` uses the same matching, so the same line hid the same directory from the formatter
— `prettier --write tests/release` reported nothing and exited zero. That silence WAS the visible
symptom, hours before the missing files were found, and it was read as ordinary quiet output. A
formatter that reports no files for a path you just wrote to is saying the path is ignored.

## The nightly channel is not optional for a feed component

The update feed tracks the same component SET on both channels, so a component that publishes only
stable makes the nightly feed unresolvable — `feedsign doctor --channel nightly` fails on it, and one
component failing fails the whole run closed. Measured: adding dig-chat to `feed-config.json` turned a
green nightly leg red purely because `releases/tags/nightly` returned 404.

The nightly version is a semver PRERELEASE stamped into `package.json` at build time and never
committed, so it sorts below the stable `X.Y.Z` of the same number. It has to reach the asset NAMES,
because the rolling `nightly` tag carries no version and the feed recovers one by stripping the fixed
prefix and suffix from the file name. Verified by building: electron-builder renders the prerelease
into `artifactName` verbatim, hyphens and dots intact —
`dig-chat-0.5.0-nightly.20260824.abc1234-windows-x64.exe`.

## A release that does not wake the feed is invisible for up to six hours

Publishing a GitHub Release is not shipping. Users install from the signed update feed, and the feed
is re-signed on a six-hourly cron — so a release with a live tag, `latest` set and every asset
attached reaches nobody until the next signing run. Every signal in this repository reads green
throughout, because the coupling lives in a different repository.

The fix is a `repository_dispatch` to `DIG-Network/dig-updater` with
`event_type=component-released` on a successful publish, from BOTH channels. `repository_dispatch`
specifically, not a `release:` trigger: a dispatch always runs on the default branch, so the feed's
signing guard passes by construction, while a release-triggered run would carry the TAG as
`github.ref`, silently skip every job, and still report `completed`.
