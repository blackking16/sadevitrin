# SadeVitrin

SadeVitrin, klasik pazaryerlerindeki ürün kalabalığını azaltan ve iki farklı alışveriş deneyimini tek mobil uygulamada birleştiren pazaryeri prototipidir.

Ana fikir şudur: sade tarafta kullanıcı aynı ürün için onlarca ilan ve satıcı görmek yerine, belirli bir ürün standardı için parametrelere göre seçilen en uygun satıcıyı görür. Rekabet ortadan kalkmaz; kullanıcıyı yormayan arka plan ihale/teklif sürecinde devam eder. Vitrin tarafında ise içerik üreticileri ve satıcılar ürün bağlantılı görsel/video paylaşımlarıyla keşif odaklı alışveriş deneyimi sunar.

## Problem

Geleneksel pazaryerlerinde aynı ürün için onlarca satıcı, çok sayıda benzer ilan, karmaşık kampanyalar ve dikkat dağıtan arayüzler bulunur. Bu yapı kullanıcı tarafında karar yorgunluğu oluşturur; satıcı tarafında ise görünür olmak pahalı ve karmaşık hale gelir.

SadeVitrin bu problemi iki ayrı deneyimle ele alır:

- **Sade mod:** Kullanıcı arar, net ürün sayfasını görür, parametrelere göre seçilen en uygun satıcıdan satın alır.
- **Vitrin modu:** Kullanıcı ürünleri içerik ve öneri akışı içinde keşfeder; influencer veya satıcı paylaşımlarındaki ürünlere basılı tutarak ulaşır.

## Çözüm

### Sade Pazaryeri

- Ürünler satıcı talebiyle başlar.
- Yönetici talebi onaylarsa ürün ihaleye açılır.
- Satıcılar açık ihalelere teklif verir.
- Yönetici fiyat, stok, teslimat süresi ve ürün standardına uygunluk gibi parametrelere göre en uygun satıcıyı seçerek ürünü satışa açar.
- Kullanıcı aynı ürün için onlarca satıcı görmez; sade ürün sayfasında sadece seçilen aktif satıcıyı görür.
- Rekabet kullanıcı arayüzünde kalabalık oluşturmaz; arka plandaki teklif ve ihale mekanizmasında devam eder.

### Vitrin

- Kullanıcılar ve satıcılar aynı hesapla vitrin açabilir.
- Satıcılar vitrine özel ürün ekleyebilir.
- İçerik üreticileri post, video veya kampanya paylaşabilir.
- Paylaşımlara ürün bağlantıları eklenebilir; ürün etiketleri görselin üstünde kalabalık oluşturmaz, paylaşım basılı tutulduğunda ürün listesi açılır.
- İçerik sahibi paylaşımını düzenleyebilir, gizleyebilir, tekrar yayına alabilir veya silebilir.
- Vitrin ürünleri sade moddaki ihale ürünlerinden ayrı tutulur.

## Gemini Kullanımı

Gemini API, uygulamada yalnızca vitrin keşfet algoritmasını güçlendirmek için kullanılır.

Kullanım amacı:

- Vitrin paylaşımının kategori ve etiketlerini çıkarmak
- Görsel/metin kalitesini puanlamak
- Ticari niyet skorunu hesaplamak
- Risk seviyesini belirlemek
- Keşfet sıralamasına yardımcı olacak algoritma skorunu üretmek

Gemini çağrısı backend tarafında yapılır. Mobil uygulama doğrudan Gemini'ye veya başka bir yapay zeka servisine istek göndermez. API anahtarı yoksa sistem deterministik fallback algoritmasıyla çalışmaya devam eder.

Kodda başka bir üretken yapay zeka sağlayıcısına istek yoktur. Harici yapay zeka entegrasyonu yalnızca Google Gemini endpoint'i üzerinden yapılır:

```text
https://generativelanguage.googleapis.com
```

Bu kullanım sadece sponsor teknolojisini göstermek için eklenmiş değildir; keşfet akışındaki içerik sıralamasını daha alakalı, ticari olarak anlamlı ve güvenli hale getirmek için ürünün gerçek bir parçasıdır.

## Değerlendirme Kriterleriyle Uyum

- **Kullanıcı değeri:** Karar yorgunluğunu azaltan, sade ve hızlı alışveriş deneyimi sunar.
- **Teknik puan:** Mobil uygulama, backend API, PostgreSQL veri modeli, Prisma migration'ları, admin paneli, satıcı akışı ve Gemini destekli keşfet algoritması birlikte çalışır.
- **Performans ve doğruluk:** Gemini çıktısı JSON şemasıyla sınırlandırılır; API anahtarı yoksa fallback skorlarıyla sistem bozulmadan devam eder.
- **Agentic yapılar:** Yönetici onayı, ihale açma, teklif toplama, ürün yayına alma, barkod talebi ve vitrin içerik analiz akışları görev bazlı süreçler olarak tasarlanmıştır.
- **Yenilikçilik:** Arka planda rekabet eden satıcı modeli ile sade kullanıcı deneyimini ve sosyal/vitrin alışverişini aynı üründe birleştirir.
- **Kullanıcı dostu çalışma:** İlk ekran sade tutulur; keşif isteyen kullanıcı vitrin moduna geçer.
- **Sunum ve iletişim:** Demo hesapları, kurulum adımları ve demo akışı aşağıda yer alır.

## Teknolojiler

- Expo / React Native
- TypeScript
- Express.js
- PostgreSQL
- Prisma ORM
- JWT tabanlı kimlik doğrulama
- Google Gemini API
- Expo Camera ve Image Picker

## Proje Yapısı

```text
.
├── App.tsx                 # Mobil uygulama
├── api/
│   ├── src/server.ts       # Express API ve admin panel
│   ├── prisma/schema.prisma
│   ├── prisma/migrations/
│   └── scripts/
├── legal/                  # Yasal metin taslakları
├── scripts/start-dev.ps1   # API + Expo geliştirme başlatıcı
└── README.md
```

## Gereksinimler

- Node.js 20 LTS (test edilen surum: v20.20.2)
- npm 10+ (test edilen surum: 10.8.2)
- PostgreSQL
- Expo Go mobil uygulaması veya web tarayıcı
- Opsiyonel: Google AI Studio Gemini API anahtarı

## Kurulum

### 1. Bağımlılıkları yükle

Proje kök dizininde:

```powershell
npm install
cd api
npm install
```

### 2. Backend ortam değişkenlerini hazırla

`api/.env.example` dosyasını `api/.env` olarak kopyala.

```powershell
cd api
copy .env.example .env
```

Örnek:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/secili_pazar?schema=public"
PORT=4000
JWT_SECRET="change-this-secret-before-production"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash-lite"
GEMINI_FALLBACK_MODELS="gemini-2.5-flash"
SEED_DEMO_DATA="false"
```

Gemini kullanmak için `GEMINI_API_KEY` alanına Google AI Studio anahtarı eklenir. Anahtar yoksa uygulama fallback keşfet skoru ile çalışır.

### 3. Veritabanını hazırla

PostgreSQL çalışır durumdayken:

```powershell
cd api
npx prisma generate
npx prisma migrate dev
npm run seed:admin
npm run seed:demo
```

## Çalıştırma

### Hızlı başlatma

Windows ortamında proje kök dizininde şu komut yeterlidir:

```powershell
npm start
```

Bu komut API'yi `http://localhost:4000` üzerinde, Expo/Metro geliştirme sunucusunu ise terminalde başlatır. Aynı ağdaki telefondan Expo Go ile QR kod okutulabilir.

`npm start` komutu PostgreSQL'i otomatik başlatmayı dener; farklı bilgisayarlarda PostgreSQL servisi elle başlatılmış olabilir. Bu durumda uyarı verse bile API ve Expo ayrı ayrı çalıştırılabilir.

### Manuel başlatma

Jüri veya farklı işletim sistemi için daha garantili yöntem:

Terminal 1:

```powershell
cd api
npm run dev
```

Terminal 2:

```powershell
npx expo start
```

Web üzerinden denemek için Expo terminalinde `w` tuşuna basılabilir. Mobil cihaz için Expo Go ile QR kod okutulabilir.

## Demo Hesapları

Admin panel:

```text
URL: http://localhost:4000/admin
E-posta: admin@sadevitrin.local
Şifre: Demo1234!
```

Kullanıcı:

```text
E-posta: ayse.demo@sadevitrin.local
Şifre: Demo1234!
```

Satıcı:

```text
E-posta: pati.demo@sadevitrin.local
Şifre: Demo1234!
```

## Demo Akışı

1. Kullanıcı sade modda ürünleri inceler ve sepete ekler.
2. Satıcı ürün satma talebi oluşturur.
3. Yönetici panelinde talep onaylanır ve ihale açılır.
4. Satıcı açık ihaleye teklif verir.
5. Yönetici fiyat, stok, teslimat ve ürün standardına göre en uygun satıcıyı seçerek ürünü yayına alır.
6. Kullanıcı sade ürün sayfasında yalnızca seçilen aktif satıcıyı görür ve satın alır.
7. Vitrin modunda içerik üreticisi veya satıcı paylaşım yapar.
8. Keşfet akışı, etkileşim metrikleri ve Gemini destekli içerik skoru ile sıralanır.

