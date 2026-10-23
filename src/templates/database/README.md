# Database Seed Data (CSV)

Full MongoDB collection sample data for client-side testing of the demo e-commerce server.
Multi-niche storefront — each niche ships as its own CSV set, all in **BDT** with a
matching settings preset from `src/app/modules/settings/settings.presets.ts`.

## Niche templates

| Niche | CSV prefix | Brand (settings preset) | Products |
|---|---|---|---|
| Electronics | `electronics_` | VoltEdge | 20 (5 non-variant + 15 variant) |
| Perfume Oil | `perfume_oil_` | Attor | 20 (5 non-variant + 15 variant) |
| Clothing | `clothing_` | Attor | 20 (5 non-variant + 15 variant) |
| Eyewear | `eyewear_` | Attor Optics | 20 (5 non-variant + 15 variant) |
| Cosmetics | `cosmetics_` | Lumière | 20 (5 non-variant + 15 variant) |
| Shoes | `shoes_` | Solemate | 20 (5 non-variant + 15 variant) |
| Watches | `watches_` | Attor Time | 20 (5 non-variant + 15 variant) |

Each niche produces 8 CSVs: `<prefix>_users.csv`, `_brands.csv`, `_categories.csv`,
`_coupons.csv`, `_products.csv`, `_reviews.csv`, `_orders.csv`, `_settings.csv` — written
into a per-niche folder: `src/templates/database/collections/<niche>/` (e.g.
`collections/clothing/clothing_products.csv`).

## Per-niche counts (identical across niches)

| Collection | Docs |
|---|---|
| users | 10 (1 admin + 1 manager + 8 customers) |
| brands | 5 |
| categories | 5 |
| coupons | 5 |
| products | 20 (5 non-variant + 15 variant, max 5 variants each) |
| reviews | ~66 (15 products reviewed, max 8 each; 5 products have none) |
| orders | 10 (variant/non-variant, COD/Online, Paid/Pending/Failed, 1 guest order) |
| settings | 1 singleton (`_id = "singleton"`) |

## How it was generated

`generate-seed.ts` (ts-node) is a shared engine that builds every document in memory with
**fresh, dynamic MongoDB ObjectIds** (`crypto.randomBytes(12).toString("hex")`) and resolves
all cross-collection references (user/brand/category/product/review) from the in-memory
objects — ids can never drift out of sync. Order pricing uses the server's exact formula
from `order.utils.ts`:

```
totalAmount     = Σ(unitPrice × qty)            (offer-adjusted unit price)
discount        = coupon discount (capped by maxDiscountAmount)
offerDiscount   = Σ savings from active offerPrice(s)
totalDiscount   = offerDiscount + discount
finalAmount     = totalAmount − discount − offerDiscount + deliveryCharge
```

Each niche's product data + orders live in `src/templates/database/collections/data/<niche>.ts`
(typed against `data/types.ts`). The settings CSV for each niche is pulled directly from the
app's own `settingsPresets` so brand/hero/theme always match what the server would seed.

Regenerate anytime (ids change on every run — that's expected and fine):

```bash
npx ts-node src/templates/database/collections/generate-seed.ts
```

The engine self-validates before writing: unique _ids, unique SKUs, unique coupon codes,
unique review (user, product) pairs, all FK references resolve, order math consistent,
settings `_id === "singleton"`, settings currency `bdt`, exactly 20 products per niche
(5 non-variant + 15 variant), 15 reviewed + 5 unreviewed.

## CSV shape notes

- Every document carries an explicit `_id` (24-hex ObjectId, except settings which is the
  string `singleton`).
- Nested objects/arrays (`specification`, `keyFeatures`, `variants`, `attributes`,
  `colorOptions`, `offerPrice`, `reviews`, `clientInfo`, `deliveryOptions`, `products`,
  etc.) are stored as **JSON strings** in the cell — valid JSON per field.
- Dates are ISO 8601 (`2026-08-01T00:00:00.000Z`).
- Product `imageUrls` (and variant `imageUrls`) are intentionally **empty** — images are
  added manually one-by-one later.
- Product `reviews` arrays are populated with the referencing review `_id`s, and
  `averageRating` / `ratingCount` are computed from those reviews (same rounding as
  `review.utils.ts`).
- Users share one bcrypt hash for all 10 accounts: `$2b$12$daonVNqLWBwWX.tjLKEJ.eh9/Wb8moJjGmZu2iD47yjveuA6XJMOK` (password `12345678`).

## Importing one niche (e.g. electronics)

### MongoDB Compass

1. Create the database (e.g. `aeromart-ecommerce`).
2. For each collection: **Add Data → Import File** → pick
   `src/templates/database/collections/electronics_<collection>.csv`.

### mongoimport (CLI)

```bash
# from the repo root — repeat per niche by swapping the folder + prefix
for c in users brands categories coupons products reviews orders settings; do
  mongoimport --db aeromart-ecommerce --collection $c \
    --file "src/templates/database/collections/electronics/electronics_$c.csv" --type csv --headerline
done
```

Import in dependency order so references resolve: **users → brands → categories → coupons → products → reviews → orders → settings**.

## Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demoecommerce.com` | `12345678` |
| Manager | `manager@demoecommerce.com` | `12345678` |
| Customers | `ayesha.rahman@gmail.com`, `tanvir.hasan@gmail.com`, `nusrat.jahan@outlook.com`, `mashrafe.karim@gmail.com`, `farhana.mim@gmail.com`, `shakil.ahmed@yahoo.com`, `tasnim.chowdhury@gmail.com`, `imran.hossain@gmail.com` | `12345678` |

Passwords are already bcrypt-hashed in the CSVs — no post-import step needed.

## Known notes

- Settings `_id` is the literal string `singleton` (see `settings.constant.ts`) — do not
  convert it to ObjectId on import.
- Order `orderId` format `DE + 8 chars` matches `generateOrderId.ts` (alphabet without
  `I/O/1/0`).
- Each settings document uses its niche's preset with `brand.currency = "bdt"` — delivery
  charges (90/150) are in BDT and match each niche's order `deliveryCharge` values.
- The Stripe order in each niche includes `fxRate`/`fxBaseCurrency` since BDT is not a
  Stripe-native currency (mirrors `payment.service.ts` behavior).
