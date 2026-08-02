/** Korean (ko). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const ko: Catalog = {
  'app.name': 'DIG Chat',
  'app.tagline': '당신의 DIG 신원으로 서명된 비공개 메시지.',
  'app.version': '버전 {version}',

  'locale.label': '언어',

  'state.checking.heading': 'DIG App을 찾는 중…',
  'state.checking.body':
    'DIG Chat이 페어링되어 있는지, 그리고 DIG App이 실행 중인지 확인하고 있습니다.',

  'state.unpaired.heading': 'DIG Chat을 당신의 DIG 신원과 페어링하세요',
  'state.unpaired.body':
    'DIG Chat은 메시지를 암호화하는 데 당신의 DIG 신원을 사용합니다. 지갑에서 절대 지출할 수 없습니다.',
  'state.unpaired.step1': 'DIG App을 열고 보안 → 앱 페어링을 선택하세요.',
  'state.unpaired.step2': 'DIG App이 2분간 유효한 8자리 코드를 보여줍니다.',
  'state.unpaired.step3':
    '아래에 그 코드를 입력하세요. DIG App이 DIG Chat을 이름으로 승인하도록 요청합니다.',
  'state.unpaired.codeLabel': '페어링 코드',
  'state.unpaired.codeHint': 'ABCD-EFGH 같은 8자. 대문자와 소문자 모두 사용할 수 있습니다.',
  'state.unpaired.submit': 'DIG App과 페어링',
  'state.unpaired.pairing': 'DIG App에서 DIG Chat을 승인하기를 기다리는 중…',

  'state.appUnreachable.heading': 'DIG App이 실행되고 있지 않습니다',
  'state.appUnreachable.body':
    'DIG Chat은 이 컴퓨터의 DIG 신원과 페어링되어 있지만 아무 응답이 없습니다. DIG App을 시작하고 다시 시도하세요.',
  'state.appUnreachable.retry': '다시 시도',

  'state.identityUnsupported.heading': '이 DIG App은 아직 채팅을 지원하지 않습니다',
  'state.identityUnsupported.body':
    'DIG Chat이 페어링되어 있고 DIG App도 실행 중입니다 — 하지만 이 버전은 DIG Chat이 메시지를 암호화하는 데 필요한 신원 기능을 제공하지 않습니다. DIG App을 업데이트하고 다시 시도하세요.',
  'state.identityUnsupported.detail':
    'DIG Chat은 identity.attest, identity.seal, identity.unseal을 요청했습니다. 서명하거나 지출할 권한은 절대 요청하지 않습니다.',

  'state.connected.you': '당신은 {did}입니다',

  'pairing.problem.empty': 'DIG App이 보여준 코드를 입력하세요.',
  'pairing.problem.tooShort':
    '그것은 {found, plural, other {#자}}입니다 — 페어링 코드는 여덟 자입니다.',
  'pairing.problem.tooLong':
    '그것은 {found, plural, other {#자}}입니다 — 페어링 코드는 여덟 자입니다.',

  'chat.heading': '대화',
  'chat.recipientLabel': '보낼 대상 (DID)',
  'chat.recipientHint': 'did:chia:… 형태의 DID',
  'chat.bodyLabel': '메시지',
  'chat.send': '보내기',
  'chat.sending': '봉인하고 보내는 중…',
  'chat.empty': '아직 메시지가 없습니다. 보내는 모든 것은 받는 사람의 DIG 신원으로 암호화됩니다.',
  'chat.unreadable': '{count, plural, other {#개의 메시지를 열 수 없습니다}}.',
  'chat.from': '{did} 님으로부터',
  'chat.to': '{did} 님에게',
  'chat.historyEphemeral':
    '이 컴퓨터에는 보안 저장소가 없어서 DIG Chat은 이 대화를 닫을 때까지만 보관합니다 — 평문으로 디스크에 저장하지 않습니다.',

  'transport.localOnly.heading': '메시지는 이 컴퓨터에 머무릅니다',
  'transport.localOnly.body':
    '피어 투 피어 전송은 아직 구축되지 않았기 때문에, 보낸 메시지는 이 앱으로 다시 전달될 뿐 다른 어디로도 가지 않습니다. 그 외 모든 것은 실제입니다: DIG App이 메시지를 보내기 전에 받는 사람의 신원 키로 봉인합니다.',

  'unpair.action': '이 페어링 잊기',
  'unpair.explanation':
    '이 작업은 DIG Chat에서 페어링을 제거합니다. DIG Chat의 접근을 완전히 취소하려면 DIG App의 페어링된 앱을 사용하세요.',

  'error.heading': '실패했습니다',
  'error.retry': '다시 시도',
  'error.appUnreachable': 'DIG App이 응답하지 않았습니다. 실행 중인가요?',
  'error.authRequired':
    'DIG App이 이 페어링을 더 이상 인식하지 못합니다. 취소되었을 수 있습니다 — 새 코드로 다시 페어링하세요.',
  'error.authBadMac': 'DIG App이 요청을 거부했습니다. 새 코드로 다시 페어링하세요.',
  'error.authReplay': 'DIG App이 순서에 어긋난 요청으로 거부했습니다. 다시 시도하세요.',
  'error.pairDenied': '페어링이 DIG App에서 거부되었습니다.',
  'error.pairTimeout': 'DIG App의 승인 창에 아무도 응답하지 않았습니다.',
  'error.pairCodeRejected':
    'DIG App이 그 코드를 받아들이지 않았습니다. 코드는 2분간 유효하며 한 번만 작동하므로 만료되었거나 이미 사용되었을 수 있습니다. 새 코드를 생성하고 다시 시도하세요.',
  'error.connectRequired': 'DIG App은 이 앱이 먼저 연결되어야 합니다.',
  'error.connectDenied': '연결이 DIG App에서 거부되었습니다.',
  'error.connectTimeout': 'DIG App의 연결 창에 아무도 응답하지 않았습니다.',
  'error.signDenied': '그 작업이 DIG App에서 거부되었습니다.',
  'error.signTimeout': 'DIG App의 창에 아무도 응답하지 않았습니다.',
  'error.signUnknownType': 'DIG App이 그 요청을 인식하지 못했습니다.',
  'error.signBadPayload': 'DIG App이 그 요청을 읽을 수 없었습니다.',
  'error.signNoConfirmer': 'DIG App이 승인 창을 표시할 수 없었습니다.',
  'error.locked': 'DIG Account가 잠겨 있습니다. DIG App에서 잠금을 해제하고 다시 시도하세요.',
  'error.capNotGranted':
    '이 페어링에는 DIG Chat이 필요로 하는 신원 기능이 부여되지 않았습니다. 다시 페어링하고 신원 요청을 승인하세요.',
  'error.identityUnsupported': '이 버전의 DIG App은 아직 신원 작업을 제공하지 않습니다.',
  'error.credentialStorageUnavailable':
    'DIG Chat이 이 시스템에서 페어링을 안전하게 저장할 수 없어서 전혀 저장하지 않았습니다. 다음에 다시 페어링해야 합니다.',
  'error.historyStorageUnavailable':
    'DIG Chat이 이 시스템에서 메시지 기록을 안전하게 저장할 수 없어서 이 세션 동안만 보관합니다.',
  'settings.heading': '기록',
  'settings.export.heading': '기록 내보내기',
  'settings.export.body':
    '전체 대화 기록을 다른 컴퓨터로 옮길 수 있는 암호화된 파일로 저장하세요. 파일은 암호문구로 봉인됩니다 — 파일을 여는 유일한 방법이므로 안전하게 보관하세요.',
  'settings.export.passphraseLabel': '암호문구',
  'settings.export.confirmLabel': '암호문구 다시 입력',
  'settings.export.submit': '파일로 내보내기',
  'settings.export.exporting': '기록을 봉인하는 중…',
  'settings.export.success': '암호화된 기록을 {path}에 저장했습니다.',
  'settings.export.mismatch': '두 암호문구가 일치하지 않습니다.',
  'settings.import.heading': '기록 파일 가져오기',
  'settings.import.body':
    '암호화된 기록 파일을 열어 이 대화에 병합합니다. 이미 가지고 있는 메시지는 그대로 유지됩니다.',
  'settings.import.passphraseLabel': '암호문구',
  'settings.import.submit': '파일 선택 후 가져오기',
  'settings.import.importing': '기록을 여는 중…',
  'settings.import.success':
    '{added, plural, other {#개의 메시지}}를 추가했습니다. 이제 {total, plural, other {#개의 메시지}}가 있습니다.',
  'settings.retention.heading': '자동 정리',
  'settings.retention.body':
    '기본적으로 DIG Chat은 모든 메시지를 보관합니다. 이 기능을 켜면 지정한 일수보다 오래된 메시지를 자동으로 삭제합니다.',
  'settings.retention.enableLabel': '설정한 기간보다 오래된 메시지 삭제',
  'settings.retention.daysLabel': '보관할 일수',
  'settings.danger.heading': '기록 삭제',
  'settings.danger.body':
    '기록을 삭제하면 이 컴퓨터에서 메시지가 제거됩니다. 되돌릴 수 없으며, 다른 사람의 컴퓨터에 있는 내용은 삭제하지 않습니다.',
  'settings.danger.empty': '삭제할 대화가 없습니다.',
  'settings.danger.clearConversation': '{did}와의 대화 삭제',
  'settings.danger.clearAll': '모든 기록 삭제',
  'settings.danger.confirmHeading': '이 기록을 삭제할까요?',
  'settings.danger.confirmBody': '이 작업은 이 컴퓨터에서 메시지를 제거하며 되돌릴 수 없습니다.',
  'settings.danger.confirm': '삭제',
  'settings.danger.cancel': '유지',
  'error.archiveFormat': '그 파일은 DIG Chat 기록 파일이 아닙니다.',
  'error.archiveVersion':
    '그 기록 파일은 최신 버전의 DIG Chat으로 만들어졌습니다. 업데이트한 후 다시 시도하세요.',
  'error.archiveDecrypt': '그 암호문구로 파일을 열지 못했거나 파일이 손상되었습니다.',
  'error.emptyMessage': '보낼 내용을 입력하세요.',
  'error.messageTooLong': '그 메시지는 너무 길어서 보낼 수 없습니다.',
  'error.sealFailed':
    'DIG Chat이 전송을 거부했습니다: DIG App이 봉인된 메시지를 반환하지 않았습니다.',
  'error.unknown': '문제가 발생했습니다. 다시 시도하세요.',
};
