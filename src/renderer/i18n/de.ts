/** German (de). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const de: Catalog = {
  'app.version': 'Version {version}',

  'locale.label': 'Sprache',

  'state.checking.heading': 'Suche nach deiner DIG App…',
  'state.checking.body': 'DIG Chat prüft, ob es gekoppelt ist und ob die DIG App läuft.',

  'state.unpaired.heading': 'Kopple DIG Chat mit deiner DIG-Identität',
  'state.unpaired.body':
    'DIG Chat verwendet deine DIG-Identität, um Nachrichten zu verschlüsseln. Es kann niemals aus deiner Wallet ausgeben.',
  'state.unpaired.step1': 'Öffne die DIG App und wähle Sicherheit → App koppeln.',
  'state.unpaired.step2':
    'Die DIG App zeigt dir einen achtstelligen Code, der zwei Minuten gültig ist.',
  'state.unpaired.step3':
    'Gib diesen Code unten ein. Die DIG App bittet dich, DIG Chat namentlich zu bestätigen.',
  'state.unpaired.codeLabel': 'Kopplungscode',
  'state.unpaired.codeHint':
    'Acht Zeichen, wie ABCD-EFGH. Groß- oder Kleinschreibung funktioniert beides.',
  'state.unpaired.submit': 'Mit der DIG App koppeln',
  'state.unpaired.pairing': 'Warte darauf, dass du DIG Chat in der DIG App bestätigst…',

  'state.appUnreachable.heading': 'Die DIG App läuft nicht',
  'state.appUnreachable.body':
    'DIG Chat ist mit der DIG-Identität dieses Computers gekoppelt, aber niemand hat geantwortet. Starte die DIG App und versuche es erneut.',
  'state.appUnreachable.retry': 'Erneut versuchen',

  'state.identityUnsupported.heading': 'Diese DIG App kann noch nicht chatten',
  'state.identityUnsupported.body':
    'DIG Chat ist gekoppelt und die DIG App läuft — aber diese Version bietet nicht die Identitätsfunktion, die DIG Chat zum Verschlüsseln von Nachrichten benötigt. Aktualisiere die DIG App und versuche es erneut.',
  'state.identityUnsupported.detail':
    'DIG Chat hat identity.attest, identity.seal und identity.unseal angefragt. Es bittet niemals um die Erlaubnis zu signieren oder auszugeben.',

  'pairing.problem.empty': 'Gib den Code ein, den die DIG App dir gezeigt hat.',
  'pairing.problem.tooShort':
    'Das sind {found, plural, one {# Zeichen} other {# Zeichen}} — ein Kopplungscode hat acht.',
  'pairing.problem.tooLong':
    'Das sind {found, plural, one {# Zeichen} other {# Zeichen}} — ein Kopplungscode hat acht.',

  'chat.heading': 'Unterhaltung',
  'chat.recipientLabel': 'Senden an (DID)',
  'chat.recipientHint': 'Eine DID in der Form did:chia:…',
  'chat.bodyLabel': 'Nachricht',
  'chat.send': 'Senden',
  'chat.sending': 'Wird versiegelt und gesendet…',
  'chat.empty':
    'Noch keine Nachrichten. Alles, was du sendest, wird für die DIG-Identität des Empfängers verschlüsselt.',
  'chat.from': 'Von {did}',
  'chat.to': 'An {did}',
  'chat.historyEphemeral':
    'Dieser Computer hat keinen sicheren Speicher, daher behält DIG Chat diese Unterhaltung nur, bis du sie schließt — sie wird nicht unverschlüsselt auf die Festplatte geschrieben.',

  'transport.localOnly.heading': 'Nachrichten bleiben auf diesem Computer',
  'transport.localOnly.body':
    'Der Peer-to-Peer-Transport ist noch nicht gebaut, daher wird eine Nachricht, die du sendest, an diese App zurückgeliefert und an keinen anderen Ort. Alles andere ist echt: Die DIG App versiegelt die Nachricht für den Identitätsschlüssel des Empfängers, bevor sie gesendet wird.',

  'unpair.action': 'Diese Kopplung vergessen',
  'unpair.explanation':
    'Dies entfernt die Kopplung aus DIG Chat. Um den Zugriff von DIG Chat endgültig zu widerrufen, verwende Gekoppelte Apps in der DIG App.',

  'error.appUnreachable': 'Die DIG App hat nicht geantwortet. Läuft sie?',
  'error.authRequired':
    'Die DIG App erkennt diese Kopplung nicht mehr. Sie wurde möglicherweise widerrufen — kopple erneut mit einem neuen Code.',
  'error.authBadMac': 'Die DIG App hat die Anfrage abgelehnt. Kopple erneut mit einem neuen Code.',
  'error.authReplay':
    'Die DIG App hat die Anfrage als außerhalb der Reihenfolge abgelehnt. Versuche es erneut.',
  'error.pairDenied': 'Die Kopplung wurde in der DIG App abgelehnt.',
  'error.pairTimeout': 'Niemand hat auf das Bestätigungsfenster in der DIG App reagiert.',
  'error.pairCodeRejected':
    'Die DIG App hat diesen Code nicht akzeptiert. Codes gelten zwei Minuten und funktionieren nur einmal, er ist also vielleicht abgelaufen oder bereits verwendet worden. Erzeuge einen neuen und versuche es erneut.',
  'error.connectRequired': 'Die DIG App verlangt, dass sich diese App zuerst verbindet.',
  'error.connectDenied': 'Die Verbindung wurde in der DIG App abgelehnt.',
  'error.connectTimeout': 'Niemand hat auf das Verbindungsfenster in der DIG App reagiert.',
  'error.signDenied': 'Das wurde in der DIG App abgelehnt.',
  'error.signTimeout': 'Niemand hat auf das Fenster in der DIG App reagiert.',
  'error.signUnknownType': 'Die DIG App hat diese Anfrage nicht erkannt.',
  'error.signBadPayload': 'Die DIG App konnte diese Anfrage nicht lesen.',
  'error.signNoConfirmer': 'Die DIG App konnte ihr Bestätigungsfenster nicht anzeigen.',
  'error.locked':
    'Dein DIG Account ist gesperrt. Entsperre ihn in der DIG App und versuche es erneut.',
  'error.capNotGranted':
    'Dieser Kopplung wurde die Identitätsfunktion, die DIG Chat benötigt, nicht gewährt. Kopple erneut und bestätige die Identitätsanfrage.',
  'error.identityUnsupported': 'Diese Version der DIG App bietet noch keine Identitätsoperationen.',
  'error.credentialStorageUnavailable':
    'DIG Chat konnte die Kopplung auf diesem System nicht sicher speichern und hat sie daher gar nicht gespeichert. Du musst beim nächsten Mal erneut koppeln.',
  'error.historyStorageUnavailable':
    'DIG Chat konnte deinen Nachrichtenverlauf auf diesem System nicht sicher speichern und behält ihn daher nur für diese Sitzung.',
  'settings.heading': 'Verlauf',
  'settings.export.heading': 'Verlauf exportieren',
  'settings.export.body':
    'Speichere deinen gesamten Gesprächsverlauf in einer verschlüsselten Datei, die du auf einen anderen Computer übertragen kannst. Die Datei ist mit einer Passphrase versiegelt — bewahre sie sicher auf, denn sie ist die einzige Möglichkeit, die Datei zu öffnen.',
  'settings.export.passphraseLabel': 'Passphrase',
  'settings.export.confirmLabel': 'Passphrase wiederholen',
  'settings.export.submit': 'In eine Datei exportieren',
  'settings.export.exporting': 'Verlauf wird versiegelt…',
  'settings.export.success': 'Dein verschlüsselter Verlauf wurde in {path} gespeichert.',
  'settings.export.mismatch': 'Die beiden Passphrasen stimmen nicht überein.',
  'settings.import.heading': 'Verlaufsdatei importieren',
  'settings.import.body':
    'Öffne eine verschlüsselte Verlaufsdatei und füge sie in dieses Gespräch ein. Nachrichten, die du bereits hast, bleiben unverändert.',
  'settings.import.passphraseLabel': 'Passphrase',
  'settings.import.submit': 'Datei auswählen und importieren',
  'settings.import.importing': 'Verlauf wird geöffnet…',
  'settings.import.success':
    '{added, plural, other {# Nachrichten}} hinzugefügt. Du hast jetzt {total, plural, other {# Nachrichten}}.',
  'settings.retention.heading': 'Automatische Bereinigung',
  'settings.retention.body':
    'Standardmäßig behält DIG Chat jede Nachricht. Aktiviere dies, um Nachrichten, die älter als eine bestimmte Anzahl von Tagen sind, automatisch zu vergessen.',
  'settings.retention.enableLabel':
    'Nachrichten löschen, die älter als ein festgelegtes Alter sind',
  'settings.retention.daysLabel': 'Aufzubewahrende Tage',
  'settings.danger.heading': 'Verlauf löschen',
  'settings.danger.body':
    'Das Löschen des Verlaufs entfernt Nachrichten von diesem Computer. Es kann nicht rückgängig gemacht werden und löscht nichts auf dem Computer einer anderen Person.',
  'settings.danger.empty': 'Es gibt keine Gespräche zum Löschen.',
  'settings.danger.clearConversation': 'Gespräch mit {did} löschen',
  'settings.danger.clearAll': 'Gesamten Verlauf löschen',
  'settings.danger.confirmHeading': 'Diesen Verlauf löschen?',
  'settings.danger.confirmBody':
    'Dies entfernt die Nachrichten von diesem Computer und kann nicht rückgängig gemacht werden.',
  'settings.danger.confirm': 'Löschen',
  'settings.danger.cancel': 'Behalten',
  'error.archiveFormat': 'Diese Datei ist keine DIG Chat-Verlaufsdatei.',
  'error.archiveVersion':
    'Diese Verlaufsdatei wurde mit einer neueren Version von DIG Chat erstellt. Aktualisiere und versuche es erneut.',
  'error.archiveDecrypt':
    'Diese Passphrase hat die Datei nicht geöffnet, oder die Datei ist beschädigt.',
  'error.archiveTooLarge': 'Diese Datei ist zu groß, um eine DIG-Chat-Verlaufsdatei zu sein.',
  'error.emptyMessage': 'Gib etwas zum Senden ein.',
  'error.messageTooLong': 'Diese Nachricht ist zu lang zum Senden.',
  'error.sealFailed':
    'DIG Chat hat das Senden verweigert: Die DIG App hat keine versiegelte Nachricht zurückgegeben.',
  'error.notConnected': 'DIG Chat ist nicht verbunden. Koppeln Sie Ihre DIG App, um zu senden.',
  'error.unknown': 'Etwas ist schiefgelaufen. Versuche es erneut.',
  'error.dismiss': 'Schließen',
  'error.boundary.heading': 'DIG Chat ist auf ein Problem gestoßen',
  'error.boundary.reload': 'DIG Chat neu laden',
};
