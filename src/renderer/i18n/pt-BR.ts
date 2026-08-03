/** Portuguese, Brazil (pt-BR). Brand/scheme literals — DIG Chat, DIG App, DID, did:chia: — verbatim. */
import type { Catalog } from './en';

export const ptBR: Catalog = {
  'app.version': 'Versão {version}',

  'locale.label': 'Idioma',

  'state.checking.heading': 'Procurando seu DIG App…',
  'state.checking.body':
    'O DIG Chat está verificando se está pareado e se o DIG App está em execução.',

  'state.unpaired.heading': 'Pareie o DIG Chat com sua identidade DIG',
  'state.unpaired.body':
    'O DIG Chat usa sua identidade DIG para criptografar mensagens. Ele nunca pode gastar da sua carteira.',
  'state.unpaired.step1': 'Abra o DIG App e escolha Segurança → Parear um aplicativo.',
  'state.unpaired.step2': 'O DIG App mostra um código de oito caracteres, válido por dois minutos.',
  'state.unpaired.step3':
    'Digite esse código abaixo. O DIG App vai pedir que você aprove o DIG Chat pelo nome.',
  'state.unpaired.codeLabel': 'Código de pareamento',
  'state.unpaired.codeHint':
    'Oito caracteres, como ABCD-EFGH. Funciona em maiúsculas ou minúsculas.',
  'state.unpaired.submit': 'Parear com o DIG App',
  'state.unpaired.pairing': 'Aguardando você aprovar o DIG Chat no DIG App…',

  'state.appUnreachable.heading': 'O DIG App não está em execução',
  'state.appUnreachable.body':
    'O DIG Chat está pareado com a identidade DIG deste computador, mas ninguém respondeu. Inicie o DIG App e tente de novo.',
  'state.appUnreachable.retry': 'Tentar de novo',

  'state.identityUnsupported.heading': 'Este DIG App ainda não faz chat',
  'state.identityUnsupported.body':
    'O DIG Chat está pareado e o DIG App está em execução — mas esta versão não oferece a capacidade de identidade de que o DIG Chat precisa para criptografar mensagens. Atualize o DIG App e tente de novo.',
  'state.identityUnsupported.detail':
    'O DIG Chat pediu identity.attest, identity.seal e identity.unseal. Ele nunca pede permissão para assinar ou gastar.',

  'pairing.problem.empty': 'Digite o código que o DIG App mostrou.',
  'pairing.problem.tooShort':
    'Isso é {found, plural, one {# caractere} other {# caracteres}} — um código de pareamento tem oito.',
  'pairing.problem.tooLong':
    'Isso é {found, plural, one {# caractere} other {# caracteres}} — um código de pareamento tem oito.',

  'chat.heading': 'Conversa',
  'chat.recipientLabel': 'Enviar para (DID)',
  'chat.recipientHint': 'Um DID no formato did:chia:…',
  'chat.bodyLabel': 'Mensagem',
  'chat.send': 'Enviar',
  'chat.sending': 'Selando e enviando…',
  'chat.empty':
    'Ainda não há mensagens. Tudo que você envia é criptografado para a identidade DIG do destinatário.',
  'chat.from': 'De {did}',
  'chat.to': 'Para {did}',
  'chat.historyEphemeral':
    'Este computador não tem armazenamento seguro, então o DIG Chat mantém esta conversa apenas até você fechá-la — ela não é salva em disco sem criptografia.',

  'transport.localOnly.heading': 'As mensagens ficam neste computador',
  'transport.localOnly.body':
    'O transporte ponto a ponto ainda não foi construído, então uma mensagem que você envia é entregue de volta a este aplicativo e a nenhum outro lugar. Todo o resto é real: o DIG App sela a mensagem para a chave de identidade do destinatário antes de ela ser enviada.',

  'unpair.action': 'Esquecer este pareamento',
  'unpair.explanation':
    'Isso remove o pareamento do DIG Chat. Para revogar o acesso do DIG Chat de vez, use Aplicativos pareados no DIG App.',

  'error.retry': 'Tentar de novo',
  'error.appUnreachable': 'O DIG App não respondeu. Ele está em execução?',
  'error.authRequired':
    'O DIG App não reconhece mais este pareamento. Ele pode ter sido revogado — pareie de novo com um código novo.',
  'error.authBadMac': 'O DIG App rejeitou a solicitação. Pareie de novo com um código novo.',
  'error.authReplay': 'O DIG App rejeitou a solicitação por estar fora de ordem. Tente de novo.',
  'error.pairDenied': 'O pareamento foi recusado no DIG App.',
  'error.pairTimeout': 'Ninguém respondeu à janela de aprovação no DIG App.',
  'error.pairCodeRejected':
    'O DIG App não aceitou esse código. Os códigos duram dois minutos e funcionam só uma vez, então ele pode ter expirado ou já ter sido usado. Gere um novo e tente de novo.',
  'error.connectRequired': 'O DIG App precisa que este aplicativo se conecte primeiro.',
  'error.connectDenied': 'A conexão foi recusada no DIG App.',
  'error.connectTimeout': 'Ninguém respondeu à janela de conexão no DIG App.',
  'error.signDenied': 'Isso foi recusado no DIG App.',
  'error.signTimeout': 'Ninguém respondeu à janela no DIG App.',
  'error.signUnknownType': 'O DIG App não reconheceu essa solicitação.',
  'error.signBadPayload': 'O DIG App não conseguiu ler essa solicitação.',
  'error.signNoConfirmer': 'O DIG App não conseguiu mostrar sua janela de aprovação.',
  'error.locked': 'Sua DIG Account está bloqueada. Desbloqueie-a no DIG App e tente de novo.',
  'error.capNotGranted':
    'A este pareamento não foi concedida a capacidade de identidade de que o DIG Chat precisa. Pareie de novo e aprove a solicitação de identidade.',
  'error.identityUnsupported': 'Esta versão do DIG App ainda não oferece operações de identidade.',
  'error.credentialStorageUnavailable':
    'O DIG Chat não conseguiu guardar o pareamento com segurança neste sistema, então não o guardou de forma alguma. Você vai precisar parear de novo na próxima vez.',
  'error.historyStorageUnavailable':
    'O DIG Chat não conseguiu guardar seu histórico de mensagens com segurança neste sistema, então está mantendo-o apenas nesta sessão.',
  'settings.heading': 'Histórico',
  'settings.export.heading': 'Exportar seu histórico',
  'settings.export.body':
    'Salve todo o seu histórico de conversas em um arquivo criptografado que você pode mover para outro computador. O arquivo é selado com uma frase secreta — guarde-a bem, pois é a única forma de abrir o arquivo.',
  'settings.export.passphraseLabel': 'Frase secreta',
  'settings.export.confirmLabel': 'Repita a frase secreta',
  'settings.export.submit': 'Exportar para um arquivo',
  'settings.export.exporting': 'Selando seu histórico…',
  'settings.export.success': 'Seu histórico criptografado foi salvo em {path}.',
  'settings.export.mismatch': 'As duas frases secretas não coincidem.',
  'settings.import.heading': 'Importar um arquivo de histórico',
  'settings.import.body':
    'Abra um arquivo de histórico criptografado e mescle-o com esta conversa. As mensagens que você já tem permanecem como estão.',
  'settings.import.passphraseLabel': 'Frase secreta',
  'settings.import.submit': 'Escolher um arquivo e importar',
  'settings.import.importing': 'Abrindo seu histórico…',
  'settings.import.success':
    '{added, plural, other {# mensagens}} adicionadas. Agora você tem {total, plural, other {# mensagens}}.',
  'settings.retention.heading': 'Limpeza automática',
  'settings.retention.body':
    'Por padrão, o DIG Chat mantém todas as mensagens. Ative isto para esquecer automaticamente mensagens mais antigas que um número de dias.',
  'settings.retention.enableLabel': 'Excluir mensagens mais antigas que uma idade definida',
  'settings.retention.daysLabel': 'Dias para manter',
  'settings.danger.heading': 'Excluir histórico',
  'settings.danger.body':
    'Excluir o histórico remove mensagens deste computador. Não pode ser desfeito e não exclui nada no computador de outra pessoa.',
  'settings.danger.empty': 'Não há conversas para excluir.',
  'settings.danger.clearConversation': 'Excluir conversa com {did}',
  'settings.danger.clearAll': 'Excluir todo o histórico',
  'settings.danger.confirmHeading': 'Excluir este histórico?',
  'settings.danger.confirmBody':
    'Isto remove as mensagens deste computador e não pode ser desfeito.',
  'settings.danger.confirm': 'Excluir',
  'settings.danger.cancel': 'Manter',
  'error.archiveFormat': 'Esse arquivo não é um arquivo de histórico do DIG Chat.',
  'error.archiveVersion':
    'Esse arquivo de histórico foi criado por uma versão mais nova do DIG Chat. Atualize e tente novamente.',
  'error.archiveDecrypt': 'Essa frase secreta não abriu o arquivo, ou o arquivo está danificado.',
  'error.archiveTooLarge':
    'Esse arquivo é grande demais para ser um arquivo de histórico do DIG Chat.',
  'error.emptyMessage': 'Digite algo para enviar.',
  'error.messageTooLong': 'Essa mensagem é longa demais para enviar.',
  'error.sealFailed': 'O DIG Chat se recusou a enviar: o DIG App não retornou uma mensagem selada.',
  'error.unknown': 'Algo deu errado. Tente de novo.',
  'error.dismiss': 'Dispensar',
  'error.boundary.heading': 'O DIG Chat encontrou um problema',
  'error.boundary.reload': 'Recarregar o DIG Chat',
};
