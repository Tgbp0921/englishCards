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
