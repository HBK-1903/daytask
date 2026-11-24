# Violet Focus

Kişisel kullanım için, çevrimdışı çalışabilen bir planlama PWA'sı. Uygulama Vite/React ile derlenir; statik çıktı `dist/` klasörüne alınır.

## Geliştirme

```bash
npm install
npm run dev
```

Üretim derlemesi ve domain testleri:

```bash
npm run build
npm test
npm --prefix worker run test
npm --prefix worker run typecheck
```

## PWA'yı iPhone'a ekleme

1. Siteyi Safari'de aç.
2. Paylaş düğmesi → **Ana Ekrana Ekle**.
3. Violet Focus'u ana ekrandan aç.

Web uygulaması manifestinde desteklenen platformlar için **Görev ekle**, **Takvim** ve **Odak başlat** kısayolları bulunur. iOS'taki Kestirmeler uygulamasında **URL'yi aç** eylemine aşağıdaki bağlantıları ekleyebilirsin:

- `https://<uygulama-adresi>/?action=add-task`
- `https://<uygulama-adresi>/?action=calendar`
- `https://<uygulama-adresi>/?action=start-focus`

Uygulamanın **Ayarlar → Kestirmeler** bölümündeki düğmeler tam adresi panoya kopyalar. iOS PWA'ları web uygulamasından yerel ana ekran widget'ı sağlayamaz; widget için yerel iOS uygulaması gerekir.

## Açılış ve hesap oturumu

İlk açılışta kayıt/giriş ekranı gösterilir; hesap oturumu olmadan ana çalışma alanı açılmaz. Giriş bilgileri cihazda tekrar sorulmaz. Oturum 25. günde yenilenmeye hazırlanır ve 35 günlük süresi içinde uygulama kullanılırken yeni token alınır; 35 gün boyunca bağlantı kurulamazsa yeniden giriş gerekir. Bu cihazdaki yerel planlar, oturum kapatılırken silinmez. Ağ yoksa geçerli yerel oturumla çevrimdışı kullanım sürer; Worker'a bağlı işlemler bağlantı gerektirir.

## Şifreli, isteğe bağlı eşitleme

**Ayarlar → Şifreli bulut eşitleme** bölümünde tek kişisel hesap oluşturulup e-posta ve hesap parolasıyla giriş yapılabilir. E-posta yalnızca giriş adıdır; doğrulama e-postası gönderilmez. İlk hesap için Worker'daki `APP_PASSWORD` kurulum anahtarı gerekir. Hesap kurtarma kodu bir kez gösterilir; parola sıfırlanınca yenilenir. Kodu çevrimdışı, güvenli bir yerde sakla; kodu kaybedersen hesap parolasını sıfırlamak mümkün olmaz. Planları buluta gönderme ve başka cihazdan geri yükleme ayrı düğmelerle ve onayla yapılır; otomatik/arka plan eşitlemesi yoktur. Yedek tarayıcıda PBKDF2-SHA-256 (310.000 tur) ve AES-GCM-256 ile şifrelenir. Eşitleme parolası sunucuya gönderilmez veya uygulamada saklanmaz. Worker yalnızca şifreli metni ve IV/salt bilgisini tutar. Her yeni gönderme mevcut bulut kopyasının yerini alır; iki cihazın değişikliklerini birleştirmez.

Worker API, D1 ve gerekli gizli değerler yapılandırılıp dağıtılmadıkça eşitleme etkinleştirilemez. Kurulum adımları `worker/README.md` içindedir. Kod değişikliği tek başına canlı servisi dağıtmaz veya herhangi bir veriyi buluta göndermez.

## Gün planı görünümü

Ana ekrandaki zaman akışı artık tüm bugünkü görevleri genişletebilir ve **Tümü / Açık / Tamamlanan** görünümleri arasında geçiş yapar. Her satırdan görevi tamamlayabilir, yeniden açabilir veya düzenleyebilirsin. İlk tamamlanmamış görevin saati geçtiyse bu plan otomatik değiştirilmez; görev günlük gözden geçirmede kalır. 6,1 inç telefon ekranında metin ve dokunma hedefleri daha rahat okunacak/erişilecek ölçülere çıkarılır; küçük ekranlar için daraltılmış düzen de korunur.

## Hızlı görev yakalama

Ana ekrandaki **Hızlı ekle** alanı ve `N` kısayolu, akıldaki işi ayrıntılı planlama adımına girmeden yakalar. Türkçe “bugün”, “yarın”, “öbür gün”, hafta günü ve `14:30` / “saat 14” biçimlerini yorumlar. Görev kaydedilmeden önce başlık, tarih ve saat önizlemesi gösterilir; ifade anlaşılmadığında varsayılan bugün 18:00 kullanılır. `/` kısayolu görev aramasını açar. Tarih yorumu kullanıcı onayı olmadan görev oluşturmaz ve diğer görevleri taşımaz.

## Hatırlatmalar

Hatırlatmalar kullanıcı açıkça etkinleştirirse Web Push kullanır. Worker Cron görevi zamanında başlar ve görev tamamlanana, ertelenene ya da arşivlenene kadar beş dakikalık aralıklarla yeniden dener. Desteklenen bildirimlerde “Tamamlandı”, “10 dk ertele” ve “Kapat” aksiyonları tek kullanımlık imzalı görev yetkisiyle işlenir; bildirime dokunmak görevi uygulamada açar. Sessiz saatler `Europe/Istanbul` saat diliminde uygulanır; kilit ekranı gizliliği ve metin seçimi Ayarlar'dan yönetilir. Ayarlar'daki test düğmesi gerçek bir push gönderim denemesi yapar. Push teslimatı tarayıcı/işletim sistemi tarafından geciktirilebilir veya engellenebilir; kesin teslimat garantisi yoktur. Push kurulumu için Worker/VAPID sırlarının yapılandırılması ve `worker/README.md` içindeki D1 migration'larının onaylı uygulanması gerekir.

## Yerel veri

Görevler, alışkanlıklar, öğrenme kayıtları, özel kategoriler ve odak verileri varsayılan olarak bu cihazda saklanır. Analiz verileri ölçülmüş oturumlardan hesaplanır; görev süresi gerçekleşen süre gibi gösterilmez.
