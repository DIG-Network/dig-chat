/** Vietnamese (vi). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const vi: Catalog = {
  'app.version': 'Phiên bản {version}',

  'locale.label': 'Ngôn ngữ',

  'state.checking.heading': 'Đang tìm DIG App của bạn…',
  'state.checking.body':
    'DIG Chat đang kiểm tra xem nó đã được ghép nối chưa và DIG App có đang chạy không.',

  'state.unpaired.heading': 'Ghép nối DIG Chat với danh tính DIG của bạn',
  'state.unpaired.body':
    'DIG Chat dùng danh tính DIG của bạn để mã hóa tin nhắn. Nó không bao giờ có thể chi tiêu từ ví của bạn.',
  'state.unpaired.step1': 'Mở DIG App và chọn Bảo mật → Ghép nối một ứng dụng.',
  'state.unpaired.step2': 'DIG App hiển thị cho bạn một mã tám ký tự, có hiệu lực trong hai phút.',
  'state.unpaired.step3':
    'Nhập mã đó bên dưới. DIG App sẽ yêu cầu bạn phê duyệt DIG Chat theo tên.',
  'state.unpaired.codeLabel': 'Mã ghép nối',
  'state.unpaired.codeHint': 'Tám ký tự, như ABCD-EFGH. Chữ hoa hay chữ thường đều được.',
  'state.unpaired.submit': 'Ghép nối với DIG App',
  'state.unpaired.pairing': 'Đang chờ bạn phê duyệt DIG Chat trong DIG App…',

  'state.appUnreachable.heading': 'DIG App không chạy',
  'state.appUnreachable.body':
    'DIG Chat đã ghép nối với danh tính DIG của máy tính này, nhưng không có phản hồi. Hãy khởi động DIG App và thử lại.',
  'state.appUnreachable.retry': 'Thử lại',

  'state.identityUnsupported.heading': 'DIG App này chưa thể trò chuyện',
  'state.identityUnsupported.body':
    'DIG Chat đã ghép nối và DIG App đang chạy — nhưng phiên bản này không cung cấp khả năng danh tính mà DIG Chat cần để mã hóa tin nhắn. Hãy cập nhật DIG App và thử lại.',
  'state.identityUnsupported.detail':
    'DIG Chat đã yêu cầu identity.attest, identity.seal và identity.unseal. Nó không bao giờ xin quyền ký hoặc chi tiêu.',

  'pairing.problem.empty': 'Nhập mã mà DIG App đã hiển thị cho bạn.',
  'pairing.problem.tooShort':
    'Đó là {found, plural, other {# ký tự}} — một mã ghép nối có tám ký tự.',
  'pairing.problem.tooLong':
    'Đó là {found, plural, other {# ký tự}} — một mã ghép nối có tám ký tự.',

  'chat.heading': 'Cuộc trò chuyện',
  'chat.recipientLabel': 'Gửi tới (DID)',
  'chat.recipientHint': 'Một DID có dạng did:chia:…',
  'chat.bodyLabel': 'Tin nhắn',
  'chat.send': 'Gửi',
  'chat.sending': 'Đang niêm phong và gửi…',
  'chat.empty':
    'Chưa có tin nhắn nào. Mọi thứ bạn gửi đều được mã hóa cho danh tính DIG của người nhận.',
  'chat.from': 'Từ {did}',
  'chat.to': 'Đến {did}',
  'chat.historyEphemeral':
    'Máy tính này không có bộ nhớ an toàn, vì vậy DIG Chat chỉ giữ cuộc trò chuyện này cho đến khi bạn đóng nó — nó không được lưu vào đĩa dưới dạng rõ.',

  'transport.localOnly.heading': 'Tin nhắn ở lại máy tính này',
  'transport.localOnly.body':
    'Lớp truyền tải ngang hàng chưa được xây dựng, nên một tin nhắn bạn gửi sẽ được chuyển trở lại ứng dụng này và không đến nơi nào khác. Mọi thứ còn lại đều là thật: DIG App niêm phong tin nhắn cho khóa danh tính của người nhận trước khi gửi.',

  'unpair.action': 'Quên ghép nối này',
  'unpair.explanation':
    'Thao tác này xóa ghép nối khỏi DIG Chat. Để thu hồi vĩnh viễn quyền truy cập của DIG Chat, hãy dùng Ứng dụng đã ghép nối trong DIG App.',

  'error.appUnreachable': 'DIG App không phản hồi. Nó có đang chạy không?',
  'error.authRequired':
    'DIG App không còn nhận ra ghép nối này. Nó có thể đã bị thu hồi — hãy ghép nối lại bằng một mã mới.',
  'error.authBadMac': 'DIG App đã từ chối yêu cầu. Hãy ghép nối lại bằng một mã mới.',
  'error.authReplay': 'DIG App đã từ chối yêu cầu vì sai thứ tự. Hãy thử lại.',
  'error.pairDenied': 'Ghép nối đã bị từ chối trong DIG App.',
  'error.pairTimeout': 'Không ai phản hồi cửa sổ phê duyệt trong DIG App.',
  'error.pairCodeRejected':
    'DIG App không chấp nhận mã đó. Mã có hiệu lực trong hai phút và chỉ dùng được một lần, nên nó có thể đã hết hạn hoặc đã được dùng. Hãy tạo mã mới và thử lại.',
  'error.connectRequired': 'DIG App cần ứng dụng này kết nối trước.',
  'error.connectDenied': 'Kết nối đã bị từ chối trong DIG App.',
  'error.connectTimeout': 'Không ai phản hồi cửa sổ kết nối trong DIG App.',
  'error.signDenied': 'Điều đó đã bị từ chối trong DIG App.',
  'error.signTimeout': 'Không ai phản hồi cửa sổ trong DIG App.',
  'error.signUnknownType': 'DIG App không nhận ra yêu cầu đó.',
  'error.signBadPayload': 'DIG App không thể đọc yêu cầu đó.',
  'error.signNoConfirmer': 'DIG App không thể hiển thị cửa sổ phê duyệt của nó.',
  'error.locked': 'DIG Account của bạn đang bị khóa. Hãy mở khóa trong DIG App và thử lại.',
  'error.capNotGranted':
    'Ghép nối này chưa được cấp khả năng danh tính mà DIG Chat cần. Hãy ghép nối lại và phê duyệt yêu cầu danh tính.',
  'error.identityUnsupported': 'Phiên bản DIG App này chưa cung cấp các thao tác danh tính.',
  'error.credentialStorageUnavailable':
    'DIG Chat không thể lưu trữ ghép nối một cách an toàn trên hệ thống này, nên nó không lưu gì cả. Bạn sẽ cần ghép nối lại vào lần sau.',
  'error.historyStorageUnavailable':
    'DIG Chat không thể lưu trữ lịch sử tin nhắn của bạn một cách an toàn trên hệ thống này, nên chỉ giữ nó cho phiên này.',
  'settings.heading': 'Lịch sử',
  'settings.export.heading': 'Xuất lịch sử của bạn',
  'settings.export.body':
    'Lưu toàn bộ lịch sử trò chuyện của bạn vào một tệp được mã hóa mà bạn có thể chuyển sang máy tính khác. Tệp được niêm phong bằng một cụm mật khẩu — hãy giữ an toàn, vì đó là cách duy nhất để mở tệp.',
  'settings.export.passphraseLabel': 'Cụm mật khẩu',
  'settings.export.confirmLabel': 'Nhập lại cụm mật khẩu',
  'settings.export.submit': 'Xuất ra tệp',
  'settings.export.exporting': 'Đang niêm phong lịch sử của bạn…',
  'settings.export.success': 'Đã lưu lịch sử được mã hóa của bạn vào {path}.',
  'settings.export.mismatch': 'Hai cụm mật khẩu không khớp.',
  'settings.import.heading': 'Nhập một tệp lịch sử',
  'settings.import.body':
    'Mở một tệp lịch sử được mã hóa và hợp nhất vào cuộc trò chuyện này. Các tin nhắn bạn đã có được giữ nguyên.',
  'settings.import.passphraseLabel': 'Cụm mật khẩu',
  'settings.import.submit': 'Chọn một tệp và nhập',
  'settings.import.importing': 'Đang mở lịch sử của bạn…',
  'settings.import.success':
    'Đã thêm {added, plural, other {# tin nhắn}}. Bây giờ bạn có {total, plural, other {# tin nhắn}}.',
  'settings.retention.heading': 'Tự động dọn dẹp',
  'settings.retention.body':
    'Theo mặc định DIG Chat giữ mọi tin nhắn. Bật tùy chọn này để tự động quên các tin nhắn cũ hơn một số ngày.',
  'settings.retention.enableLabel': 'Xóa các tin nhắn cũ hơn độ tuổi đã đặt',
  'settings.retention.daysLabel': 'Số ngày giữ lại',
  'settings.danger.heading': 'Xóa lịch sử',
  'settings.danger.body':
    'Xóa lịch sử sẽ loại bỏ tin nhắn khỏi máy tính này. Không thể hoàn tác và không xóa bất cứ thứ gì trên máy tính của người khác.',
  'settings.danger.empty': 'Không có cuộc trò chuyện nào để xóa.',
  'settings.danger.clearConversation': 'Xóa cuộc trò chuyện với {did}',
  'settings.danger.clearAll': 'Xóa toàn bộ lịch sử',
  'settings.danger.confirmHeading': 'Xóa lịch sử này?',
  'settings.danger.confirmBody':
    'Thao tác này loại bỏ tin nhắn khỏi máy tính này và không thể hoàn tác.',
  'settings.danger.confirm': 'Xóa',
  'settings.danger.cancel': 'Giữ lại',
  'error.archiveFormat': 'Tệp đó không phải là tệp lịch sử DIG Chat.',
  'error.archiveVersion':
    'Tệp lịch sử đó được tạo bởi một phiên bản DIG Chat mới hơn. Hãy cập nhật và thử lại.',
  'error.archiveDecrypt': 'Cụm mật khẩu đó không mở được tệp, hoặc tệp bị hỏng.',
  'error.archiveTooLarge': 'Tệp đó quá lớn để là một tệp lịch sử DIG Chat.',
  'error.emptyMessage': 'Hãy nhập nội dung để gửi.',
  'error.messageTooLong': 'Tin nhắn đó quá dài để gửi.',
  'error.sealFailed': 'DIG Chat đã từ chối gửi: DIG App không trả về tin nhắn đã niêm phong.',
  'error.notConnected': 'DIG Chat chưa được kết nối. Hãy ghép nối với DIG App của bạn để gửi.',
  'error.unknown': 'Đã xảy ra sự cố. Hãy thử lại.',
  'error.dismiss': 'Bỏ qua',
  'error.boundary.heading': 'DIG Chat đã gặp sự cố',
  'error.boundary.reload': 'Tải lại DIG Chat',
};
