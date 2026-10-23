# Settings Module

## Overview
The Settings module manages all site-wide configuration as a **single singleton Mongoose document** (fixed `_id: "singleton"`). It holds the brand identity, theme, and all storefront sections: `brand`, `theme`, `hero`, `testimonials`, `navbar`, `footer`, `contact`, `about`, and `limitedOffer`. The whole config is readable in one request, and each section can be updated independently by an admin.

## How It Works
- **Singleton document** – One document, one `_id` (`"singleton"`). Created at deploy time via the seed script (`npm run seed:settings`), prefilled from the default niche preset (`clothing`).
- **Get settings** – Public route. Returns the whole singleton, cached in memory; the second read is served from cache until a write invalidates it.
- **Update brand** – Admin-only. Updates only the `brand` fields you provide (`name`, `tagline`, `description`, `niche`, `nicheLabel`, plus `logo`/`favicon` file uploads). **Unprovided fields are preserved** — sending only `name` keeps the existing logo/favicon.
- **Update section** – Admin-only. Updates a single section (`theme`, `hero`, `testimonials`, `navbar`, `footer`, `contact`, `about`, `limitedOffer`) via `$set` with `runValidators: true`. **Every section uses the same `multipart/form-data` shape: a `data` field (JSON string of the section body) + an optional `images` file field** (mapped positionally for hero/testimonials/about/limitedOffer). Unknown section → 400, invalid body → 400.
- **Niche presets** – Admin-only `PATCH /settings/preset/:niche` applies **only the theme** for a niche (`shoes` | `watches` | `eyewear` | `clothing` | `electronics` | `pet_animal` | `furniture` | `cosmetics` | `sports` | `jewelry` | `perfume_oil`). `PATCH /settings/reset/:niche` does a **full reset** (theme + brand + hero + about + contact + footer + navbar + testimonials + limitedOffer). `PATCH /settings/reset/empty` clears **everything** (keeping currency + delivery options) for a from-scratch rebuild. All from `settings.presets.ts`.
- **Image uploads** – Positional, same semantics as the Product module: re-send the whole section; uploaded files map by index (hero → `slides[i].image`, testimonials → `items[i].avatar`, about/limitedOffer → `image`).
- **Cache invalidation** – Every write invalidates the in-memory cache. The cache is single-instance only; use Redis (or a short TTL) when running multiple server instances.
- **Concurrency** – The schema uses `optimisticConcurrency: true` to avoid silent last-write-wins on concurrent admin edits.
- **Rule going forward** – Settings holds singleton, site-wide config only. Anything that grows as a list of records (products, posts, banners) belongs in its own module/collection — do not add arrays-of-many here.

## Test Data

### GET /api/v1/settings (Get Settings — Public)
**Request:**
```
GET /api/v1/settings
```
No auth required — the storefront/frontend needs this to render.

**Response:**
```json
{
    "success": true,
    "message": "Settings retrieved successfully",
    "data": {
        "_id": "singleton",
        "brand": {
            "name": "Attor",
            "tagline": "Define Your Style",
            "description": "Premium clothing for the modern individual.",
            "niche": "clothing",
            "nicheLabel": "Clothing",
            "logo": "/demo/clothing/logo.svg",
            "favicon": "",
            "currency": "usd",
            "deliveryOptions": [
                { "name": "Store Pickup", "charge": 0, "country": "", "isActive": true },
                { "name": "Inside Dhaka", "charge": 90, "country": "BD", "isActive": true },
                { "name": "Outside Dhaka", "charge": 150, "country": "BD", "isActive": true },
                { "name": "International", "charge": 15, "country": "", "isActive": true }
            ]
        },
        "theme": {
            "colors": {
                "background": "oklch(1 0 0)",
                "foreground": "oklch(0.145 0 0)",
                "card": "oklch(1 0 0)",
                "cardForeground": "oklch(0.145 0 0)",
                "popover": "oklch(1 0 0)",
                "popoverForeground": "oklch(0.145 0 0)",
                "primary": "oklch(0.514 0.222 16.935)",
                "primaryForeground": "oklch(0.969 0.015 12.422)",
                "secondary": "oklch(0.967 0.001 286.375)",
                "secondaryForeground": "oklch(0.21 0.006 285.885)",
                "muted": "oklch(0.97 0 0)",
                "mutedForeground": "oklch(0.556 0 0)",
                "accent": "oklch(0.97 0 0)",
                "accentForeground": "oklch(0.205 0 0)",
                "destructive": "oklch(0.577 0.245 27.325)",
                "border": "oklch(0.922 0 0)",
                "input": "oklch(0.922 0 0)",
                "ring": "oklch(0.708 0 0)",
                "chart1": "oklch(0.81 0.117 11.638)",
                "chart2": "oklch(0.645 0.246 16.439)",
                "chart3": "oklch(0.586 0.253 17.585)",
                "chart4": "oklch(0.514 0.222 16.935)",
                "chart5": "oklch(0.455 0.188 13.697)",
                "sidebar": "oklch(0.985 0 0)",
                "sidebarForeground": "oklch(0.145 0 0)",
                "sidebarPrimary": "oklch(0.586 0.253 17.585)",
                "sidebarPrimaryForeground": "oklch(0.969 0.015 12.422)",
                "sidebarAccent": "oklch(0.97 0 0)",
                "sidebarAccentForeground": "oklch(0.205 0 0)",
                "sidebarBorder": "oklch(0.922 0 0)",
                "sidebarRing": "oklch(0.708 0 0)"
            },
            "dark": {
                "enabled": true,
                "colors": {
                    "background": "oklch(0.145 0 0)",
                    "foreground": "oklch(0.985 0 0)",
                    "card": "oklch(0.205 0 0)",
                    "cardForeground": "oklch(0.985 0 0)",
                    "popover": "oklch(0.205 0 0)",
                    "popoverForeground": "oklch(0.985 0 0)",
                    "primary": "oklch(0.455 0.188 13.697)",
                    "primaryForeground": "oklch(0.969 0.015 12.422)",
                    "secondary": "oklch(0.274 0.006 286.033)",
                    "secondaryForeground": "oklch(0.985 0 0)",
                    "muted": "oklch(0.269 0 0)",
                    "mutedForeground": "oklch(0.708 0 0)",
                    "accent": "oklch(0.269 0 0)",
                    "accentForeground": "oklch(0.985 0 0)",
                    "destructive": "oklch(0.704 0.191 22.216)",
                    "border": "oklch(1 0 0 / 10%)",
                    "input": "oklch(1 0 0 / 15%)",
                    "ring": "oklch(0.556 0 0)",
                    "chart1": "oklch(0.81 0.117 11.638)",
                    "chart2": "oklch(0.645 0.246 16.439)",
                    "chart3": "oklch(0.586 0.253 17.585)",
                    "chart4": "oklch(0.514 0.222 16.935)",
                    "chart5": "oklch(0.455 0.188 13.697)",
                    "sidebar": "oklch(0.21 0.006 285.885)",
                    "sidebarForeground": "oklch(0.985 0 0)",
                    "sidebarPrimary": "oklch(0.645 0.246 16.439)",
                    "sidebarPrimaryForeground": "oklch(0.969 0.015 12.422)",
                    "sidebarAccent": "oklch(0.269 0 0)",
                    "sidebarAccentForeground": "oklch(0.985 0 0)",
                    "sidebarBorder": "oklch(1 0 0 / 10%)",
                    "sidebarRing": "oklch(0.556 0 0)"
                }
            },
            "fonts": {
                "family": "Cormorant Garamond",
                "mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
                "sizes": {
                    "h1": "2.5rem",
                    "h2": "2rem",
                    "h3": "1.5rem",
                    "body": "1rem",
                    "small": "0.875rem"
                }
            },
            "radius": "0.625rem",
            "globalCss": ""
        },
        "hero": {
            "slides": [
                {
                    "image": "/demo/perfume-oil/banner/hero-1.webp",
                    "headline": "Discover Your Signature Scent",
                    "subtext": "Explore our curated collection of artisanal perfume oils - from deep, smoky ouds to luminous florals. Find the fragrance that speaks to you.",
                    "ctaText": "Explore Collection",
                    "ctaLink": "/products",
                    "order": 0
                },
                {
                    "image": "/demo/perfume-oil/banner/hero-2.webp",
                    "headline": "The Art of Oud",
                    "subtext": "Journey through our collection of rare and precious oud oils - aged, layered, and utterly unforgettable.",
                    "ctaText": "Shop Oud Collection",
                    "ctaLink": "/products?category=oud",
                    "order": 1
                },
                {
                    "image": "/demo/perfume-oil/banner/hero-3.webp",
                    "headline": "Bloom in Every Drop",
                    "subtext": "From Damask rose to jasmine sambac - our floral attars capture nature's most exquisite moments in every bottle.",
                    "ctaText": "Shop Florals",
                    "ctaLink": "/products?category=floral",
                    "order": 2
                }
            ]
        },
        "testimonials": {
            "heading": "What Our Customers Say",
            "items": [
                {
                    "name": "Ayesha Rahman",
                    "role": "Fragrance Collector",
                    "quote": "The Midnight Oud is absolutely intoxicating. I've never worn anything like it - one drop lasts all day and I get stopped by strangers asking what I'm wearing.",
                    "rating": 5,
                    "avatar": "/demo/perfume-oil/testimonials/tm-3.jpg",
                    "order": 0
                },
                {
                    "name": "Omar Hassan",
                    "role": "Perfumery Enthusiast",
                    "quote": "I've been collecting ouds for over a decade and the quality here rivals houses that charge five times the price. The Oud & Rose Sublime is a work of art.",
                    "rating": 5,
                    "avatar": "/demo/perfume-oil/testimonials/tm-1.jpg",
                    "order": 1
                },
                {
                    "name": "Priya Kapoor",
                    "role": "Lifestyle Blogger",
                    "quote": "The Damask Rose Attar is the most beautiful rose fragrance I've ever worn. It's real rose - not synthetic - and it blooms differently on my skin every hour.",
                    "rating": 5,
                    "avatar": "/demo/perfume-oil/testimonials/tm-2.jpeg",
                    "order": 2
                },
                {
                    "name": "Daniel Choi",
                    "role": "Creative Director",
                    "quote": "White Tea & Musk is my daily signature now. Clean, subtle, but somehow everyone notices. It's the kind of scent that makes people lean in closer.",
                    "rating": 5,
                    "avatar": "/demo/perfume-oil/testimonials/tm-4.jpeg",
                    "order": 3
                }
            ]
        },
        "navbar": {
            "links": [
                { "label": "Home", "url": "/", "order": 0, "children": [] },
                { "label": "Products", "url": "/products", "order": 1, "children": [] },
                { "label": "About", "url": "/about", "order": 2, "children": [] },
                { "label": "Contact", "url": "/contact", "order": 3, "children": [] }
            ],
            "groups": {
                "auth": [
                    { "label": "Login", "url": "/login", "order": 0, "children": [] }
                ],
                "customer": [
                    { "label": "Dashboard", "url": "/dashboard/customer", "order": 0, "children": [] },
                    { "label": "Logout", "url": "/logout", "order": 1, "children": [] }
                ],
                "admin": [
                    { "label": "Dashboard", "url": "/dashboard/admin", "order": 0, "children": [] },
                    { "label": "Logout", "url": "/logout", "order": 1, "children": [] }
                ]
            }
        },
        "footer": {
            "description": "Artisanal perfume oils crafted for those who seek the extraordinary. Pure ingredients, timeless scents, and a story in every drop.",
            "columns": [
                {
                    "title": "Quick Links",
                    "links": [
                        { "label": "Products", "url": "/products" },
                        { "label": "About", "url": "/about" },
                        { "label": "Contact", "url": "/contact" },
                        { "label": "Dashboard", "url": "/dashboard" }
                    ]
                },
                {
                    "title": "Contact",
                    "links": [
                        { "label": "123 Perfume Avenue, New York, NY 10001", "url": "/contact" },
                        { "label": "+1 (555) 123-4567", "url": "/contact" },
                        { "label": "hello@attor.com", "url": "/contact" }
                    ]
                }
            ],
            "socialLinks": [
                { "platform": "twitter", "url": "https://twitter.com/attor" },
                { "platform": "instagram", "url": "https://instagram.com/attor" },
                { "platform": "facebook", "url": "https://facebook.com/attor" }
            ],
            "copyrightText": "© 2026 Attor. All rights reserved.",
            "newsletter": {
                "enabled": true,
                "heading": "Stay in the loop"
            }
        },
        "contact": {
            "address": "123 Perfume Avenue, New York, NY 10001",
            "phone": "+1 (555) 123-4567",
            "email": "hello@attor.com",
            "hours": "Mon–Sat 9am–6pm",
            "mapEmbedUrl": "",
            "social": {
                "twitter": "https://twitter.com/attor",
                "instagram": "https://instagram.com/attor",
                "facebook": "https://facebook.com/attor"
            }
        },
        "about": {
            "story": "Attor began with a passion for the ancient art of perfumery. Rooted in tradition yet crafted for the modern connoisseur, each of our perfume oils is a journey - from the misty forests of Assam to the sun-drenched gardens of Grasse. We work directly with distillers and growers to bring you the purest expressions of nature's most precious botanicals.",
            "mission": "We believe fragrance is the most intimate form of expression. Our mission is to make artisanal perfume oils accessible - offering uncompromising quality, ethical sourcing, and a sensory experience that transcends the ordinary.",
            "image": "/demo/perfume-oil/about.jpeg",
            "stats": [
                { "label": "Founded", "value": "2018" },
                { "label": "Oud Variants", "value": "30+" }
            ]
        },
        "limitedOffer": {
            "enabled": true,
            "badge": "Limited Time",
            "title": "Midnight Oud",
            "subtitle": "Aged 12 months in teak barrels. Rare Assamese and Cambodian oud - now available at an exclusive introductory price.",
            "ctaText": "Shop Now",
            "ctaLink": "/products/midnight-oud",
            "image": "/demo/perfume-oil/products/product-1.webp",
            "endsAt": "2026-08-31T23:59:59.000Z"
        },
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
    }
}
```
If not seeded yet, returns 404 with `"Settings not seeded. Run the settings seed script."`

### PATCH /api/v1/settings (Update Brand — Admin)
Updates only the fields you provide. **logo/favicon are only changed when a file is uploaded — otherwise they keep their current value.**

**Request (multipart/form-data):**
```
PATCH /api/v1/settings
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
  data: { "brand": { "name": "Attor", "tagline": "Define Your Style", "description": "Premium clothing for the modern individual.", "niche": "clothing", "nicheLabel": "Clothing" } }
  logo: [optional file upload]
  favicon: [optional file upload]
```

**Request (application/json — text fields only):**
```
PATCH /api/v1/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "brand": {
        "name": "Attor",
        "tagline": "Define Your Style",
        "niche": "clothing",
        "currency": "usd",
        "deliveryOptions": [
            { "name": "Store Pickup", "charge": 0, "country": "", "isActive": true },
            { "name": "Inside Dhaka", "charge": 90, "country": "BD", "isActive": true },
            { "name": "Outside Dhaka", "charge": 150, "country": "BD", "isActive": true },
            { "name": "International", "charge": 15, "country": "", "isActive": true }
        ]
    }
}
```
Note: `currency` (single code string, e.g. `"usd"`, `"bdt"` — must be one of `usd`/`bdt`/`eur`/`gbp`/`inr`/`aed`/`aud`/`cad`, invalid codes are rejected with 400) and `deliveryOptions` are optional — send them only when changing them. `currency` is the store's active currency that new products inherit.

**Response:**
```json
{
    "success": true,
    "message": "Settings updated successfully",
    "data": { "...": "whole updated settings document" }
}
```
Note: Sending an empty body → 400 `"No brand fields provided to update!"`.

### PATCH /api/v1/settings/:section (Update Section — Admin)

**Every section uses the exact same request format.** The route is `multerUpload.array("images", 20)` + `parseBody`, so **all** section updates are sent as `multipart/form-data` with exactly two fields:

| Form field | Type | Description |
|---|---|---|
| `data` | JSON string | The section body (JSON) — **always required**, even for sections with no images |
| `images` | files (optional, max 20) | Uploaded files, mapped into the section by position (only for hero/testimonials/about/limitedOffer) |

```
PATCH /api/v1/settings/:section
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

data:   <JSON string of the section body>
images: <optional file1, file2, ...>
```

> **Important:** because `parseBody` reads `req.body.data`, sending a plain `application/json` body (without the `data` key) fails with `400 "Please provide data in the body under data key"`. Always wrap the JSON in a `data` form field, and send images (if any) in the `images` form field.

**How images map into the section body:**

| Section | `images` mapping |
|---|---|
| `hero` | `images[i]` → `slides[i].image` (by index) |
| `testimonials` | `images[i]` → `items[i].avatar` (by index) |
| `about` | `images[0]` → `image` |
| `limitedOffer` | `images[0]` → `image` |
| `theme`, `navbar`, `footer`, `contact` | no images — send only the `data` field |

All section writes return the whole updated settings document. Below is the **complete real `data` value for each section** (what goes inside the `data` form field).

**`PATCH /api/v1/settings/theme`** — form field `data`:
```json
{
    "colors": {
        "background": "oklch(1 0 0)",
        "foreground": "oklch(0.145 0 0)",
        "card": "oklch(1 0 0)",
        "cardForeground": "oklch(0.145 0 0)",
        "popover": "oklch(1 0 0)",
        "popoverForeground": "oklch(0.145 0 0)",
        "primary": "oklch(0.514 0.222 16.935)",
        "primaryForeground": "oklch(0.969 0.015 12.422)",
        "secondary": "oklch(0.967 0.001 286.375)",
        "secondaryForeground": "oklch(0.21 0.006 285.885)",
        "muted": "oklch(0.97 0 0)",
        "mutedForeground": "oklch(0.556 0 0)",
        "accent": "oklch(0.97 0 0)",
        "accentForeground": "oklch(0.205 0 0)",
        "destructive": "oklch(0.577 0.245 27.325)",
        "border": "oklch(0.922 0 0)",
        "input": "oklch(0.922 0 0)",
        "ring": "oklch(0.708 0 0)",
        "chart1": "oklch(0.81 0.117 11.638)",
        "chart2": "oklch(0.645 0.246 16.439)",
        "chart3": "oklch(0.586 0.253 17.585)",
        "chart4": "oklch(0.514 0.222 16.935)",
        "chart5": "oklch(0.455 0.188 13.697)",
        "sidebar": "oklch(0.985 0 0)",
        "sidebarForeground": "oklch(0.145 0 0)",
        "sidebarPrimary": "oklch(0.586 0.253 17.585)",
        "sidebarPrimaryForeground": "oklch(0.969 0.015 12.422)",
        "sidebarAccent": "oklch(0.97 0 0)",
        "sidebarAccentForeground": "oklch(0.205 0 0)",
        "sidebarBorder": "oklch(0.922 0 0)",
        "sidebarRing": "oklch(0.708 0 0)"
    },
    "dark": {
        "enabled": true,
        "colors": {
            "background": "oklch(0.145 0 0)",
            "foreground": "oklch(0.985 0 0)",
            "card": "oklch(0.205 0 0)",
            "cardForeground": "oklch(0.985 0 0)",
            "popover": "oklch(0.205 0 0)",
            "popoverForeground": "oklch(0.985 0 0)",
            "primary": "oklch(0.455 0.188 13.697)",
            "primaryForeground": "oklch(0.969 0.015 12.422)",
            "secondary": "oklch(0.274 0.006 286.033)",
            "secondaryForeground": "oklch(0.985 0 0)",
            "muted": "oklch(0.269 0 0)",
            "mutedForeground": "oklch(0.708 0 0)",
            "accent": "oklch(0.269 0 0)",
            "accentForeground": "oklch(0.985 0 0)",
            "destructive": "oklch(0.704 0.191 22.216)",
            "border": "oklch(1 0 0 / 10%)",
            "input": "oklch(1 0 0 / 15%)",
            "ring": "oklch(0.556 0 0)",
            "chart1": "oklch(0.81 0.117 11.638)",
            "chart2": "oklch(0.645 0.246 16.439)",
            "chart3": "oklch(0.586 0.253 17.585)",
            "chart4": "oklch(0.514 0.222 16.935)",
            "chart5": "oklch(0.455 0.188 13.697)",
            "sidebar": "oklch(0.21 0.006 285.885)",
            "sidebarForeground": "oklch(0.985 0 0)",
            "sidebarPrimary": "oklch(0.645 0.246 16.439)",
            "sidebarPrimaryForeground": "oklch(0.969 0.015 12.422)",
            "sidebarAccent": "oklch(0.269 0 0)",
            "sidebarAccentForeground": "oklch(0.985 0 0)",
            "sidebarBorder": "oklch(1 0 0 / 10%)",
            "sidebarRing": "oklch(0.556 0 0)"
        }
    },
    "fonts": {
        "family": "Cormorant Garamond",
        "mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
        "sizes": {
            "h1": "2.5rem",
            "h2": "2rem",
            "h3": "1.5rem",
            "body": "1rem",
            "small": "0.875rem"
        }
    },
    "radius": "0.625rem",
    "globalCss": ""
}
```
> **Partial update:** you only send the fields you want to change inside `data` (e.g. `{ "colors": { "primary": "oklch(0.2 0.1 300)" } }`). Unprovided theme fields keep their current values.

**`PATCH /api/v1/settings/hero`** — form field `data` (+ `images` files → `slides[i].image`):
```json
{
    "slides": [
        {
            "image": "/demo/perfume-oil/banner/hero-1.webp",
            "headline": "Discover Your Signature Scent",
            "subtext": "Explore our curated collection of artisanal perfume oils - from deep, smoky ouds to luminous florals. Find the fragrance that speaks to you.",
            "ctaText": "Explore Collection",
            "ctaLink": "/products",
            "order": 0
        },
        {
            "image": "/demo/perfume-oil/banner/hero-2.webp",
            "headline": "The Art of Oud",
            "subtext": "Journey through our collection of rare and precious oud oils - aged, layered, and utterly unforgettable.",
            "ctaText": "Shop Oud Collection",
            "ctaLink": "/products?category=oud",
            "order": 1
        },
        {
            "image": "/demo/perfume-oil/banner/hero-3.webp",
            "headline": "Bloom in Every Drop",
            "subtext": "From Damask rose to jasmine sambac - our floral attars capture nature's most exquisite moments in every bottle.",
            "ctaText": "Shop Florals",
            "ctaLink": "/products?category=floral",
            "order": 2
        }
    ]
}
```
In Postman: `body` → `form-data` → add `data` (set the JSON above as the value) and add `images` (type file, one per slide; `images[0]` → `slides[0].image`, `images[1]` → `slides[1].image`, ...).

**`PATCH /api/v1/settings/testimonials`** — form field `data` (+ `images` files → `items[i].avatar`):
```json
{
    "heading": "What Our Customers Say",
    "items": [
        {
            "name": "Ayesha Rahman",
            "role": "Fragrance Collector",
            "quote": "The Midnight Oud is absolutely intoxicating. I've never worn anything like it - one drop lasts all day and I get stopped by strangers asking what I'm wearing.",
            "rating": 5,
            "avatar": "/demo/perfume-oil/testimonials/tm-3.jpg",
            "order": 0
        },
        {
            "name": "Omar Hassan",
            "role": "Perfumery Enthusiast",
            "quote": "I've been collecting ouds for over a decade and the quality here rivals houses that charge five times the price. The Oud & Rose Sublime is a work of art.",
            "rating": 5,
            "avatar": "/demo/perfume-oil/testimonials/tm-1.jpg",
            "order": 1
        },
        {
            "name": "Priya Kapoor",
            "role": "Lifestyle Blogger",
            "quote": "The Damask Rose Attar is the most beautiful rose fragrance I've ever worn. It's real rose - not synthetic - and it blooms differently on my skin every hour.",
            "rating": 5,
            "avatar": "/demo/perfume-oil/testimonials/tm-2.jpeg",
            "order": 2
        },
        {
            "name": "Daniel Choi",
            "role": "Creative Director",
            "quote": "White Tea & Musk is my daily signature now. Clean, subtle, but somehow everyone notices. It's the kind of scent that makes people lean in closer.",
            "rating": 5,
            "avatar": "/demo/perfume-oil/testimonials/tm-4.jpeg",
            "order": 3
        }
    ]
}
```
In Postman: `data` + `images` (one file per item; `images[i]` → `items[i].avatar`).

**`PATCH /api/v1/settings/navbar`** — form field `data` (no images):
```json
{
    "links": [
        { "label": "Home", "url": "/", "order": 0, "children": [] },
        { "label": "Products", "url": "/products", "order": 1, "children": [] },
        { "label": "About", "url": "/about", "order": 2, "children": [] },
        { "label": "Contact", "url": "/contact", "order": 3, "children": [] }
    ],
    "groups": {
        "auth": [
            { "label": "Login", "url": "/login", "order": 0, "children": [] }
        ],
        "customer": [
            { "label": "Dashboard", "url": "/dashboard/customer", "order": 0, "children": [] },
            { "label": "Logout", "url": "/logout", "order": 1, "children": [] }
        ],
        "admin": [
            { "label": "Dashboard", "url": "/dashboard/admin", "order": 0, "children": [] },
            { "label": "Logout", "url": "/logout", "order": 1, "children": [] }
        ]
    }
}
```

**`PATCH /api/v1/settings/footer`** — form field `data` (no images):
```json
{
    "description": "Artisanal perfume oils crafted for those who seek the extraordinary. Pure ingredients, timeless scents, and a story in every drop.",
    "columns": [
        {
            "title": "Quick Links",
            "links": [
                { "label": "Products", "url": "/products" },
                { "label": "About", "url": "/about" },
                { "label": "Contact", "url": "/contact" },
                { "label": "Dashboard", "url": "/dashboard" }
            ]
        },
        {
            "title": "Contact",
            "links": [
                { "label": "123 Perfume Avenue, New York, NY 10001", "url": "/contact" },
                { "label": "+1 (555) 123-4567", "url": "/contact" },
                { "label": "hello@attor.com", "url": "/contact" }
            ]
        }
    ],
    "socialLinks": [
        { "platform": "twitter", "url": "https://twitter.com/attor" },
        { "platform": "instagram", "url": "https://instagram.com/attor" },
        { "platform": "facebook", "url": "https://facebook.com/attor" }
    ],
    "copyrightText": "© 2026 Attor. All rights reserved.",
    "newsletter": {
        "enabled": true,
        "heading": "Stay in the loop"
    }
}
```

**`PATCH /api/v1/settings/contact`** — form field `data` (no images):
```json
{
    "address": "123 Perfume Avenue, New York, NY 10001",
    "phone": "+1 (555) 123-4567",
    "email": "hello@attor.com",
    "hours": "Mon–Sat 9am–6pm",
    "mapEmbedUrl": "",
    "social": {
        "twitter": "https://twitter.com/attor",
        "instagram": "https://instagram.com/attor",
        "facebook": "https://facebook.com/attor"
    }
}
```

**`PATCH /api/v1/settings/about`** — form field `data` (+ `images[0]` file → `image`):
```json
{
    "story": "Attor began with a passion for the ancient art of perfumery. Rooted in tradition yet crafted for the modern connoisseur, each of our perfume oils is a journey - from the misty forests of Assam to the sun-drenched gardens of Grasse. We work directly with distillers and growers to bring you the purest expressions of nature's most precious botanicals.",
    "mission": "We believe fragrance is the most intimate form of expression. Our mission is to make artisanal perfume oils accessible - offering uncompromising quality, ethical sourcing, and a sensory experience that transcends the ordinary.",
    "image": "/demo/perfume-oil/about.jpeg",
    "stats": [
        { "label": "Founded", "value": "2018" },
        { "label": "Oud Variants", "value": "30+" }
    ]
}
```
In Postman: `data` + `images` (single file → `image`).

**`PATCH /api/v1/settings/limitedOffer`** — form field `data` (+ `images[0]` file → `image`):
```json
{
    "enabled": true,
    "badge": "Limited Time",
    "title": "Midnight Oud",
    "subtitle": "Aged 12 months in teak barrels. Rare Assamese and Cambodian oud - now available at an exclusive introductory price.",
    "ctaText": "Shop Now",
    "ctaLink": "/products/midnight-oud",
    "image": "/demo/perfume-oil/products/product-1.webp",
    "endsAt": "2026-08-31T23:59:59.000Z"
}
```
In Postman: `data` + `images` (single file → `image`).

### PATCH /api/v1/settings/preset/:niche (Apply Niche THEME — Admin)
**Request:**
```
PATCH /api/v1/settings/preset/clothing
Authorization: Bearer <admin_token>
```
Applies **only the niche's theme** (colors, fonts, radius, globalCss) in one write. The rest of the settings document — brand, hero, navbar, footer, testimonials, about, contact, limitedOffer — is **left untouched**. This lets an admin switch the store's look without clobbering customized content.

Each niche ships its own unique theme (`settings.themes.ts`) — distinct color palettes (light + dark), font pairing, and radius:

| Niche | Theme personality | Font | Radius |
|---|---|---|---|
| `shoes` | Street/athletic — bold red on charcoal | Oswald | `0.375rem` |
| `watches` | Luxury — deep navy + champagne gold | Playfair Display | `0.5rem` |
| `eyewear` | Precision blue/violet | Space Grotesk | `0.75rem` |
| `clothing` | Warm earthy fashion | Playfair Display | `0.5rem` |
| `electronics` | Futuristic cyan/violet on near-black | Orbitron | `0.25rem` |
| `pet_animal` | Friendly warm amber + teal | Nunito | `1rem` |
| `furniture` | Minimalist natural oak + cream | Merriweather | `0.25rem` |
| `cosmetics` | Elegant rose + blush | Cormorant Garamond | `0.625rem` |
| `sports` | Energetic green/lime | Barlow Condensed | `0.375rem` |
| `jewelry` | Opulent black + champagne | Cinzel | `0.125rem` |
| `perfume_oil` | Classic amber/rose fragrance | Cormorant Garamond | `0.625rem` |

Valid niches: `shoes`, `watches`, `eyewear`, `clothing`, `electronics`, `pet_animal`, `furniture`, `cosmetics`, `sports`, `jewelry`, `perfume_oil`. Unknown → 400.

### PATCH /api/v1/settings/reset/:niche (Full Settings Reset — Admin)
**Request:**
```
PATCH /api/v1/settings/reset/electronics
Authorization: Bearer <admin_token>
```
Applies the **entire** niche preset in one write: **theme + brand + hero + about + contact + footer + navbar + testimonials + limitedOffer**. Use this to recover from accidental content loss (e.g. deleted nav links) or to fully re-theme the storefront.

- **Navbar** is standardized: main `links` = Home / Products / About / Contact (public links — no redundant `public` group); role `groups` are `auth` (Login), `customer` (Dashboard, Logout) and `admin` (Dashboard, Logout).
- **Footer** is standardized: **Quick Links** (Home, Products, About, Contact) + **Shop** column + **Contact** column + social links + newsletter.
- **Brand currency + delivery options are PRESERVED** if already set (the admin may have customized them); if unset they fall back to the preset defaults (`usd` + the standard delivery list).
- Old section images (hero slides, testimonial avatars, about/limitedOffer images) replaced by the reset are **destroyed from Cloudinary** (best-effort, after the DB write).
- Unknown niche → 400.

### PATCH /api/v1/settings/reset/empty (Clear Everything — Admin)
**Request:**
```
PATCH /api/v1/settings/reset/empty
Authorization: Bearer <admin_token>
```
Special `empty` niche: clears **all** sections to empty defaults — theme, hero, testimonials, navbar, footer, contact, about, limitedOffer — so the admin can fill everything back in one by one. Keeps:
- **`brand.currency`** (as-is, not reset to `usd`).
- **`brand.deliveryOptions`** (as-is).
- A minimal brand identity (`name`, `niche`, `nicheLabel`) so the store stays usable while being rebuilt.
- Existing section images are **destroyed from Cloudinary** (best-effort) since the sections are cleared.
- Unknown niche → 400.

## Seeding
Run once after DB provisioning (or in CI/CD before first deploy):
```bash
npm run seed:settings
```
This creates the singleton document prefilled from the `DEFAULT_NICHE` preset (`clothing`) if it does not exist; if it already exists it skips.

## Notes
- `GET /settings` is **public**; all writes (`PATCH /`, `PATCH /:section`, `PATCH /preset/:niche`, `PATCH /reset/:niche`) require the `admin` role via the `auth` middleware.
- The in-memory cache is invalidated on every write. For multi-instance deployments, swap `settings.cache.ts` for Redis (or add a TTL).
- Sections are typed sub-schemas (`{ _id: false }`) — no generic `content` blob. Adding a new config area means adding a new typed sub-schema + a `SETTINGS_SECTIONS` entry + a zod schema.
- **Logo syncing**: the logo lives once under `brand`. Navbar/footer intentionally have no logo field — the frontend reads `brand.logo`.
- **Brand partial update**: only provided fields are written (dotted-path `$set`). Uploading `logo`/`favicon` replaces those values; not uploading them preserves the existing ones.
- The full static default (matching the seeded `clothing` preset) is in `docs/settings.json` — the frontend can use it as offline/static fallback data.
