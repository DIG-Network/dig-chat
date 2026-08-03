/** French (fr). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const fr: Catalog = {
  'app.version': 'Version {version}',

  'locale.label': 'Langue',

  'state.checking.heading': 'Recherche de votre DIG App…',
  'state.checking.body':
    'DIG Chat vérifie s’il est appairé et si la DIG App est en cours d’exécution.',

  'state.unpaired.heading': 'Appairez DIG Chat à votre identité DIG',
  'state.unpaired.body':
    'DIG Chat utilise votre identité DIG pour chiffrer les messages. Il ne peut jamais dépenser depuis votre portefeuille.',
  'state.unpaired.step1': 'Ouvrez la DIG App et choisissez Sécurité → Appairer une application.',
  'state.unpaired.step2':
    'La DIG App vous montre un code de huit caractères, valable deux minutes.',
  'state.unpaired.step3':
    'Saisissez ce code ci-dessous. La DIG App vous demandera d’approuver DIG Chat par son nom.',
  'state.unpaired.codeLabel': 'Code d’appairage',
  'state.unpaired.codeHint':
    'Huit caractères, comme ABCD-EFGH. Les majuscules et les minuscules fonctionnent.',
  'state.unpaired.submit': 'Appairer avec la DIG App',
  'state.unpaired.pairing': 'En attente de votre approbation de DIG Chat dans la DIG App…',

  'state.appUnreachable.heading': 'La DIG App n’est pas en cours d’exécution',
  'state.appUnreachable.body':
    'DIG Chat est appairé à l’identité DIG de cet ordinateur, mais personne n’a répondu. Démarrez la DIG App et réessayez.',
  'state.appUnreachable.retry': 'Réessayer',

  'state.identityUnsupported.heading': 'Cette DIG App ne gère pas encore le chat',
  'state.identityUnsupported.body':
    'DIG Chat est appairé et la DIG App est en cours d’exécution — mais cette version n’offre pas la capacité d’identité dont DIG Chat a besoin pour chiffrer les messages. Mettez la DIG App à jour et réessayez.',
  'state.identityUnsupported.detail':
    'DIG Chat a demandé identity.attest, identity.seal et identity.unseal. Il ne demande jamais l’autorisation de signer ou de dépenser.',

  'pairing.problem.empty': 'Saisissez le code que la DIG App vous a montré.',
  'pairing.problem.tooShort':
    'Cela fait {found, plural, one {# caractère} other {# caractères}} — un code d’appairage en compte huit.',
  'pairing.problem.tooLong':
    'Cela fait {found, plural, one {# caractère} other {# caractères}} — un code d’appairage en compte huit.',

  'chat.heading': 'Conversation',
  'chat.recipientLabel': 'Envoyer à (DID)',
  'chat.recipientHint': 'Un DID de la forme did:chia:…',
  'chat.bodyLabel': 'Message',
  'chat.send': 'Envoyer',
  'chat.sending': 'Scellement et envoi…',
  'chat.empty':
    'Aucun message pour l’instant. Tout ce que vous envoyez est chiffré pour l’identité DIG du destinataire.',
  'chat.from': 'De {did}',
  'chat.to': 'À {did}',
  'chat.historyEphemeral':
    'Cet ordinateur n’a pas de stockage sécurisé, donc DIG Chat ne conserve cette conversation que jusqu’à sa fermeture — elle n’est pas enregistrée en clair sur le disque.',

  'transport.localOnly.heading': 'Les messages restent sur cet ordinateur',
  'transport.localOnly.body':
    'Le transport pair à pair n’est pas encore construit, donc un message que vous envoyez est renvoyé à cette application et nulle part ailleurs. Tout le reste est réel : la DIG App scelle le message pour la clé d’identité du destinataire avant son envoi.',

  'unpair.action': 'Oublier cet appairage',
  'unpair.explanation':
    'Cela supprime l’appairage de DIG Chat. Pour révoquer définitivement l’accès de DIG Chat, utilisez Applications appairées dans la DIG App.',

  'error.retry': 'Réessayer',
  'error.appUnreachable': 'La DIG App n’a pas répondu. Est-elle en cours d’exécution ?',
  'error.authRequired':
    'La DIG App ne reconnaît plus cet appairage. Il a peut-être été révoqué — appairez de nouveau avec un nouveau code.',
  'error.authBadMac': 'La DIG App a rejeté la requête. Appairez de nouveau avec un nouveau code.',
  'error.authReplay': 'La DIG App a rejeté la requête comme étant hors séquence. Réessayez.',
  'error.pairDenied': 'L’appairage a été refusé dans la DIG App.',
  'error.pairTimeout': 'Personne n’a répondu à la fenêtre d’approbation dans la DIG App.',
  'error.pairCodeRejected':
    'La DIG App n’a pas accepté ce code. Les codes durent deux minutes et ne fonctionnent qu’une fois ; il a donc pu expirer ou déjà être utilisé. Générez-en un nouveau et réessayez.',
  'error.connectRequired': 'La DIG App exige que cette application se connecte d’abord.',
  'error.connectDenied': 'La connexion a été refusée dans la DIG App.',
  'error.connectTimeout': 'Personne n’a répondu à la fenêtre de connexion dans la DIG App.',
  'error.signDenied': 'Cela a été refusé dans la DIG App.',
  'error.signTimeout': 'Personne n’a répondu à la fenêtre dans la DIG App.',
  'error.signUnknownType': 'La DIG App n’a pas reconnu cette requête.',
  'error.signBadPayload': 'La DIG App n’a pas pu lire cette requête.',
  'error.signNoConfirmer': 'La DIG App n’a pas pu afficher sa fenêtre d’approbation.',
  'error.locked':
    'Votre DIG Account est verrouillée. Déverrouillez-la dans la DIG App et réessayez.',
  'error.capNotGranted':
    'Cet appairage n’a pas reçu la capacité d’identité dont DIG Chat a besoin. Appairez de nouveau et approuvez la demande d’identité.',
  'error.identityUnsupported':
    'Cette version de la DIG App n’offre pas encore d’opérations d’identité.',
  'error.credentialStorageUnavailable':
    'DIG Chat n’a pas pu stocker l’appairage en toute sécurité sur ce système, il ne l’a donc pas stocké du tout. Vous devrez appairer de nouveau la prochaine fois.',
  'error.historyStorageUnavailable':
    'DIG Chat n’a pas pu stocker votre historique de messages en toute sécurité sur ce système, il ne le conserve donc que pour cette session.',
  'settings.heading': 'Historique',
  'settings.export.heading': 'Exporter votre historique',
  'settings.export.body':
    'Enregistrez tout votre historique de conversation dans un fichier chiffré que vous pouvez déplacer vers un autre ordinateur. Le fichier est scellé avec une phrase secrète — gardez-la en sécurité, car c’est le seul moyen d’ouvrir le fichier.',
  'settings.export.passphraseLabel': 'Phrase secrète',
  'settings.export.confirmLabel': 'Répétez la phrase secrète',
  'settings.export.submit': 'Exporter vers un fichier',
  'settings.export.exporting': 'Scellement de votre historique…',
  'settings.export.success': 'Votre historique chiffré a été enregistré dans {path}.',
  'settings.export.mismatch': 'Les deux phrases secrètes ne correspondent pas.',
  'settings.import.heading': 'Importer un fichier d’historique',
  'settings.import.body':
    'Ouvrez un fichier d’historique chiffré et fusionnez-le avec cette conversation. Les messages que vous avez déjà restent inchangés.',
  'settings.import.passphraseLabel': 'Phrase secrète',
  'settings.import.submit': 'Choisir un fichier et importer',
  'settings.import.importing': 'Ouverture de votre historique…',
  'settings.import.success':
    '{added, plural, other {# messages}} ajoutés. Vous avez maintenant {total, plural, other {# messages}}.',
  'settings.retention.heading': 'Nettoyage automatique',
  'settings.retention.body':
    'Par défaut, DIG Chat conserve chaque message. Activez ceci pour oublier automatiquement les messages plus anciens qu’un nombre de jours.',
  'settings.retention.enableLabel': 'Supprimer les messages plus anciens qu’un âge défini',
  'settings.retention.daysLabel': 'Jours à conserver',
  'settings.danger.heading': 'Supprimer l’historique',
  'settings.danger.body':
    'Supprimer l’historique retire les messages de cet ordinateur. C’est irréversible et cela ne supprime rien sur l’ordinateur de quelqu’un d’autre.',
  'settings.danger.empty': 'Il n’y a aucune conversation à supprimer.',
  'settings.danger.clearConversation': 'Supprimer la conversation avec {did}',
  'settings.danger.clearAll': 'Supprimer tout l’historique',
  'settings.danger.confirmHeading': 'Supprimer cet historique ?',
  'settings.danger.confirmBody': 'Cela retire les messages de cet ordinateur et est irréversible.',
  'settings.danger.confirm': 'Supprimer',
  'settings.danger.cancel': 'Le garder',
  'error.archiveFormat': 'Ce fichier n’est pas un fichier d’historique DIG Chat.',
  'error.archiveVersion':
    'Ce fichier d’historique a été créé par une version plus récente de DIG Chat. Mettez à jour et réessayez.',
  'error.archiveDecrypt':
    'Cette phrase secrète n’a pas ouvert le fichier, ou le fichier est endommagé.',
  'error.archiveTooLarge':
    'Ce fichier est trop volumineux pour être un fichier d’historique DIG Chat.',
  'error.emptyMessage': 'Saisissez quelque chose à envoyer.',
  'error.messageTooLong': 'Ce message est trop long pour être envoyé.',
  'error.sealFailed': 'DIG Chat a refusé d’envoyer : la DIG App n’a pas renvoyé de message scellé.',
  'error.unknown': 'Une erreur est survenue. Réessayez.',
  'error.dismiss': 'Ignorer',
  'error.boundary.heading': 'DIG Chat a rencontré un problème',
  'error.boundary.reload': 'Recharger DIG Chat',
};
