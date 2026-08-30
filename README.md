# AURE — Streetwear Webstore

Dark, 3D-UI styled storefront + password-protected admin panel. Prices in INR, Razorpay checkout, image/ads uploads straight from your computer (no database — everything is plain JSON + files on disk).

## Quick start

```bash
npm install
npm run seed      # creates sample products + ads (placeholders)
npm start         # http://localhost:3000
```

- **Storefront** → `http://localhost:3000`
- **Admin panel** → `http://localhost:3000/admin`
  - default password: `aureadmin`

## Configuration (`.env`)

| Key | Purpose |
| --- | --- |
| `PORT` | Server port (default `3000`) |
| `SESSION_SECRET` | Change to a long random string |
| `ADMIN_PASSWORD` | Admin panel password (default `aureadmin`) |
| `RAZORPAY_KEY_ID` | Razorpay live key (leaves payment in **demo mode** if empty) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (leaves payment in **demo mode** if empty) |

> **Payments:** With keys set, checkout uses the real Razorpay flow (UPI / cards / netbanking, INR).
> Without keys, orders are still created and marked **paid** locally so you can test end-to-end;
> the checkout screen shows a "demo mode" banner.

Get keys from <https://dashboard.razorpay.com/> → Settings → API Keys.

## Admin capabilities

- **Dashboard** — stats (products, orders, pending, revenue) + recent orders
- **Products** — add / edit / delete, set name, category, **price in INR**, sizes, stock, description,
  badge tag, featured flag, and **upload a photo from your computer**
- **Ads & Banners** — hero + banner placements, upload images, toggle live/hidden, link to a product
- **Orders** — full list with status filters, detail view (customer + payment info), update status
  (pending → paid → shipped → delivered / cancelled)

## Storefront

- Home (hero, banner ads, featured + fresh drops, marquees)
- Shop with category filter
- Product detail (size selector, stock, add to cart)
- Cart (session-based), Checkout (billing form → Razorpay), order confirmation with receipt

## Tech

- Node.js + Express + EJS (server-rendered)
- `express-session` for admin auth + cart
- `multer` for image uploads → `public/uploads/`
- `razorpay` SDK
- Data lives in `data/products.json`, `data/ads.json`, `data/orders.json`

## Tests

```bash
npm test   # integration smoke test (server must be running on :3000)
```

## Structure

```
server.js            # app, routes, auth, uploads, Razorpay
lib/store.js         # JSON data access (products / ads / orders)
scripts/seed.js      # seeds sample catalog + placeholder artwork
scripts/smoke-test.js
views/               # EJS templates (storefront + admin)
public/css|js|uploads
data/                # JSON storage (gitignored)
```