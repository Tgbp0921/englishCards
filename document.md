# Feyza-Kelime Proje Dokumani

Bu dokuman uygulamanin guncel mimarisini, ekranlarini, veri yapisini ve dikkat edilmesi gereken teknik notlari ozetler.

## Genel Bilgi

Feyza-Kelime, cocuklar icin hazirlanmis bir Ingilizce kelime calisma ve sinav uygulamasidir. Uygulama React Native + Expo ile gelistirilir. Kelimeler dersler halinde tutulur, kullanici hem sinav modunda hem de calisma modunda sesli cevap verir.

Uygulamanin ana hedefleri:

- Ingilizce -> Turkce ve Turkce -> Ingilizce yonlerinde pratik yaptirmak.
- Cevaplari speech-to-text ile yaziya cevirip dogrulamak.
- Ingilizce kelimeleri ve ornekleri text-to-speech ile seslendirmek.
- Her kelime ve her ders icin puan gecmisi tutmak.
- Zayif veya unutulan kelimeleri tekrar ettirmek.
- Ayarlar ekranindan ders/kelime ekleme, silme ve duzenleme yapmak.

## Teknoloji

Kullanilan baslica paketler:

- `expo`
- `react-native`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-native-async-storage/async-storage`
- `expo-speech`
- `expo-speech-recognition`
- `@expo/vector-icons`
- `yup`

Not: `package.json` tarafinda uygulama adi `Feyza-Kelime` olarak geciyor. `app.json` icinde de uygulama adi ve ikonlari Feyza-Kelime icin ayarlandi.

## Klasor Yapisi

Ana dosyalar:

```txt
App.js
index.js
app.json
package.json
palette.js
document.md
context/DataContext.js
src/navigation/AppNavigator.js
src/components/ExamSession.js
src/screens/HomeScreen.js
src/screens/lessons/LessonsScreen.js
src/screens/exam/ExamScreen.js
src/screens/study/StudyScreen.js
src/screens/list/ListScreen.js
assets/feyza-icon.png
assets/feyza-favicon.png
assets/feyza-android-foreground.png
assets/feyza-android-background.png
assets/feyza-android-monochrome.png
```

## Veri Yonetimi

Butun ders ve kelime verisi `AsyncStorage` icinde `lessons` anahtariyla tutulur.

Global veri `context/DataContext.js` icinden yonetilir. Uygulama `DataProvider` ile sarilir.

Context icinde saglanan degerler:

```js
{
  (colorPalette,
    palette,
    ascncData,
    loading,
    setAscncData,
    updateLesson,
    updateCard,
    deleteCard,
    deleteLesson,
    addLesson);
}
```

Uygulama acilisinda:

1. `AsyncStorage.getItem("lessons")` okunur.
2. Veri yoksa baslangic dersleri olusturulur.
3. Eski veya eksik veri normalize edilir.
4. Eksik seed dersleri varsa mevcut veriye eklenir.
5. `ascncData.lessons` her degistiginde AsyncStorage otomatik guncellenir.

## Ders Veri Modeli

Guncel ders modeli:

```js
{
  id: Number,
  name: String,
  date: Number,
  enToTrExams: [
    { date: Number, point: Number }
  ],
  trToEnExams: [
    { date: Number, point: Number }
  ],
  cards: [Card]
}
```

`enToTrPoint`, `trToEnPoint`, `enToTrLastExamDate`, `trToEnLastExamDate` gibi eski alanlar normalize edilirken ayiklaniyor. Ders puani artik sinav gecmisinden hesaplanir.

## Kart Veri Modeli

Guncel kart modeli:

```js
{
  id: Number,
  english: String,
  turkish: String,
  example: String,
  imgSrc: String,
  fromEnToTrPoints: [
    { date: Number, point: Number }
  ],
  fromTrToEnPoints: [
    { date: Number, point: Number }
  ]
}
```

`englishSound` ve `exampleSound` artik kullanilmiyor. Seslendirme icin dosya URL'i yerine text-to-speech kullaniliyor.

Bozuk seed resim linkleri (`your-cdn.com`, `source.unsplash.com`) normalize edilirken calisan Unsplash linkleriyle degistiriliyor.

## Renk Sistemi

Butun ekranlarda renkler `palette.js` dosyasindan ve context uzerinden kullanilir.

Onemli renk gruplari:

- `palette.app.background`
- `palette.app.surface`
- `palette.app.surfaceSoft`
- `palette.app.primary`
- `palette.app.text`
- `palette.app.mutedText`
- `palette.app.border`
- `palette.score.low`
- `palette.score.medium`
- `palette.score.good`
- `palette.score.excellent`
- `palette.score.empty`

Puan renkleri:

- 0-49: `score.low`
- 50-69: `score.medium`
- 70-84: `score.good`
- 85-100: `score.excellent`

## Navigasyon

Navigasyon `src/navigation/AppNavigator.js` icindedir.

Stack route'lari:

- `Home`: Anasayfa
- `lessons`: Sinav ders listesi
- `Exam`: Ortak sinav/calisma oturumu
- `study`: Calisma ekrani
- `list`: Ayarlar ekrani

Header:

- Sol taraf: Anasayfa, Sinav, Calisma
- Sag taraf: Ayarlar
- Secili navigasyon ikonu ve yazisi 3 px asagi iner.
- `Exam` ekraninda header gizlidir.

## Anasayfa

Dosya: `src/screens/HomeScreen.js`

Anasayfa genel istatistikleri gosterir:

- Son 1 ay / son 1 hafta / son 1 gun deneme sayilari
- Dogru ve yanlis cevap adetleri
- Toplam kart sayisi
- Son 3 En-Tr denemesi 85+ olan kart sayisi
- Ders bazli kart sayilari ve puan araligi dagilimlari

## Sinav Ekrani

Dosya: `src/screens/lessons/LessonsScreen.js`

Sinav sayfasinda dersler tablo olarak listelenir.

Her ders satirinda:

- Ders adi
- En -> Tr sinav puani
- Tr -> En sinav puani

Ders adina basinca yon secim modal'i acilir:

- Ingilizce -> Turkce
- Turkce -> Ingilizce

Basla denince `Exam` route'una gidilir ve `ExamSession` kullanilir.

Sinav puanlari `enToTrExams` ve `trToEnExams` dizilerinden hesaplanir. Gosterilen puanda gun gecisiyle azalan bir etki uygulanir.

## Ortak Oturum Komponenti

Dosya: `src/components/ExamSession.js`

`ExamSession`, hem sinav hem de calisma icin kullanilan ortak komponenttir.

Ana ozellikler:

- Kartlari karisik siralar.
- Sinav modunda her kart bir kez sorulur.
- Calisma modunda oturum bitmez, kartlar tekrar doner.
- `CARD_SECONDS = 7`
- Speech recognition suresi `RECOGNITION_LIMIT_MS = 4000`
- Cevap kontrolunden once sonuc icin `RESULT_SETTLE_MS = 350` beklenir.
- Ingilizce metinler `expo-speech` ile okunur.
- Cevaplar `expo-speech-recognition` ile yaziya cevrilir.
- `answersMatch` normalize edilmis metin ve Levenshtein toleransi ile kontrol yapar.
- `goNext` icinde aktif speech recognition temizlenir, ekran state'i resetlenir ve boylece onceki cevabin bir an gorunmesi engellenir.

Oturum state'i `useReducer` ile yonetilir:

```js
{
  (isPaused, isRevealed, isFinished, isChecking, isRecognizing, phase);
}
```

Puanlama:

- 0-2 saniye: 100 puan
- 2-7 saniye: 100'den 30'a dogru azalir
- Sure biterse veya cevap bilinemezse: 0 puan

Mikrofon butonu:

- 95x95 boyutundadir.
- Hatali speech recognition mesajlari butonun ustunde gosterilir.
- Android crash riskini azaltmak icin `goNext` sirasinda `ExpoSpeechRecognitionModule.abort()` cagrilir.

## Calisma Ekrani

Dosya: `src/screens/study/StudyScreen.js`

Calisma sayfasinda iki tab vardir:

- Hizli secim
- Elle secim

### Hizli Secim

Hizli secimde kullanici:

- Birden fazla ders secebilir.
- `Hepsi` ile tum dersleri secip kaldirabilir.
- Mod secebilir:
  - Karisik
  - Az bilinen
  - Unutulan
- Kelime sayisi secebilir.

Basla denince secilen kartlar `ExamSession` icinde calisma modu olarak acilir. Calisma modu bitmez; kartlar tekrar tekrar doner.

Kart secme mantigi:

- Az bilinen: son 3 denemenin ortalamasi en dusuk olanlar.
- Unutulan: son cevap tarihi en eski olanlar.
- Karisik: az bilinen ve unutulan kartlardan yari yariya secim.

### Elle Secim

Elle secimde:

- En / Tr radio secimi vardir.
- Dersler akordiyon olarak listelenir.
- Ders satirinda `Hepsi` butonu ve secili kelime sayisi vardir.
- Akordiyon acilinca kelimeler listelenir.
- Kelimeye tiklayinca secim yapilir.
- Kelimeye uzun basilinca diger dildeki karsiligi tooltip olarak gosterilir.
- Basla denince sadece secilen kelimelerle calisma baslar.

Akordiyon icinde sort kolonlari:

- `A-Z` butonu kelime kolonunun ustundedir.
- `1-9` butonu En puani kolonunun ustundedir.
- `1-9` butonu Tr puani kolonunun ustundedir.
- Alt satirda `Kelime / En puani / Tr puani` basliklari vardir.

## Ayarlar Ekrani

Dosya: `src/screens/list/ListScreen.js`

Navigasyonda adi `Ayarlar`, ikonu `settings-outline`.

Iki tab vardir:

- Kelimeler
- Ders ekle

### Kelimeler Tab'i

Ozellikler:

- En ustte search input vardir.
- Yazdikca filtreleme yapar, search butonu yoktur.
- Dersler akordiyon olarak listelenir.
- Ders adi duzenlenebilir.
- Ders silinebilir.
- Kelimeler listelenir.
- Kelime silinebilir.
- Kelimenin sadece `english` ve `turkish` alanlari duzenlenebilir.
- En puani ve Tr puani tiklaninca tum puan gecmisi modalda gosterilir.

Silme ve duzenleme islemleri context uzerinden yapilir; context degisince AsyncStorage otomatik guncellenir.

### Ders Ekle Tab'i

Kullanici JSON array olarak kart listesi yapistirir.

Kabul edilen kart key'leri:

```js
[
  {
    english: "Hello",
    turkish: "Merhaba",
    example: "Hello, how are you?",
    imgSrc: "https://...",
  },
];
```

Kurallar:

- `english` zorunlu, max 20 karakter.
- `turkish` zorunlu, max 20 karakter.
- `example` opsiyonel, max 50 karakter.
- `imgSrc` opsiyonel, max 150 karakter.
- Fazla veya hatali key olursa yup ile key hatasi verilir.
- Ders adi zorunlu, max 20 karakter.

Olustur denince ders adi modal'i acilir. Dogrulama basariliysa yeni ders context ve AsyncStorage'a eklenir.

## Ses ve Speech Notlari

Uygulamada iki farkli ses teknolojisi var:

- Text-to-speech: `expo-speech`
- Speech-to-text: `expo-speech-recognition`

Text-to-speech:

- Ingilizce kelime ve ornek cumleleri cihaz TTS motoru ile okur.
- Harici ses kaydi dosyasi kullanilmaz.

Speech-to-text:

- Mikrofon izni gerektirir.
- Android APK/dev build uzerinde test edilmelidir.
- Expo Go her native modul icin guvenilir test ortami degildir.
- Android'de Google speech service kullanimi icin `app.json` plugin ayari vardir.

`app.json` icindeki ilgili alanlar:

```json
{
  "android": {
    "permissions": ["android.permission.RECORD_AUDIO"]
  },
  "ios": {
    "infoPlist": {
      "NSSpeechRecognitionUsageDescription": "Allow $(PRODUCT_NAME) to use speech recognition.",
      "NSMicrophoneUsageDescription": "Allow $(PRODUCT_NAME) to use the microphone."
    }
  },
  "plugins": [
    [
      "expo-speech-recognition",
      {
        "androidSpeechServicePackages": [
          "com.google.android.googlequicksearchbox"
        ]
      }
    ]
  ]
}
```

## Android Build

APK almak icin:

```powershell
npx eas build --profile preview --platform android
```

EAS CLI yoksa:

```powershell
npx eas --version
```

veya global kurulum:

```powershell
npm install -g eas-cli
```

Telefon loglari icin:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat | Select-String "FATAL EXCEPTION|AndroidRuntime|ExpoSpeechRecognition|SpeechRecognizer|com.birolaygun.MyApp2"
```

## Bilinen Teknik Notlar

- Web'de calisan bir ozellik Android APK'da ayni sekilde calismayabilir.
- Expo Go, native modul testleri icin yeterli olmayabilir.
- Speech recognition gibi native ozellikler mutlaka Android APK/dev build ve ileride iOS build uzerinde test edilmelidir.
- Android'de mikrofon butonuna arka arkaya basma senaryosu riskli oldugu icin `abort()` ve state reset akisi eklendi.
- `ExamSession` icinde Animated native driver karisikliklarini azaltmak icin ilgili animasyonlarda JS driver kullanildi.

## Sonraki Fikirler

- iOS cihaz veya simulator uzerinde speech recognition testi.
- Sentry veya Firebase Crashlytics ile production crash log takibi.
- Sesli cevap akisi icin daha guclu retry/debounce mekanizmasi.
- Dogru/yanlis cevap animasyonlarini daha belirgin hale getirme.
- Anasayfa UI denemeleri.
- Sesler ve motivasyon efektleri icin daha cocuk odakli tasarim.
















eskisi:
data yapısı:

bütün data asyncStorage de tutulacak.

bir DataContext oluşturulacak ve bütün proje sarmallanacak. context içinde palette.js den alınan colorPalette şu şekilde olacak {colorPalette:colorPalette}

uygulama açılınca önce asyncStorage.get(lessons) deki veri alınacak ve context içine eklenecek. şu şekilde {colorPalette:colorPalette, ascncData:asyncStorage.get(lessons)} context.ascncData içindeki veri her değiştiğinde asyncStorage de güncellenecek.

asyncstoraga da başlangıç datası: lessons:[ {

name: "1. ders",
date: 1780691558047, //console.log(new Date().getTime());
id: Math.random(),
enToTrPoint:0,
enToTrExams:[{date:1780691558047, point:50}]
trToEnExams:[{date:1780691558047, point:30}]
trToEnPoint:0,
cards: [
{
id: Math.random(),
english: "Hello",
turkish: "Merhaba",
example: "Hello, how are you?",
exampleSound:
"https://your-cdn.com/audio/examples/hello-how-are-you.mp3",
englishSound:
"https://your-cdn.com/audio/words/hello.mp3",
imgSrc:
"https://your-cdn.com/images/hello.jpg",
fromEnToTrPoints: [{date:Date.now , point:0}] ,
fromTrToEnPoints: [{date:Date.now , point:0}],
},
{
id: Math.random(),
english: "Goodbye",
turkish: "Hoşçakal",
example: "Goodbye, see you later!",
exampleSound:
"https://your-cdn.com/audio/examples/goodbye-see-you-later.mp3",
englishSound:
"https://your-cdn.com/audio/words/goodbye.mp3",
imgSrc:
"https://your-cdn.com/images/goodbye.jpg",
fromEnToTrPoints: [{date:Date.now , point:0}] ,
fromTrToEnPoints: [{date:Date.now , point:0}],
},
{
id: Math.random(),
english: "Thank you",
turkish: "Teşekkür ederim",
example: "Thank you for your help!",
exampleSound:
"https://your-cdn.com/audio/examples/thank-you-for-your-help.mp3",
englishSound:
"https://your-cdn.com/audio/words/thank-you.mp3",
imgSrc:
"https://your-cdn.com/images/thank-you.jpg",
fromEnToTrPoints: [{date:Date.now , point:0}] ,
fromTrToEnPoints: [{date:Date.now , point:0}],
},
];
},

]

asyncStorage de data yoksa yukarıdaki datayı ekle.

---

projede bütün style renk seçimleri context.palette üzerinden çekilecek.

sınav sayfası:

lessons klasörü olustur ve LessonsScreen.js oraya taşı.

context içinden lessons çelikir ve burada map edilerek tablo şeklinde sıralanır.en üstte ilk olusturulan ders vardır. tabloda ilk stunda dersin adı vardır. 2. stunda enToTrPoint, 3. sırada trToEnPoint vardır. puanlar 0-50 arası kırmızı, 50-70 arası mavi, 70-85 arası açık yeş,l, 85-100 arası koyu yeşille yazılır. bu renkler palette yok. oraya ekle ve oradan çek.

tabloda ders adına basılınca confirm modülü aç ve sınava başlansın mı diye sorsun. modalda üst tarafta ingilizce -> türkçe veya türkçe -> ingilizce diye radio select olsun. hayır derse modal kapatılsın. evet derse sınav(nasıl olacagı ileride anlatılacak) başlasın.

sınav ekranı:
teni bir navigasyon sayfası oluşturulsun. Exam diye
backgroun değişsin ve navigasyon kalksın. sadece sağ üst tarafta çıkış için icon olsun ve home a navigate etsin.

şimdi ingilizce -> türkçe seçilmiş halini yazıyorum:

sınavda cards içindekiler karışık bir sıra ile sorulsun. 1 kere sorulan tekrar sorulmadan her kelime 1 kere sorulsun. ekranda 1 kart olsun ve üzerinde o kartın english kelimesi yazsın. kart açılınca 10 saniyelik geri sayım başlasın. varsa eğer englishSound oynatılsın. aşağıda ses kaydetme butonu olsun ve 4 saniye ile sınırlı olarak ses kaydı alsın. ses kaydına kelimenin türkçe karşılığını söylemesi bekleniyor. sesi yazıya çevir ve turkish ile karşılaştır. sonuç doğru ise kartı ters çevir ve en üste turkish, altına example ve onun altına da varsa imgSrc. kart açılınca vrsa exampleSound oynat. doğru bildiği için kartın fromEnToTr correct sayısını 1 arttır.

ses kaydına bastıgı anda sure duraklasın ve dogru - yanlış kontrolü yapıldıktan sonra cevap yanlıssa süre akmaya devam etsin.
her sorulan cart için puanlama yapılsın. bilinemeyenler 0 puan, 0-3 saniye içinde bilinenler 100 puan. 3-10 saniye aralıgında ise 100 - 30 arası puan bir fonksiyon ile hesaplanarak verilir ve useState ile elde tutulur.

verdiği cevap yanlışsa süre bitmediyse tekrar ses kaydı alarak cevaplama hakkı olsun. 10 saniye doldugunda kart kendi kendine açılsın. en üste turkish, altına example ve onun altına da varsa imgSrc. kart açılınca vrsa exampleSound oynat. yanlıs oldugu için wrong 1 arttır.

sınav sırasında bir çubuk bar üzerinde ne kadar kart oldugunu ve ne kadar ilerlediğini göster. bilemediği soruların kutuları kırmızıdır. uanlar 0-50 arası kırmızı, 50-70 arası mavi, 70-85 arası açık yeşil, 85-100 arası koyu yeşille yazılır. bu renkler palette olacak oradan çek.

sınav bitiminde kullanıcıya en üstte toplam puan gösterilir. toplam puan tün soruların ortalamasıdır. altta kelimeler map edilerek en -> tr yanında kaça puan aldıkları yazılır. burada veriler async ve context e eklenir. enToTrLastExamDate date.now olacak. ekranda anamenü ikonu olur ve home navigate edilir.

---

3. sayfa navigasyon içinde kalem ile göster altında da Çalışma yazsın. diğerlerinin kullandığı componentle yap. navigate adresi study olsun. studyScreen.js oluştur. içinde dersler map edilsin, tablo gibi olmasın üstte dersin adı ve toplam kelime sayısı, altta da puanlar 0-50 arası , 50-70 arası , 70-85 arası, 85-100 arası olarak kelime sayıları yazsın,

derse tıklanınca yine en-tr tr-en seçimi olsun. exam sayfasındaki sınav sayfasının benzeri gelsin. burada soru sayısı gösterilmeyecek. kart gelecek ve cevaplanacak. puanı ve zamanı fromEnToTrPoints veya fromTrToEnPoints
e kaydeilecek.

her cevap sonrası arkada bir fonksiyon çalışsın ve son 5 sorunun ortalamaları karşılaştırılsın.
en düşük olan cart ekrana gelsin. ama bir önceki kart gelmesin, aynı kart gelecekse puanı düşük diğer kart gelsin. yukarıda yine zaman gerisayım barı olsun. süre bitince 0 puan verilsin. soru bilinirse puanlama yine sınav sayfasındaki gibi olsun
önceki sayfaya git butonu ve en->tr yazısı kalksın. hatta navigasyon görünmesin

4. karışık soru sayfası
   bu sayfa için de navigasyon ve mixedScreen sayfası eklenir.

ders select inputu. en üstte defaultta hepsi olacak. buradaki seçime göre aşagıdaki kelime sayısı max güncellenecek.

radio inputu olur ve karışık / az bilinen / unutulan /

kelime sayısı inputu select ile seçilir. min 1 max 30.

3 ünden birini seçer ve projedeki bütün kelimelerde filtreleme yaparak kelime sayısı inputu adedi kadar kelime filtreler.

az bilinen : son 3 ortalaması en düşük olanlar alınır
unutulan : son cevapları en uzak olanlar
karışık: az bilinen ve unutulan yarı yarıya veya birisi 1 fazla olarak kelimeleri filtrele

aşagıda başla butonuna basınca aynı study sayfasının sınav sayfasında çalışmaya başla ve puanları güncelle

5.uygulama çok hareketsiz kaldı. transitionlar ve animasyonlar lazım ki çocuklar sıkılmasın. doğru cevaplarda yeşil konfeti patlat ve heeyy sesi oynat, bilemezse de üzgün emoji kısaca fade gelsin gitsin 0.5 saniyede ve noo sesi çıksın. kullanıcı çocuk olacağı için sıkılmamalı. soru geçişleri slide şeklinde olsun. sınav sonu puanının arkasında puana göre kutlama üzülme animasyonları oynasın.

6. kelime listesi sayfası. icon: yatay satırlar

burada bütün kelimeler elle seçim akordionundaki gibi akordion içinde listelensin. seçim olmayacagı için seçim stunu kalksın. tabloda english / turkish / tr puanı (tıklayınca modalda bütün puanlar) / en puanı (tıklayınca modalda bütün puanlar), sil/düzenle iconları olsun. sile basınca bir confirm modalı ile eminmisin diye sorsun. edite basınca kelimenin sadece englis ve turkish yazımları değişebilmesi için modal açılsın. altta ok ve cancel butonları olsun. sil ve edit işlemleri hem context hem de asyncstorege de uygulansın.
en tepede search inputu olsun. sadece yazma ile filtrelesin. search butonu istemiyorum

elle seçim tabından sonra akordion açılınca gelen sıralama seçenekleri sütunlarının tam üzerinde olsun. hepsi solda olmasın.

sesler
anasayfa
uı denemeleri
