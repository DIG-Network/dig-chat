/** Russian (ru). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const ru: Catalog = {
  'app.version': 'Версия {version}',

  'locale.label': 'Язык',

  'state.checking.heading': 'Поиск вашего DIG App…',
  'state.checking.body': 'DIG Chat проверяет, выполнено ли сопряжение и запущен ли DIG App.',

  'state.unpaired.heading': 'Свяжите DIG Chat с вашей DIG-личностью',
  'state.unpaired.body':
    'DIG Chat использует вашу DIG-личность для шифрования сообщений. Он никогда не может тратить средства из вашего кошелька.',
  'state.unpaired.step1': 'Откройте DIG App и выберите Безопасность → Связать приложение.',
  'state.unpaired.step2':
    'DIG App показывает вам код из восьми символов, действительный две минуты.',
  'state.unpaired.step3':
    'Введите этот код ниже. DIG App попросит вас подтвердить DIG Chat по имени.',
  'state.unpaired.codeLabel': 'Код сопряжения',
  'state.unpaired.codeHint':
    'Восемь символов, например ABCD-EFGH. Подойдут как заглавные, так и строчные буквы.',
  'state.unpaired.submit': 'Связать с DIG App',
  'state.unpaired.pairing': 'Ожидание подтверждения DIG Chat в DIG App…',

  'state.appUnreachable.heading': 'DIG App не запущен',
  'state.appUnreachable.body':
    'DIG Chat связан с DIG-личностью этого компьютера, но никто не ответил. Запустите DIG App и повторите попытку.',
  'state.appUnreachable.retry': 'Повторить',

  'state.identityUnsupported.heading': 'Этот DIG App пока не умеет чат',
  'state.identityUnsupported.body':
    'DIG Chat связан, и DIG App запущен — но эта версия не предоставляет возможность работы с личностью, которая нужна DIG Chat для шифрования сообщений. Обновите DIG App и повторите попытку.',
  'state.identityUnsupported.detail':
    'DIG Chat запросил identity.attest, identity.seal и identity.unseal. Он никогда не просит разрешения подписывать или тратить.',

  'pairing.problem.empty': 'Введите код, который показал DIG App.',
  'pairing.problem.tooShort':
    'Это {found, plural, one {# символ} few {# символа} many {# символов} other {# символа}} — в коде сопряжения их восемь.',
  'pairing.problem.tooLong':
    'Это {found, plural, one {# символ} few {# символа} many {# символов} other {# символа}} — в коде сопряжения их восемь.',

  'chat.heading': 'Беседа',
  'chat.recipientLabel': 'Отправить (DID)',
  'chat.recipientHint': 'DID вида did:chia:…',
  'chat.bodyLabel': 'Сообщение',
  'chat.send': 'Отправить',
  'chat.sending': 'Запечатывание и отправка…',
  'chat.empty':
    'Пока нет сообщений. Всё, что вы отправляете, шифруется для DIG-личности получателя.',
  'chat.from': 'От {did}',
  'chat.to': 'Кому {did}',
  'chat.historyEphemeral':
    'На этом компьютере нет безопасного хранилища, поэтому DIG Chat сохраняет эту беседу только до её закрытия — она не записывается на диск в открытом виде.',

  'transport.localOnly.heading': 'Сообщения остаются на этом компьютере',
  'transport.localOnly.body':
    'Одноранговый транспорт ещё не построен, поэтому отправленное вами сообщение возвращается в это приложение и никуда больше. Всё остальное реально: DIG App запечатывает сообщение для ключа личности получателя перед отправкой.',

  'unpair.action': 'Забыть это сопряжение',
  'unpair.explanation':
    'Это удаляет сопряжение из DIG Chat. Чтобы окончательно отозвать доступ DIG Chat, используйте Связанные приложения в DIG App.',

  'error.appUnreachable': 'DIG App не ответил. Он запущен?',
  'error.authRequired':
    'DIG App больше не распознаёт это сопряжение. Возможно, оно было отозвано — свяжите заново с новым кодом.',
  'error.authBadMac': 'DIG App отклонил запрос. Свяжите заново с новым кодом.',
  'error.authReplay': 'DIG App отклонил запрос как нарушающий порядок. Повторите попытку.',
  'error.pairDenied': 'Сопряжение было отклонено в DIG App.',
  'error.pairTimeout': 'Никто не ответил в окне подтверждения в DIG App.',
  'error.pairCodeRejected':
    'DIG App не принял этот код. Коды действуют две минуты и работают только один раз, поэтому он мог истечь или уже быть использованным. Создайте новый и повторите попытку.',
  'error.connectRequired': 'DIG App требует, чтобы это приложение сначала подключилось.',
  'error.connectDenied': 'Подключение было отклонено в DIG App.',
  'error.connectTimeout': 'Никто не ответил в окне подключения в DIG App.',
  'error.signDenied': 'Это было отклонено в DIG App.',
  'error.signTimeout': 'Никто не ответил в окне в DIG App.',
  'error.signUnknownType': 'DIG App не распознал этот запрос.',
  'error.signBadPayload': 'DIG App не смог прочитать этот запрос.',
  'error.signNoConfirmer': 'DIG App не смог показать своё окно подтверждения.',
  'error.locked': 'Ваш DIG Account заблокирован. Разблокируйте его в DIG App и повторите попытку.',
  'error.capNotGranted':
    'Этому сопряжению не была предоставлена возможность работы с личностью, которая нужна DIG Chat. Свяжите заново и подтвердите запрос личности.',
  'error.identityUnsupported': 'Эта версия DIG App пока не предоставляет операций с личностью.',
  'error.credentialStorageUnavailable':
    'DIG Chat не смог безопасно сохранить сопряжение в этой системе, поэтому не сохранил его вовсе. В следующий раз вам придётся связать заново.',
  'error.historyStorageUnavailable':
    'DIG Chat не смог безопасно сохранить историю сообщений в этой системе, поэтому хранит её только для этого сеанса.',
  'settings.heading': 'История',
  'settings.export.heading': 'Экспортировать историю',
  'settings.export.body':
    'Сохраните всю историю переписки в зашифрованный файл, который можно перенести на другой компьютер. Файл запечатан парольной фразой — храните её в надёжном месте, ведь это единственный способ открыть файл.',
  'settings.export.passphraseLabel': 'Парольная фраза',
  'settings.export.confirmLabel': 'Повторите парольную фразу',
  'settings.export.submit': 'Экспортировать в файл',
  'settings.export.exporting': 'Запечатываем вашу историю…',
  'settings.export.success': 'Ваша зашифрованная история сохранена в {path}.',
  'settings.export.mismatch': 'Две парольные фразы не совпадают.',
  'settings.import.heading': 'Импортировать файл истории',
  'settings.import.body':
    'Откройте зашифрованный файл истории и объедините его с этой перепиской. Сообщения, которые у вас уже есть, остаются без изменений.',
  'settings.import.passphraseLabel': 'Парольная фраза',
  'settings.import.submit': 'Выбрать файл и импортировать',
  'settings.import.importing': 'Открываем вашу историю…',
  'settings.import.success':
    'Добавлено {added, plural, other {# сообщений}}. Теперь у вас {total, plural, other {# сообщений}}.',
  'settings.retention.heading': 'Автоматическая очистка',
  'settings.retention.body':
    'По умолчанию DIG Chat хранит каждое сообщение. Включите это, чтобы автоматически забывать сообщения старше указанного числа дней.',
  'settings.retention.enableLabel': 'Удалять сообщения старше заданного возраста',
  'settings.retention.daysLabel': 'Дней хранить',
  'settings.danger.heading': 'Удалить историю',
  'settings.danger.body':
    'Удаление истории убирает сообщения с этого компьютера. Это нельзя отменить, и это ничего не удаляет на компьютере другого человека.',
  'settings.danger.empty': 'Нет переписок для удаления.',
  'settings.danger.clearConversation': 'Удалить переписку с {did}',
  'settings.danger.clearAll': 'Удалить всю историю',
  'settings.danger.confirmHeading': 'Удалить эту историю?',
  'settings.danger.confirmBody':
    'Это убирает сообщения с этого компьютера и не может быть отменено.',
  'settings.danger.confirm': 'Удалить',
  'settings.danger.cancel': 'Оставить',
  'error.archiveFormat': 'Этот файл не является файлом истории DIG Chat.',
  'error.archiveVersion':
    'Этот файл истории создан более новой версией DIG Chat. Обновите и попробуйте снова.',
  'error.archiveDecrypt': 'Эта парольная фраза не открыла файл, или файл повреждён.',
  'error.archiveTooLarge': 'Этот файл слишком большой, чтобы быть файлом истории DIG Chat.',
  'error.emptyMessage': 'Введите что-нибудь для отправки.',
  'error.messageTooLong': 'Это сообщение слишком длинное для отправки.',
  'error.sealFailed': 'DIG Chat отказался отправлять: DIG App не вернул запечатанное сообщение.',
  'error.unknown': 'Что-то пошло не так. Повторите попытку.',
  'error.dismiss': 'Закрыть',
  'error.boundary.heading': 'В DIG Chat произошла ошибка',
  'error.boundary.reload': 'Перезагрузить DIG Chat',
};
