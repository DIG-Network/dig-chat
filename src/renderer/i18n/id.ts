/** Indonesian (id). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const id: Catalog = {
  'app.version': 'Versi {version}',

  'locale.label': 'Bahasa',

  'state.checking.heading': 'Mencari DIG App Anda…',
  'state.checking.body':
    'DIG Chat sedang memeriksa apakah sudah dipasangkan dan apakah DIG App sedang berjalan.',

  'state.unpaired.heading': 'Pasangkan DIG Chat dengan identitas DIG Anda',
  'state.unpaired.body':
    'DIG Chat menggunakan identitas DIG Anda untuk mengenkripsi pesan. Ia tidak pernah bisa membelanjakan dari dompet Anda.',
  'state.unpaired.step1': 'Buka DIG App dan pilih Keamanan → Pasangkan sebuah aplikasi.',
  'state.unpaired.step2':
    'DIG App menampilkan kode delapan karakter kepada Anda, berlaku dua menit.',
  'state.unpaired.step3':
    'Ketik kode itu di bawah. DIG App akan meminta Anda menyetujui DIG Chat berdasarkan namanya.',
  'state.unpaired.codeLabel': 'Kode pemasangan',
  'state.unpaired.codeHint':
    'Delapan karakter, seperti ABCD-EFGH. Huruf besar atau kecil sama-sama berfungsi.',
  'state.unpaired.submit': 'Pasangkan dengan DIG App',
  'state.unpaired.pairing': 'Menunggu Anda menyetujui DIG Chat di DIG App…',

  'state.appUnreachable.heading': 'DIG App tidak berjalan',
  'state.appUnreachable.body':
    'DIG Chat dipasangkan dengan identitas DIG komputer ini, tetapi tidak ada yang menjawab. Jalankan DIG App dan coba lagi.',
  'state.appUnreachable.retry': 'Coba lagi',

  'state.identityUnsupported.heading': 'DIG App ini belum bisa mengobrol',
  'state.identityUnsupported.body':
    'DIG Chat dipasangkan, dan DIG App berjalan — tetapi versi ini tidak menyediakan kemampuan identitas yang DIG Chat butuhkan untuk mengenkripsi pesan. Perbarui DIG App dan coba lagi.',
  'state.identityUnsupported.detail':
    'DIG Chat meminta identity.attest, identity.seal, dan identity.unseal. Ia tidak pernah meminta izin untuk menandatangani atau membelanjakan.',

  'pairing.problem.empty': 'Ketik kode yang ditunjukkan DIG App kepada Anda.',
  'pairing.problem.tooShort':
    'Itu {found, plural, other {# karakter}} — kode pemasangan berisi delapan.',
  'pairing.problem.tooLong':
    'Itu {found, plural, other {# karakter}} — kode pemasangan berisi delapan.',

  'chat.heading': 'Percakapan',
  'chat.recipientLabel': 'Kirim ke (DID)',
  'chat.recipientHint': 'Sebuah DID yang berbentuk did:chia:…',
  'chat.bodyLabel': 'Pesan',
  'chat.send': 'Kirim',
  'chat.sending': 'Menyegel dan mengirim…',
  'chat.empty': 'Belum ada pesan. Apa pun yang Anda kirim dienkripsi ke identitas DIG penerima.',
  'chat.from': 'Dari {did}',
  'chat.to': 'Kepada {did}',
  'chat.historyEphemeral':
    'Komputer ini tidak memiliki penyimpanan aman, sehingga DIG Chat menyimpan percakapan ini hanya sampai Anda menutupnya — ia tidak disimpan ke disk dalam bentuk terbuka.',

  'transport.localOnly.heading': 'Pesan tetap di komputer ini',
  'transport.localOnly.body':
    'Transport peer-to-peer belum dibuat, jadi pesan yang Anda kirim dikirim kembali ke aplikasi ini dan tidak ke mana pun lagi. Segala hal lainnya nyata: DIG App menyegel pesan ke kunci identitas penerima sebelum dikirim.',

  'unpair.action': 'Lupakan pemasangan ini',
  'unpair.explanation':
    'Ini menghapus pemasangan dari DIG Chat. Untuk mencabut akses DIG Chat selamanya, gunakan Aplikasi terpasang di DIG App.',

  'error.appUnreachable': 'DIG App tidak menjawab. Apakah ia berjalan?',
  'error.authRequired':
    'DIG App tidak lagi mengenali pemasangan ini. Mungkin telah dicabut — pasangkan lagi dengan kode baru.',
  'error.authBadMac': 'DIG App menolak permintaan. Pasangkan lagi dengan kode baru.',
  'error.authReplay': 'DIG App menolak permintaan karena tidak berurutan. Coba lagi.',
  'error.pairDenied': 'Pemasangan ditolak di DIG App.',
  'error.pairTimeout': 'Tidak ada yang menjawab jendela persetujuan di DIG App.',
  'error.pairCodeRejected':
    'DIG App tidak menerima kode itu. Kode berlaku dua menit dan hanya berfungsi sekali, jadi mungkin sudah kedaluwarsa atau sudah dipakai. Buat yang baru dan coba lagi.',
  'error.connectRequired': 'DIG App memerlukan aplikasi ini terhubung terlebih dahulu.',
  'error.connectDenied': 'Koneksi ditolak di DIG App.',
  'error.connectTimeout': 'Tidak ada yang menjawab jendela koneksi di DIG App.',
  'error.signDenied': 'Itu ditolak di DIG App.',
  'error.signTimeout': 'Tidak ada yang menjawab jendela di DIG App.',
  'error.signUnknownType': 'DIG App tidak mengenali permintaan itu.',
  'error.signBadPayload': 'DIG App tidak dapat membaca permintaan itu.',
  'error.signNoConfirmer': 'DIG App tidak dapat menampilkan jendela persetujuannya.',
  'error.locked': 'DIG Account Anda terkunci. Buka kuncinya di DIG App dan coba lagi.',
  'error.capNotGranted':
    'Pemasangan ini tidak diberi kemampuan identitas yang DIG Chat butuhkan. Pasangkan lagi, dan setujui permintaan identitas.',
  'error.identityUnsupported': 'Versi DIG App ini belum menyediakan operasi identitas.',
  'error.credentialStorageUnavailable':
    'DIG Chat tidak dapat menyimpan pemasangan dengan aman di sistem ini, jadi ia tidak menyimpannya sama sekali. Anda perlu memasangkan lagi lain kali.',
  'error.historyStorageUnavailable':
    'DIG Chat tidak dapat menyimpan riwayat pesan Anda dengan aman di sistem ini, jadi ia menyimpannya hanya untuk sesi ini.',
  'settings.heading': 'Riwayat',
  'settings.export.heading': 'Ekspor riwayat Anda',
  'settings.export.body':
    'Simpan seluruh riwayat percakapan Anda ke berkas terenkripsi yang dapat Anda pindahkan ke komputer lain. Berkas disegel dengan frasa sandi — simpan dengan aman, karena itulah satu-satunya cara membuka berkas.',
  'settings.export.passphraseLabel': 'Frasa sandi',
  'settings.export.confirmLabel': 'Ulangi frasa sandi',
  'settings.export.submit': 'Ekspor ke berkas',
  'settings.export.exporting': 'Menyegel riwayat Anda…',
  'settings.export.success': 'Riwayat terenkripsi Anda disimpan ke {path}.',
  'settings.export.mismatch': 'Kedua frasa sandi tidak cocok.',
  'settings.import.heading': 'Impor berkas riwayat',
  'settings.import.body':
    'Buka berkas riwayat terenkripsi dan gabungkan ke percakapan ini. Pesan yang sudah Anda miliki dibiarkan apa adanya.',
  'settings.import.passphraseLabel': 'Frasa sandi',
  'settings.import.submit': 'Pilih berkas dan impor',
  'settings.import.importing': 'Membuka riwayat Anda…',
  'settings.import.success':
    'Menambahkan {added, plural, other {# pesan}}. Sekarang Anda memiliki {total, plural, other {# pesan}}.',
  'settings.retention.heading': 'Pembersihan otomatis',
  'settings.retention.body':
    'Secara bawaan DIG Chat menyimpan setiap pesan. Aktifkan ini untuk secara otomatis melupakan pesan yang lebih lama dari sejumlah hari.',
  'settings.retention.enableLabel': 'Hapus pesan yang lebih lama dari usia yang ditetapkan',
  'settings.retention.daysLabel': 'Hari untuk disimpan',
  'settings.danger.heading': 'Hapus riwayat',
  'settings.danger.body':
    'Menghapus riwayat menghilangkan pesan dari komputer ini. Tindakan ini tidak dapat dibatalkan, dan tidak menghapus apa pun di komputer orang lain.',
  'settings.danger.empty': 'Tidak ada percakapan untuk dihapus.',
  'settings.danger.clearConversation': 'Hapus percakapan dengan {did}',
  'settings.danger.clearAll': 'Hapus semua riwayat',
  'settings.danger.confirmHeading': 'Hapus riwayat ini?',
  'settings.danger.confirmBody':
    'Ini menghilangkan pesan dari komputer ini dan tidak dapat dibatalkan.',
  'settings.danger.confirm': 'Hapus',
  'settings.danger.cancel': 'Simpan saja',
  'error.archiveFormat': 'Berkas itu bukan berkas riwayat DIG Chat.',
  'error.archiveVersion':
    'Berkas riwayat itu dibuat oleh versi DIG Chat yang lebih baru. Perbarui dan coba lagi.',
  'error.archiveDecrypt': 'Frasa sandi itu tidak membuka berkas, atau berkas rusak.',
  'error.archiveTooLarge': 'Berkas itu terlalu besar untuk menjadi berkas riwayat DIG Chat.',
  'error.emptyMessage': 'Ketik sesuatu untuk dikirim.',
  'error.messageTooLong': 'Pesan itu terlalu panjang untuk dikirim.',
  'error.sealFailed': 'DIG Chat menolak mengirim: DIG App tidak mengembalikan pesan yang tersegel.',
  'error.unknown': 'Ada yang salah. Coba lagi.',
  'error.dismiss': 'Tutup',
  'error.boundary.heading': 'DIG Chat mengalami masalah',
  'error.boundary.reload': 'Muat ulang DIG Chat',
};
