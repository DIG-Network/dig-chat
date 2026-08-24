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

