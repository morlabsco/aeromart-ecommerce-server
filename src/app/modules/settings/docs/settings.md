# Settings — Frontend Data Contract & Static Fallback

> **Purpose of this doc** — Extracted from the Settings module so the frontend team can:
> 1. Build static data that mirrors the backend shape exactly.
> 2. Set sensible **default values per section** before live data arrives.
> 3. Render from static data when the backend fails (offline / API down).
> 4. Fall back to live `GET /api/v1/settings` data when the backend recovers.

This document is the **source of truth for the settings document format**. The backend model (`settings.interface.ts`), validation (`settings.validation.ts`), and presets (`settings.presets.ts`) implement exactly this shape.

---

## 1. Document Shape (Top Level)

The backend stores the entire site configuration as **one singleton document** (fixed `_id: "singleton"`). The API returns this whole document; each section is a typed sub-document.

```json
{
    "_id": "singleton",
    "brand": { "...": "see §2" },
    "theme": { "...": "see §3" },
    "hero": { "...": "see §4" },
    "testimonials": { "...": "see §5" },
    "navbar": { "...": "see §6" },
    "footer": { "...": "see §7" },
    "contact": { "...": "see §8" },
    "about": { "...": "see §9" },
    "limitedOffer": { "...": "see §10" },
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

> **Note**: `createdAt` / `updatedAt` are Mongoose timestamps. The frontend static default can omit them (or set them to a fixed date); the render code should treat them as informational only.

---

## 2. `brand`

Storefront brand identity + niche. **The logo lives here only** — navbar/footer have no logo field; the frontend reads `brand.logo`.

| Field | Type | Default (perfume_oil) | Notes |
|---|---|---|---|
| `name` | string | `"Attor"` | Brand name |
| `tagline` | string | `"Essence of Distinction"` | Short tagline |
| `description` | string | `"Premium perfume oils crafted for the discerning."` | Longer description |
| `niche` | string | `"perfume_oil"` | Preset key: `clothing` \| `perfume_oil` \| `eyewear` |
| `nicheLabel` | string | `"Perfume Oil"` | Human label for `niche` |
| `logo` | string (URL) | `"/demo/perfume-oil/logo.png"` | Uploaded via admin |
| `favicon` | string (URL) | `""` | Uploaded via admin |

```json
{
    "name": "Attor",
    "tagline": "Essence of Distinction",
    "description": "Premium perfume oils crafted for the discerning.",
    "niche": "perfume_oil",
    "nicheLabel": "Perfume Oil",
    "logo": "/demo/perfume-oil/logo.png",
    "favicon": ""
}
```

---

## 3. `theme`

Design tokens the frontend applies to the whole app (colors → CSS variables, fonts, radius, raw CSS override).

### 3.1 `colors` — 17 CSS variables (oklch, matching the old `globals.css`)

| Field | Default (light) |
|---|---|
| `primary` | `oklch(0.514 0.222 16.935)` |
| `primaryForeground` | `oklch(0.969 0.015 12.422)` |
| `secondary` | `oklch(0.967 0.001 286.375)` |
| `secondaryForeground` | `oklch(0.145 0 0)` |
| `background` | `oklch(1 0 0)` |
| `foreground` | `oklch(0.145 0 0)` |
| `accent` | `oklch(0.967 0.001 286.375)` |
| `accentForeground` | `oklch(0.145 0 0)` |
| `muted` | `oklch(0.967 0.001 286.375)` |
| `mutedForeground` | `oklch(0.552 0.016 285.938)` |
| `border` | `oklch(0.922 0 0)` |
| `destructive` | `oklch(0.577 0.245 27.325)` |
| `ring` | `oklch(0.708 0 0)` |
| `card` | `oklch(1 0 0)` |
| `cardForeground` | `oklch(0.145 0 0)` |
| `popover` | `oklch(1 0 0)` |
| `popoverForeground` | `oklch(0.145 0 0)` |

### 3.2 `dark` — optional dark-mode override

| Field | Type | Default |
|---|---|---|
| `enabled` | boolean | `false` |
| `colors` | partial `colors` object | `{}` (falls back to light) |

### 3.3 `fonts`, `radius`, `globalCss`

| Field | Type | Default |
|---|---|---|
| `fonts.family` | string | `"Inter"` |
| `fonts.sizes.h1` | string | `"2.5rem"` |
| `fonts.sizes.h2` | string | `"2rem"` |
| `fonts.sizes.h3` | string | `"1.5rem"` |
| `fonts.sizes.body` | string | `"1rem"` |
| `fonts.sizes.small` | string | `"0.875rem"` |
| `radius` | string | `"0.625rem"` |
| `globalCss` | string | `""` (raw CSS override) |

```json
{
    "colors": {
        "primary": "oklch(0.514 0.222 16.935)",
        "primaryForeground": "oklch(0.969 0.015 12.422)",
        "secondary": "oklch(0.967 0.001 286.375)",
        "secondaryForeground": "oklch(0.145 0 0)",
        "background": "oklch(1 0 0)",
        "foreground": "oklch(0.145 0 0)",
        "accent": "oklch(0.967 0.001 286.375)",
        "accentForeground": "oklch(0.145 0 0)",
        "muted": "oklch(0.967 0.001 286.375)",
        "mutedForeground": "oklch(0.552 0.016 285.938)",
        "border": "oklch(0.922 0 0)",
        "destructive": "oklch(0.577 0.245 27.325)",
        "ring": "oklch(0.708 0 0)",
        "card": "oklch(1 0 0)",
        "cardForeground": "oklch(0.145 0 0)",
        "popover": "oklch(1 0 0)",
        "popoverForeground": "oklch(0.145 0 0)"
    },
    "dark": {
        "enabled": false,
        "colors": {}
    },
    "fonts": {
        "family": "Inter",
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

---

## 4. `hero`

Slides shown in the hero banner. `image` is positional-uploaded; `order` sorts the slides ascending.

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

---

## 5. `testimonials`

Customer quotes. `avatar` is positional-uploaded (maps to `items[i].avatar`); `rating` 1–5.

```json
{
    "heading": "What Our Customers Say",
    "items": [
        {
            "name": "Ayesha Rahman",
            "role": "Verified Buyer",
            "quote": "Absolutely in love with the Oud Royale - the scent lasts all day and the packaging is stunning!",
            "rating": 5,
            "avatar": "",
            "order": 0
        },
        {
            "name": "Marcus Chen",
            "role": "Verified Buyer",
            "quote": "The floral attars are pure luxury. You can tell every drop is crafted with care.",
            "rating": 5,
            "avatar": "",
            "order": 1
        }
    ]
}
```

---

## 6. `navbar`

Navigation links with nested children + role-based link groups. The frontend renders `links` for the main menu and picks from `groups` by the user's role.

```json
{
    "links": [
        {
            "label": "Shop",
            "url": "/products",
            "order": 0,
            "children": [
                { "label": "Oud", "url": "/products?category=oud", "order": 0 },
                { "label": "Floral", "url": "/products?category=floral", "order": 1 },
                { "label": "Citrus", "url": "/products?category=citrus", "order": 2 }
            ]
        },
        {
            "label": "About",
            "url": "/about",
            "order": 1,
            "children": []
        },
        {
            "label": "Contact",
            "url": "/contact",
            "order": 2,
            "children": []
        }
    ],
    "groups": {
        "public": [{ "label": "Home", "url": "/", "order": 0, "children": [] }],
        "auth": [{ "label": "Login", "url": "/login", "order": 0, "children": [] }],
        "customer": [{ "label": "My Account", "url": "/account", "order": 0, "children": [] }],
        "admin": [{ "label": "Admin Dashboard", "url": "/admin", "order": 0, "children": [] }]
    }
}
```

> **Default groups**: `public` → shown to everyone; `auth` → logged-out users; `customer` → logged-in customers; `admin` → admins.

---

## 7. `footer`

Footer content: description, link columns, socials, copyright, newsletter prompt. **No logo here** — read `brand.logo`.

```json
{
    "description": "Artisanal perfume oils crafted for those who seek the extraordinary. Pure ingredients, timeless scents, and a story in every drop.",
    "columns": [
        {
            "title": "Shop",
            "links": [
                { "label": "Oud", "url": "/products?category=oud" },
                { "label": "Floral", "url": "/products?category=floral" },
                { "label": "Citrus", "url": "/products?category=citrus" }
            ]
        },
        {
            "title": "Company",
            "links": [
                { "label": "About", "url": "/about" },
                { "label": "Contact", "url": "/contact" }
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
        "heading": "Subscribe for exclusive offers"
    }
}
```

---

## 8. `contact`

Contact info rendered on the Contact page / footer contact strip.

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

---

## 9. `about`

About page story, mission, image, and stat highlights.

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

---

## 10. `limitedOffer`

Promotional banner shown when `enabled` is true. `endsAt` is an ISO date string; the frontend should hide the banner after it passes.

```json
{
    "enabled": false,
    "badge": "Limited Time",
    "title": "Summer Sale",
    "subtitle": "Up to 50% off",
    "ctaText": "Shop Now",
    "ctaLink": "/sale",
    "image": "",
    "endsAt": "2026-08-31T23:59:59.000Z"
}
```

---

## 11. API Contract

Base URL: `/api/v1`

| Route | Method | Auth | Description |
|---|---|---|---|
| `/settings` | GET | Public | Returns the whole singleton document (cached in memory). |
| `/settings` | PATCH | Admin | Update `brand` (multipart: `data` JSON + optional `logo` + `favicon` files). |
| `/settings/:section` | PATCH | Admin | Update one section (`theme` \| `hero` \| `testimonials` \| `navbar` \| `footer` \| `contact` \| `about` \| `limitedOffer`). |
| `/settings/preset/:niche` | PATCH | Admin | Apply a niche preset (`clothing` \| `perfume_oil` \| `eyewear`) — brand + hero + about + contact + footer in one write. |

### GET /api/v1/settings (the one the frontend calls)

```
GET /api/v1/settings
```

**Response 200** — the full document in §2–§10 inside `data`.

```json
{
    "success": true,
    "message": "Settings retrieved successfully",
    "data": {
        "_id": "singleton",
        "brand": { "...": "see §2" },
        "theme": { "...": "see §3" },
        "hero": { "...": "see §4" },
        "testimonials": { "...": "see §5" },
        "navbar": { "...": "see §6" },
        "footer": { "...": "see §7" },
        "contact": { "...": "see §8" },
        "about": { "...": "see §9" },
        "limitedOffer": { "...": "see §10" },
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
    }
}
```

**Error 404 (not seeded yet)** — treat exactly like "backend unavailable": render static defaults.

```json
{
    "success": false,
    "message": "Settings not seeded. Run the settings seed script.",
    "errorSources": []
}
```

### Image upload fields (admin only, not needed by the storefront)

- `PATCH /settings` → `data` JSON + `logo` file + `favicon` file → sets `brand.logo` / `brand.favicon`.
- `PATCH /settings/hero` → `data` (slides) + `images` files → `slides[i].image = files[i].path`.
- `PATCH /settings/testimonials` → `data` (items) + `images` files → `items[i].avatar = files[i].path`.
- `PATCH /settings/about`, `PATCH /settings/limitedOffer` → `data` + `images[0]` → `image`.

All other sections are plain JSON. Responses mirror the GET shape (the whole updated document).

---

## 12. Static Defaults Strategy (backend-down fallback)

### 12.1 What to keep on the frontend

Keep the §2–§10 sections as one **static default object** with the same field names — e.g. `settings.defaults.ts`. Seed it from the **`perfume_oil` preset** (the backend's `DEFAULT_NICHE`) + the theme defaults in §3, so the fallback storefront looks like the seeded storefront.

### 12.2 How to load (recommended flow)

1. **On app boot / storefront mount** → try `GET /api/v1/settings` with a **short timeout** (e.g. 5s).
2. **On success** → cache the live response in memory (and optionally localStorage) and render from it.
3. **On failure** (network error, timeout, HTTP 404/500, malformed body) → **silently fall back** to the static defaults and render those. No error screen.
4. **Merge safety** — when live data is partial or a section is missing, **deep-merge** the live section over the static defaults (`{ ...defaults, ...live }` per section) so the UI never breaks on a missing key. Never trust a section to be complete.
5. **Re-try policy** — on failure, keep a lightweight in-memory "unhealthy" flag with a small interval (e.g. retry every 60s) so the storefront upgrades to live data once the backend recovers — without a full reload. On success, clear the flag.
6. **Banner (optional)** — since the static data looks identical to live data, an optional dismissible "preview / offline data" note can be shown in dev only, so admins know the API is down.

### 12.3 Rules for the static default

- **Never change the shape** — field names and types must match §2–§10 exactly, so the render components take one `Settings` type and both paths feed it.
- **Keep images local** — use the preset's `/demo/...` paths (the same demo assets the backend seeds with) so they work when the API/CDN is unreachable.
- **Niche-specific defaults** — if the client picks a different niche (`clothing`, `eyewear`), swap the static brand/hero/about/contact/footer with that preset's values (see `settings.presets.ts`); theme stays the same.

### 12.4 `endsAt` note for `limitedOffer`

When using static defaults, `endsAt` is a fixed future date — either keep a rolling date (e.g. `new Date(Date.now() + 30d)`) or hardcode one and update it with releases. The renderer must treat an expired `endsAt` as "banner hidden" in both paths.

---

## 13. Section Reference (type table)

| Section | Key fields |
|---|---|
| `brand` | `name`, `tagline`, `description`, `niche`, `nicheLabel`, `logo`, `favicon` |
| `theme` | `colors` (17 vars), `dark.{enabled,colors}`, `fonts.{family,sizes.{h1,h2,h3,body,small}}`, `radius`, `globalCss` |
| `hero` | `slides[]` → `{ image, headline, subtext, ctaText, ctaLink, order }` |
| `testimonials` | `heading`, `items[]` → `{ name, role, quote, rating(1–5), avatar, order }` |
| `navbar` | `links[]` (recursive `children[]`), `groups.{public,auth,customer,admin}` |
| `footer` | `description`, `columns[]` → `{ title, links[] }`, `socialLinks[]` → `{ platform, url }`, `copyrightText`, `newsletter.{enabled,heading}` |
| `contact` | `address`, `phone`, `email`, `hours`, `mapEmbedUrl`, `social.{twitter,instagram,facebook}` |
| `about` | `story`, `mission`, `image`, `stats[]` → `{ label, value }` |
| `limitedOffer` | `enabled`, `badge`, `title`, `subtitle`, `ctaText`, `ctaLink`, `image`, `endsAt` |
