/** Chinese, Traditional (zh-TW). Brand/scheme literals — DIG Chat, DIG App, DID, did:chia: — verbatim. */
import type { Catalog } from './en';

export const zhTW: Catalog = {
  'app.name': 'DIG Chat',
  'app.tagline': '由你的 DIG 身分簽署的私密訊息。',
  'app.version': '版本 {version}',

  'locale.label': '語言',

  'state.checking.heading': '正在尋找你的 DIG App…',
  'state.checking.body': 'DIG Chat 正在檢查是否已配對，以及 DIG App 是否正在執行。',

  'state.unpaired.heading': '將 DIG Chat 與你的 DIG 身分配對',
  'state.unpaired.body': 'DIG Chat 使用你的 DIG 身分來加密訊息。它永遠無法從你的錢包支出。',
  'state.unpaired.step1': '開啟 DIG App，選擇 安全性 → 配對應用程式。',
  'state.unpaired.step2': 'DIG App 會向你顯示一組八位字元的驗證碼，有效期兩分鐘。',
  'state.unpaired.step3': '在下方輸入該驗證碼。DIG App 會請你依名稱核准 DIG Chat。',
  'state.unpaired.codeLabel': '配對碼',
  'state.unpaired.codeHint': '八位字元，例如 ABCD-EFGH。大小寫皆可。',
  'state.unpaired.submit': '與 DIG App 配對',
  'state.unpaired.pairing': '正在等待你在 DIG App 中核准 DIG Chat…',

  'state.appUnreachable.heading': 'DIG App 未執行',
  'state.appUnreachable.body':
    'DIG Chat 已與這台電腦的 DIG 身分配對，但沒有任何回應。請啟動 DIG App 後再試一次。',
  'state.appUnreachable.retry': '再試一次',

  'state.identityUnsupported.heading': '此 DIG App 尚不支援聊天',
  'state.identityUnsupported.body':
    'DIG Chat 已配對，DIG App 也在執行——但此版本未提供 DIG Chat 加密訊息所需的身分能力。請更新 DIG App 後再試一次。',
  'state.identityUnsupported.detail':
    'DIG Chat 要求了 identity.attest、identity.seal 和 identity.unseal。它從不要求簽署或支出的權限。',

  'state.connected.you': '你是 {did}',

  'pairing.problem.empty': '請輸入 DIG App 向你顯示的驗證碼。',
  'pairing.problem.tooShort': '那是 {found, plural, other {# 個字元}}——配對碼有八位。',
  'pairing.problem.tooLong': '那是 {found, plural, other {# 個字元}}——配對碼有八位。',

  'chat.heading': '對話',
  'chat.recipientLabel': '傳送至（DID）',
  'chat.recipientHint': '形如 did:chia:… 的 DID',
  'chat.bodyLabel': '訊息',
  'chat.send': '傳送',
  'chat.sending': '正在封裝並傳送…',
  'chat.empty': '還沒有訊息。你傳送的任何內容都會為收件人的 DIG 身分加密。',
  'chat.unreadable': '{count, plural, other {有 # 則訊息無法開啟}}。',
  'chat.from': '來自 {did}',
  'chat.to': '傳給 {did}',
  'chat.historyEphemeral':
    '這台電腦沒有安全儲存空間，因此 DIG Chat 只在你關閉前保留此對話——它不會以明文儲存到磁碟。',

  'transport.localOnly.heading': '訊息保留在這台電腦上',
  'transport.localOnly.body':
    '點對點傳輸尚未建立，因此你傳送的訊息只會回傳到本應用程式，不會送往其他任何地方。其餘一切都是真實的：DIG App 會在訊息傳送前將其封裝到收件人的身分金鑰。',

  'unpair.action': '忘記此配對',
  'unpair.explanation':
    '這會從 DIG Chat 中移除該配對。若要徹底撤銷 DIG Chat 的存取權，請在 DIG App 中使用 已配對的應用程式。',

  'error.heading': '操作未成功',
  'error.retry': '再試一次',
  'error.appUnreachable': 'DIG App 未回應。它在執行嗎？',
  'error.authRequired': 'DIG App 不再辨識此配對。它可能已被撤銷——請用新的驗證碼重新配對。',
  'error.authBadMac': 'DIG App 拒絕了該要求。請用新的驗證碼重新配對。',
  'error.authReplay': 'DIG App 因要求順序錯亂而拒絕。請再試一次。',
  'error.pairDenied': '配對在 DIG App 中被拒絕。',
  'error.pairTimeout': '沒有人回應 DIG App 中的核准視窗。',
  'error.pairCodeRejected':
    'DIG App 未接受該驗證碼。驗證碼有效期兩分鐘且只能使用一次，因此它可能已過期或已被使用。請產生一組新的並再試一次。',
  'error.connectRequired': 'DIG App 需要此應用程式先連線。',
  'error.connectDenied': '連線在 DIG App 中被拒絕。',
  'error.connectTimeout': '沒有人回應 DIG App 中的連線視窗。',
  'error.signDenied': '該操作在 DIG App 中被拒絕。',
  'error.signTimeout': '沒有人回應 DIG App 中的視窗。',
  'error.signUnknownType': 'DIG App 無法辨識該要求。',
  'error.signBadPayload': 'DIG App 無法讀取該要求。',
  'error.signNoConfirmer': 'DIG App 無法顯示其核准視窗。',
  'error.locked': '你的 DIG Account 已鎖定。請在 DIG App 中解鎖後再試一次。',
  'error.capNotGranted': '此配對未被授予 DIG Chat 所需的身分能力。請重新配對，並核准身分要求。',
  'error.identityUnsupported': '此版本的 DIG App 尚未提供身分操作。',
  'error.credentialStorageUnavailable':
    'DIG Chat 無法在此系統上安全地儲存該配對，因此根本沒有儲存。下次你需要重新配對。',
  'error.historyStorageUnavailable':
    'DIG Chat 無法在此系統上安全地儲存你的訊息歷史，因此僅在本次工作階段中保留。',
  'settings.heading': '歷史記錄',
  'settings.export.heading': '匯出你的歷史記錄',
  'settings.export.body':
    '將你的全部對話歷史儲存到一個加密檔案中，你可以將其移動到另一台電腦。該檔案使用一個通關密語封存——請妥善保管，因為這是開啟檔案的唯一方式。',
  'settings.export.passphraseLabel': '通關密語',
  'settings.export.confirmLabel': '再次輸入通關密語',
  'settings.export.submit': '匯出到檔案',
  'settings.export.exporting': '正在封存你的歷史記錄…',
  'settings.export.success': '已將你的加密歷史記錄儲存到 {path}。',
  'settings.export.mismatch': '兩個通關密語不相符。',
  'settings.import.heading': '匯入歷史記錄檔案',
  'settings.import.body':
    '開啟一個加密的歷史記錄檔案並將其合併到此對話中。你已有的訊息將保持不變。',
  'settings.import.passphraseLabel': '通關密語',
  'settings.import.submit': '選擇檔案並匯入',
  'settings.import.importing': '正在開啟你的歷史記錄…',
  'settings.import.success':
    '已新增 {added, plural, other {# 則訊息}}。你現在有 {total, plural, other {# 則訊息}}。',
  'settings.retention.heading': '自動清理',
  'settings.retention.body':
    '預設情況下，DIG Chat 會保留每一則訊息。開啟此項可自動忘記超過指定天數的訊息。',
  'settings.retention.enableLabel': '刪除超過設定時長的訊息',
  'settings.retention.daysLabel': '保留天數',
  'settings.danger.heading': '刪除歷史記錄',
  'settings.danger.body':
    '刪除歷史記錄會從這台電腦上移除訊息。此操作無法復原，且不會刪除其他人電腦上的任何內容。',
  'settings.danger.empty': '沒有可刪除的對話。',
  'settings.danger.clearConversation': '刪除與 {did} 的對話',
  'settings.danger.clearAll': '刪除全部歷史記錄',
  'settings.danger.confirmHeading': '刪除此歷史記錄？',
  'settings.danger.confirmBody': '此操作會從這台電腦上移除訊息，且無法復原。',
  'settings.danger.confirm': '刪除',
  'settings.danger.cancel': '保留',
  'error.archiveFormat': '該檔案不是 DIG Chat 歷史記錄檔案。',
  'error.archiveVersion': '該歷史記錄檔案是由較新版本的 DIG Chat 建立的。請更新後重試。',
  'error.archiveDecrypt': '該通關密語未能開啟檔案，或檔案已損毀。',
  'error.archiveTooLarge': '該檔案太大，不可能是 DIG Chat 歷史檔案。',
  'error.emptyMessage': '請輸入要傳送的內容。',
  'error.messageTooLong': '該訊息過長，無法傳送。',
  'error.sealFailed': 'DIG Chat 拒絕傳送：DIG App 未回傳已封裝的訊息。',
  'error.unknown': '出了點問題。請再試一次。',
};
