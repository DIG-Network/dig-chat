/** Turkish (tr). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const tr: Catalog = {
  'app.name': 'DIG Chat',
  'app.tagline': 'DIG kimliğinizle imzalanan özel mesajlar.',
  'app.version': 'Sürüm {version}',

  'locale.label': 'Dil',

  'state.checking.heading': 'DIG App aranıyor…',
  'state.checking.body':
    'DIG Chat, eşleştirilip eşleştirilmediğini ve DIG App’in çalışıp çalışmadığını denetliyor.',

  'state.unpaired.heading': 'DIG Chat’i DIG kimliğinizle eşleştirin',
  'state.unpaired.body':
    'DIG Chat, mesajları şifrelemek için DIG kimliğinizi kullanır. Cüzdanınızdan asla harcama yapamaz.',
  'state.unpaired.step1': 'DIG App’i açın ve Güvenlik → Bir uygulama eşleştir’i seçin.',
  'state.unpaired.step2': 'DIG App size iki dakika geçerli, sekiz karakterlik bir kod gösterir.',
  'state.unpaired.step3':
    'Bu kodu aşağıya yazın. DIG App, DIG Chat’i adıyla onaylamanızı isteyecek.',
  'state.unpaired.codeLabel': 'Eşleştirme kodu',
  'state.unpaired.codeHint':
    'ABCD-EFGH gibi sekiz karakter. Büyük veya küçük harf, ikisi de çalışır.',
  'state.unpaired.submit': 'DIG App ile eşleştir',
  'state.unpaired.pairing': 'DIG App’te DIG Chat’i onaylamanız bekleniyor…',

  'state.appUnreachable.heading': 'DIG App çalışmıyor',
  'state.appUnreachable.body':
    'DIG Chat bu bilgisayarın DIG kimliğiyle eşleştirildi, ancak yanıt veren olmadı. DIG App’i başlatın ve yeniden deneyin.',
  'state.appUnreachable.retry': 'Yeniden dene',

  'state.identityUnsupported.heading': 'Bu DIG App henüz sohbet yapamıyor',
  'state.identityUnsupported.body':
    'DIG Chat eşleştirildi ve DIG App çalışıyor — ancak bu sürüm, DIG Chat’in mesajları şifrelemek için ihtiyaç duyduğu kimlik yeteneğini sunmuyor. DIG App’i güncelleyin ve yeniden deneyin.',
  'state.identityUnsupported.detail':
    'DIG Chat, identity.attest, identity.seal ve identity.unseal istedi. İmzalama veya harcama izni asla istemez.',

  'state.connected.you': 'Siz {did} kişisisiniz',

  'pairing.problem.empty': 'DIG App’in size gösterdiği kodu yazın.',
  'pairing.problem.tooShort':
    'Bu {found, plural, one {# karakter} other {# karakter}} — bir eşleştirme kodu sekiz karakterdir.',
  'pairing.problem.tooLong':
    'Bu {found, plural, one {# karakter} other {# karakter}} — bir eşleştirme kodu sekiz karakterdir.',

  'chat.heading': 'Konuşma',
  'chat.recipientLabel': 'Gönderilecek (DID)',
  'chat.recipientHint': 'did:chia:… biçiminde bir DID',
  'chat.bodyLabel': 'Mesaj',
  'chat.send': 'Gönder',
  'chat.sending': 'Mühürleniyor ve gönderiliyor…',
  'chat.empty': 'Henüz mesaj yok. Gönderdiğiniz her şey, alıcının DIG kimliğine şifrelenir.',
  'chat.unreadable': '{count, plural, one {# mesaj açılamadı} other {# mesaj açılamadı}}.',
  'chat.from': 'Gönderen: {did}',
  'chat.to': 'Alıcı: {did}',
  'chat.historyEphemeral':
    'Bu bilgisayarda güvenli depolama yok, bu yüzden DIG Chat bu konuşmayı yalnızca siz kapatana kadar tutar — diske açık biçimde kaydedilmez.',

  'transport.localOnly.heading': 'Mesajlar bu bilgisayarda kalır',
  'transport.localOnly.body':
    'Eşler arası taşıma henüz yapılmadı, bu yüzden gönderdiğiniz bir mesaj yalnızca bu uygulamaya geri iletilir, başka hiçbir yere değil. Geri kalan her şey gerçektir: DIG App, mesajı gönderilmeden önce alıcının kimlik anahtarına mühürler.',

  'unpair.action': 'Bu eşleştirmeyi unut',
  'unpair.explanation':
    'Bu, eşleştirmeyi DIG Chat’ten kaldırır. DIG Chat’in erişimini tamamen iptal etmek için DIG App’teki Eşleştirilmiş uygulamalar’ı kullanın.',

  'error.heading': 'Bu işe yaramadı',
  'error.retry': 'Yeniden dene',
  'error.appUnreachable': 'DIG App yanıt vermedi. Çalışıyor mu?',
  'error.authRequired':
    'DIG App bu eşleştirmeyi artık tanımıyor. İptal edilmiş olabilir — yeni bir kodla yeniden eşleştirin.',
  'error.authBadMac': 'DIG App isteği reddetti. Yeni bir kodla yeniden eşleştirin.',
  'error.authReplay': 'DIG App isteği sıra dışı olduğu için reddetti. Yeniden deneyin.',
  'error.pairDenied': 'Eşleştirme DIG App’te reddedildi.',
  'error.pairTimeout': 'DIG App’teki onay penceresine kimse yanıt vermedi.',
  'error.pairCodeRejected':
    'DIG App bu kodu kabul etmedi. Kodlar iki dakika geçerlidir ve yalnızca bir kez çalışır, bu yüzden süresi dolmuş ya da zaten kullanılmış olabilir. Yeni bir tane oluşturun ve yeniden deneyin.',
  'error.connectRequired': 'DIG App, önce bu uygulamanın bağlanmasını gerektiriyor.',
  'error.connectDenied': 'Bağlantı DIG App’te reddedildi.',
  'error.connectTimeout': 'DIG App’teki bağlantı penceresine kimse yanıt vermedi.',
  'error.signDenied': 'Bu, DIG App’te reddedildi.',
  'error.signTimeout': 'DIG App’teki pencereye kimse yanıt vermedi.',
  'error.signUnknownType': 'DIG App bu isteği tanımadı.',
  'error.signBadPayload': 'DIG App bu isteği okuyamadı.',
  'error.signNoConfirmer': 'DIG App onay penceresini gösteremedi.',
  'error.locked': 'DIG Account’unuz kilitli. DIG App’te kilidini açın ve yeniden deneyin.',
  'error.capNotGranted':
    'Bu eşleştirmeye, DIG Chat’in ihtiyaç duyduğu kimlik yeteneği verilmedi. Yeniden eşleştirin ve kimlik isteğini onaylayın.',
  'error.identityUnsupported': 'DIG App’in bu sürümü henüz kimlik işlemleri sunmuyor.',
  'error.credentialStorageUnavailable':
    'DIG Chat, eşleştirmeyi bu sistemde güvenli biçimde saklayamadı, bu yüzden hiç saklamadı. Bir dahaki sefere yeniden eşleştirmeniz gerekecek.',
  'error.historyStorageUnavailable':
    'DIG Chat, mesaj geçmişinizi bu sistemde güvenli biçimde saklayamadı, bu yüzden yalnızca bu oturum için tutuyor.',
  'error.emptyMessage': 'Göndermek için bir şeyler yazın.',
  'error.messageTooLong': 'Bu mesaj göndermek için çok uzun.',
  'error.sealFailed': 'DIG Chat göndermeyi reddetti: DIG App mühürlü bir mesaj döndürmedi.',
  'error.unknown': 'Bir şeyler ters gitti. Yeniden deneyin.',
};
