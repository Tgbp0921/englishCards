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
src/screens/home/HomeScreen.js
src/screens/home/AnimatedBar.js
src/screens/home/AnimatedPanel.js
src/screens/home/DirectionComparison.js
src/screens/home/FocusWords.js
src/screens/home/LessonReport.js
src/screens/home/OverviewStats.js
src/screens/home/ScoreDistribution.js
src/screens/home/TimeSummary.js
src/screens/home/homeStats.js
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
  colorPalette,
  palette,
  ascncData,
  loading,
  setAscncData,
  updateLesson,
  updateCard,
  deleteCard,
  deleteLesson,
  addLesson
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

Dosya: `src/screens/home/HomeScreen.js`

Anasayfa rapor ekrani olarak calisir ve `src/screens/home` klasorundeki parcalara ayrilmistir.

Bilesenler:

- `OverviewStats`: Toplam kelime, toplam ders, toplam deneme, genel ortalama ve son calisma.
- `TimeSummary`: Son 1 gun / son 1 hafta / son 1 ay cevap, dogru, yanlis ve ortalama puan ozeti.
- `LessonReport`: Ders, kelime sayisi, En-Tr, Tr-En, ortalama ve zayif kelime sayisi tablosu.
- `ScoreDistribution`: 0-49, 50-69, 70-84, 85-100 puan dagilimi.
- `FocusWords`: En zayif kelimeler ve en uzun suredir calisilmayan kelimeler.
- `DirectionComparison`: En-Tr ve Tr-En genel ortalama karsilastirmasi.

Grafik barlari 1 saniye icinde 0'dan hedef seviyeye animasyonla dolar. Rapor kartlari acilista hafif fade/slide animasyonu ile gelir.

`FocusWords` icindeki kartlar tiklanabilir. `Basla` ile En-Tr yonunde sadece o kelimelerden olusan calisma oturumu baslatilir.

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
  isPaused,
  isRevealed,
  isFinished,
  isChecking,
  isRecognizing,
  phase
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



