/** Hindi (hi). Brand and scheme literals — DIG Chat, DIG App, DID, did:chia: — stay verbatim. */
import type { Catalog } from './en';

export const hi: Catalog = {
  'app.name': 'DIG Chat',
  'app.tagline': 'निजी संदेश, आपकी DIG पहचान से हस्ताक्षरित।',
  'app.version': 'संस्करण {version}',

  'locale.label': 'भाषा',

  'state.checking.heading': 'आपका DIG App खोजा जा रहा है…',
  'state.checking.body':
    'DIG Chat जाँच रहा है कि वह युग्मित है या नहीं और DIG App चल रहा है या नहीं।',

  'state.unpaired.heading': 'DIG Chat को अपनी DIG पहचान से युग्मित करें',
  'state.unpaired.body':
    'DIG Chat संदेशों को एन्क्रिप्ट करने के लिए आपकी DIG पहचान का उपयोग करता है। यह कभी भी आपके वॉलेट से खर्च नहीं कर सकता।',
  'state.unpaired.step1': 'DIG App खोलें और सुरक्षा → किसी ऐप को युग्मित करें चुनें।',
  'state.unpaired.step2':
    'DIG App आपको आठ अक्षरों का एक कोड दिखाता है, जो दो मिनट तक मान्य रहता है।',
  'state.unpaired.step3':
    'वह कोड नीचे टाइप करें। DIG App आपसे DIG Chat को नाम से स्वीकृत करने के लिए कहेगा।',
  'state.unpaired.codeLabel': 'युग्मन कोड',
  'state.unpaired.codeHint': 'आठ अक्षर, जैसे ABCD-EFGH। बड़े या छोटे, दोनों अक्षर काम करते हैं।',
  'state.unpaired.submit': 'DIG App के साथ युग्मित करें',
  'state.unpaired.pairing': 'DIG App में DIG Chat को स्वीकृत करने की आपकी प्रतीक्षा है…',

  'state.appUnreachable.heading': 'DIG App चल नहीं रहा है',
  'state.appUnreachable.body':
    'DIG Chat इस कंप्यूटर की DIG पहचान से युग्मित है, लेकिन किसी ने उत्तर नहीं दिया। DIG App शुरू करें और फिर से प्रयास करें।',
  'state.appUnreachable.retry': 'फिर से प्रयास करें',

  'state.identityUnsupported.heading': 'यह DIG App अभी चैट नहीं कर सकता',
  'state.identityUnsupported.body':
    'DIG Chat युग्मित है और DIG App चल रहा है — लेकिन यह संस्करण वह पहचान क्षमता प्रदान नहीं करता जिसकी DIG Chat को संदेश एन्क्रिप्ट करने के लिए आवश्यकता है। DIG App को अपडेट करें और फिर से प्रयास करें।',
  'state.identityUnsupported.detail':
    'DIG Chat ने identity.attest, identity.seal और identity.unseal माँगा। यह हस्ताक्षर करने या खर्च करने की अनुमति कभी नहीं माँगता।',

  'state.connected.you': 'आप {did} हैं',

  'pairing.problem.empty': 'वह कोड टाइप करें जो DIG App ने आपको दिखाया।',
  'pairing.problem.tooShort':
    'यह {found, plural, one {# अक्षर} other {# अक्षर}} है — एक युग्मन कोड में आठ होते हैं।',
  'pairing.problem.tooLong':
    'यह {found, plural, one {# अक्षर} other {# अक्षर}} है — एक युग्मन कोड में आठ होते हैं।',

  'chat.heading': 'बातचीत',
  'chat.recipientLabel': 'भेजें (DID)',
  'chat.recipientHint': 'did:chia:… जैसा दिखने वाला एक DID',
  'chat.bodyLabel': 'संदेश',
  'chat.send': 'भेजें',
  'chat.sending': 'सील करके भेजा जा रहा है…',
  'chat.empty':
    'अभी कोई संदेश नहीं है। आप जो कुछ भी भेजते हैं, वह प्राप्तकर्ता की DIG पहचान के लिए एन्क्रिप्ट किया जाता है।',
  'chat.unreadable':
    '{count, plural, one {# संदेश नहीं खोला जा सका} other {# संदेश नहीं खोले जा सके}}।',
  'chat.from': '{did} से',
  'chat.to': '{did} को',
  'chat.historyEphemeral':
    'इस कंप्यूटर में सुरक्षित भंडारण नहीं है, इसलिए DIG Chat इस बातचीत को केवल तब तक रखता है जब तक आप इसे बंद नहीं करते — इसे डिस्क पर सादे रूप में सहेजा नहीं जाता।',

  'transport.localOnly.heading': 'संदेश इसी कंप्यूटर पर रहते हैं',
  'transport.localOnly.body':
    'पीयर-टू-पीयर परिवहन अभी नहीं बना है, इसलिए आपके द्वारा भेजा गया संदेश इसी ऐप को वापस पहुँचाया जाता है और कहीं और नहीं। बाकी सब कुछ वास्तविक है: DIG App संदेश को भेजे जाने से पहले प्राप्तकर्ता की पहचान कुंजी के लिए सील कर देता है।',

  'unpair.action': 'इस युग्मन को भूल जाएँ',
  'unpair.explanation':
    'यह DIG Chat से युग्मन हटा देता है। DIG Chat की पहुँच को हमेशा के लिए रद्द करने के लिए, DIG App में युग्मित ऐप्स का उपयोग करें।',

  'error.heading': 'यह काम नहीं आया',
  'error.retry': 'फिर से प्रयास करें',
  'error.appUnreachable': 'DIG App ने उत्तर नहीं दिया। क्या यह चल रहा है?',
  'error.authRequired':
    'DIG App अब इस युग्मन को नहीं पहचानता। हो सकता है इसे रद्द कर दिया गया हो — एक नए कोड के साथ फिर से युग्मित करें।',
  'error.authBadMac': 'DIG App ने अनुरोध अस्वीकार कर दिया। एक नए कोड के साथ फिर से युग्मित करें।',
  'error.authReplay':
    'DIG App ने अनुरोध को क्रम से बाहर मानकर अस्वीकार कर दिया। फिर से प्रयास करें।',
  'error.pairDenied': 'युग्मन DIG App में अस्वीकार कर दिया गया।',
  'error.pairTimeout': 'DIG App में स्वीकृति विंडो का किसी ने उत्तर नहीं दिया।',
  'error.pairCodeRejected':
    'DIG App ने वह कोड स्वीकार नहीं किया। कोड दो मिनट तक चलते हैं और केवल एक बार काम करते हैं, इसलिए यह समाप्त हो चुका हो सकता है या पहले ही उपयोग किया जा चुका हो सकता है। एक नया बनाएँ और फिर से प्रयास करें।',
  'error.connectRequired': 'DIG App के लिए आवश्यक है कि यह ऐप पहले कनेक्ट हो।',
  'error.connectDenied': 'कनेक्शन DIG App में अस्वीकार कर दिया गया।',
  'error.connectTimeout': 'DIG App में कनेक्शन विंडो का किसी ने उत्तर नहीं दिया।',
  'error.signDenied': 'यह DIG App में अस्वीकार कर दिया गया।',
  'error.signTimeout': 'DIG App में विंडो का किसी ने उत्तर नहीं दिया।',
  'error.signUnknownType': 'DIG App ने वह अनुरोध नहीं पहचाना।',
  'error.signBadPayload': 'DIG App वह अनुरोध पढ़ नहीं सका।',
  'error.signNoConfirmer': 'DIG App अपनी स्वीकृति विंडो नहीं दिखा सका।',
  'error.locked': 'आपका DIG Account लॉक है। इसे DIG App में अनलॉक करें और फिर से प्रयास करें।',
  'error.capNotGranted':
    'इस युग्मन को वह पहचान क्षमता नहीं दी गई जिसकी DIG Chat को आवश्यकता है। फिर से युग्मित करें और पहचान अनुरोध स्वीकृत करें।',
  'error.identityUnsupported': 'DIG App का यह संस्करण अभी पहचान संचालन प्रदान नहीं करता।',
  'error.credentialStorageUnavailable':
    'DIG Chat इस सिस्टम पर युग्मन को सुरक्षित रूप से संग्रहीत नहीं कर सका, इसलिए उसने इसे बिलकुल संग्रहीत नहीं किया। आपको अगली बार फिर से युग्मित करना होगा।',
  'error.historyStorageUnavailable':
    'DIG Chat इस सिस्टम पर आपके संदेश इतिहास को सुरक्षित रूप से संग्रहीत नहीं कर सका, इसलिए इसे केवल इस सत्र के लिए रख रहा है।',
  'error.emptyMessage': 'भेजने के लिए कुछ टाइप करें।',
  'error.messageTooLong': 'वह संदेश भेजने के लिए बहुत लंबा है।',
  'error.sealFailed':
    'DIG Chat ने भेजने से मना कर दिया: DIG App ने एक सील किया हुआ संदेश नहीं लौटाया।',
  'error.unknown': 'कुछ गड़बड़ हो गई। फिर से प्रयास करें।',
};
