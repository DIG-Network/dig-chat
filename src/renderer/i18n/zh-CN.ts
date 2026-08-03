/** Chinese, Simplified (zh-CN). Brand/scheme literals — DIG Chat, DIG App, DID, did:chia: — verbatim. */
import type { Catalog } from './en';

export const zhCN: Catalog = {
  'app.version': '版本 {version}',

  'locale.label': '语言',

  'state.checking.heading': '正在查找你的 DIG App…',
  'state.checking.body': 'DIG Chat 正在检查是否已配对，以及 DIG App 是否正在运行。',

  'state.unpaired.heading': '将 DIG Chat 与你的 DIG 身份配对',
  'state.unpaired.body': 'DIG Chat 使用你的 DIG 身份来加密消息。它永远无法从你的钱包中支出。',
  'state.unpaired.step1': '打开 DIG App，选择 安全 → 配对应用。',
  'state.unpaired.step2': 'DIG App 会向你显示一个八位字符的验证码，有效期两分钟。',
  'state.unpaired.step3': '在下方输入该验证码。DIG App 会请你按名称批准 DIG Chat。',
  'state.unpaired.codeLabel': '配对码',
  'state.unpaired.codeHint': '八位字符，例如 ABCD-EFGH。大小写均可。',
  'state.unpaired.submit': '与 DIG App 配对',
  'state.unpaired.pairing': '正在等待你在 DIG App 中批准 DIG Chat…',

  'state.appUnreachable.heading': 'DIG App 未运行',
  'state.appUnreachable.body':
    'DIG Chat 已与这台计算机的 DIG 身份配对，但没有任何响应。请启动 DIG App 后重试。',
  'state.appUnreachable.retry': '重试',

  'state.identityUnsupported.heading': '此 DIG App 尚不支持聊天',
  'state.identityUnsupported.body':
    'DIG Chat 已配对，DIG App 也在运行——但此版本未提供 DIG Chat 加密消息所需的身份能力。请更新 DIG App 后重试。',
  'state.identityUnsupported.detail':
    'DIG Chat 请求了 identity.attest、identity.seal 和 identity.unseal。它从不请求签名或支出的权限。',

  'pairing.problem.empty': '请输入 DIG App 向你显示的验证码。',
  'pairing.problem.tooShort': '那是 {found, plural, other {# 个字符}}——配对码有八位。',
  'pairing.problem.tooLong': '那是 {found, plural, other {# 个字符}}——配对码有八位。',

  'chat.heading': '对话',
  'chat.recipientLabel': '发送至（DID）',
  'chat.recipientHint': '形如 did:chia:… 的 DID',
  'chat.bodyLabel': '消息',
  'chat.send': '发送',
  'chat.sending': '正在封装并发送…',
  'chat.empty': '还没有消息。你发送的任何内容都会为收件人的 DIG 身份加密。',
  'chat.from': '来自 {did}',
  'chat.to': '发给 {did}',
  'chat.historyEphemeral':
    '这台计算机没有安全存储，因此 DIG Chat 仅在你关闭前保留此对话——它不会以明文保存到磁盘。',

  'transport.localOnly.heading': '消息保留在这台计算机上',
  'transport.localOnly.body':
    '点对点传输尚未构建，因此你发送的消息只会回传到本应用，不会发往其他任何地方。其余一切都是真实的：DIG App 会在消息发送前将其封装到收件人的身份密钥。',

  'unpair.action': '忘记此配对',
  'unpair.explanation':
    '这会从 DIG Chat 中移除该配对。若要彻底撤销 DIG Chat 的访问权限，请在 DIG App 中使用 已配对的应用。',

  'error.appUnreachable': 'DIG App 未响应。它在运行吗？',
  'error.authRequired': 'DIG App 不再识别此配对。它可能已被撤销——请用新的验证码重新配对。',
  'error.authBadMac': 'DIG App 拒绝了该请求。请用新的验证码重新配对。',
  'error.authReplay': 'DIG App 因请求顺序错乱而拒绝。请重试。',
  'error.pairDenied': '配对在 DIG App 中被拒绝。',
  'error.pairTimeout': '没有人响应 DIG App 中的批准窗口。',
  'error.pairCodeRejected':
    'DIG App 未接受该验证码。验证码有效期两分钟且只能使用一次，因此它可能已过期或已被使用。请生成一个新的并重试。',
  'error.connectRequired': 'DIG App 需要此应用先连接。',
  'error.connectDenied': '连接在 DIG App 中被拒绝。',
  'error.connectTimeout': '没有人响应 DIG App 中的连接窗口。',
  'error.signDenied': '该操作在 DIG App 中被拒绝。',
  'error.signTimeout': '没有人响应 DIG App 中的窗口。',
  'error.signUnknownType': 'DIG App 无法识别该请求。',
  'error.signBadPayload': 'DIG App 无法读取该请求。',
  'error.signNoConfirmer': 'DIG App 无法显示其批准窗口。',
  'error.locked': '你的 DIG Account 已锁定。请在 DIG App 中解锁后重试。',
  'error.capNotGranted': '此配对未被授予 DIG Chat 所需的身份能力。请重新配对，并批准身份请求。',
  'error.identityUnsupported': '此版本的 DIG App 尚未提供身份操作。',
  'error.credentialStorageUnavailable':
    'DIG Chat 无法在此系统上安全地存储该配对，因此根本没有存储。下次你需要重新配对。',
  'error.historyStorageUnavailable':
    'DIG Chat 无法在此系统上安全地存储你的消息历史，因此仅在本次会话中保留。',
  'settings.heading': '历史记录',
  'settings.export.heading': '导出你的历史记录',
  'settings.export.body':
    '将你的全部对话历史保存到一个加密文件中，你可以将其移动到另一台计算机。该文件使用一个口令短语封存——请妥善保管，因为这是打开文件的唯一方式。',
  'settings.export.passphraseLabel': '口令短语',
  'settings.export.confirmLabel': '再次输入口令短语',
  'settings.export.submit': '导出到文件',
  'settings.export.exporting': '正在封存你的历史记录…',
  'settings.export.success': '已将你的加密历史记录保存到 {path}。',
  'settings.export.mismatch': '两个口令短语不匹配。',
  'settings.import.heading': '导入历史记录文件',
  'settings.import.body':
    '打开一个加密的历史记录文件并将其合并到此对话中。你已有的消息将保持不变。',
  'settings.import.passphraseLabel': '口令短语',
  'settings.import.submit': '选择文件并导入',
  'settings.import.importing': '正在打开你的历史记录…',
  'settings.import.success':
    '已添加 {added, plural, other {# 条消息}}。你现在有 {total, plural, other {# 条消息}}。',
  'settings.retention.heading': '自动清理',
  'settings.retention.body':
    '默认情况下，DIG Chat 会保留每一条消息。开启此项可自动忘记超过指定天数的消息。',
  'settings.retention.enableLabel': '删除超过设定时长的消息',
  'settings.retention.daysLabel': '保留天数',
  'settings.danger.heading': '删除历史记录',
  'settings.danger.body':
    '删除历史记录会从这台计算机上移除消息。此操作无法撤销，且不会删除其他人计算机上的任何内容。',
  'settings.danger.empty': '没有可删除的对话。',
  'settings.danger.clearConversation': '删除与 {did} 的对话',
  'settings.danger.clearAll': '删除全部历史记录',
  'settings.danger.confirmHeading': '删除此历史记录？',
  'settings.danger.confirmBody': '此操作会从这台计算机上移除消息，且无法撤销。',
  'settings.danger.confirm': '删除',
  'settings.danger.cancel': '保留',
  'error.archiveFormat': '该文件不是 DIG Chat 历史记录文件。',
  'error.archiveVersion': '该历史记录文件是由更新版本的 DIG Chat 创建的。请更新后重试。',
  'error.archiveDecrypt': '该口令短语未能打开文件，或文件已损坏。',
  'error.archiveTooLarge': '该文件太大，不可能是 DIG Chat 历史文件。',
  'error.emptyMessage': '请输入要发送的内容。',
  'error.messageTooLong': '该消息过长，无法发送。',
  'error.sealFailed': 'DIG Chat 拒绝发送：DIG App 未返回已封装的消息。',
  'error.notConnected': 'DIG Chat 未连接。请先与你的 DIG App 配对后再发送。',
  'error.unknown': '出了点问题。请重试。',
  'error.dismiss': '关闭',
  'error.boundary.heading': 'DIG Chat 遇到问题',
  'error.boundary.reload': '重新加载 DIG Chat',
};
