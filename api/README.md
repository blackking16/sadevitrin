# SadeVitrin API

Express + Prisma + PostgreSQL backend iskeleti.

## Kurulum

```bash
cd "C:\Users\muham\Desktop\new app\secili-pazar\api"
npm install
```

PostgreSQL kurulduktan sonra `api/.env` içindeki bağlantıyı kendi şifrene göre düzenle:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/secili_pazar?schema=public"
```

Veritabanını oluştur:

```bash
createdb -U postgres secili_pazar
```

Tabloları oluştur:

```bash
npm run prisma:migrate -- --name init
```

API'yi başlat:

```bash
npm run dev
```

Sağlık kontrolü:

```text
GET http://localhost:4000/health
```

## İlk API Alanları

- `POST /auth/register`
- `POST /auth/login`
- `GET /me`
- `POST /addresses`
- `GET /products`
- `POST /seller/product-requests`
- `GET /seller/product-requests`
- `GET /auctions/open`
- `POST /auctions/:auctionId/bids`
- `GET /cart`
- `POST /cart`
- `POST /orders`
- `GET /orders`
