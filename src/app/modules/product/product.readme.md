# Product Module

## Overview
The Product module manages the entire product catalog. Products support rich metadata including multiple images (Cloudinary, with order + deletable publicIds), specifications, key features, attribute definitions + color options, variants (size/color combos with own SKU/price/stock), offer pricing (flat or percentage sales), and a currency inherited from the store. Products can be soft-deleted (`isDeleted`), have their stock tracked, and carry an `averageRating`/`ratingCount` synced from reviews.

## How It Works
- **List products** – Public route. Returns non-deleted (`isDeleted: false`) products with category, brand, and non-flagged reviews populated. Supports search, filter, sort, pagination, and price-range filtering via QueryBuilder.
- **Get single product** – Public route. Returns product details with category, brand, and non-flagged reviews populated. 404 if missing or soft-deleted.
- **Create product** – Admin-only. Accepts up to 10 images via Multer/Cloudinary (`images` field). Auto-generates a unique slug from name if none is provided. Category and brand are validated as existing references. `createdBy` is attached from the authenticated admin. **`currency` is NOT accepted on create — it inherits from the store's brand settings** (`brand.currency`).
- **Update product** – Admin-only. Advanced image management (`keepImages` + `newImages` + `removedImageIds`), re-validates slug uniqueness and category/brand references, supports offer price + variants. Can toggle `isActive` both ways. **Unlike create, `currency` IS accepted here** (one of `usd`/`bdt`/`eur`/`gbp`/`inr`/`aed`/`aud`/`cad`) — an explicit override for this product. **Removing an image (main or variant) destroys its Cloudinary file automatically** — you only need to omit it from `keepImages` / the variant's `imageUrls`.
- **Delete product** – Admin-only. Soft-deletes by setting `isDeleted: true` and `isActive: false` (not toggleable back via delete).

### Slug rules
- If a slug is **provided**, it is rejected (409) only if it belongs to a product with a **different name**. Products with the same name (different price/variant) may share the slug.
- If **omitted**, a slug is generated from the name (lowercased, hyphenated). If the base slug is taken by a different-named product, a unique random-suffixed slug is generated instead.
- A name with no letters/numbers → 400.

### Currency
Products **inherit** the store's currency from the settings brand (`brand.currency`) — the admin picks the store currency in settings, and new products automatically carry it. Orders inherit the currency of their products. Changing the store currency affects new products only. On **update**, an explicit `currency` override is accepted.

### Offer price
An optional `offerPrice` sub-doc: `{ type: "flat" | "percentage", value, startAt, endAt, isActive }`. `endAt` must be after `startAt` (else 400). The frontend computes the effective sale price: flat = `price - value`, percentage = `price - (price * value / 100)`.

### Variants
Products can have a single default price/stock (no variants) or multiple `variants` (`hasVariants: true` — set automatically whenever `variants` has entries, on both create and update). Each variant has `sku`, `attributes` (e.g. `{ Color: "Black", Size: "M" }`), optional `price` (falls back to product price), `stock`, `imageUrls`, `isActive`. SKUs are auto-generated as `{PRODUCT_PREFIX}-{COLOR}-{SIZE}-{RANDOM}` when not provided (e.g. `SMAR-BLACK-M-7F3K9Q`).

**`Color` is special — do NOT declare it in `attributes`.** Colors are expressed **once** in `colorOptions` (`[{ name, hex }]` — the swatch palette). A variant's `attributes` may reference `Color` by name (e.g. `{ Color: "Black", Size: "M" }`), and the server:
- **auto-adds** any variant `Color` value missing from `colorOptions` (silently, with an empty `hex` for the admin to fill later) — so the UI never has a swatch-less color and the two lists never drift;
- validates the `Color` value against `colorOptions` names (not an `attributes` axis).

**Other axes (`Size`, `Material`, custom names, ...) go in `attributes`** (`[{ key, values }]`) so the storefront can render filters/selectors. Each variant's non-`Color` attribute keys **and values** must draw from these definitions — the server rejects (`400`) any variant attribute key/value not declared in the axes. This keeps the variant system manageable for any axis type, fully dynamic, with no color duplication.

**Variant images** use the same `{ publicId, url, order }` shape as the main product images (`order: 0` = first/cover for that variant). New variant images can be uploaded as files in the `variantImages` multipart field (flat, in variant order) and each variant's `imageUrls` in `data` declares its image slots:
- existing images → `{ publicId, order }` (the `url` is backfilled from the stored variant by `publicId`);
- **new slots → empty placeholder `{}` (or `{ order }`)** — the server fills them from the `variantImages` files in order of appearance;
- plain URL strings are also accepted and normalized to objects with sequential order.

On create, if there is no `variantImages` file for a placeholder slot, it stays empty. On update, providing only `{ publicId, order }` preserves the existing `url` from the stored variant. If more files are sent than placeholder slots, the server responds `400` with a count-mismatch message. **On update, omitting an existing variant image from `imageUrls` removes AND destroys it from Cloudinary** (best-effort).

## Test Data

### GET /api/v1/product (Get All Products)
**Request:**
```
GET /api/v1/product?searchTerm=phone&minPrice=100&maxPrice=1000&page=1&limit=10
```

**Response:**
```json
{
    "success": true,
    "message": "Products retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
    "data": [
        {
            "_id": "prod_id",
            "name": "Smartphone X",
            "slug": "smartphone-x",
            "description": "Latest smartphone with advanced features",
            "price": 799.99,
            "currency": "usd",
            "stock": 50,
            "weight": 0.2,
            "category": { "_id": "cat_id", "name": "Electronics", "slug": "electronics" },
            "brand": { "_id": "brand_id", "name": "TechBrand", "logo": "https://..." },
            "createdBy": "user_id",
            "reviews": [
                {
                    "_id": "review_id_1",
                    "rating": 4,
                    "description": "Great product! Highly recommended.",
                    "isFlagged": false,
                    "createdAt": "2025-01-15T00:00:00.000Z"
                }
            ],
            "imageUrls": [
                { "publicId": "aeromart-ecommerce/abc123", "url": "https://res.cloudinary.com/.../image1.jpg", "order": 0 },
                { "publicId": "aeromart-ecommerce/def456", "url": "https://res.cloudinary.com/.../image2.jpg", "order": 1 }
            ],
            "offerPrice": null,
            "colorOptions": [ { "name": "Black", "hex": "#000000" }, { "name": "White", "hex": "#FFFFFF" } ],
            "attributes": [ { "key": "Size", "values": ["S", "M", "L"] } ],
            "variants": [
                {
                    "sku": "SMAR-BLACK-M-7F3K9Q",
                    "attributes": { "Color": "Black", "Size": "M" },
                    "price": 799.99,
                    "stock": 20,
                    "imageUrls": [
                        { "publicId": "aeromart-ecommerce/variant-red", "url": "https://res.cloudinary.com/.../variant-red.jpg", "order": 0 }
                    ],
                    "isActive": true
                }
            ],
            "hasVariants": true,
            "isActive": true,
            "averageRating": 4.5,
            "ratingCount": 12,
            "specification": [
                { "key": "RAM", "value": "8GB" },
                { "key": "Storage", "value": "128GB" }
            ],
            "keyFeatures": ["5G Support", "Wireless Charging"],
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
    ]
}
```
Note: Only non-deleted products are returned. Only non-flagged reviews are populated. `createdBy` is attached on create (admin id). `imageUrls` is now an array of `{ publicId, url, order }` objects — `order: 0` is the cover image.

### GET /api/v1/product/:productId (Get Single Product)
**Request:**
```
GET /api/v1/product/prod_id
```

**Response:**
```json
{
    "success": true,
    "message": "Product retrieved successfully",
    "data": { "...": "same structure as above" }
}
```
Note: 404 if the product does not exist or has been soft-deleted (`isDeleted: true`).

### POST /api/v1/product (Create Product)

**Request — WITHOUT variants (single price/stock product):**
```
POST /api/v1/product
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
  data: {
    "name": "Classic White T-Shirt",
    "description": "Soft cotton t-shirt",
    "price": 19.99,
    "stock": 100,
    "weight": 0.15,
    "category": "cat_id",
    "brand": "brand_id",
    "specification": [{ "key": "Fabric", "value": "100% Cotton" }],
    "keyFeatures": ["Machine Washable"],
    "offerPrice": { "type": "flat", "value": 5, "startAt": "2026-08-01", "endAt": "2026-08-31", "isActive": true }
  }
  images: [front.jpg, back.jpg, detail.jpg]   // main product photos (max 10)
```

No `attributes`, no `variants`, no `hasVariants` — the product has a single price/stock. `hasVariants` stays `false`, `variants` stays `[]`.

**Request — WITH variants (color/size/custom combos):**
```
POST /api/v1/product
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
  data: {
    "name": "Smartphone X",
    "description": "Latest smartphone with advanced features",
    "price": 799.99,
    "stock": 50,
    "weight": 0.2,
    "category": "cat_id",
    "brand": "brand_id",
    "specification": [{ "key": "RAM", "value": "8GB" }],
    "keyFeatures": ["5G Support"],
    "colorOptions": [ { "name": "Black", "hex": "#000000" }, { "name": "White", "hex": "#FFFFFF" } ],
    "attributes": [ { "key": "Size", "values": ["S", "M", "L"] } ],
    "variants": [
      { "attributes": { "Color": "Black", "Size": "M" }, "price": 799.99, "stock": 20, "imageUrls": [ {}, {} ] },
      { "attributes": { "Color": "White", "Size": "M" }, "price": 799.99, "stock": 15, "imageUrls": [ {} ] }
    ]
  }
  images: [product-1.jpg, product-2.jpg, product-3.jpg]   // main photos (max 10)
  variantImages: [black-m-1.jpg, black-m-2.jpg, white-m-1.jpg]   // flat, in variant order
```

**How variant images map to slots:**
- `variantImages` files are consumed **in order of appearance** across all variants' placeholder slots.
- Variant 1 (`Black / M`) declares 2 placeholders `[{}, {}]` → gets `black-m-1.jpg`, `black-m-2.jpg`.
- Variant 2 (`White / M`) declares 1 placeholder `[{}]` → gets `white-m-1.jpg`.
- A placeholder can also carry an explicit order: `[{ "order": 1 }, {}]`.
- `hasVariants` is set to `true` automatically; missing `sku`s are auto-generated (`SMAR-BLACK-M-XXXXXX` style).
- `Color` is read from `colorOptions` + the variant's `Color` value — **not** from an `attributes` axis. Any variant `Color` missing from `colorOptions` is **silently auto-added** (empty `hex`) so the swatch palette always matches the variants.

**Response:**
```json
{
    "success": true,
    "message": "Product created successfully",
    "data": { "...": "product object with populated category/brand, createdBy, reviews, and variant imageUrls filled from the uploaded files" }
}
```
Note: **No `currency` field** — it inherits from the store's brand settings. `slug` optional. `offerPrice.endAt` must be after `startAt` (400 otherwise). Uploaded main images become `{ publicId, url, order }` objects in the order uploaded; a `data`-level `imageUrls` array is accepted but **overridden** when `images` files are uploaded. Variant attribute keys/values must be declared in `attributes` (400 otherwise) — **except `Color`, which is validated against `colorOptions`**. Sending more `variantImages` files than placeholder slots → 400 with a count-mismatch message.

### PATCH /api/v1/product/:productId (Update Product)
**Request — image management (multipart):**
```
PATCH /api/v1/product/prod_id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
  data: {
    "name": "Smartphone X Pro", "price": 899.99, "isActive": true,
    "currency": "usd" (optional override — unlike create, accepted here),
    "keepImages": [ { "publicId": "aeromart-ecommerce/abc123", "order": 1 }, { "publicId": "aeromart-ecommerce/def456", "order": 0 } ],
    "removedImageIds": ["aeromart-ecommerce/ghi789"],
    "offerPrice": { "type": "percentage", "value": 10, "startAt": "2026-08-01", "endAt": "2026-08-31" },
    "variants": [
      { "sku": "SMAR-BLACK-M-7F3K9Q", "attributes": { "Color": "Black", "Size": "M" }, "stock": 15, "imageUrls": [ { "publicId": "aeromart-ecommerce/variant-red", "order": 0 }, {} ] },
      { "attributes": { "Color": "White", "Size": "L" }, "price": 849.99, "stock": 10, "imageUrls": [ {} ] }
    ]
  }
  images: [new file1, new file2]   // main images — appended after kept images
  variantImages: [black-m-new.jpg, white-l-new.jpg]   // new variant images, flat in variant order
```

**How image updates work:**
- `keepImages` — the existing main images you want to KEEP, with their new `order` (reorder by changing `order`; `0` = cover/first).
- `images` (multipart files) — new main uploads, appended after the kept images' max order.
- `removedImageIds` — Cloudinary publicIds to **delete from Cloudinary** and drop from the product.
- If `keepImages`/`images` are absent, the current main images stay untouched.
- **Main images removed implicitly are destroyed too** — any existing main-image `publicId` that is **not** in `keepImages` and **not** re-uploaded is deleted from Cloudinary automatically. You don't have to list them in `removedImageIds`; both paths destroy the file. (Best-effort — a missing/stale id won't fail the update.)
- **Variant images** — send each variant's `imageUrls` as its image slots:
  - existing images → `{ publicId, order }` — the `url` is backfilled from the stored variant by `publicId`;
  - **new slots → empty placeholder `{}` (or `{ order }`)** — filled from the `variantImages` files in order of appearance (flat, across all variants);
  - plain URL strings are also normalized.
  - **Removing a variant image destroys it from Cloudinary too** — a stored variant `publicId` that is absent from the new `imageUrls` is deleted automatically. To keep an image, list it (or its `publicId`); to remove it, just omit it.
  - In the example above: variant 1 keeps its existing image and declares one new slot (`{}` → `black-m-new.jpg`); variant 2 (new) declares one slot (`{}` → `white-l-new.jpg`). Sending more `variantImages` files than total placeholders → `400` count-mismatch.

**Response:**
```json
{
    "success": true,
    "message": "Product updated successfully",
    "data": { "...": "updated product" }
}
```
Note: `isActive` can be toggled `true`/`false` freely. `slug` optional — same uniqueness rules as create. `offerPrice`, `colorOptions`, `attributes`, `variants`, and `hasVariants` are all updatable — `hasVariants` is set automatically from the `variants` array length. `currency` is accepted as an explicit override (unlike create). New/existing variant attribute keys and values must be declared in `attributes` (400 otherwise) — **except `Color`** (validated against `colorOptions`; missing colors are auto-added).

### DELETE /api/v1/product/:productId (Delete Product)
**Request:**
```
DELETE /api/v1/product/prod_id
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Product deleted successfully",
    "data": {
        "_id": "prod_id",
        "isActive": false,
        "isDeleted": true,
        "...": "rest of product fields"
    }
}
```
Note: Soft delete — sets `isDeleted: true` and `isActive: false`. The product is excluded from public reads.
