# Violet Focus

Kişisel kullanım için, çevrimdışı çalışabilen bir planlama PWA'sı. Uygulama Vite/React ile derlenir; statik çıktı `dist/` klasörüne alınır.

## Geliştirme

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
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

## Şifreli, isteğe bağlı eşitleme

**Ayarlar → Şifreli bulut eşitleme** bölümünde Worker oturumu açılabilir. Buluta gönderme ve başka cihazdan geri yükleme ayrı düğmelerle ve onayla yapılır; otomatik/arka plan eşitlemesi yoktur. Yedek tarayıcıda PBKDF2-SHA-256 (310.000 tur) ve AES-GCM-256 ile şifrelenir. Eşitleme parolası sunucuya gönderilmez veya uygulamada saklanmaz. Worker yalnızca şifreli metni ve IV/salt bilgisini tutar. Parolayı kaybedersen şifreli yedek açılamaz. Her yeni gönderme mevcut bulut kopyasının yerini alır; iki cihazın değişikliklerini birleştirmez.

Worker API, D1 ve gerekli gizli değerler yapılandırılıp dağıtılmadıkça eşitleme etkinleştirilemez. Kurulum adımları `worker/README.md` içindedir. Kod değişikliği tek başına canlı servisi dağıtmaz veya herhangi bir veriyi buluta göndermez.

## Hatırlatmalar

Hatırlatmalar kullanıcı açıkça etkinleştirirse Web Push kullanır. Worker Cron görevi zamanında başlar ve görev tamamlanana, ertelenene, arşivlenene ya da silinene kadar beş dakikalık aralıklarla yeniden dener. Sessiz saatler `Europe/Istanbul` saat diliminde uygulanır; kilit ekranı gizliliği ve metin seçimi Ayarlar'dan yönetilir. Push teslimatı tarayıcı/işletim sistemi tarafından geciktirilebilir veya engellenebilir; kesin teslimat garantisi yoktur. Push kurulumu için Worker/VAPID sırlarının yapılandırılması gerekir.

## Yerel veri

Görevler, alışkanlıklar, öğrenme kayıtları, özel kategoriler ve odak verileri varsayılan olarak bu cihazda saklanır. Analiz verileri ölçülmüş oturumlardan hesaplanır; görev süresi gerçekleşen süre gibi gösterilmez.
