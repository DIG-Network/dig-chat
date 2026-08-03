/** Japanese (ja). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const ja: Catalog = {
  'app.version': 'バージョン {version}',

  'locale.label': '言語',

  'state.checking.heading': 'DIG App を探しています…',
  'state.checking.body':
    'DIG Chat は、ペアリング済みかどうか、そして DIG App が実行中かどうかを確認しています。',

  'state.unpaired.heading': 'DIG Chat をあなたの DIG 識別情報とペアリングする',
  'state.unpaired.body':
    'DIG Chat はメッセージの暗号化にあなたの DIG 識別情報を使用します。あなたのウォレットから支払うことは決してできません。',
  'state.unpaired.step1': 'DIG App を開き、セキュリティ → アプリをペアリング を選択します。',
  'state.unpaired.step2': 'DIG App が、2 分間有効な 8 文字のコードを表示します。',
  'state.unpaired.step3':
    'そのコードを下に入力します。DIG App が DIG Chat を名前で承認するよう求めます。',
  'state.unpaired.codeLabel': 'ペアリングコード',
  'state.unpaired.codeHint': 'ABCD-EFGH のような 8 文字です。大文字でも小文字でも構いません。',
  'state.unpaired.submit': 'DIG App とペアリング',
  'state.unpaired.pairing': 'DIG App で DIG Chat を承認するのを待っています…',

  'state.appUnreachable.heading': 'DIG App が実行されていません',
  'state.appUnreachable.body':
    'DIG Chat はこのコンピューターの DIG 識別情報とペアリングされていますが、応答がありませんでした。DIG App を起動して、もう一度お試しください。',
  'state.appUnreachable.retry': 'もう一度試す',

  'state.identityUnsupported.heading': 'この DIG App はまだチャットに対応していません',
  'state.identityUnsupported.body':
    'DIG Chat はペアリングされ、DIG App も実行中です。しかし、このバージョンは DIG Chat がメッセージを暗号化するために必要な識別情報の機能を提供していません。DIG App を更新して、もう一度お試しください。',
  'state.identityUnsupported.detail':
    'DIG Chat は identity.attest、identity.seal、identity.unseal を要求しました。署名や支払いの許可を求めることは決してありません。',

  'pairing.problem.empty': 'DIG App が表示したコードを入力してください。',
  'pairing.problem.tooShort':
    'それは {found, plural, other {# 文字}} です。ペアリングコードは 8 文字です。',
  'pairing.problem.tooLong':
    'それは {found, plural, other {# 文字}} です。ペアリングコードは 8 文字です。',

  'chat.heading': '会話',
  'chat.recipientLabel': '送信先 (DID)',
  'chat.recipientHint': 'did:chia:… のような形式の DID',
  'chat.bodyLabel': 'メッセージ',
  'chat.send': '送信',
  'chat.sending': '封印して送信しています…',
  'chat.empty':
    'まだメッセージはありません。送信するものはすべて、受信者の DIG 識別情報宛てに暗号化されます。',
  'chat.from': '{did} から',
  'chat.to': '{did} へ',
  'chat.historyEphemeral':
    'このコンピューターには安全なストレージがないため、DIG Chat はこの会話を閉じるまでのみ保持します。平文でディスクに保存されることはありません。',

  'transport.localOnly.heading': 'メッセージはこのコンピューターにとどまります',
  'transport.localOnly.body':
    'ピアツーピアのトランスポートはまだ構築されていないため、送信したメッセージはこのアプリに返されるだけで、他のどこにも届きません。それ以外はすべて本物です。DIG App が送信前にメッセージを受信者の識別鍵宛てに封印します。',

  'unpair.action': 'このペアリングを削除する',
  'unpair.explanation':
    'これにより DIG Chat からペアリングが削除されます。DIG Chat のアクセスを完全に取り消すには、DIG App の ペアリング済みのアプリ を使用してください。',

  'error.appUnreachable': 'DIG App が応答しませんでした。実行中ですか？',
  'error.authRequired':
    'DIG App はこのペアリングをもう認識しません。取り消された可能性があります。新しいコードでもう一度ペアリングしてください。',
  'error.authBadMac':
    'DIG App がリクエストを拒否しました。新しいコードでもう一度ペアリングしてください。',
  'error.authReplay':
    'DIG App が順序の誤りとしてリクエストを拒否しました。もう一度お試しください。',
  'error.pairDenied': 'ペアリングが DIG App で拒否されました。',
  'error.pairTimeout': 'DIG App の承認ウィンドウに誰も応答しませんでした。',
  'error.pairCodeRejected':
    'DIG App がそのコードを受け付けませんでした。コードは 2 分間有効で 1 回しか使えないため、期限切れかすでに使用済みの可能性があります。新しいコードを生成して、もう一度お試しください。',
  'error.connectRequired': 'DIG App は、このアプリが先に接続することを必要としています。',
  'error.connectDenied': '接続が DIG App で拒否されました。',
  'error.connectTimeout': 'DIG App の接続ウィンドウに誰も応答しませんでした。',
  'error.signDenied': 'それは DIG App で拒否されました。',
  'error.signTimeout': 'DIG App のウィンドウに誰も応答しませんでした。',
  'error.signUnknownType': 'DIG App はそのリクエストを認識できませんでした。',
  'error.signBadPayload': 'DIG App はそのリクエストを読み取れませんでした。',
  'error.signNoConfirmer': 'DIG App は承認ウィンドウを表示できませんでした。',
  'error.locked':
    'あなたの DIG Account はロックされています。DIG App でロックを解除して、もう一度お試しください。',
  'error.capNotGranted':
    'このペアリングには、DIG Chat が必要とする識別情報の機能が付与されていません。もう一度ペアリングし、識別情報のリクエストを承認してください。',
  'error.identityUnsupported': 'このバージョンの DIG App はまだ識別情報の操作を提供していません。',
  'error.credentialStorageUnavailable':
    'DIG Chat はこのシステムでペアリングを安全に保存できなかったため、まったく保存しませんでした。次回はもう一度ペアリングする必要があります。',
  'error.historyStorageUnavailable':
    'DIG Chat はこのシステムでメッセージ履歴を安全に保存できなかったため、このセッションの間だけ保持します。',
  'settings.heading': '履歴',
  'settings.export.heading': '履歴をエクスポート',
  'settings.export.body':
    '会話履歴全体を暗号化ファイルに保存し、別のコンピューターに移動できます。ファイルはパスフレーズで封印されます。ファイルを開く唯一の方法なので、大切に保管してください。',
  'settings.export.passphraseLabel': 'パスフレーズ',
  'settings.export.confirmLabel': 'パスフレーズを再入力',
  'settings.export.submit': 'ファイルにエクスポート',
  'settings.export.exporting': '履歴を封印しています…',
  'settings.export.success': '暗号化された履歴を {path} に保存しました。',
  'settings.export.mismatch': '2つのパスフレーズが一致しません。',
  'settings.import.heading': '履歴ファイルをインポート',
  'settings.import.body':
    '暗号化された履歴ファイルを開いて、この会話に統合します。すでに持っているメッセージはそのまま残ります。',
  'settings.import.passphraseLabel': 'パスフレーズ',
  'settings.import.submit': 'ファイルを選択してインポート',
  'settings.import.importing': '履歴を開いています…',
  'settings.import.success':
    '{added, plural, other {# 件のメッセージ}}を追加しました。現在 {total, plural, other {# 件のメッセージ}}があります。',
  'settings.retention.heading': '自動クリーンアップ',
  'settings.retention.body':
    '既定では DIG Chat はすべてのメッセージを保持します。これをオンにすると、指定した日数より古いメッセージを自動的に削除します。',
  'settings.retention.enableLabel': '設定した期間より古いメッセージを削除',
  'settings.retention.daysLabel': '保持する日数',
  'settings.danger.heading': '履歴を削除',
  'settings.danger.body':
    '履歴を削除すると、このコンピューターからメッセージが削除されます。元に戻すことはできず、他の人のコンピューター上の内容は削除されません。',
  'settings.danger.empty': '削除する会話はありません。',
  'settings.danger.clearConversation': '{did} との会話を削除',
  'settings.danger.clearAll': 'すべての履歴を削除',
  'settings.danger.confirmHeading': 'この履歴を削除しますか？',
  'settings.danger.confirmBody':
    'これはこのコンピューターからメッセージを削除し、元に戻すことはできません。',
  'settings.danger.confirm': '削除',
  'settings.danger.cancel': '残す',
  'error.archiveFormat': 'そのファイルは DIG Chat の履歴ファイルではありません。',
  'error.archiveVersion':
    'その履歴ファイルは新しいバージョンの DIG Chat で作成されました。更新してもう一度お試しください。',
  'error.archiveDecrypt':
    'そのパスフレーズではファイルを開けなかったか、ファイルが破損しています。',
  'error.archiveTooLarge': 'そのファイルは DIG Chat の履歴ファイルにしては大きすぎます。',
  'error.emptyMessage': '送信する内容を入力してください。',
  'error.messageTooLong': 'そのメッセージは長すぎて送信できません。',
  'error.sealFailed':
    'DIG Chat は送信を拒否しました。DIG App が封印されたメッセージを返しませんでした。',
  'error.notConnected':
    'DIG Chat が接続されていません。送信するにはまず DIG App とペアリングしてください。',
  'error.unknown': '問題が発生しました。もう一度お試しください。',
  'error.dismiss': '閉じる',
  'error.boundary.heading': 'DIG Chat で問題が発生しました',
  'error.boundary.reload': 'DIG Chat を再読み込み',
};
