/**
 * Every string a person reads, in one place.
 *
 * No copy is written inline in a component (§6.6): a locale is added by adding a sibling of this
 * file, and a string that only exists in a JSX expression can never be translated. The ids are
 * dotted paths that mirror where the string appears, so a translator can tell a heading from a
 * button without reading the source.
 *
 * Brand and scheme literals — DIG, DIG Chat, `did:chia:` — stay verbatim in every locale.
 */
export const en = {
  'app.name': 'DIG Chat',
  'app.tagline': 'Private messages, signed by your DIG identity.',
  'app.version': 'Version {version}',

  'locale.label': 'Language',

  'state.checking.heading': 'Looking for your DIG App…',
  'state.checking.body':
    'DIG Chat is checking whether it is paired and whether the DIG App is running.',

  'state.unpaired.heading': 'Pair DIG Chat with your DIG identity',
  'state.unpaired.body':
    'DIG Chat uses your DIG identity to encrypt messages. It can never spend from your wallet.',
  'state.unpaired.step1': 'Open the DIG App and choose Security → Pair an app.',
  'state.unpaired.step2': 'The DIG App shows you an eight-character code, good for two minutes.',
  'state.unpaired.step3':
    'Type that code below. The DIG App will ask you to approve DIG Chat by name.',
  'state.unpaired.codeLabel': 'Pairing code',
  'state.unpaired.codeHint': 'Eight characters, like ABCD-EFGH. Upper or lower case both work.',
  'state.unpaired.submit': 'Pair with the DIG App',
  'state.unpaired.pairing': 'Waiting for you to approve DIG Chat in the DIG App…',

  'state.appUnreachable.heading': 'The DIG App is not running',
  'state.appUnreachable.body':
    'DIG Chat is paired with this computer’s DIG identity, but nothing answered. Start the DIG App and try again.',
  'state.appUnreachable.retry': 'Try again',

  'state.identityUnsupported.heading': 'This DIG App cannot do chat yet',
  'state.identityUnsupported.body':
    'DIG Chat is paired, and the DIG App is running — but this version does not offer the identity capability DIG Chat needs to encrypt messages. Update the DIG App and try again.',
  'state.identityUnsupported.detail':
    'DIG Chat asked for identity.attest, identity.seal and identity.unseal. It never asks for permission to sign or spend.',

  'state.connected.you': 'You are {did}',

  'pairing.problem.empty': 'Type the code the DIG App showed you.',
  'pairing.problem.tooShort':
    'That is {found, plural, one {# character} other {# characters}} — a pairing code has eight.',
  'pairing.problem.tooLong':
    'That is {found, plural, one {# character} other {# characters}} — a pairing code has eight.',

  'chat.heading': 'Conversation',
  'chat.recipientLabel': 'Send to (DID)',
  'chat.recipientHint': 'A DID that looks like did:chia:…',
  'chat.bodyLabel': 'Message',
  'chat.send': 'Send',
  'chat.sending': 'Sealing and sending…',
  'chat.empty': 'No messages yet. Anything you send is encrypted to the recipient’s DIG identity.',
  'chat.unreadable':
    '{count, plural, one {# message could not be opened} other {# messages could not be opened}}.',
  'chat.from': 'From {did}',
  'chat.to': 'To {did}',
  'chat.historyEphemeral':
    'This computer has no secure storage, so DIG Chat keeps this conversation only until you close it — it is not saved to disk in the clear.',

  'transport.localOnly.heading': 'Messages stay on this computer',
  'transport.localOnly.body':
    'The peer-to-peer transport is not built yet, so a message you send is delivered back to this app and to nowhere else. Everything else is real: the message is sealed by your DIG App to the recipient’s identity key before it is sent.',

  'unpair.action': 'Forget this pairing',
  'unpair.explanation':
    'This removes the pairing from DIG Chat. To revoke DIG Chat’s access for good, use Paired apps in the DIG App.',

  'error.heading': 'That did not work',
  'error.retry': 'Try again',
  'error.appUnreachable': 'The DIG App did not answer. Is it running?',
  'error.authRequired':
    'The DIG App no longer recognises this pairing. It may have been revoked — pair again with a new code.',
  'error.authBadMac': 'The DIG App rejected the request. Pair again with a new code.',
  'error.authReplay': 'The DIG App rejected the request as out of order. Try again.',
  'error.pairDenied': 'The pairing was declined in the DIG App.',
  'error.pairTimeout': 'Nobody answered the approval window in the DIG App.',
  'error.pairCodeRejected':
    'The DIG App did not accept that code. Codes last two minutes and work only once, so it may have expired or already been used. Generate a new one and try again.',
  'error.connectRequired': 'The DIG App needs this app to be connected first.',
  'error.connectDenied': 'The connection was declined in the DIG App.',
  'error.connectTimeout': 'Nobody answered the connection window in the DIG App.',
  'error.signDenied': 'That was declined in the DIG App.',
  'error.signTimeout': 'Nobody answered the window in the DIG App.',
  'error.signUnknownType': 'The DIG App did not recognise that request.',
  'error.signBadPayload': 'The DIG App could not read that request.',
  'error.signNoConfirmer': 'The DIG App could not show its approval window.',
  'error.locked': 'Your DIG Account is locked. Unlock it in the DIG App and try again.',
  'error.capNotGranted':
    'This pairing was not granted the identity capability DIG Chat needs. Pair again, and approve the identity request.',
  'error.identityUnsupported':
    'This version of the DIG App does not offer identity operations yet.',
  'error.credentialStorageUnavailable':
    'DIG Chat could not store the pairing securely on this system, so it did not store it at all. You will need to pair again next time.',
  'error.historyStorageUnavailable':
    'DIG Chat could not store your message history securely on this system, so it is keeping it only for this session.',
  'error.emptyMessage': 'Type something to send.',
  'error.messageTooLong': 'That message is too long to send.',
  'error.sealFailed': 'DIG Chat refused to send: the DIG App did not return a sealed message.',
  'error.unknown': 'Something went wrong. Try again.',
} as const;

/** The message ids the app knows. `en` is the base every other locale is type-checked against. */
export type MessageId = keyof typeof en;

/**
 * A complete catalog: every {@link MessageId}, no more and no fewer. Typing each locale file as this
 * turns "a locale is missing a string" and "a locale has a stray key" into COMPILE errors — the
 * completeness gate (§6.6) enforced by the type system, before the runtime test ever runs.
 */
export type Catalog = Record<MessageId, string>;
