# Demo eCommerce Server — Backend Usage Guide for Frontend

This guide explains how to connect a frontend application to the Demo eCommerce backend and use every API without issues. Follow the conventions here (authentication, request/response formats, query parameters, file uploads, and payment flows) exactly as described.

---

## 1. Table of Contents

- [2. Getting Started](#2-getting-started)
- [3. Authentication & Authorization](#3-authentication--authorization)
- [4. Common Conventions](#4-common-conventions)
- [5. Auth Module](#5-auth-module)
- [6. User Module](#6-user-module)
- [7. Product Module](#7-product-module)
- [8. Order Module](#8-order-module)
- [9. Payment Module](#9-payment-module)
- [10. Meta Module](#10-meta-module)
- [11. Brand Module](#11-brand-module)
- [12. Coupon Module](#12-coupon-module)
- [13. Category Module](#13-category-module)
- [14. Review Module](#14-review-module)
- [15. Settings Module](#15-settings-module)
- [16. Activity Module](#16-activity-module)
- [17. Payment Flow Walkthroughs](#17-payment-flow-walkthroughs)
- [18. Frontend Integration Notes](#18-frontend-integration-notes)

---

## 2. Getting Started

### Base URL

```
/api/v1
```

All routes below are relative to the base URL. Example full URL:

```
http://localhost:3001/api/v1/product
```

### Server Configuration

| Item | Value |
|---|---|
| Base path | `/api/v1` |
| Default dev port | `3001` |
| Root endpoint | `GET /` (returns server info + health check) |
| CORS origin | `http://localhost:3000` (configured in `app.ts`) |

### Root / Health Check Endpoint

```
GET /
```

**Response:**
```json
{
  "success": true,
  "message": "Welcome to the Demo eCommerce Server",
  "version": "1.0.0",
  "clientDetails": {
    "ipAddress": "::1",
    "accessedAt": "2026-07-31T12:00:00.000Z"
  },
  "serverDetails": {
    "hostname": "my-host",
    "platform": "win32",
    "uptime": "2 hours 10 minutes"
  },
  "developerContact": {
    "email": "mahfuzzayn8@gmail.com",
    "website": "https://mahfuzzayn.vercel.app"
  }
}
```

### Content Types

- **Most endpoints**: `Content-Type: application/json`
- **File upload endpoints** (user profile, product, brand logo, category icon): `Content-Type: multipart/form-data`

---

## 3. Authentication & Authorization

The API uses **JWT tokens**. Two token types exist:

| Token | Lifetime | How it is delivered | Where it is used |
|---|---|---|---|
| **Access Token** | `JWT_ACCESS_EXPIRES_IN` (default `7d`) | Returned in response body | Sent as `Authorization: Bearer <accessToken>` on protected routes |
| **Refresh Token** | `JWT_REFRESH_EXPIRES_IN` (default `1y`) | Set as an **httpOnly cookie** named `refreshToken` | Sent automatically by the browser to `/auth/refresh-token` |

### How to authenticate a request

Add the access token to the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Important:** The auth middleware reads `req.headers.authorization` directly — it does **not** accept `Authorization: Bearer` with a missing token, and there is no `x-access-token` alternative. Always send the header exactly as `Bearer <token>`.

### Roles

| Role | Value |
|---|---|
| Admin | `admin` |
| Manager | `manager` |
| Customer | `customer` |

Role restrictions per endpoint are listed in each module below. `manager` is defined in the system but **not** currently used by any route guard; the active guards are `admin` and `customer`.

### Refresh token cookie details

Set by the server on `POST /auth/login` and `POST /user/register`:

| Attribute | Value |
|---|---|
| Name | `refreshToken` |
| httpOnly | `true` |
| secure | `true` in production, `false` in development |
| sameSite | `none` |
| maxAge | 1 year |

Because `sameSite: "none"` + `secure` is used in production, the frontend must be served over **HTTPS** in production for the cookie to be sent.

### Keeping the session alive

1. Call `POST /api/v1/auth/login` (or register). The server sets the `refreshToken` cookie and returns an `accessToken`.
2. When the access token expires (HTTP 401, "Token has expired!"), call `POST /api/v1/auth/refresh-token`. The cookie is sent automatically; the response contains a new `accessToken`.
3. Store the access token in memory (or `localStorage`/`sessionStorage` — your choice) and attach it to every protected request.

---

## 4. Common Conventions

### Success response format

Every successful response uses this shape:

```json
{
  "success": true,
  "message": "Human readable message",
  "meta": { "page": 1, "limit": 10, "total": 25, "totalPage": 3 },
  "data": { }
}
```

- `meta` is **only present on paginated list endpoints** (products, users, orders, brands, coupons, categories, reviews).
- `data` can be an object, an array, or `null` depending on the endpoint.

### Error response format

All errors (validation, auth, not-found, server errors) use this shape:

```json
{
  "success": false,
  "message": "Short human readable error",
  "errorSources": [
    { "path": "price", "message": "Price must be a positive number" }
  ],
  "err": {},
  "stack": null
}
```

- `errorSources` gives field-level details (Zod validation, Mongo validation, duplicate key, cast errors).
- `stack` is only populated in development.

### Common HTTP status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad request (validation, business rule violation) |
| 401 | Unauthorized / invalid or expired token |
| 403 | Forbidden (wrong role, inactive user, bad credentials) |
| 404 | Not found |
| 406 | Not acceptable (e.g., email already registered) |
| 409 | Conflict (duplicate name/slug/code, duplicate review) |
| 500 | Internal server error |

### Query parameters (lists)

All list endpoints support the same QueryBuilder parameters:

| Parameter | Type | Description |
|---|---|---|
| `searchTerm` | string | Case-insensitive regex search over module-specific searchable fields |
| `page` | number | Page number (default `1`) |
| `limit` | number | Items per page (default `10`) |
| `sort` | string | Comma-separated field list, e.g. `price,-createdAt` (default `-createdAt`) |
| `fields` | string | Comma-separated projection, e.g. `name,price` |
| *(module filters)* | varies | Module-specific filter fields, listed per module below |

**Example:**
```
GET /api/v1/product?searchTerm=phone&minPrice=100&maxPrice=1000&page=2&limit=20&sort=-price
```

### Date & ID formats

- **IDs**: MongoDB ObjectId strings (24 hex chars), e.g. `664f1a2b3c4d5e6f7a8b9c0d`.
- **Dates**: ISO 8601 strings, e.g. `2026-07-31T12:00:00.000Z`. When sending dates (coupon start/end), send `YYYY-MM-DD` or full ISO strings.

---

## 5. Auth Module

Parent route: `/api/v1/auth`

### 5.1 POST /api/v1/auth/login — Login

Public. Client info (device, browser, IP) is captured automatically from the request headers by the server — **do not send `clientInfo` in the body**.

**Request:**
```json
{
  "email": "customer@example.com",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User logged in successfully!",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

The server also sets the `refreshToken` httpOnly cookie. The `refreshToken` value in the body is a convenience — you do not need to store it manually, but you can.

**Errors:** 404 "This user is not found!" / 403 "This user is not active!" / 403 "Password does not match"

### 5.2 POST /api/v1/auth/refresh-token — Refresh access token

Public. Reads the `refreshToken` cookie automatically.

**Request:**
```
POST /api/v1/auth/refresh-token
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIs...
```
No body needed.

**Response (200):**
```json
{
  "success": true,
  "message": "User logged in successfully!",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:** 403 "Invalid Refresh Token" / 404 "User does not exist" / 400 "User is not active"

### 5.3 POST /api/v1/auth/change-password — Change password

Protected — `admin`, `customer`.

**Request:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "oldPassword": "123456",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully!",
  "data": null
}
```

### 5.4 POST /api/v1/auth/forgot-password — Request password reset OTP

Public. Sends a **6-digit OTP** to the user's email. OTP is valid for **5 minutes**.

**Request:**
```json
{
  "email": "customer@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Check your email to reset your password",
  "data": null
}
```

### 5.5 POST /api/v1/auth/verify-otp — Verify OTP

Public. Verifies the OTP received by email and returns a **resetToken** for the next step.

**Request:**
```json
{
  "email": "customer@example.com",
  "otp": "483291"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully.",
  "data": {
    "resetToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:** 403 "OTP has expired or is invalid" / 403 "Invalid OTP" / 400 "No OTP token found. Please request a new password reset OTP."

### 5.6 POST /api/v1/auth/reset-password — Reset password

Public. Uses the `resetToken` from step 5.5.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully!",
  "data": {
    "message": "Password changed successfully"
  }
}
```

### Frontend password reset flow

```
1. POST /auth/forgot-password   { email }                    → OTP emailed
2. POST /auth/verify-otp        { email, otp }               → resetToken
3. POST /auth/reset-password    { token: resetToken, newPassword } → done
```

---

## 6. User Module

Parent route: `/api/v1/user`

### 6.1 POST /api/v1/user/register — Register customer

Public. Auto-logs-in: returns an access token and sets the `refreshToken` cookie. Only `customer` role is allowed (`admin` registration is rejected).

**Request:**
```json
{
  "name": "John Doe",
  "email": "customer@example.com",
  "password": "123456",
  "role": "customer"
}
```

> **Note:** `clientInfo` is **auto-captured** by the server from headers — do not send it. `role` is optional (defaults to `customer`).

**Response (200):**
```json
{
  "success": true,
  "message": "User registration completed successfully!",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:** 406 "Invalid role. Only User is allowed." / 406 "Email is already registered"

### 6.2 GET /api/v1/user — Get all users (admin dashboard)

Protected — `admin`.

**Query params:** `searchTerm` (searches `email`, `name`, `role`), `page`, `limit`, `sort`, `fields`, plus filters: `role`, `isActive`.

**Request:**
```
GET /api/v1/user?searchTerm=john&page=1&limit=10
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Users are retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
  "data": [
    {
      "_id": "664f1a2b3c4d5e6f7a8b9c0d",
      "name": "John Doe",
      "email": "customer@example.com",
      "role": "customer",
      "photoUrl": null,
      "clientInfo": {
        "device": "pc",
        "browser": "Chrome",
        "ipAddress": "::1",
        "os": "Windows",
        "userAgent": "Mozilla/5.0..."
      },
      "lastLogin": "2026-07-31T10:00:00.000Z",
      "isActive": true,
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-31T10:00:00.000Z"
    }
  ]
}
```

> **Note:** `password` is never returned (stripped by the model).

### 6.3 GET /api/v1/user/me — My profile

Protected — `admin`, `customer`.

**Request:**
```
GET /api/v1/user/me
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "name": "John Doe",
    "email": "customer@example.com",
    "role": "customer",
    "photoUrl": null,
    "clientInfo": { "device": "pc", "browser": "Chrome", "ipAddress": "::1", "os": "Windows" },
    "lastLogin": "2026-07-31T10:00:00.000Z",
    "isActive": true,
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-31T10:00:00.000Z"
  }
}
```

### 6.4 PATCH /api/v1/user/update-profile — Update profile

Protected — `admin`, `manager`, `customer`. **Multipart form-data** — the JSON payload goes inside a `data` field and the photo is a `profilePhoto` file.

**Request:**
```
PATCH /api/v1/user/update-profile
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"name":"John Updated","phoneNo":"01712345678","gender":"Male","dateOfBirth":"1990-01-01","address":"123 Main Street, Dhaka","photoUrl":""}
  profilePhoto: <image file>
```
To **remove** the current photo, send `photoUrl: ""` — the backend sets it to `null`. A `profilePhoto` upload overrides it.

Allowed `data` fields (all optional, unknown keys are rejected — `zod .strict()`):

| Field | Type | Rules |
|---|---|---|
| `phoneNo` | string | exactly 11 digits |
| `gender` | string | `Male`, `Female`, or `Other` |
| `dateOfBirth` | string | valid date |
| `address` | string | any text |
| `photo` | string | must be a valid `http(s)://...png|jpg|jpeg` URL |

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "name": "John Doe",
    "email": "customer@example.com",
    "role": "customer",
    "photoUrl": "https://res.cloudinary.com/.../profile.jpg",
    "isActive": true,
    "lastLogin": "2026-07-31T10:00:00.000Z",
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-31T10:00:00.000Z"
  }
}
```

### 6.5 PATCH /api/v1/user/:id/status — Toggle user active status

Protected — `admin`. Toggles `isActive`.

**Request:**
```
PATCH /api/v1/user/664f1a2b3c4d5e6f7a8b9c0d/status
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User is now inactive",
  "data": {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "name": "John Doe",
    "isActive": false
  }
}
```

---

## 7. Product Module

Parent route: `/api/v1/product`

Product model fields: `name`, `slug` (auto-generated), `description`, `price`, `currency` (inherited from store brand settings — not sent on create; **accepted on update**), `stock`, `weight`, `category` (ObjectId → Category), `brand` (ObjectId → Brand), `createdBy` (ObjectId → User, attached automatically), `imageUrls[]` (`{ publicId, url, order }`), `isActive`, `isDeleted`, `averageRating`, `ratingCount`, `specification[]` (`{key, value}`), `keyFeatures[]`, `offerPrice` (`{ type: flat|percentage, value, startAt, endAt, isActive }`), `colorOptions[]` (`{ name, hex }` — **the single source of truth for colors**), `attributes[]` (`{ key, values }` — variant axes, **non-color only**, e.g. Size/Material/custom), `variants[]` (`{ sku, attributes, price?, stock, imageUrls, isActive }` — a variant's `attributes` may include `Color` by name, validated against `colorOptions` and **auto-added** to it if missing; `imageUrls` use the same `{ publicId, url, order }` shape with `{}` placeholders filled from `variantImages`), `hasVariants` (auto-set from the presence of `variants`), timestamps.

### 7.1 GET /api/v1/product — Get all products

Public. Returns **non-deleted only** (`isDeleted: false`). Category (`name`, `slug`), brand (`name`, `logo`), and non-flagged reviews (`rating`, `description`, `isFlagged`, `createdAt`) are populated.

**Query params:** `searchTerm` (searches `name`, `description`), `page`, `limit`, `sort`, `fields`, plus filters:
- `category` — category ObjectId
- `brand` — brand ObjectId
- `minPrice`, `maxPrice` — numeric price range
- `isActive` — boolean

**Request:**
```
GET /api/v1/product?searchTerm=phone&minPrice=100&maxPrice=1000&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
  "data": [
    {
      "_id": "664f1a2b3c4d5e6f7a8b9c0d",
      "name": "Smartphone X",
      "slug": "smartphone-x",
      "description": "Latest smartphone with advanced features",
      "price": 799.99,
      "currency": "usd",
      "stock": 50,
      "weight": 0.2,
      "category": { "_id": "665a...", "name": "Electronics", "slug": "electronics" },
      "brand": { "_id": "665b...", "name": "TechBrand", "logo": "https://..." },
      "createdBy": "664f1a2b3c4d5e6f7a8b9c0d",
      "reviews": [
        {
          "_id": "667d1a2b...",
          "rating": 4,
          "description": "Great product! Highly recommended.",
          "isFlagged": false,
          "createdAt": "2026-07-20T10:00:00.000Z"
        }
      ],
      "imageUrls": [
        { "publicId": "aeromart-ecommerce/abc123", "url": "https://res.cloudinary.com/.../image1.jpg", "order": 0 },
        { "publicId": "aeromart-ecommerce/def456", "url": "https://res.cloudinary.com/.../image2.jpg", "order": 1 }
      ],
      "isActive": true,
      "averageRating": 4.5,
      "ratingCount": 12,
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
      "specification": [
        { "key": "RAM", "value": "8GB" },
        { "key": "Storage", "value": "128GB" }
      ],
      "keyFeatures": ["5G Support", "Wireless Charging"],
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
    }
  ]
}
```

### 7.2 GET /api/v1/product/:productId — Get single product

Public.

**Request:**
```
GET /api/v1/product/664f1a2b3c4d5e6f7a8b9c0d
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": { "...": "same structure as list item" }
}
```

**Errors:** 404 "Product not found!" (missing or soft-deleted)

### 7.3 POST /api/v1/product — Create product

Protected — `admin`. **Multipart form-data.** The JSON payload goes in a `data` field; up to **10 main images** upload via the `images` field, and **variant images** via the `variantImages` field (a flat pool consumed in order across each variant's `{}` placeholder slots). The slug is auto-generated from `name` if not provided.

**Request:**
```
POST /api/v1/product
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"name":"Smartphone X","description":"Latest smartphone","price":799.99,"stock":50,"weight":0.2,"category":"<categoryId>","brand":"<brandId>","colorOptions":[{"name":"Black","hex":"#000000"},{"name":"White","hex":"#FFFFFF"}],"attributes":[{"key":"Size","values":["S","M","L"]}],"variants":[{"attributes":{"Color":"Black","Size":"M"},"price":799.99,"stock":20,"imageUrls":[{},{}]},{"attributes":{"Color":"White","Size":"M"},"price":799.99,"stock":15,"imageUrls":[{}]}],"offerPrice":{"type":"flat","value":50,"startAt":"2026-08-01","endAt":"2026-08-31"},"specification":[{"key":"RAM","value":"8GB"}],"keyFeatures":["5G Support"]}
  images: <file1> <file2> <file3> ... (max 10, main photos)
  variantImages: <black-m-1.jpg> <black-m-2.jpg> <white-m-1.jpg> ... (flat, in variant order)
```

- In the example: variant 1 (`Black / M`) declares 2 `{}` placeholders → gets `black-m-1.jpg`, `black-m-2.jpg`; variant 2 (`White / M`) declares 1 → gets `white-m-1.jpg`. Files are consumed **in order of appearance across all variants' placeholders**.
- `Color` is **not** declared in `attributes` — it lives in `colorOptions` (swatches). A variant's `attributes` may reference `Color` by name; any value missing from `colorOptions` is **silently auto-added** (empty `hex`).
- Every other variant `attributes` key **and** value must be declared in the `attributes` axes — otherwise `400` with a clear message.
- `hasVariants` is set to `true` automatically when `variants` has entries.

Required `data` fields: `name`, `description`, `price`, `weight`, `category`, `brand`. Optional: `slug`, `stock` (default 0), `imageUrls`, `isActive` (default true), `specification`, `keyFeatures`, `colorOptions`, `attributes` (variant axes `{ key, values }` — non-color), `variants` (SKUs auto-generated as `{PREFIX}-{COLOR}-{SIZE}-{RANDOM}` when omitted; `imageUrls` entries are `{}` placeholders for new variant images), `hasVariants`, `offerPrice`. **Do NOT send `currency`** — it inherits from the store's brand settings (`brand.currency`). `createdBy` is attached automatically. `offerPrice.endAt` must be after `startAt` (400 otherwise).

**Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": { "...": "product object with populated category/brand and uploaded imageUrls" }
}
```

**Errors:** 409 "A product with this slug already exists!" (slug owned by a different-named product), 404 for invalid category/brand, 400 for invalid data.

### 7.4 PATCH /api/v1/product/:productId — Update product

Protected — `admin`. **Multipart form-data** with `data` + optional `images` and `variantImages` files. Any subset of fields can be sent. `isActive` can be toggled `true`/`false` freely. **`currency` IS accepted here** (unlike create) — an explicit override for this product. `hasVariants` is set automatically from the `variants` array length.

**Image management** — main images are objects `{ publicId, url, order }` (`order: 0` = cover/first). On update:
- `keepImages: [{ publicId, order }]` — existing main images to keep, with new order (reorder by changing `order`).
- `images` (multipart files) — new main uploads, appended after the kept images.
- `removedImageIds: ["<cloudinary publicId>"]` — explicit Cloudinary publicIds to destroy.
- **Implicit removal**: any existing main image NOT in `keepImages` and NOT re-uploaded is considered removed and **destroyed from Cloudinary automatically** (best-effort, after the DB write). Omit all three to leave images untouched.
- **Variant images** — send each variant's `imageUrls` as its image slots:
  - existing images → `{ publicId, order }` — the `url` is backfilled from the stored variant by `publicId`;
  - **new slots → empty placeholder `{}` (or `{ order }`)** — filled from the `variantImages` files in order of appearance (flat, across all variants);
  - a stored variant `publicId` absent from the new `imageUrls` is **destroyed from Cloudinary automatically** (implicit removal);
  - variant image `order`s are re-normalized to a clean `0, 1, 2, …` sequence after the merge.

**Request:**
```
PATCH /api/v1/product/664f1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"name":"Smartphone X Pro","price":899.99,"isActive":true,"currency":"usd","keepImages":[{"publicId":"aeromart-ecommerce/abc123","order":1}],"removedImageIds":["aeromart-ecommerce/def456"],"offerPrice":{"type":"percentage","value":10,"startAt":"2026-08-01","endAt":"2026-08-31"},"variants":[{"sku":"SMAR-BLACK-M-7F3K9Q","attributes":{"Color":"Black","Size":"M"},"stock":15,"imageUrls":[{"publicId":"aeromart-ecommerce/variant-red","order":0},{}]},{"attributes":{"Color":"White","Size":"L"},"price":849.99,"stock":10,"imageUrls":[{}]}]}
  images: <file1> (optional, appended after kept main images)
  variantImages: <black-m-new.jpg> <white-l-new.jpg> (optional, fills the {} placeholders in order)
```

In the example: variant 1 keeps its existing image and declares one new slot (`{}` → `black-m-new.jpg`); variant 2 (new) declares one slot (`{}` → `white-l-new.jpg`). Sending more `variantImages` files than total placeholders → `400` count-mismatch. `Color` in a variant's `attributes` is validated against `colorOptions` (missing colors auto-added); `colorOptions` not resent on update are merged with the stored palette.

**Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": { "...": "updated product" }
}
```

### 7.5 DELETE /api/v1/product/:productId — Delete product

Protected — `admin`. **Soft delete** — sets `isDeleted: true` and `isActive: false` (not toggleable back via delete).

**Request:**
```
DELETE /api/v1/product/664f1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "isActive": false,
    "isDeleted": true,
    "...": "rest of product fields"
  }
}
```

---

## 8. Order Module

Parent route: `/api/v1/order`

Order model fields: `orderId` (auto-generated, unguessable `DEXXXXXXXX`, e.g. `DEY2H7ULPD`), `user` (ObjectId → User, or `null` for guest orders), `products[]` (`{product, quantity, unitPrice, variant?}` — `variant: { sku, attributes }` snapshot when a product variant was chosen), `coupon`, `totalAmount`, `offerDiscount` (savings from active product `offerPrice`s), `discount` (**coupon-only**), `totalDiscount` (`offerDiscount + discount`), `deliveryCharge`, `deliveryOptionName`, `finalAmount`, `currency`, `status`, `shippingAddress`, `recipientName`, `phoneNo`, `notes` (optional), `paymentMethod` (`COD` | `Online`), `paymentStatus` (`Pending` | `Paid` | `Failed`), `paymentProvider` (`stripe`/`sslcommerz`/`bkash`), gateway tracking fields (`stripeSessionId`, `sslSessionKey`, `transactionId`), FX fields (`fxRate`, `fxBaseCurrency`), timestamps.

**All money fields are computed server-side** — the client never sends `totalAmount`, `discount`, `offerDiscount`, `totalDiscount`, `finalAmount`, `unitPrice`, or `deliveryCharge`. `deliveryCharge` is resolved from the chosen `deliveryOptionName` (brand settings). `currency` is inherited from the products (all products in an order must share the same currency, else 400).

**Pricing:** `totalAmount` is the subtotal after offer discounts (unit prices already reflect active `offerPrice`s). `discount` = coupon savings only. `offerDiscount` = the savings from active product offers vs base prices. `totalDiscount = offerDiscount + discount`. `finalAmount = totalAmount - totalDiscount + deliveryCharge`.

**Variants:** when a product `hasVariants: true`, the order line **must** include `variant: { sku }` (400 if missing). Price/stock come from that variant (`variant.price ?? product.price`, with `offerPrice` applied on top); stock decrement/restore targets the variant's stock (`variants.$.stock`) when a variant is chosen.

**Guest checkout:** `POST /order` requires **no auth**. Send a Bearer token to link the order to that user; omit it to order as a guest (`user: null`).

### Order status lifecycle

`Pending` → `Processing` → `Shipped` → `Completed`, or `Cancelled` from any non-final state. Once `Completed` or `Cancelled`, status is **locked**.

### 8.1 GET /api/v1/order — Get all orders

Protected — `admin`. Populates `user` and `products.product`.

**Query params:** `searchTerm` (searches `status`, `paymentMethod`, `paymentStatus`), `page`, `limit`, `sort`, `fields`, plus filters: `status`, `paymentMethod`, `paymentStatus`, `userId`.

**Request:**
```
GET /api/v1/order?status=Pending&page=1&limit=10
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPage": 1 },
  "data": [
    {
      "_id": "666a1a2b3c4d5e6f7a8b9c0d",
      "user": { "_id": "664f...", "name": "John Doe", "email": "customer@example.com" },
      "products": [
        {
          "product": { "_id": "664f1a2b...", "name": "Smartphone X", "price": 799.99 },
          "quantity": 2,
          "unitPrice": 799.99
        }
      ],
      "coupon": null,
      "totalAmount": 1599.98,
      "discount": 0,
      "deliveryCharge": 50,
      "finalAmount": 1649.98,
      "currency": "usd",
      "status": "Pending",
      "shippingAddress": "123 Main Street, Dhaka",
      "paymentMethod": "COD",
      "paymentStatus": "Pending",
      "paymentProvider": null,
      "fxRate": null,
      "fxBaseCurrency": null,
      "createdAt": "2026-07-15T10:00:00.000Z",
      "updatedAt": "2026-07-15T10:00:00.000Z"
    }
  ]
}
```

### 8.2 GET /api/v1/order/my-orders — Get my orders (customer)

Protected — `customer`. Returns only the authenticated customer's orders.

**Request:**
```
GET /api/v1/order/my-orders?status=Pending&page=1&limit=10
Authorization: Bearer <customerAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "My orders retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
  "data": [ { "...": "same structure as list item above" } ]
}
```

### 8.3 GET /api/v1/order/:orderId — Get order details

Protected — `admin`, `customer`. **Ownership is enforced** — an admin or the user who placed the order can view it; anyone else gets `401 You are not authorized!`.

**Request:**
```
GET /api/v1/order/666a1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order details retrieved successfully",
  "data": { "...": "same structure as list item" }
}
```

### 8.4 POST /api/v1/order — Create order (guest checkout)

**No auth required** — optional `Authorization` header. If a valid Bearer token is present the order is linked to that user; without a token it's a **guest order** (`user: null`). Each product is validated (exists, not deleted, active, sufficient stock — product or **variant** stock, same currency); stock is **decremented** on order creation inside a transaction (variant stock when a variant is chosen).

**Request:**
```
POST /api/v1/order
Authorization: Bearer <accessToken>   // OPTIONAL — omit for guest checkout
Content-Type: application/json

{
  "products": [
    { "product": "664f1a2b3c4d5e6f7a8b9c0d", "quantity": 2 },
    { "product": "664f1a2b3c4d5e6f7a8b9c0d", "quantity": 1, "variant": { "sku": "SMAR-BLACK-M-7F3K9Q" } }
  ],
  "coupon": "SAVE20",
  "deliveryOptionName": "Inside Dhaka",
  "shippingAddress": "123 Main Street, Dhaka",
  "recipientName": "John Doe",
  "phoneNo": "+1 (555) 123-4567",
  "notes": "Please call before delivery",
  "paymentMethod": "Online"
}
```

- `products` — required, at least 1 item. Only `product` (id) and `quantity` are needed — `unitPrice` comes from the DB. **When the product `hasVariants: true`, `variant: { sku }` is required** (400 if missing); price/stock come from that variant.
- `coupon` — optional string (verified: exists, active, in date range, meets min order).
- `deliveryOptionName` — **required** string. The customer picks an option from the store's brand settings (`Store Pickup`, `Inside Dhaka`, `Outside Dhaka`, `International`, ...); the backend resolves the `deliveryCharge` from that option. **The amount is never sent by the client.**
- `shippingAddress` — required string.
- `recipientName`, `phoneNo` — **required** strings (delivery recipient).
- `notes` — optional string.
- `paymentMethod` — `"COD"` or `"Online"`.
- **Do not send** `totalAmount`, `discount`, `offerDiscount`, `totalDiscount`, `finalAmount`, `deliveryCharge`, `unitPrice`, `currency`, `user`, `orderId` — all computed/attached server-side.

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "666a1a2b3c4d5e6f7a8b9c0d",
    "orderId": "DEY2H7ULPD",
    "user": { "_id": "664f...", "name": "John Doe", "email": "customer@example.com" },
    "products": [
      { "product": { "_id": "664f1a2b...", "name": "Smartphone X" }, "quantity": 2, "unitPrice": 799.99 },
      { "product": { "_id": "664f1a2b...", "name": "Smartphone X" }, "quantity": 1, "unitPrice": 759.99, "variant": { "sku": "SMAR-BLACK-M-7F3K9Q", "attributes": { "Color": "Black", "Size": "M" } } }
    ],
    "coupon": "SAVE20",
    "totalAmount": 2359.97,
    "offerDiscount": 40.0,
    "discount": 0,
    "totalDiscount": 40.0,
    "deliveryCharge": 50,
    "finalAmount": 2369.97,
    "currency": "usd",
    "status": "Pending",
    "shippingAddress": "123 Main Street, Dhaka",
    "recipientName": "John Doe",
    "phoneNo": "+1 (555) 123-4567",
    "notes": "Please call before delivery",
    "paymentMethod": "Online",
    "paymentStatus": "Pending",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "updatedAt": "2026-07-15T10:00:00.000Z"
  }
}
```

**Errors:** 404 "Product with ID X not found!" / 400 "Product ... is not available!" / 400 "Product ... has variants — please select a variant (send variant.sku)." / 400 "Variant SKU ... not found for product ..." / 400 "Insufficient stock for ... Available: N" / 400 "All products in an order must have the same currency!" / 400 "Coupon has expired!" etc.

### 8.5 GET /api/v1/order/track-order/:orderId — Track order (public)

Public — no auth. Looks up **only by the human-friendly `orderId`** (e.g. `DEY2H7ULPD`) — the Mongo `_id` is not accepted. Returns delivery + payment tracking insights for a "track your order" page.

**Request:**
```
GET /api/v1/order/track-order/DEY2H7ULPD
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order tracking details retrieved successfully",
  "data": {
    "orderId": "DEY2H7ULPD",
    "id": "666a1a2b3c4d5e6f7a8b9c0d",
    "status": "Processing",
    "paymentStatus": "Paid",
    "paymentMethod": "Online",
    "paymentProvider": "stripe",
    "currency": "usd",
    "totalAmount": 1599.98,
    "offerDiscount": 0,
    "discount": 0,
    "totalDiscount": 0,
    "deliveryCharge": 50,
    "finalAmount": 1649.98,
    "recipientName": "John Doe",
    "phoneNo": "+1 (555) 123-4567",
    "shippingAddress": "123 Main Street, Dhaka",
    "notes": "Please call before delivery",
    "placedBy": "John Doe",
    "products": [
      { "productId": "664f1a2b...", "name": "Smartphone X", "image": "https://...", "quantity": 2, "unitPrice": 799.99, "total": 1599.98, "variant": { "sku": "SMAR-BLACK-M-7F3K9Q", "attributes": { "Color": "Black", "Size": "M" } } }
    ],
    "statusHistory": [
      { "status": "Pending", "at": "2026-07-15T10:00:00.000Z" },
      { "status": "Processing", "at": "2026-07-16T10:00:00.000Z" }
    ],
    "createdAt": "2026-07-15T10:00:00.000Z",
    "updatedAt": "2026-07-16T10:00:00.000Z"
  }
}
```

### 8.6 GET /api/v1/order/:orderId/invoice — Get order invoice

Protected — `admin`, `customer` (owner). Returns invoice data as JSON for the frontend to render with react-pdf and a download button. **400 unless the order is `Paid`.**

**Request — by orderId or Mongo `_id` (default):**
```
GET /api/v1/order/DE07D08M0001U/invoice
Authorization: Bearer <accessToken>
```

**Request — by gateway transactionId (opt-in):**
```
GET /api/v1/order/cs_test_abc123.../invoice?by=transactionId
Authorization: Bearer <accessToken>
```
Use `?by=transactionId` on the payment success page to fetch the invoice straight from the `tran_id` returned by the gateway callback. When present, the param is matched **only** against `transactionId` (never `_id`, so it can't resolve to the wrong order). Without it, the lookup is `orderId` OR `_id` — existing callers are unaffected.

**Response (200):**
```json
{
  "success": true,
  "message": "Order invoice retrieved successfully",
  "data": {
    "orderId": "DE07D08M0001U",
    "id": "666a1a2b3c4d5e6f7a8b9c0d",
    "status": "Processing",
    "currency": "usd",
    "issuedAt": "2026-07-16T10:00:00.000Z",
    "customer": { "name": "John Doe", "email": "customer@example.com", "phoneNo": "+1 (555) 123-4567", "address": "123 Main Street, Dhaka" },
    "recipient": { "name": "John Doe", "phoneNo": "+1 (555) 123-4567", "shippingAddress": "123 Main Street, Dhaka", "notes": "" },
    "payment": { "method": "Online", "provider": "stripe", "transactionId": "cs_test_abc123..." },
    "items": [
      { "productId": "664f1a2b...", "name": "Smartphone X", "image": "https://...", "quantity": 2, "unitPrice": 799.99, "total": 1599.98, "variant": { "sku": "SMAR-BLACK-M-7F3K9Q", "attributes": { "Color": "Black", "Size": "M" } } }
    ],
    "totals": { "subtotal": 1599.98, "offerDiscount": 0, "discount": 0, "totalDiscount": 0, "deliveryCharge": 50, "finalAmount": 1649.98 }
  }
}
```

### 8.7 PATCH /api/v1/order/:orderId — Update order

Protected — `admin`, `customer`. **Ownership is enforced** (admin or owner). Re-validates + re-prices the product list (restores old stock, decrements new quantities in a transaction), re-verifies coupon, recomputes `finalAmount` and `currency`. Locked once `Completed`/`Cancelled`.

**Request:**
```
PATCH /api/v1/order/666a1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "products": [
    { "product": "664f1a2b3c4d5e6f7a8b9c0d", "quantity": 3 },
    { "product": "664f1a2b3c4d5e6f7a8b9c0d", "quantity": 1, "variant": { "sku": "SMAR-BLACK-M-7F3K9Q" } }
  ],
  "coupon": "SAVE20",
  "deliveryOptionName": "Outside Dhaka",
  "shippingAddress": "456 New Street, Dhaka"
}
```
Same rules as create: variant products require `variant.sku`; old stock (variant or base) is restored and new stock decremented inside a transaction; `offerDiscount`/`discount`/`totalDiscount`/`finalAmount` are all recomputed server-side.

**Response (200):**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": { "...": "updated order with recomputed totals" }
}
```

**Errors:** 401 (not owner/admin), 400 "Cannot modify a completed/cancelled order!"

### 8.8 PATCH /api/v1/order/:orderId/status — Change order status

Protected — `admin`.

**Request:**
```
PATCH /api/v1/order/666a1a2b3c4d5e6f7a8b9c0d/status
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "status": "Processing"
}
```

`status` must be one of: `Pending`, `Processing`, `Shipped`, `Completed`, `Cancelled`.

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated to Processing",
  "data": { "_id": "666a...", "status": "Processing", "...": "rest of order fields" }
}
```

**Errors:** 400 "Cannot change status of a completed/cancelled order!" (final states are locked)

---

## 9. Payment Module

Parent route: `/api/v1/payment`

Three providers: **Stripe** (international), **SSLCommerz** (Bangladesh), **bKash** (Bangladesh). Each provider has an **initiate** endpoint (returns a gateway URL for the frontend to send the user to) and a **validate** endpoint (confirms the result and updates the order).

**Amounts are always taken from the order's `finalAmount`** — never client-supplied. A paid order (`paymentStatus: "Paid"`) cannot be re-initialized (`400 This order has already been paid!`). Missing order → `404 Order not found!`.

### How the flow works (high level)

```
1. Frontend creates an order           → POST /api/v1/order
2. Frontend calls provider init        → POST /api/v1/payment/:orderId/<provider>/init
   → Server returns gatewayUrl
3. Frontend redirects user to gatewayUrl
4. User pays on the gateway
5. Provider redirects user back to the backend callback route
6. On success, the server marks the order:
   paymentStatus = "Paid", status = "Processing", paymentProvider = <provider>
   then redirects the browser to FRONTEND_URL/payment/success (or /payment/failed)
```

### 9.1 POST /api/v1/payment/:orderId/stripe/init — Initiate Stripe

Protected — `admin`, `customer`. Uses Stripe **Checkout Sessions** (hosted page). **Body is optional** — amount and currency are derived from the order.

**Request:**
```
POST /api/v1/payment/666a1a2b3c4d5e6f7a8b9c0d/stripe/init
Authorization: Bearer <accessToken>
Content-Type: application/json

{}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Stripe payment initiated successfully",
  "data": {
    "success": true,
    "gatewayUrl": "https://checkout.stripe.com/c/pay/...",
    "sessionId": "cs_test_abc123...",
    "message": "Stripe payment initiated successfully"
  }
}
```

**Currency strategy:** if the order's currency is Stripe-supported, it is charged directly. If not (e.g. `bdt`), the `finalAmount` is converted to **USD** via a free FX API and `fxRate` + `fxBaseCurrency` are recorded on the order for reconciliation.

**Frontend action:** redirect the browser to `data.gatewayUrl`.

### 9.2 Stripe redirect callbacks — `/stripe/success` and `/stripe/cancel`

> **Note:** `POST /stripe/validate` is **not registered** — the routes are `/stripe/success` and `/stripe/cancel` (both `router.all`, no auth — they are provider/browser callbacks).

1. After the user pays, Stripe redirects the browser to `GET /api/v1/payment/stripe/success?session_id=<id>&orderId=<orderId>` (or `/stripe/cancel` on cancel).
2. The server validates the session; on success updates the order (`paymentStatus: "Paid"`, `status: "Processing"`, `paymentProvider: "stripe"`, `transactionId` = session id) and redirects the browser to:
   - `FRONTEND_URL/payment/success?tran_id=<sessionId>` on success
   - `FRONTEND_URL/payment/failed` on failure/cancel
3. When called via POST (e.g. `{ "sessionId": "..." }`), the same handler returns **JSON** instead of redirecting.

**Redirect callbacks (do not call manually):**
- `GET/POST /api/v1/payment/stripe/success?session_id=<id>&orderId=<orderId>` — Stripe redirects here after payment; the server validates, then redirects the browser to `FRONTEND_URL/payment/success?tran_id=<transactionId>`.
- `GET/POST /api/v1/payment/stripe/cancel?orderId=<orderId>` — Stripe redirects here if cancelled; the server redirects the browser to `FRONTEND_URL/payment/failed`.

### 9.3 POST /api/v1/payment/:orderId/sslcommerz/init — Initiate SSLCommerz

Protected — `admin`, `customer`. **Body is optional** — all `cus_*`/`ship_*` fields are auto-filled from the order user's profile (`name`, `email`, `phoneNo`, `address`, `city`, `state`, `postcode`, `country`) with Dhaka/BD defaults. Any field can be overridden via body. The server generates `tran_id`, `success_url`, `fail_url`, `cancel_url`, `ipn_url`; amount from `finalAmount`, currency BDT.

**Request:**
```
POST /api/v1/payment/666a1a2b3c4d5e6f7a8b9c0d/sslcommerz/init
Authorization: Bearer <accessToken>
Content-Type: application/json

{}
```

Optional overridable body fields: `product_name`, `product_category`, `cus_name`, `cus_email`, `cus_phone`, `cus_add1`, `cus_add2`, `cus_city`, `cus_state`, `cus_postcode`, `cus_country`, `ship_name`, `ship_add1`, `ship_add2`, `ship_city`, `ship_state`, `ship_postcode`, `ship_country`.

**Response (200):**
```json
{
  "success": true,
  "message": "SSLCommerz payment initiated successfully",
  "data": {
    "success": true,
    "gatewayUrl": "https://sandbox.sslcommerz.com/gwprocess/v4/...",
    "sessionId": "session_key_xyz",
    "message": "SSLCommerz payment initiated successfully"
  }
}
```

**Frontend action:** redirect the browser to `data.gatewayUrl`.

### 9.4 GET|POST /api/v1/payment/sslcommerz/validate — SSLCommerz validate callback

> **Note:** This route is registered as `router.all("/sslcommerz/validate", ...)` with **no auth** and **always responds with a browser redirect** (never JSON), whether called by SSLCommerz's server or by your frontend. Use it as the callback target for SSLCommerz's `success_url`/`ipn_url`; do **not** rely on it for a JSON response.

1. SSLCommerz calls the server's `success_url`/`fail_url`/`cancel_url`/`ipn_url` (all configured server-side to hit this handler) with `val_id` and `tran_id`.
2. The server validates the transaction with SSLCommerz; on success updates the order (`paymentStatus: "Paid"`, `status: "Processing"`, `paymentProvider: "sslcommerz"`), matching by the stored `transactionId` (the raw unprefixed `tran_id`).
3. The browser is redirected to:
   - `FRONTEND_URL/payment/success?tran_id=<tran_id>` on success
   - `FRONTEND_URL/payment/failed?tran_id=<tran_id>` on failure

If you call this endpoint from your own frontend code, you will receive a **302 redirect** — handle it as a redirect, not a JSON response.

### 9.5 POST /api/v1/payment/:orderId/bkash/init — Initiate bKash

Protected — `admin`, `customer`.

**Request:**
```
POST /api/v1/payment/666a1a2b3c4d5e6f7a8b9c0d/bkash/init
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "customerNumber": "01712345678"
}
```

Required: `customerNumber`. Amount from `finalAmount`, currency BDT. The bKash `paymentID` is returned as `transactionId` and stored on the order as `transactionId` for callback matching.

**Response (200):**
```json
{
  "success": true,
  "message": "bKash payment initiated successfully",
  "data": {
    "success": true,
    "gatewayUrl": "https://sandbox.bka.sh/...",
    "message": "bKash payment initiated successfully"
  }
}
```

**Frontend action:** redirect the browser to `data.gatewayUrl` (the bKash payment page). The bKash callback (configured via `BKASH_CALLBACK_URL`) returns the user to the server; the `paymentID` from bKash must then be sent to the validate endpoint.

### 9.6 POST /api/v1/payment/bkash/validate — Validate bKash

Protected — `admin`, `customer`. Returns **JSON** (unlike the SSLCommerz validate). Uses the `paymentID` from the bKash gateway; matches the order by the stored `transactionId` (raw `paymentID`, no prefix).

**Request:**
```
POST /api/v1/payment/bkash/validate
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "paymentID": "bkash_payment_id_from_callback"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment validated successfully",
  "data": {
    "success": true,
    "transactionId": "TRX123456",
    "status": "success",
    "message": "bKash payment validated successfully"
  }
}
```

---

## 10. Meta Module

Parent route: `/api/v1/meta`

### 10.1 GET /api/v1/meta — Dashboard metadata

Protected — `admin`. Aggregates counts from all modules in real time.

**Request:**
```
GET /api/v1/meta
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Metadata retrieved successfully",
  "data": {
    "totalProducts": 25,
    "totalOrders": 150,
    "totalUsers": 42,
    "totalRevenue": 125000.0,
    "totalCategories": 8,
    "totalBrands": 12,
    "totalReviews": 67,
    "recentOrders": 18,
    "lowStockProducts": 3
  }
}
```

Field meanings:
- `totalRevenue` — sum of `finalAmount` across orders with `paymentStatus: "Paid"`.
- `recentOrders` — orders created in the last 7 days.
- `lowStockProducts` — active products with `stock < 5`.
- Counts use active records where applicable (users, products, categories, brands).

---

## 11. Brand Module

Parent route: `/api/v1/brand`

Brand model fields: `name`, `logo`, `isActive`, `createdBy` (ObjectId → User, attached automatically), timestamps.

### 11.1 GET /api/v1/brand — Get all brands

Public. Returns **active only**, with `createdBy` populated (`name`, `email`).

**Query params:** `searchTerm` (searches `name`), `page`, `limit`, `sort`, `fields`, plus filter: `isActive`.

**Request:**
```
GET /api/v1/brand?searchTerm=nike&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "message": "Brands retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
  "data": [
    {
      "_id": "665b1a2b3c4d5e6f7a8b9c0d",
      "name": "Nike",
      "logo": "https://res.cloudinary.com/.../nike.png",
      "isActive": true,
      "createdBy": { "_id": "664f...", "name": "Admin", "email": "admin@example.com" },
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ]
}
```

### 11.2 POST /api/v1/brand — Create brand

Protected — `admin`. **Multipart form-data** — JSON payload in `data`, logo file in `logo` field (optional). Name uniqueness is case-insensitive.

**Request:**
```
POST /api/v1/brand
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"name":"Nike","isActive":true}
  logo: <image file> (optional)
```

**Response (201):**
```json
{
  "success": true,
  "message": "Brand created successfully",
  "data": {
    "_id": "665b1a2b3c4d5e6f7a8b9c0d",
    "name": "Nike",
    "logo": "https://res.cloudinary.com/.../nike.png",
    "isActive": true,
    "createdBy": "664f1a2b3c4d5e6f7a8b9c0d",
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-01T10:00:00.000Z"
  }
}
```

**Errors:** 409 "Brand with this name already exists!"

### 11.3 PATCH /api/v1/brand/:id — Update brand

Protected — `admin`. **Multipart form-data** with `data` + optional `logo` file.

**Request:**
```
PATCH /api/v1/brand/665b1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"name":"Nike Updated"}
  logo: <image file> (optional)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Brand updated successfully",
  "data": { "...": "updated brand" }
}
```

### 11.4 DELETE /api/v1/brand/:id — Delete brand

Protected — `admin`. **Soft delete** — sets `isActive: false`.

**Request:**
```
DELETE /api/v1/brand/665b1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Brand deleted successfully",
  "data": {
    "_id": "665b1a2b3c4d5e6f7a8b9c0d",
    "name": "Nike Updated",
    "logo": "https://res.cloudinary.com/.../nike.png",
    "isActive": false
  }
}
```

---

## 12. Coupon Module

Parent route: `/api/v1/coupon`

Coupon model fields: `code` (uppercase, unique), `discountType` (`percentage` | `fixed`), `discountValue`, `minOrderAmount`, `maxDiscountAmount`, `startDate`, `endDate`, `isActive`, `isDeleted`, timestamps.

### 12.1 POST /api/v1/coupon — Create coupon

Protected — `admin`.

**Request:**
```
POST /api/v1/coupon
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "code": "SAVE20",
  "discountType": "percentage",
  "discountValue": 20,
  "minOrderAmount": 500,
  "maxDiscountAmount": 200,
  "startDate": "2026-08-01",
  "endDate": "2026-12-31"
}
```

Required: `code`, `discountType`, `discountValue`, `startDate`, `endDate`. Optional: `minOrderAmount` (0), `maxDiscountAmount` (0), `isActive` (true). The code is stored uppercase; `endDate` must be after `startDate`.

**Response (201):**
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "_id": "666c1a2b3c4d5e6f7a8b9c0d",
    "code": "SAVE20",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderAmount": 500,
    "maxDiscountAmount": 200,
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-12-31T00:00:00.000Z",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-07-31T10:00:00.000Z",
    "updatedAt": "2026-07-31T10:00:00.000Z"
  }
}
```

**Errors:** 409 "Coupon with this code already exists!" / 400 "End date must be after start date!"

### 12.2 GET /api/v1/coupon — Get all coupons

Protected — `admin`. Soft-deleted coupons are excluded automatically. Returns all non-deleted coupons (expired/inactive included — admins manage them from here).

**Query params:** `searchTerm` (searches `code`), `page`, `limit`, `sort`, `fields`, plus filters: `discountType`, `isActive`, `isDeleted`.

**Request:**
```
GET /api/v1/coupon?page=1&limit=10
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Coupons retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
  "data": [ { "...": "coupon object" } ]
}
```

### 12.3 GET /api/v1/coupon/:couponId — Get single coupon (admin)

Protected — `admin`. Admin single fetch — no expiry/active check; 404 only if missing or soft-deleted.

**Request:**
```
GET /api/v1/coupon/666c1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Coupon retrieved successfully",
  "data": {
    "_id": "666c1a2b3c4d5e6f7a8b9c0d",
    "code": "SAVE20",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderAmount": 500,
    "maxDiscountAmount": 200,
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-12-31T00:00:00.000Z",
    "isActive": true,
    "isDeleted": false
  }
}
```

### 12.4 GET /api/v1/coupon/by-code/:code — Get coupon by code (public)

Public. **Use this on the checkout page to validate a coupon before order creation.** Case-insensitive; validates date range and active status.

**Request:**
```
GET /api/v1/coupon/by-code/SAVE20
```

**Response (200):**
```json
{
  "success": true,
  "message": "Coupon retrieved successfully",
  "data": {
    "_id": "666c1a2b3c4d5e6f7a8b9c0d",
    "code": "SAVE20",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderAmount": 500,
    "maxDiscountAmount": 200,
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-12-31T00:00:00.000Z",
    "isActive": true,
    "isDeleted": false
  }
}
```

**Errors:** 404 "Coupon not found!" / 400 "Coupon is not yet active!" / 400 "Coupon has expired!" / 400 "Coupon is not active!"

### 12.5 PATCH /api/v1/coupon/:couponId — Update coupon

Protected — `admin`. Lookup is by coupon **id**.

**Request:**
```
PATCH /api/v1/coupon/666c1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "discountValue": 25,
  "maxDiscountAmount": 250
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Coupon updated successfully",
  "data": { "...": "updated coupon" }
}
```

### 12.6 DELETE /api/v1/coupon/:couponId — Delete coupon

Protected — `admin`. Lookup is by coupon **id**. **Soft delete** — sets `isDeleted: true` only (does not touch `isActive`).

**Request:**
```
DELETE /api/v1/coupon/666c1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Coupon deleted successfully",
  "data": {
    "_id": "666c1a2b3c4d5e6f7a8b9c0d",
    "code": "SAVE20",
    "isDeleted": true,
    "...": "rest of coupon fields"
  }
}
```

---

## 13. Category Module

Parent route: `/api/v1/category`

Category model fields: `name`, `slug` (auto-generated), `description`, `parent` (ObjectId → Category, for subcategories), `isActive`, `createdBy` (ObjectId → User, attached automatically), `icon`, timestamps.

### 13.1 GET /api/v1/category — Get all categories

Public. Returns **active only**. `parent` (`name`, `slug`) and `createdBy` (`name`, `email`) are populated.

**Query params:** `searchTerm` (searches `name`, `description`), `page`, `limit`, `sort`, `fields`, plus filters: `isActive`, `parent`.

**Request:**
```
GET /api/v1/category?searchTerm=electronics
```

**Response (200):**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
  "data": [
    {
      "_id": "665a1a2b3c4d5e6f7a8b9c0d",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and accessories",
      "parent": null,
      "isActive": true,
      "createdBy": { "_id": "664f...", "name": "Admin", "email": "admin@example.com" },
      "icon": "https://res.cloudinary.com/.../icon.png",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ]
}
```

### 13.2 POST /api/v1/category — Create category

Protected — `admin`. **Multipart form-data** — JSON payload in `data`, icon file in `icon` field (optional). Slug is auto-generated from `name`. For a subcategory, pass the parent category ID.

**Request:**
```
POST /api/v1/category
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"name":"Electronics","description":"Electronic devices","parent":"<parentCategoryId or null>"}
  icon: <image file> (optional)
```

**Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "665a1a2b3c4d5e6f7a8b9c0d",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and accessories",
    "parent": null,
    "isActive": true,
    "createdBy": "664f1a2b3c4d5e6f7a8b9c0d",
    "icon": "https://res.cloudinary.com/.../icon.png",
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-01T10:00:00.000Z"
  }
}
```

**Errors:** 409 "Category with this name already exists!" / 404 invalid parent.

### 13.3 PATCH /api/v1/category/:id — Update category

Protected — `admin`. **Multipart form-data** with `data` + optional `icon` file.

**Request:**
```
PATCH /api/v1/category/665a1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"description":"Updated description"}
  icon: <image file> (optional)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": { "...": "updated category with populated parent" }
}
```

### 13.4 DELETE /api/v1/category/:id — Delete category

Protected — `admin`. **Fails if the category has subcategories.** Soft delete — sets `isActive: false`.

**Request:**
```
DELETE /api/v1/category/665a1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "_id": "665a1a2b3c4d5e6f7a8b9c0d",
    "name": "Electronics",
    "isActive": false
  }
}
```

**Errors:** 400 "Cannot delete category with subcategories. Remove child categories first."

---

## 14. Review Module

Parent route: `/api/v1/review`

Review model fields: `rating` (1–5), `description`, `user` (ObjectId → User, attached automatically), `product` (ObjectId → Product), `isFlagged`, `flaggedReason`, `isVerifiedPurchase`, timestamps. **One review per user per product** (unique index). **A verified purchase is required to review** — the customer must have a `Processing`/`Shipped`/`Completed` order containing the product (a `Pending` or `Cancelled` order does not count); without one the review is rejected. `isVerifiedPurchase` is therefore always `true` on created reviews.

### 14.1 GET /api/v1/review — Get all reviews

Public. `user` (`name`, `email`, `photoUrl`) and `product` (`name`, `slug`) are populated.

**Query params:** `searchTerm` (searches `description`), `page`, `limit`, `sort`, `fields`, plus filters: `rating`, `isFlagged`, `isVerifiedPurchase`, `product`, `user`.

**Request:**
```
GET /api/v1/review?product=664f1a2b3c4d5e6f7a8b9c0d&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPage": 1 },
  "data": [
    {
      "_id": "667d1a2b3c4d5e6f7a8b9c0d",
      "rating": 4,
      "description": "Great product! Highly recommended.",
      "user": { "_id": "664f...", "name": "John Doe", "email": "customer@example.com", "photoUrl": "" },
      "product": { "_id": "664f1a2b...", "name": "Smartphone X", "slug": "smartphone-x" },
      "isFlagged": false,
      "flaggedReason": "",
      "isVerifiedPurchase": false,
      "createdAt": "2026-07-20T10:00:00.000Z",
      "updatedAt": "2026-07-20T10:00:00.000Z"
    }
  ]
}
```

### 14.2 GET /api/v1/review/:reviewId — Get single review

Public.

**Request:**
```
GET /api/v1/review/667d1a2b3c4d5e6f7a8b9c0d
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review retrieved successfully",
  "data": { "...": "same structure as list item" }
}
```

### 14.3 GET /api/v1/review/my-reviews — My reviews (customer)

Protected — `customer`. Returns the authenticated customer's own reviews (including flagged ones), with `user` and `product` populated.

**Query params:** same QueryBuilder params as the public list (`searchTerm`, `page`, `limit`, `sort`, `fields`, plus `rating`, `product`, `isVerifiedPurchase` filters).

**Request:**
```
GET /api/v1/review/my-reviews?page=1&limit=10
Authorization: Bearer <customerAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "My reviews retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
  "data": [ { "...": "same structure as list item" } ]
}
```

### 14.4 POST /api/v1/review — Create review

Protected — `customer` only (admin/manager tokens get `401 You are not authorized!`). Validations:
1. **Product exists + is active** — 404 "Product not found!" / 400 "Product is not available!".
2. **No duplicate review** — one review per user per product → 409 "You have already reviewed this product!".
3. **Verified purchase required** — the customer must have a `Processing`/`Shipped`/`Completed` order containing this product (a `Pending` or `Cancelled` order does not count). Without one → 403 "Only customers who purchased this product can review it!". `isVerifiedPurchase` is always `true` on created reviews.

On creation, the product's `averageRating` and `ratingCount` are **recalculated automatically**.

**Request:**
```
POST /api/v1/review
Authorization: Bearer <customerAccessToken>
Content-Type: application/json

{
  "rating": 4,
  "description": "Great product! Highly recommended.",
  "product": "664f1a2b3c4d5e6f7a8b9c0d"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "_id": "667d1a2b3c4d5e6f7a8b9c0d",
    "rating": 4,
    "description": "Great product! Highly recommended.",
    "user": { "_id": "664f...", "name": "John Doe", "email": "customer@example.com", "photoUrl": "" },
    "product": { "_id": "664f1a2b...", "name": "Smartphone X", "slug": "smartphone-x" },
    "isFlagged": false,
    "flaggedReason": "",
    "isVerifiedPurchase": true,
    "createdAt": "2026-07-20T10:00:00.000Z",
    "updatedAt": "2026-07-20T10:00:00.000Z"
  }
}
```

**Errors:** 404 "Product not found!" / 400 "Product is not available!" / 409 "You have already reviewed this product!" / 403 "Only customers who purchased this product can review it!"

### 14.5 PATCH /api/v1/review/:reviewId/status — Toggle review flag (admin)

Protected — `admin`. Toggles `isFlagged`; flagged reviews are hidden from public reads and excluded from the product's rating calculation.

**Request:**
```
PATCH /api/v1/review/667d1a2b3c4d5e6f7a8b9c0d/status
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review is now flagged",
  "data": { "_id": "667d...", "isFlagged": true, "...": "rest of review fields" }
}
```

### 14.6 DELETE /api/v1/review/:reviewId — Delete review (admin)

Protected — `admin`. Hard deletes the review, removes it from the product's `reviews` array, and recalculates the product rating.

**Request:**
```
DELETE /api/v1/review/667d1a2b3c4d5e6f7a8b9c0d
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": { "_id": "667d...", "rating": 4, "...": "rest of review fields" }
}
```

---

## 15. Settings Module

Parent route: `/api/v1/settings`

The Settings module is a **single singleton document** (`_id: "singleton"`) that drives the whole storefront: brand identity, theme (colors/fonts/radius/global CSS), hero slides, testimonials, navbar (links + role groups), footer, contact, about, and limited-offer banner. The whole config is readable in one request, and each section can be updated independently by an admin. Seeded at deploy time via `npm run seed:settings` (prefilled from the default `clothing` preset).

**Full document shape:**
```json
{
  "_id": "singleton",
  "brand": { "name": "Attor", "tagline": "Define Your Style", "description": "Premium clothing for the modern individual.", "niche": "clothing", "nicheLabel": "Clothing", "logo": "/demo/clothing/logo.svg", "favicon": "", "currency": "usd", "deliveryOptions": [ { "name": "Store Pickup", "charge": 0, "country": "", "isActive": true }, { "name": "Inside Dhaka", "charge": 90, "country": "BD", "isActive": true }, { "name": "Outside Dhaka", "charge": 150, "country": "BD", "isActive": true }, { "name": "International", "charge": 15, "country": "", "isActive": true } ] },
  "theme": {
    "colors": { "background": "oklch(0.985 0.002 85)", "foreground": "oklch(0.19 0.02 65)", "primary": "oklch(0.42 0.12 45)", "primaryForeground": "oklch(0.98 0.01 45)", "...": "28 full CSS color tokens (base + chart + sidebar)" },
    "dark": { "enabled": true, "colors": { "...": "dark overrides" } },
    "fonts": { "family": "Playfair Display", "mono": "ui-monospace, SFMono-Regular, Menlo, monospace", "sizes": { "h1": "2.75rem", "h2": "2.125rem", "h3": "1.5rem", "body": "1rem", "small": "0.875rem" } },
    "radius": "0.5rem",
    "globalCss": ""
  },
  "hero": { "slides": [{ "image": "/demo/clothing/hero-1.webp", "headline": "Elevate Your Everyday Style", "subtext": "...", "ctaText": "Shop Collection", "ctaLink": "/products", "order": 0 }] },
  "testimonials": { "heading": "What Our Customers Say", "items": [{ "name": "Ayesha Rahman", "role": "Verified Buyer", "quote": "...", "rating": 5, "avatar": "", "order": 0 }] },
  "navbar": {
    "links": [{ "label": "Home", "url": "/", "order": 0, "children": [] }, { "label": "Products", "url": "/products", "order": 1, "children": [] }, { "label": "About", "url": "/about", "order": 2, "children": [] }, { "label": "Contact", "url": "/contact", "order": 3, "children": [] }],
    "groups": {
      "auth": [{ "label": "Login", "url": "/login", "order": 0, "children": [] }],
      "customer": [{ "label": "Dashboard", "url": "/dashboard/customer", "order": 0, "children": [] }, { "label": "Logout", "url": "/logout", "order": 1, "children": [] }],
      "admin": [{ "label": "Dashboard", "url": "/dashboard/admin", "order": 0, "children": [] }, { "label": "Logout", "url": "/logout", "order": 1, "children": [] }]
    }
  },
  "footer": { "description": "Quality products curated for your lifestyle...", "columns": [{ "title": "Quick Links", "links": [{ "label": "Home", "url": "/" }, { "label": "Products", "url": "/products" }, { "label": "About", "url": "/about" }, { "label": "Contact", "url": "/contact" }] }, { "title": "Shop", "links": [{ "label": "All Products", "url": "/products" }] }, { "title": "Contact", "links": [{ "label": "About Us", "url": "/about" }, { "label": "Contact Us", "url": "/contact" }] }], "socialLinks": [{ "platform": "twitter", "url": "https://twitter.com/attor" }, { "platform": "instagram", "url": "https://instagram.com/attor" }, { "platform": "facebook", "url": "https://facebook.com/attor" }], "copyrightText": "© 2026 Attor. All rights reserved.", "newsletter": { "enabled": true, "heading": "Subscribe for exclusive offers" } },
  "contact": { "address": "123 Fashion Avenue, New York, NY 10001", "phone": "+1 (555) 123-4567", "email": "hello@attor.com", "hours": "Mon–Sat 9am–6pm", "mapEmbedUrl": "", "social": { "twitter": "https://twitter.com/attor", "instagram": "https://instagram.com/attor", "facebook": "https://facebook.com/attor" } },
  "about": { "story": "...", "mission": "...", "image": "/demo/clothing/about.jpg", "stats": [{ "label": "Founded", "value": "2020" }, { "label": "Collections", "value": "50+" }] },
  "limitedOffer": { "enabled": false, "badge": "Limited Time", "title": "Seasonal Sale", "subtitle": "Up to 30% off selected items", "ctaText": "Shop Now", "ctaLink": "/products", "image": "", "endsAt": "" },
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

> The full static default (matching the seeded `clothing` preset) is documented in `src/app/modules/settings/docs/settings.json` — use it as the frontend's static fallback data when the backend is unreachable.

### 15.1 GET /api/v1/settings — Get settings (public)

Public. Returns the full singleton document (cached in memory; subsequent reads served from cache until a write invalidates it).

**Request:**
```
GET /api/v1/settings
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings retrieved successfully",
  "data": { "...": "full settings document above" }
}
```

**Error:** 404 "Settings not seeded. Run the settings seed script." — treat like "backend unavailable" and render static defaults.

### 15.2 PATCH /api/v1/settings — Update brand (admin)

Protected — `admin`. **Multipart form-data** — JSON payload in `data`, optional `logo` and `favicon` files.

**Request:**
```
PATCH /api/v1/settings
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

Form fields:
  data: {"brand":{"name":"Attor","tagline":"New tagline","description":"...","niche":"clothing","nicheLabel":"Clothing","currency":"usd","deliveryOptions":[{"name":"Inside Dhaka","charge":90,"country":"BD","isActive":true},{"name":"International","charge":15,"isActive":true}]}}
  logo: <image file> (optional)
  favicon: <image file> (optional)
```
Only provided brand fields are updated (unprovided ones keep their value). `currency` (single code string = active store currency; must be `usd`/`bdt`/`eur`/`gbp`/`inr`/`aed`/`aud`/`cad` — invalid codes rejected with 400) and `deliveryOptions` (used by order creation to resolve `deliveryCharge`) are optional. **Uploading a new `logo`/`favicon` destroys the previous file from Cloudinary** (best-effort, after the DB write).

**Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": { "...": "the whole updated settings document" }
}
```

### 15.3 PATCH /api/v1/settings/:section — Update one section (admin)

Protected — `admin`. Sections: `theme`, `hero`, `testimonials`, `navbar`, `footer`, `contact`, `about`, `limitedOffer`. **Multipart** (`data` JSON + optional `images` files for hero/testimonials/about/limitedOffer; plain JSON for the rest). Each section has its own schema; unknown section → 400, invalid body → 400. Writes invalidate the cache. **Replacing/removing an image in hero/testimonials/about/limitedOffer destroys the old file from Cloudinary** (best-effort, after the DB write).

**Request (hero, plain JSON):**
```
PATCH /api/v1/settings/hero
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "slides": [{ "image": "/demo/clothing/hero-1.webp", "headline": "New Hero Title", "subtext": "Summer Sale", "ctaText": "Shop Now", "ctaLink": "/products", "order": 0 }]
}
```

**Image upload semantics** (same as Product module — positional):
- `hero` → `data` (slides) + `images` files → `slides[i].image = files[i].path`.
- `testimonials` → `data` (items) + `images` files → `items[i].avatar = files[i].path`.
- `about` / `limitedOffer` → `data` + `images[0]` → `image`.
- Other sections → plain JSON.

**Response (200):**
```json
{
  "success": true,
  "message": "hero settings updated successfully",
  "data": { "...": "the whole updated settings document" }
}
```

### 15.4 PATCH /api/v1/settings/preset/:niche — Apply niche THEME only (admin)

Protected — `admin`. Applies **only the niche's theme** (colors light+dark, fonts, radius, globalCss) — brand, hero, navbar, footer and other sections are **untouched**. This lets an admin switch the store's look without clobbering customized content. Each niche ships its own unique theme:

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

**Request:**
```
PATCH /api/v1/settings/preset/clothing
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "clothing preset applied successfully",
  "data": { "...": "the whole updated settings document" }
}
```

### 15.5 PATCH /api/v1/settings/reset/:niche — Full settings reset (admin)

Protected — `admin`. Applies the **entire** niche preset in one write: **theme + brand + hero + about + contact + footer + navbar + testimonials + limitedOffer**. Use it to recover from accidental content loss (e.g. deleted nav links) or to fully re-theme the storefront.

- The navbar is standardized: main `links` = Home / Products / About / Contact (public links — no redundant `public` group); `groups` = `auth` (Login), `customer` (Dashboard, Logout) and `admin` (Dashboard, Logout).
- The footer is standardized: **Quick Links** + **Shop** + **Contact** columns, social links, newsletter.
- **`brand.currency` and `brand.deliveryOptions` are PRESERVED** if already set; if unset they fall back to the preset defaults (`usd` + the standard delivery list).
- Replaced section images (hero/testimonials/about/limitedOffer) are **destroyed from Cloudinary** (best-effort, after the DB write).
- Same 10 valid niches as 15.4. Unknown → 400.

**Request:**
```
PATCH /api/v1/settings/reset/electronics
Authorization: Bearer <adminAccessToken>
```

### 15.6 PATCH /api/v1/settings/reset/empty — Clear everything (admin)

Protected — `admin`. Special `empty` reset: clears **all** sections to empty defaults (theme, hero, testimonials, navbar, footer, contact, about, limitedOffer) so the admin can fill everything back in one by one. Keeps:
- **`brand.currency`** (as-is, not reset to `usd`).
- **`brand.deliveryOptions`** (as-is).
- A minimal brand identity (`name`, `niche`, `nicheLabel`) so the store stays usable while being rebuilt.
- Existing section images are **destroyed from Cloudinary** (best-effort) since the sections are cleared.

**Request:**
```
PATCH /api/v1/settings/reset/empty
Authorization: Bearer <adminAccessToken>
```

---

## 16. Activity Module

Parent route: `/api/v1/activity`

The Activity module is the platform's **audit log**. Every important write across the modules (orders, brands, categories, products, reviews, users, coupons, payments, settings) is recorded automatically by the service layer — the frontend does not send anything to create activities. Admins can read and clear the log.

### 16.1 GET /api/v1/activity — Get all activities

Protected — `admin`. Newest first.

**Query params:** `searchTerm` (searches `module`, `type`, `message`, `reference`), `page`, `limit`, `sort`, `fields`, plus filters: `module`, `type`, `performedBy`, `reference`.

**Request:**
```
GET /api/v1/activity?module=Order&type=create&page=1&limit=10
Authorization: Bearer <adminAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Activities retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 12, "totalPage": 2 },
  "data": [
    {
      "_id": "668a1a2b3c4d5e6f7a8b9c0d",
      "module": "Order",
      "type": "create",
      "message": "Order DE07D08M0001U was created",
      "referenceId": "666a1a2b3c4d5e6f7a8b9c0d",
      "reference": "DE07D08M0001U",
      "performedBy": "664f1a2b3c4d5e6f7a8b9c0d",
      "metadata": { "finalAmount": 1649.98, "isGuest": false },
      "createdAt": "2026-08-07T10:00:00.000Z",
      "updatedAt": "2026-08-07T10:00:00.000Z"
    }
  ]
}
```

`module` is one of `Order` | `Brand` | `Category` | `Product` | `Review` | `User` | `Settings` | `Coupon` | `Payment`. `type` is one of `create` | `update` | `delete` | `status` | `preset`.

### 16.2 GET /api/v1/activity/:activityId — Get single activity

Protected — `admin`. 404 if not found.

### 16.3 PATCH /api/v1/activity/:activityId/clear — Clear a single activity

Protected — `admin`. Removes one activity record and returns it.

### 16.4 PATCH /api/v1/activity/clear — Clear activities

Protected — `admin`. Two modes in the JSON body:

```
{ "clearAll": true }                          // delete everything
{ "from": "2026-08-01T00:00:00.000Z", "to": "2026-08-07T23:59:59.999Z" }  // date range (inclusive on createdAt)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Activities cleared successfully",
  "data": { "deletedCount": 12 }
}
```

An empty body or invalid dates → 400.

---

## 17. Payment Flow Walkthroughs

### Stripe (recommended for international payments)

```
1. POST /api/v1/order                     (create order, paymentMethod: "Online")
2. POST /api/v1/payment/:orderId/stripe/init   (body optional — amount/currency derived from the order)
   → data: { gatewayUrl, sessionId }
3. window.location.href = data.gatewayUrl      (user pays on Stripe hosted page)
4. Stripe redirects to:
   /api/v1/payment/stripe/success?session_id=...&orderId=...
   → server validates → redirects browser to FRONTEND_URL/payment/success?tran_id=...
   (or /payment/failed on cancel)
5. Done — no manual validate call needed (the /stripe/validate route is not
   registered server-side; the redirect callback performs validation)
```

### SSLCommerz (Bangladesh)

```
1. POST /api/v1/order                     (create order, paymentMethod: "Online")
2. POST /api/v1/payment/:orderId/sslcommerz/init  (body optional — cus_*/ship_* auto-filled from the user profile)
   → data: { gatewayUrl, sessionId }
3. window.location.href = data.gatewayUrl      (user pays on SSLCommerz page)
4. SSLCommerz redirects to /api/v1/payment/sslcommerz/validate?val_id=...&tran_id=...
   → server validates → redirects browser to FRONTEND_URL/payment/success?tran_id=...
   (or /payment/failed?tran_id=... on failure)
5. Done — the validate endpoint only issues redirects (no JSON); use the
   FRONTEND_URL redirect target to read the result
```

### bKash (Bangladesh mobile banking)

```
1. POST /api/v1/order                     (create order, paymentMethod: "Online")
2. POST /api/v1/payment/:orderId/bkash/init  { customerNumber }
   → data: { gatewayUrl }
3. window.location.href = data.gatewayUrl      (user completes payment in bKash)
4. bKash calls the configured callback URL (BKASH_CALLBACK_URL) with a paymentID
5. Frontend (or server callback) calls:
   POST /api/v1/payment/bkash/validate { paymentID } → JSON, confirm success
```

### Payment result handling on the frontend

The backend redirects the browser to:

| Result | URL |
|---|---|
| Success | `FRONTEND_URL/payment/success?tran_id=<transactionId>` |
| Failure | `FRONTEND_URL/payment/failed?tran_id=<transactionId>` (or `?tran_id=` empty for Stripe cancel) |

**You must implement these two frontend routes** to display the payment outcome. On the success page, fetch the order (with `GET /api/v1/order/:orderId`) to confirm `paymentStatus: "Paid"` and `status: "Processing"`.

---

## 18. Frontend Integration Notes

### 18.1 Setting up an API client

- **Base URL**: `http://localhost:3001/api/v1` (dev). In production use the deployed server URL.
- **With credentials**: use `credentials: "include"` (or `withCredentials: true` in Axios) so the `refreshToken` cookie is sent with `/auth/refresh-token`.
- **CORS**: the server currently allows only `http://localhost:3000`. In production the server's CORS origin must be updated to the deployed frontend URL.

### 18.2 Authorization header helper

```
Authorization: Bearer <accessToken>
```

Store the access token after login/register/refresh and attach it to every request to a protected endpoint. On a 401 response, attempt a refresh (`POST /auth/refresh-token`), then retry the original request once.

### 18.3 Multipart uploads (create/update with files)

These endpoints require `multipart/form-data` with the JSON payload **inside a `data` field**:

| Endpoint | `data` field | File field |
|---|---|---|
| `PATCH /user/update-profile` | JSON | `profilePhoto` (single) |
| `POST|PATCH /product[/:productId]` | JSON | `images` (array, max 10) + `variantImages` (array, flat pool for variant `{}` placeholders) |
| `POST|PATCH /brand[/:id]` | JSON | `logo` (single) |
| `POST|PATCH /category[/:id]` | JSON | `icon` (single) |
| `PATCH /settings` | JSON | `logo` (single) + `favicon` (single) |
| `PATCH /settings/hero` | JSON | `images` (array, maps to `slides[i].image`) |
| `PATCH /settings/testimonials` | JSON | `images` (array, maps to `items[i].avatar`) |
| `PATCH /settings/about`, `/settings/limitedOffer` | JSON | `images` (`images[0]` → `image`) |

Example with `fetch`/`FormData`:

```js
const form = new FormData();
form.append("data", JSON.stringify({ name: "Nike", isActive: true }));
form.append("logo", logoFile); // File object

const res = await fetch(`${BASE}/brand`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type
  body: form,
});
```

> Do **not** manually set `Content-Type: multipart/form-data` — the browser adds the boundary automatically. If the `data` field is missing, the server responds 400 "Please provide data in the body under data key".

### 18.4 Response parsing

- Check `success`. If `false`, show `message` (and optionally `errorSources[].message` per field).
- On list endpoints, use `meta` (`page`, `limit`, `total`, `totalPage`) for pagination UI.

### 18.5 Role-based UI

Guard admin UI (dashboard, product/brand/category/coupon creation, order status changes, user management) behind role `admin`. The access token is a JWT — decode its payload to read `{ userId, name, email, role, isActive }`.

### 18.6 Populated references

Product/category/brand/review/order responses contain **populated embedded objects** instead of raw IDs for some fields:

- Product → `category: { _id, name, slug }`, `brand: { _id, name, logo }`
- Category → `parent: { _id, name, slug }` (or `null`), `createdBy: { _id, name, email }`
- Review → `user: { _id, name, email, photoUrl }`, `product: { _id, name, slug }`
- Order → `user: { ... }`, `products[].product: { ... }`

When sending these fields (e.g. `category` on product create), send the **plain ObjectId string**, not the populated object.

### 18.7 Typical customer flow to implement

1. Browse: `GET /product` (with filters) → product detail `GET /product/:id` → reviews `GET /review?product=<id>`
2. Validate coupon at checkout: `GET /coupon/by-code/<CODE>`
3. Create order: `POST /order` (paymentMethod `"COD"` or `"Online"`) — **no token required** (guest checkout); send the token if the user is logged in. For variant products include `variant: { sku }` per line (required when `hasVariants`).
4. Pay online: call the provider init endpoint → redirect to `gatewayUrl`
5. Handle redirect back on `/payment/success` / `/payment/failed`
6. View orders: `GET /order/my-orders`
7. Track an order (public, guests too): `GET /order/track-order/<orderId>`
8. Download invoice (paid orders): `GET /order/<orderId>/invoice`

### 18.8 Typical admin flow to implement

1. Login as admin → `GET /user` (manage users), `PATCH /user/:id/status`
2. Manage catalog: CRUD `category`, `brand`, `product` (multipart)
3. Manage coupons: CRUD `coupon`
4. Manage orders: `GET /order`, `PATCH /order/:id/status`
5. Dashboard: `GET /meta`
6. Moderate reviews: `GET /review?isFlagged=true`
7. Manage storefront: `GET /settings`, `PATCH /settings/:section`, `PATCH /settings/preset/:niche` (theme only), `PATCH /settings/reset/:niche` (full reset), `PATCH /settings/reset/empty` (clear everything)
8. Audit log: `GET /activity`, `PATCH /activity/clear`

---

## Appendix — Complete endpoint summary

| # | Method | Route | Auth | Multipart |
|---|---|---|---|---|
| 1 | POST | `/api/v1/auth/login` | – | – |
| 2 | POST | `/api/v1/auth/refresh-token` | – | – |
| 3 | POST | `/api/v1/auth/change-password` | admin, customer | – |
| 4 | POST | `/api/v1/auth/forgot-password` | – | – |
| 5 | POST | `/api/v1/auth/verify-otp` | – | – |
| 6 | POST | `/api/v1/auth/reset-password` | – | – |
| 7 | POST | `/api/v1/user/register` | – | – |
| 8 | GET | `/api/v1/user` | admin | – |
| 9 | GET | `/api/v1/user/me` | admin, customer | – |
| 10 | PATCH | `/api/v1/user/update-profile` | admin, manager, customer | ✅ `data` + `profilePhoto` |
| 11 | PATCH | `/api/v1/user/:id/status` | admin | – |
| 12 | GET | `/api/v1/product` | – | – |
| 13 | GET | `/api/v1/product/:productId` | – | – |
| 14 | POST | `/api/v1/product` | admin | ✅ `data` + `images` (≤10) + `variantImages` |
| 15 | PATCH | `/api/v1/product/:productId` | admin | ✅ `data` + `images` + `variantImages` |
| 16 | DELETE | `/api/v1/product/:productId` | admin | – |
| 17 | GET | `/api/v1/order` | admin | – |
| 18 | GET | `/api/v1/order/my-orders` | customer | – |
| 19 | GET | `/api/v1/order/track-order/:orderId` | – (public) | – |
| 20 | GET | `/api/v1/order/:orderId` | admin, customer (owner) | – |
| 21 | GET | `/api/v1/order/:orderId/invoice` | admin, customer (owner); paid only | – |
| 22 | POST | `/api/v1/order` | – (guest checkout, optional auth) | – |
| 23 | PATCH | `/api/v1/order/:orderId` | admin, customer (owner) | – |
| 24 | PATCH | `/api/v1/order/:orderId/status` | admin | – |
| 25 | POST | `/api/v1/payment/:orderId/stripe/init` | admin, customer | – |
| 26 | GET/POST | `/api/v1/payment/stripe/success` | – (callback, redirects to frontend) | – |
| 27 | GET/POST | `/api/v1/payment/stripe/cancel` | – (callback, redirects to frontend) | – |
| 28 | POST | `/api/v1/payment/:orderId/sslcommerz/init` | admin, customer | – |
| 29 | GET/POST | `/api/v1/payment/sslcommerz/validate` | – (callback, always redirects) | – |
| 30 | POST | `/api/v1/payment/:orderId/bkash/init` | admin, customer | – |
| 31 | POST | `/api/v1/payment/bkash/validate` | admin, customer | – |
| 32 | GET | `/api/v1/meta` | admin | – |
| 33 | GET | `/api/v1/brand` | – | – |
| 34 | GET | `/api/v1/brand/:id` | – | – |
| 35 | POST | `/api/v1/brand` | admin | ✅ `data` + `logo` |
| 36 | PATCH | `/api/v1/brand/:id` | admin | ✅ `data` + `logo` |
| 37 | DELETE | `/api/v1/brand/:id` | admin | – |
| 38 | POST | `/api/v1/coupon` | admin | – |
| 39 | GET | `/api/v1/coupon` | admin | – |
| 40 | GET | `/api/v1/coupon/:couponId` | admin | – |
| 41 | GET | `/api/v1/coupon/by-code/:code` | – | – |
| 42 | PATCH | `/api/v1/coupon/:couponId` | admin | – |
| 43 | DELETE | `/api/v1/coupon/:couponId` | admin | – |
| 44 | GET | `/api/v1/category` | – | – |
| 45 | GET | `/api/v1/category/:id` | – | – |
| 46 | POST | `/api/v1/category` | admin | ✅ `data` + `icon` |
| 47 | PATCH | `/api/v1/category/:id` | admin | ✅ `data` + `icon` |
| 48 | DELETE | `/api/v1/category/:id` | admin | – |
| 49 | GET | `/api/v1/review` | – | – |
| 50 | GET | `/api/v1/review/my-reviews` | customer | – |
| 51 | GET | `/api/v1/review/:reviewId` | – | – |
| 52 | POST | `/api/v1/review` | customer | – |
| 53 | PATCH | `/api/v1/review/:reviewId/status` | admin | – |
| 54 | DELETE | `/api/v1/review/:reviewId` | admin | – |
| 55 | GET | `/api/v1/settings` | – | – |
| 56 | PATCH | `/api/v1/settings` | admin | ✅ `data` + `logo` + `favicon` |
| 57 | PATCH | `/api/v1/settings/:section` | admin | ✅ `data` + `images` (hero/testimonials/about/limitedOffer) |
| 58 | PATCH | `/api/v1/settings/preset/:niche` | admin | – (theme only) |
| 59 | PATCH | `/api/v1/settings/reset/:niche` | admin | – |
| 60 | PATCH | `/api/v1/settings/reset/empty` | admin | – |
| 61 | GET | `/api/v1/activity` | admin | – |
| 62 | GET | `/api/v1/activity/:activityId` | admin | – |
| 63 | PATCH | `/api/v1/activity/:activityId/clear` | admin | – |
| 64 | PATCH | `/api/v1/activity/clear` | admin | – |
