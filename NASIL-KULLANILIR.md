# Satranç Eğitimi — Kullanım Kılavuzu

*Hazırlayan: Ahmet DUYAR*

Bu uygulama **internet gerektirmez**, **kurulum istemez** ve **ücretsizdir**.
Aşağıda üç kullanım yolu var. Çoğu kişi için **1. yol** yeterlidir.

---

## 1. yol — Tek dosya (EN KOLAY, tavsiye edilen)

Sınıfta, evde, USB bellekte — her yerde çalışır.

**`SatrancOkulu.html`** dosyasına **çift tıkla.** Hepsi bu.

- ✅ Sunucu gerekmez
- ✅ İnternet gerekmez
- ✅ Kurulum gerekmez
- ✅ Windows, Mac, Linux — hepsinde aynı
- ✅ Tek dosya (yaklaşık 1 MB), USB'ye kolayca sığar

### Başka bilgisayara taşımak

Sadece **`SatrancOkulu.html`** dosyasını kopyala. Başka hiçbir şeye gerek yok:

- USB belleğe at → okul bilgisayarında çift tıkla
- Kendine e-posta ile gönder → indirip aç
- WhatsApp/Drive ile paylaş → indirip aç

> **İpucu:** Dosyaya sağ tıklayıp *"Birlikte aç → Google Chrome"* seçersen
> her zaman aynı tarayıcıda açılır.

### Akıllı tahtada kullanmak

1. USB belleği akıllı tahtaya tak
2. `SatrancOkulu.html` dosyasına çift tıkla
3. Tarayıcıda **F11** ile tam ekran yap
4. Ders programından o haftanın dersini aç

### İki öğrenciyi tahtaya kaldırmak

Sol menüdeki **İki Kişilik Oyun** bölümü sınıf içi karşılaşmalar içindir:

1. **Düzen** seç: *İki Tahta* (yan yana, her oyuncu kendi gözünden) ya da
   *Tek Tahta* (iki oyuncu aynı tahtayı paylaşır).
2. Tahta **boş** gelir. Paletten taş seçip kareye dokunarak taşları
   öğrenciler dizer. Hazır kuruluş için **Standart Diziliş** düğmesi vardır.
3. **Satranç saati** seç: *Süresiz*, *5 dk*, *10 dk* ya da *15+10* (15 dakika
   süre, her hamleden sonra 10 saniye ekleme — turnuvalardaki tempo).
4. Oyuncu adlarını yaz, kimin başlayacağını seç ve **Oyunu Başlat**'a bas.
5. İki tahta düzeninde birinde yapılan hamle diğerinde anında görünür;
   sırası gelen oyuncunun tahtası yeşil çerçeveyle belirginleşir.

Tahtaların üstündeki **skor tahtası** üç şey gösterir:

- **İki saat.** Yalnızca sırası gelen oyuncunun saati işler; hamle yapılınca
  saat rakibe geçer. Son 1 dakikada saat sararır, son 10 saniyede kızarır ve
  saliseleri gösterir. Süresi biten oyunu kaybeder — ama rakibinde mat edecek
  taş kalmamışsa oyun beraberlikle biter (FIDE kuralı).
- **Materyal farkı.** Piyon 1, at ve fil 3, kale 5, vezir 9 puandır; rozet
  hangi tarafın kaç puan önde olduğunu yazar. Alınan taş şeridinde de her
  oyuncunun topladığı puan görünür.
- **Maç skoru.** Arka arkaya oynanan oyunlar turnuvadaki gibi toplanır:
  kazanan 1, beraberlik ½ puan. *Aynı Dizilişle Yeniden* skoru sürdürür,
  *Yeni Diziliş* sıfırlar.

Araç çubuğundaki ⏸ düğmesi saati duraklatır (o sırada tahtalar kilitlenir),
⛶ düğmesi menüyü gizleyip tahtaları büyütür (Esc ile çıkılır).

---

## 2. yol — Klasörü açmak (geliştirme sürümü)

Kaynak kodu düzenlemek istiyorsan bu yolu kullan.

> ⚠️ **`index.html` dosyasına çift tıklamak ÇALIŞMAZ.**
> Uygulama 54 ayrı JavaScript modülünden oluşur ve tarayıcılar güvenlik gereği
> `file://` üzerinden modül yüklemeyi engeller. Bu yüzden küçük bir yerel
> sunucu gerekir — aşağıdaki başlatıcılar bunu senin için yapar.

### Mac

**`Baslat-Mac.command`** dosyasına çift tıkla. Tarayıcı kendiliğinden açılır.

> İlk açılışta macOS "geliştirici doğrulanamadı" diyebilir.
> Çözüm: dosyaya **sağ tık → Aç** de, sonra çıkan pencerede yine **Aç**'a bas.
> Bunu bir kez yapman yeterli.

### Windows

**`Baslat-Windows.bat`** dosyasına çift tıkla. Tarayıcı kendiliğinden açılır.

> Python kurulu değilse uyarı verir. O durumda 1. yolu (tek dosya) kullan.

### Kapatmak

Açılan siyah pencereyi kapat, ya da içindeyken **Ctrl + C** bas.

---

## 3. yol — İnternete koymak (isteğe bağlı)

Öğrenciler evden de girsin istersen, klasörün tamamını ücretsiz bir statik
site servisine yükleyebilirsin (GitHub Pages, Netlify, Cloudflare Pages).
Uygulama tamamen istemci taraflıdır; veritabanı ya da sunucu kodu gerekmez.

---

## Sık sorulanlar

**İnternet olmadan çalışır mı?**
Evet. Hiçbir bölüm internet kullanmaz. Satranç motoru, 1120 bulmaca ve tüm
dersler uygulamanın içindedir.

**Öğrencilerin ilerlemesi nerede saklanıyor?**
Kullanılan bilgisayarın tarayıcısında (localStorage). Yani ilerleme **o
bilgisayara** özeldir; başka bilgisayarda sıfırdan başlar. Tarayıcı geçmişi
temizlenirse ilerleme de silinir.

**Aynı bilgisayarda birden çok öğrenci varsa?**
İlerleme tarayıcı profiline bağlıdır. Her öğrenci için ayrı tarayıcı profili
kullanabilir, ya da *Ayarlar → İlerlemeyi Sıfırla* ile temiz başlangıç yapabilirsin.

**Ses çıkmıyor.**
Tarayıcılar, sayfaya ilk kez tıklanmadan ses çalmaya izin vermez. Ekranda
herhangi bir yere bir kez tıkla. Ayrıca *Ayarlar*'dan "Ses efektleri" ve
"Sesli anlatım" açık olmalı.

**Sesli anlatım okumuyor.**
Sesli anlatım işletim sisteminin Türkçe ses paketini kullanır. Windows'ta
*Ayarlar → Saat ve Dil → Konuşma* bölümünden Türkçe ses eklemek gerekebilir.

**Yazı çok küçük / büyük.**
Tarayıcıda **Ctrl + artı** (Mac'te **Cmd + artı**) ile büyüt, **Ctrl + eksi**
ile küçült. Akıllı tahtada büyütmek okunabilirliği çok artırır.

**Kodda değişiklik yaptım ama görünmüyor.**
Tarayıcı dosyaları önbelleğe almış olabilir. **Ctrl + Shift + R**
(Mac'te **Cmd + Shift + R**) ile sayfayı zorla yenile.

**Tek dosya sürümünü nasıl güncellerim?**
`src/` altında değişiklik yaptıktan sonra şu komutu çalıştır:

```bash
node tools/build-tek-dosya.mjs
```

`SatrancOkulu.html` yeniden üretilir.

---

## Ders programı nasıl kullanılır?

Uygulama **36 haftalık** bir programa göre düzenlenmiştir (haftada 1 ders saati).

1. Uygulamayı aç — ana sayfada **"bu haftanın dersi"** kartı seni karşılar
2. **Dersi Aç**'a bas
3. Karşına 40 dakikalık ders planı gelir:
   - **Kazanım** — dersin hedefi
   - **Isınma (5 dk)** — sınıfa soracağın soru
   - **Anlatım (10 dk)** — tahtada anlatacağın maddeler
   - **Uygulama (20 dk)** — renkli düğmeler, tek tıkla alıştırmayı açar
   - **Kapanış (5 dk)** — kontrol sorusu ve cevabı
4. Ders bitince **"Bu haftayı tamamladım"**a bas

Belirli bir haftaya doğrudan gitmek için: **Ders Programı** menüsünden
istediğin hafta kartına tıkla.
