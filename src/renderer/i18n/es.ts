/** Spanish (es). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const es: Catalog = {
  'app.name': 'DIG Chat',
  'app.tagline': 'Mensajes privados, firmados con tu identidad DIG.',
  'app.version': 'Versión {version}',

  'locale.label': 'Idioma',

  'state.checking.heading': 'Buscando tu DIG App…',
  'state.checking.body':
    'DIG Chat está comprobando si está emparejado y si la DIG App está en ejecución.',

  'state.unpaired.heading': 'Empareja DIG Chat con tu identidad DIG',
  'state.unpaired.body':
    'DIG Chat usa tu identidad DIG para cifrar los mensajes. Nunca puede gastar desde tu monedero.',
  'state.unpaired.step1': 'Abre la DIG App y elige Seguridad → Emparejar una aplicación.',
  'state.unpaired.step2': 'La DIG App te muestra un código de ocho caracteres, válido dos minutos.',
  'state.unpaired.step3':
    'Escribe ese código abajo. La DIG App te pedirá que apruebes DIG Chat por su nombre.',
  'state.unpaired.codeLabel': 'Código de emparejamiento',
  'state.unpaired.codeHint':
    'Ocho caracteres, como ABCD-EFGH. Funciona en mayúsculas o minúsculas.',
  'state.unpaired.submit': 'Emparejar con la DIG App',
  'state.unpaired.pairing': 'Esperando a que apruebes DIG Chat en la DIG App…',

  'state.appUnreachable.heading': 'La DIG App no está en ejecución',
  'state.appUnreachable.body':
    'DIG Chat está emparejado con la identidad DIG de este equipo, pero nadie respondió. Inicia la DIG App e inténtalo de nuevo.',
  'state.appUnreachable.retry': 'Reintentar',

  'state.identityUnsupported.heading': 'Esta DIG App aún no admite el chat',
  'state.identityUnsupported.body':
    'DIG Chat está emparejado y la DIG App está en ejecución, pero esta versión no ofrece la capacidad de identidad que DIG Chat necesita para cifrar mensajes. Actualiza la DIG App e inténtalo de nuevo.',
  'state.identityUnsupported.detail':
    'DIG Chat solicitó identity.attest, identity.seal e identity.unseal. Nunca pide permiso para firmar ni gastar.',

  'state.connected.you': 'Eres {did}',

  'pairing.problem.empty': 'Escribe el código que te mostró la DIG App.',
  'pairing.problem.tooShort':
    'Eso son {found, plural, one {# carácter} other {# caracteres}} — un código de emparejamiento tiene ocho.',
  'pairing.problem.tooLong':
    'Eso son {found, plural, one {# carácter} other {# caracteres}} — un código de emparejamiento tiene ocho.',

  'chat.heading': 'Conversación',
  'chat.recipientLabel': 'Enviar a (DID)',
  'chat.recipientHint': 'Un DID con la forma did:chia:…',
  'chat.bodyLabel': 'Mensaje',
  'chat.send': 'Enviar',
  'chat.sending': 'Sellando y enviando…',
  'chat.empty':
    'Aún no hay mensajes. Todo lo que envíes se cifra para la identidad DIG del destinatario.',
  'chat.unreadable':
    '{count, plural, one {# mensaje no se pudo abrir} other {# mensajes no se pudieron abrir}}.',
  'chat.from': 'De {did}',
  'chat.to': 'Para {did}',
  'chat.historyEphemeral':
    'Este equipo no tiene almacenamiento seguro, así que DIG Chat conserva esta conversación solo hasta que la cierres; no se guarda en el disco sin cifrar.',

  'transport.localOnly.heading': 'Los mensajes permanecen en este equipo',
  'transport.localOnly.body':
    'El transporte entre pares aún no está construido, así que un mensaje que envías se entrega de vuelta a esta aplicación y a ningún otro sitio. Todo lo demás es real: la DIG App sella el mensaje para la clave de identidad del destinatario antes de enviarlo.',

  'unpair.action': 'Olvidar este emparejamiento',
  'unpair.explanation':
    'Esto quita el emparejamiento de DIG Chat. Para revocar el acceso de DIG Chat de forma definitiva, usa Aplicaciones emparejadas en la DIG App.',

  'error.heading': 'Eso no funcionó',
  'error.retry': 'Reintentar',
  'error.appUnreachable': 'La DIG App no respondió. ¿Está en ejecución?',
  'error.authRequired':
    'La DIG App ya no reconoce este emparejamiento. Puede que se haya revocado; empareja de nuevo con un código nuevo.',
  'error.authBadMac': 'La DIG App rechazó la solicitud. Empareja de nuevo con un código nuevo.',
  'error.authReplay':
    'La DIG App rechazó la solicitud por estar fuera de orden. Inténtalo de nuevo.',
  'error.pairDenied': 'El emparejamiento se rechazó en la DIG App.',
  'error.pairTimeout': 'Nadie respondió a la ventana de aprobación en la DIG App.',
  'error.pairCodeRejected':
    'La DIG App no aceptó ese código. Los códigos duran dos minutos y funcionan una sola vez, así que puede haber caducado o ya haberse usado. Genera uno nuevo e inténtalo de nuevo.',
  'error.connectRequired': 'La DIG App necesita que esta aplicación se conecte primero.',
  'error.connectDenied': 'La conexión se rechazó en la DIG App.',
  'error.connectTimeout': 'Nadie respondió a la ventana de conexión en la DIG App.',
  'error.signDenied': 'Eso se rechazó en la DIG App.',
  'error.signTimeout': 'Nadie respondió a la ventana en la DIG App.',
  'error.signUnknownType': 'La DIG App no reconoció esa solicitud.',
  'error.signBadPayload': 'La DIG App no pudo leer esa solicitud.',
  'error.signNoConfirmer': 'La DIG App no pudo mostrar su ventana de aprobación.',
  'error.locked': 'Tu DIG Account está bloqueada. Desbloquéala en la DIG App e inténtalo de nuevo.',
  'error.capNotGranted':
    'A este emparejamiento no se le concedió la capacidad de identidad que DIG Chat necesita. Empareja de nuevo y aprueba la solicitud de identidad.',
  'error.identityUnsupported': 'Esta versión de la DIG App aún no ofrece operaciones de identidad.',
  'error.credentialStorageUnavailable':
    'DIG Chat no pudo guardar el emparejamiento de forma segura en este sistema, así que no lo guardó en absoluto. Tendrás que emparejar de nuevo la próxima vez.',
  'error.historyStorageUnavailable':
    'DIG Chat no pudo guardar tu historial de mensajes de forma segura en este sistema, así que lo conserva solo durante esta sesión.',
  'settings.heading': 'Historial',
  'settings.export.heading': 'Exporta tu historial',
  'settings.export.body':
    'Guarda todo tu historial de conversaciones en un archivo cifrado que puedes mover a otro ordenador. El archivo se sella con una frase de contraseña — guárdala bien, porque es la única forma de abrir el archivo.',
  'settings.export.passphraseLabel': 'Frase de contraseña',
  'settings.export.confirmLabel': 'Repite la frase de contraseña',
  'settings.export.submit': 'Exportar a un archivo',
  'settings.export.exporting': 'Sellando tu historial…',
  'settings.export.success': 'Se guardó tu historial cifrado en {path}.',
  'settings.export.mismatch': 'Las dos frases de contraseña no coinciden.',
  'settings.import.heading': 'Importar un archivo de historial',
  'settings.import.body':
    'Abre un archivo de historial cifrado y combínalo con esta conversación. Los mensajes que ya tienes se mantienen tal como están.',
  'settings.import.passphraseLabel': 'Frase de contraseña',
  'settings.import.submit': 'Elegir un archivo e importar',
  'settings.import.importing': 'Abriendo tu historial…',
  'settings.import.success':
    'Se añadieron {added, plural, other {# mensajes}}. Ahora tienes {total, plural, other {# mensajes}}.',
  'settings.retention.heading': 'Limpieza automática',
  'settings.retention.body':
    'De forma predeterminada, DIG Chat conserva todos los mensajes. Activa esto para olvidar automáticamente los mensajes más antiguos que un número de días.',
  'settings.retention.enableLabel': 'Eliminar mensajes más antiguos que una edad establecida',
  'settings.retention.daysLabel': 'Días para conservar',
  'settings.danger.heading': 'Eliminar historial',
  'settings.danger.body':
    'Eliminar el historial quita mensajes de este ordenador. No se puede deshacer y no elimina nada en el ordenador de otra persona.',
  'settings.danger.empty': 'No hay conversaciones para eliminar.',
  'settings.danger.clearConversation': 'Eliminar conversación con {did}',
  'settings.danger.clearAll': 'Eliminar todo el historial',
  'settings.danger.confirmHeading': '¿Eliminar este historial?',
  'settings.danger.confirmBody':
    'Esto quita los mensajes de este ordenador y no se puede deshacer.',
  'settings.danger.confirm': 'Eliminar',
  'settings.danger.cancel': 'Conservar',
  'error.archiveFormat': 'Ese archivo no es un archivo de historial de DIG Chat.',
  'error.archiveVersion':
    'Ese archivo de historial se creó con una versión más nueva de DIG Chat. Actualiza e inténtalo de nuevo.',
  'error.archiveDecrypt': 'Esa frase de contraseña no abrió el archivo, o el archivo está dañado.',
  'error.archiveTooLarge':
    'Ese archivo es demasiado grande para ser un archivo de historial de DIG Chat.',
  'error.emptyMessage': 'Escribe algo para enviar.',
  'error.messageTooLong': 'Ese mensaje es demasiado largo para enviarlo.',
  'error.sealFailed': 'DIG Chat se negó a enviar: la DIG App no devolvió un mensaje sellado.',
  'error.unknown': 'Algo salió mal. Inténtalo de nuevo.',
};
