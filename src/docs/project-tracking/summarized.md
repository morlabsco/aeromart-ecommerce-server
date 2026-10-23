# Session Summary — aeromart-ecommerce-server

> Handoff document. Read this first to initialize a new chat session with full context. Covers this session's work (Settings docs + Order/Activity/Review/Product/User updates + Work 2 features), the code-writing standard, mistakes made, and guard rails for continuing.

---

## 1. Project Snapshot

Express + TypeScript + Mongoose (MongoDB) eCommerce backend. All routes under `/api/v1`. CORS allows `localhost:3000`. Payments: Stripe (intl), SSLCommerz (BD), bKash (BD).

**Current route totals (progress.md):** 12 modules, 61 routes.
User 5 · Auth 6 · Product 5 · Order 9 · Meta 1 · Brand 5 · Category 4 · Coupon 6 · Review 5 · Payment 7 · Settings 4 · Activity 4.

**Recent commits (before this session's uncommitted work):**
- `7f5ccc8` Activity module + Order guest order/invoice
- `c9ea716` Settings module v2 + server docs
- `806534d` Settings module v1

**Git status:** working tree is dirty with this session's changes (see §8). Do not assume anything is committed.

---

## 2. What Has Been Done (this session)

### 2.1 Settings — frontend data contract
- `src/docs/project-tracking/settings.md` — extracted the full settings document format (all 9 sections, real defaults from the `perfume_oil` preset), API contract, image-upload semantics, and a static-fallback strategy (deep-merge live over static, short timeout, silent fallback, retry interval).
- `src/app/modules/settings/docs/settings.json` — the full singleton doc as one JSON file = the frontend's static default/fallback data.

### 2.2 Settings module fixes
- **Brand partial update** — was replacing the whole `brand` sub-doc (wiped logo/favicon when not re-sent). Fixed with dotted-path `$set` (`brand.name`, `brand.logo`, ...) so only provided fields change; files override; empty body → 400.
- **Theme expansion** — `theme.colors` now holds the **full 28 CSS tokens** from global.css (base 18 + `chart1-5` + `sidebar*` 8). `fonts.mono` added. All optional (user sends only what they change).
- **Per-niche themes** — new `settings.themes.ts`: `clothingTheme` (warm fashion, Playfair Display, 0.5rem), `perfumeOilTheme` (amber/rose, Cormorant Garamond, 0.625rem), `eyewearTheme` (cool blue/violet, Space Grotesk, 0.75rem). Presets now include `theme`; `PATCH /settings/preset/:niche` applies brand+theme+hero+about+contact+footer in one write.
- **Readme** — rewritten with complete real data per section and the uniform multipart contract (`data` JSON field + optional `images` files; plain JSON body → 400 "Please provide data in the body under data key").

### 2.3 Order module (Work 1 + follow-ups)
- `orderId`: **`DEXXXXXXXX`** — `DE` + 8 cryptographically random alphanumeric chars (no I/O/1/0), **no date, no sequence** (predictable ids = scraping risk). Unique index + retry loop. Util: `src/app/utils/generateOrderId.ts`.
- **Guest checkout** — new `src/app/middleware/optionalAuth.ts`: no token → guest (`user: null`); valid token → attach user; **invalid/expired token still rejected** (never silently treated as guest). `POST /order` uses it.
- New recipient fields: `recipientName`, `phoneNo` (required), `notes` (optional).
- **`GET /order/track-order/:orderId`** (public) — looks up **only by `orderId`** (not `_id`). Returns order overview + per-product details + payment info + `statusHistory`.
- **`GET /order/:orderId/invoice`** (admin/owner) — invoice JSON for react-pdf. **400 unless `paymentStatus === "Paid"`**. Optional `?by=transactionId` to look up by gateway tran_id (payment success page) — never falls back to `_id` when set.
- **Delivery options (Work 2)** — order create/update sends `deliveryOptionName`; backend resolves `deliveryCharge` from settings `brand.deliveryOptions` (unknown/inactive → 400). Client never sends an amount.
- Ownership: guest orders (user null) are admin-only for detail/update; owner/admin otherwise.

### 2.4 Activity module (new)
`src/app/modules/activity/` — audit log of all writes. Routes (admin): `GET /activity` (QueryBuilder/pagination, newest first), `GET /activity/:activityId`, `PATCH /activity/:activityId/clear`, `PATCH /activity/clear` (`{ clearAll: true }` OR `{ from, to }` date range; empty body → 400). No delete route.
`logActivity({ module, type, message, referenceId?, reference?, performedBy?, metadata? })` is wired fire-and-forget (no transaction) into Order, Brand, Category, Product, Review, User, Coupon, Settings, Payment services.

### 2.5 Product module (Work 2)
- **Currency inheritance** — create no longer accepts `currency`; it inherits `brand.currency` from settings (`product.utils.ts` → `getStoreCurrency`).
- **`offerPrice`** — `{ type: flat|percentage, value, startAt, endAt, isActive }`; end-after-start validated; `null` clears.
- **`colorOptions`** (`{name, hex}`), **`attributes`** (`{key, values}`), **`variants`** (`{ sku, attributes, price?, stock, imageUrls, isActive }`), **`hasVariants`** — SKUs auto-generated `{PREFIX}-{COLOR}-{SIZE}-{RANDOM}` when omitted (`buildVariantSku`), existing SKUs preserved on update. **Variant `imageUrls` now uses the same `{publicId, url, order}` shape as main images** (`normalizeVariantImages` backfills `url` by `publicId` on update).
- **Image management** — `imageUrls` is now `[{ publicId, url, order }]` (`order: 0` = cover). Update supports `keepImages` (reorder; URLs auto-preserved from existing when only publicId given), multipart `images` (new uploads appended), `removedImageIds` (deleted from Cloudinary best-effort). A stray `imageUrls` in `data` is ignored so it can't wipe the set.

### 2.6 Review module
- **Verified purchase** — `isVerifiedPurchase` computed server-side from the customer's orders: `true` only when a `Processing`/`Shipped`/`Completed` order contains the product (Pending/Cancelled don't count). Helper in `review.utils.ts` (`hasVerifiedPurchase`).
- **`GET /review/my-reviews`** (customer) — own reviews incl. flagged; registered **before** `/:reviewId` to avoid route collision.

### 2.7 User module
- `photoUrl: ""` on profile update → sets to `null` (removes photo). Validation accepts empty string; uploaded `profilePhoto` overrides.

### 2.8 Utils extraction (module.utils.ts convention)
Each module's utility functions now live in `<module>.utils.ts`:
- `order.utils.ts` — `resolveDeliveryCharge`
- `product.utils.ts` — `getStoreCurrency`, `buildVariantSku`, `populateProductRefs`, `resolveProductSlug`
- `review.utils.ts` — `recalcProductRating`, `hasVerifiedPurchase`
- `settings.utils.ts` — `mapSectionFiles`
- `payment.utils.ts` — added `ensureOrderCanInitPayment` (existing: stripe/ssl/bkash + `generateTransactionId`)
- Existing: `auth.utils.ts`, `meta.utils.ts`.

---

## 3. Code Writing Standard (follow strictly)

- **Indentation:** 4 spaces · **Quotes:** double · trailing commas.
- **Files per module:** `<module>.routes.ts`, `.controller.ts`, `.service.ts`, `.model.ts`, `.interface.ts`, `.validation.ts`, `.constant.ts`, `.utils.ts`, `.readme.md`.
- **Exports:** named, aggregated at bottom, PascalCase: `export const OrderRoutes = router;`, `export const OrderServices = { ... }`, `export const OrderController = { ... }`.
- **Controllers:** `catchAsync(async (req, res) => {...})` + `sendResponse(res, { statusCode: StatusCodes.OK, success, message, data, meta? })`.
- **Validation:** zod schema wrapping `body`, applied via `validateRequest(...)` middleware. Update schemas = all fields optional. Model/interface/validation stay in sync.
- **Auth:** `auth(UserRole.ADMIN, UserRole.CUSTOMER)`; roles `admin`/`manager`/`customer`. Optional auth via `optionalAuth()`.
- **Uploads:** `multerUpload.single('x')` / `.array('images', N)` + `parseBody` (JSON must be under a `data` key) before validation.
- **Soft deletes:** `isDeleted: true` (+ `isActive: false` for brand/category/product); deleted filtered from public reads.
- **Response envelope:** `{ success, message, data, meta? }` (meta on paginated lists).
- **Money:** server-authoritative — clients never send prices/amounts/delivery charges.
- **Activity logging:** every write logs via `ActivityServices.logActivity(...)` after the write, fire-and-forget.
- **Docs:** every module change → update `<module>.readme.md` AND `src/docs/project-tracking/backend-usage-guide.md` (frontend's source of truth). Use codebase-memory-mcp for exploration (not raw file reads) to save tokens.

---

## 4. Guard Rails / Rules

1. Follow the project's code standards (above) — "follow the rules strictly".
2. Use codebase-memory-mcp (`search_graph`, `get_code_snippet`) to explore; avoid traditional file reads that burn tokens.
3. Maintain edge cases, code quality, readability, reusability.
4. **Implement only what was asked** — no extra routes/handlers/endpoints.
5. When a module changes, update its readme + backend-usage-guide.md in the same pass.
6. Typecheck with `npx tsc --noEmit` after changes (user builds when needed — don't run builds automatically).
7. Settings singleton holds site-wide config only; growing lists (products/posts/banners) belong in their own modules.
8. `orderId` = `DEXXXXXXXX` random, unguessable — never reintroduce date/sequence encoding.
9. Guest orders have no owner → admin-only for detail/update/invoice; customers track via public `/track-order`.
10. Cache (settings) is in-memory single-instance; invalidate on every write.
11. Client tokens: a bad token is a 401, never silently treated as guest/anonymous.
12. Be terse/direct; brief answers unless detail is requested.

---

## 5. Mistakes Made (and how they were fixed)

1. **Brand full-doc replace wiped logo/favicon** — `$set: { brand: update }` replaced the whole sub-doc, so unprovided fields reset to `""`. Fixed with dotted-path `$set` of only provided fields.
2. **OrderId predictability** — initial `DE{DD}D{MM}M{0001}{U|G}` was guessable/scrapeable. Replaced with random `DEXXXXXXXX`.
3. **Track-order accepted `_id`** — let callers look up by Mongo id; tightened to `orderId` only (public tracking key).
4. **Review service import over-removal** — after extracting utils, removed the `Product` import which `createReview`/`deleteReview` still use → TS errors. Re-added.
5. **Readme drift** — readmes/guide documented raw JSON bodies for settings `/:section` but the route is multipart (`data` + `images`); corrected the docs to the real contract.
6. **Image update could wipe images** — a plain `imageUrls` in update `data` would replace the set; now only `keepImages`/`images`/`removedImageIds` manage images, and kept URLs are auto-preserved from existing images.

---

## 6. What's Next / Open Items

1. **Payment SSLCommerz v4 issue** — flagged in `works.md`: SSLCommerz not initializing payments (looks like v3→v4 API update). Research + fix before it's considered working.
2. **User to test the Work 2 features** (brand currency/deliveryOptions, product offer/variants/images, order deliveryOptionName, user photoUrl removal) — fixes may follow.
3. **Order + variants edge case (known/documented):** order creation decrements **base product** stock, not variant stock (orders reference the base product). Revisit if variant-aware ordering is required.
4. **Order pricing with offerPrice:** orders use base `price`, not offer price — confirm intent if offers should apply at checkout.
5. **Uncommitted work:** everything from this session is uncommitted (see git status). Commit when the user is ready.

---

## 7. Frontend Handoff (what to tell the frontend assistant)

Read `src/docs/project-tracking/backend-usage-guide.md` (source of truth) and update the frontend for:
1. **Settings brand** — `currency` (single code string, e.g. `"usd"`, `"bdt"` — the active store currency) and `deliveryOptions` (`{name,charge,country?,isActive}`); render delivery options at checkout from `GET /settings`.
2. **Product** — create no longer sends `currency` (inherited); products return `offerPrice`, `colorOptions`, `attributes` (`{key, values}` variant axes), `variants` (with `sku`), `hasVariants`, and `imageUrls` as `{publicId,url,order}` (order 0 = cover) — **same object shape for `variants[].imageUrls`**. Show offer pricing + variant selectors; admin editor supports `keepImages`/`removedImageIds` + reorder.
3. **Order** — send `deliveryOptionName` (NOT `deliveryCharge`); backend computes the charge.
4. **User** — `photoUrl: ''` removes the profile photo.
5. **Order id** — `DEXXXXXXXX` (no hyphen); `GET /order/track-order/:orderId` accepts only that.
6. **Review** — `isVerifiedPurchase` reflects the customer's paid orders; new `GET /review/my-reviews`.
7. **Invoice** — `GET /order/:orderId/invoice?by=transactionId` fetches an invoice from the gateway `tran_id` on the payment success page.

---

## 8. Files Changed This Session (uncommitted)

**Modules:** order (controller/interface/model/readme/service/utils/validation), product (interface/model/readme/service/utils/validation), review (controller/routes/readme/service/utils), settings (interface/model/presets/readme/service/utils/validation + `settings.themes.ts` new + docs/settings.json), user (readme/service/validation), payment (service/utils).
**Shared:** `src/app/utils/generateOrderId.ts`, `src/app/middleware/optionalAuth.ts` (from earlier work), `src/app/routes/index.ts` (activity route), `src/docs/project-tracking/{backend-usage-guide.md, works.md, summarized.md}`.
**New untracked:** `order.utils.ts`, `product.utils.ts`, `review.utils.ts`, `settings.utils.ts`, `settings.themes.ts`, `summarized.md`, plus earlier `activity/` module, `optionalAuth.ts`, `generateOrderId.ts`.
