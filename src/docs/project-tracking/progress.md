# Created at: 04/08/2026
# Updated at: 07/08/2026
# Completed at: N/A

# Modules Testing
Total Module: 12
Total Routes: 61

Base URL: `http://localhost:5000/api/v1` (all routes are prefixed with `/api/v1`)

---

## 1. User Module (Completed ✔)
**Total Routes: 5**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/user/register` | POST | Register a new user (customer only). Auto-login returns access token. Tracks client info (device, browser, IP). |
| 2 | `/user` | GET | Get all users except the requesting admin (Admin only). Supports search, filter, sort, pagination via QueryBuilder. |
| 3 | `/user/me` | GET | Get logged-in user's own profile (Admin/Customer). |
| 4 | `/user/update-profile` | PATCH | Update own profile (Admin/Manager/Customer). Supports profile photo upload via Multer/Cloudinary. |
| 5 | `/user/:id/status` | PATCH | Toggle user active/inactive status (Admin only). |

### 1.1 POST /user/register — Register User
```text
POST /api/v1/user/register
Content-Type: application/json

{
    "name": "John Doe",
    "email": "customer@example.com",
    "password": "123456",
    "clientInfo": {
        "device": "pc",
        "browser": "Chrome",
        "ipAddress": "192.168.1.1",
        "os": "Windows",
        "userAgent": "Mozilla/5.0..."
    }
}
```
Note: clientInfo is auto-captured via the `clientInfoParser` middleware; the shape above is what it populates.

```json
// Response 201 Created
{
    "success": true,
    "message": "User registration completed successfully!",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### 1.2 GET /user — Get All Users (Admin)
```text
GET /api/v1/user?searchTerm=john&page=1&limit=10
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Users are retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "data": [
        {
            "_id": "user_id",
            "name": "John Doe",
            "email": "customer@example.com",
            "role": "customer",
            "photoUrl": null,
            "isActive": true,
            "lastLogin": "2025-01-01T00:00:00.000Z",
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
    ]
}
```

### 1.3 GET /user/me — My Profile
```text
GET /api/v1/user/me
Authorization: Bearer <access_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Profile retrieved successfully",
    "data": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "customer@example.com",
        "role": "customer",
        "photoUrl": null,
        "clientInfo": {
            "device": "pc",
            "browser": "Chrome",
            "ipAddress": "192.168.1.1",
            "os": "Windows",
            "userAgent": "Mozilla/5.0..."
        },
        "lastLogin": "2025-01-01T00:00:00.000Z",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
    }
}
```

### 1.4 PATCH /user/update-profile — Update Profile
```text
PATCH /api/v1/user/update-profile
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Fields:
  name: "John Updated"
  phoneNo: "01712345678"
  gender: "Male"
  dateOfBirth: "1990-01-01"
  address: "123 Main Street, Dhaka"
  profilePhoto: [file upload]
```
Note: All fields optional. `phoneNo` (11 digits), `gender` (`Male`/`Female`/`Other`), `dateOfBirth` (valid date), `photo`/`photoUrl` (image URL) are validated; uploaded `profilePhoto` sets `photoUrl`.
```json
// Response 200 OK
{
    "success": true,
    "message": "Profile updated successfully",
    "data": {
        "_id": "user_id",
        "name": "John Updated",
        "photoUrl": "https://res.cloudinary.com/.../profile.jpg",
        "email": "customer@example.com",
        "role": "customer",
        "isActive": true,
        "lastLogin": "2025-01-01T00:00:00.000Z",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-02T00:00:00.000Z"
    }
}
```

### 1.5 PATCH /user/:id/status — Update User Status (Admin)
```text
PATCH /api/v1/user/user_id/status
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK (if deactivating)
{
    "success": true,
    "message": "User is now inactive",
    "data": {
        "_id": "user_id",
        "isActive": false,
        "name": "John Doe",
        "email": "customer@example.com"
    }
}
```

---

## 2. Auth Module (Completed ✔)
**Total Routes: 6**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/auth/login` | POST | Login with email/password. Tracks client info, updates last login, returns access + refresh tokens (refresh in httpOnly cookie). |
| 2 | `/auth/refresh-token` | POST | Exchange valid refresh token (cookie) for a new access token. |
| 3 | `/auth/change-password` | POST | Change own password (Admin/Customer). Validates old password; new password must differ from old, min 6 chars. |
| 4 | `/auth/forgot-password` | POST | Send 6-digit OTP to user's email (signed JWT, 5-min expiry). |
| 5 | `/auth/verify-otp` | POST | Verify OTP from email; returns a reset token on success. |
| 6 | `/auth/reset-password` | POST | Accept reset token + new password, updates password. |

Auth middleware: valid token with a role not allowed by the route → `401 You are not authorized!`. Invalid/expired/malformed token → `401 Invalid token!` / `Token has expired!`. A valid token is never reported as invalid due to a role mismatch.

### 2.1 POST /auth/login — Login
```text
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "customer@example.com",
    "password": "123456"
}
```
Note: clientInfo auto-captured via `clientInfoParser` middleware. Validation: valid email format, password min 6 chars.

```json
// Response 200 OK
{
    "success": true,
    "message": "User logged in successfully!",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIs...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### 2.2 POST /auth/refresh-token — Refresh Token
```text
POST /api/v1/auth/refresh-token
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIs...
```
```json
// Response 200 OK
{
    "success": true,
    "message": "User logged in successfully!",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### 2.3 POST /auth/change-password — Change Password
```text
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "oldPassword": "123456",
    "newPassword": "newpassword123"
}
```
Note: Both passwords required, min 6 chars, and `newPassword` must differ from `oldPassword` (validated in zod + service).
```json
// Response 200 OK
{
    "success": true,
    "message": "Password changed successfully!",
    "data": null
}
```

### 2.4 POST /auth/forgot-password — Forgot Password
```text
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
    "email": "customer@example.com"
}
```
Note: `email` must be a valid email format.
```json
// Response 200 OK
{
    "success": true,
    "message": "Check your email to reset your password",
    "data": null
}
```

### 2.5 POST /auth/verify-otp — Verify OTP
```text
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
    "email": "customer@example.com",
    "otp": "483291"
}
```
Note: `otp` must be exactly 4 digits (matches `generateOtp`).
```json
// Response 200 OK
{
    "success": true,
    "message": "OTP verified successfully.",
    "data": {
        "resetToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### 2.6 POST /auth/reset-password — Reset Password
```text
POST /api/v1/auth/reset-password
Content-Type: application/json

{
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "newPassword": "newpassword123"
}
```
Note: `newPassword` required, min 6 chars.
```json
// Response 200 OK
{
    "success": true,
    "message": "Password reset successfully!",
    "data": {
        "message": "Password changed successfully"
    }
}
```

---

## 3. Product Module (Completed ✔)
**Total Routes: 5**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/product` | GET | Get all non-deleted products (public). Populates category/brand + non-flagged reviews. Supports search, filter, sort, price-range, pagination. |
| 2 | `/product/:productId` | GET | Get single non-deleted product (public). Populates category/brand + non-flagged reviews. |
| 3 | `/product` | POST | Create product (Admin). Up to 10 images via Multer/Cloudinary. Slug optional — auto-generated unique; validates category/brand refs; attaches `createdBy`. Currency optional (default `usd`). |
| 4 | `/product/:productId` | PATCH | Update product (Admin). Replaces image array, re-validates slug + refs. Can toggle `isActive` both ways. |
| 5 | `/product/:productId` | DELETE | Soft-delete product (Admin). Sets `isDeleted: true`, `isActive: false`. Not toggleable. |

Slug rules: a provided slug is rejected only if it belongs to a product with a **different name**. Same-name products (different price/variant) may share the slug. If no slug is provided, a unique one is generated from the name (`<name>-<random>` when the base slug is taken).

### 3.1 GET /product — Get All Products (Public)
```text
GET /api/v1/product?searchTerm=phone&minPrice=100&maxPrice=1000&page=1&limit=10
```
```json
// Response 200 OK
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
            "imageUrls": ["https://res.cloudinary.com/.../image1.jpg"],
            "isActive": true,
            "averageRating": 4.5,
            "ratingCount": 12,
            "availableColors": ["Black", "White"],
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

### 3.2 GET /product/:productId — Get Single Product (Public)
```text
GET /api/v1/product/prod_id
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Product retrieved successfully",
    "data": { "...": "same structure as list item above" }
}
```
Note: 404 if the product does not exist or has been soft-deleted (`isDeleted: true`). `reviews` (non-flagged) are populated.

### 3.3 POST /product — Create Product (Admin)
```text
POST /api/v1/product
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
  data: { "name": "Smartphone X", "slug": "smartphone-x" (optional), "description": "...", "price": 799.99, "currency": "usd" (optional, default "usd"), "stock": 50, "weight": 0.2, "category": "cat_id", "brand": "brand_id", "specification": [{"key":"RAM","value":"8GB"}], "keyFeatures": ["5G"], "availableColors": ["Black","White"] }
  images: [file1, file2, ...] (max 10)
```
```json
// Response 201 Created
{
    "success": true,
    "message": "Product created successfully",
    "data": { "...": "product object with populated category/brand, createdBy, reviews" }
}
```
Note: `slug` optional. If omitted, auto-generated from `name` (base slug if free, else `-<random>` suffix). If provided, it must not belong to a different-named product. `createdBy` is attached automatically from the authenticated admin. `currency` supports `usd` (default), `bdt`, `eur`, `gbp`, `inr`, `aed`, `aud`, `cad`.

### 3.4 PATCH /product/:productId — Update Product (Admin)
```text
PATCH /api/v1/product/prod_id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
  data: { "name": "Smartphone X Pro", "slug": "smartphone-x-pro", "price": 899.99, "isActive": true }
  images: [new images]
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Product updated successfully",
    "data": { "...": "updated product" }
}
```
Note: `isActive` can be toggled `true`/`false` freely (an inactive product can be re-activated). `slug` optional — same uniqueness rules as create.

### 3.5 DELETE /product/:productId — Delete Product (Admin)
```text
DELETE /api/v1/product/prod_id
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
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

---

## 4. Order Module (Completed ✔)
**Total Routes: 9**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/order` | GET | Get all orders (Admin). Populates user + product. Search/filter/sort/paginate. |
| 2 | `/order/my-orders` | GET | Get the authenticated customer's own orders. Search/filter/sort/paginate. |
| 3 | `/order/track-order/:orderId` | GET | Public order tracking by `orderId` (or Mongo `_id`). Delivery + payment insights, status history. |
| 4 | `/order/:orderId` | GET | Get order details (Admin or order owner). Full user + product population. |
| 5 | `/order/:orderId/invoice` | GET | Get invoice data (Admin or owner). JSON for react-pdf rendering. **Paid orders only** → else 400. |
| 6 | `/order` | POST | Create order (**guest checkout — optional auth**). Server-side pricing, coupon verify, stock decrement in a transaction. |
| 7 | `/order/:orderId` | PATCH | Update order (Admin or owner). Re-validates products/coupon, recomputes totals; locked once Cancelled/Completed. |
| 8 | `/order/:orderId/status` | PATCH | Change order status (Admin). Locked once Cancelled/Completed. |

Status lifecycle: `Pending` → `Processing` → `Shipped` → `Completed` (or `Cancelled`).

Order identity: every order gets a unique human-friendly `orderId` (`DE{DD}D{MM}M{0001}{U|G}`, e.g. `DE07D08M0001U`; `U` = user, `G` = guest). Guest orders have `user: null`.

Order currency: inherited from the products at creation (`usd`, `bdt`, `eur`, `gbp`, `inr`, `aed`, `aud`, `cad`). All products in an order must share the same currency, else 400. When a payment is charged in a different currency (e.g. BDT order via Stripe), `fxRate` + `fxBaseCurrency` are stored for reconciliation.

Recipient fields: `recipientName` + `phoneNo` required at creation; `notes` optional. All updatable by admin/owner.

### 4.1 GET /order — Get All Orders (Admin)
```text
GET /api/v1/order?status=Pending&page=1&limit=10
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Orders retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 3, "totalPage": 1 },
    "data": [
        {
            "_id": "order_id",
            "user": { "_id": "user_id", "name": "John Doe", "email": "john@example.com" },
            "products": [
                {
                    "product": { "_id": "prod_id", "name": "Smartphone X", "price": 799.99 },
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
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
    ]
}
```

### 4.2 GET /order/my-orders — My Orders (Customer)
```text
GET /api/v1/order/my-orders?status=Pending&page=1&limit=10
Authorization: Bearer <customer_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "My orders retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "data": [ { "...": "same structure as list item above" } ]
}
```

### 4.3 GET /order/:orderId — Get Order Details (Admin/Owner)
```text
GET /api/v1/order/order_id
Authorization: Bearer <admin_token or customer_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Order details retrieved successfully",
    "data": { "...": "same structure as list item above" }
}
```
Note: Only an admin or the user who placed the order can access it.

### 4.4 POST /order — Create Order (Admin/Customer)
```text
POST /api/v1/order
Authorization: Bearer <admin_token or customer_token>
Content-Type: application/json

{
    "products": [
        { "product": "prod_id", "quantity": 2 }
    ],
    "coupon": "SAVE20",
    "deliveryCharge": 50,
    "shippingAddress": "123 Main Street, Dhaka",
    "paymentMethod": "Online"
}
```
```json
// Response 201 Created
{
    "success": true,
    "message": "Order created successfully",
    "data": {
        "_id": "order_id",
        "user": { "_id": "user_id", "name": "John Doe", "email": "john@example.com" },
        "products": [
            {
                "product": { "_id": "prod_id", "name": "Smartphone X" },
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
        "paymentMethod": "Online",
        "paymentStatus": "Pending",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
    }
}
```
Note: `totalAmount`/`discount`/`finalAmount`/`unitPrice` are computed server-side from real product prices — never client-supplied. `coupon` is verified (exists, active, in date range, meets min order). Stock is decremented inside a transaction. `currency` is inherited from the products.

### 4.5 PATCH /order/:orderId — Update Order (Admin/Owner)
```text
PATCH /api/v1/order/order_id
Authorization: Bearer <admin_token or customer_token>
Content-Type: application/json

{
    "products": [ { "product": "prod_id", "quantity": 3 } ],
    "coupon": "SAVE20",
    "deliveryCharge": 60,
    "shippingAddress": "456 New Street, Dhaka"
}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Order updated successfully",
    "data": { "...": "updated order with recomputed totals" }
}
```
Note: Same strategy as create — re-validates products + re-prices, restores old stock then decrements new quantities in a transaction, re-verifies coupon, recomputes `finalAmount` and `currency`. Locked once `Completed`/`Cancelled`.

### 4.6 PATCH /order/:orderId/status — Update Order Status (Admin)
```text
PATCH /api/v1/order/order_id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "status": "Processing"
}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Order status updated to Processing",
    "data": {
        "_id": "order_id",
        "status": "Processing",
        "...": "rest of order fields"
    }
}
```

---

## 5. Meta Module (Completed ✔)
**Total Routes: 1**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/meta` | GET | Dashboard metadata & analytics (Admin). Aggregates counts across users, products, orders, revenue, categories, brands, reviews, recent orders, low stock. |

### 5.1 GET /meta — Get Metadata (Admin)
```text
GET /api/v1/meta
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Metadata retrieved successfully",
    "data": {
        "totalProducts": 25,
        "totalOrders": 150,
        "totalUsers": 42,
        "totalRevenue": 125000.00,
        "totalCategories": 8,
        "totalBrands": 12,
        "totalReviews": 67,
        "recentOrders": 18,
        "lowStockProducts": 3
    }
}
```

---

## 6. Brand Module (Completed ✔)
**Total Routes: 5**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/brand` | GET | Get all active brands (public). Supports search + pagination. |
| 2 | `/brand/:id` | GET | Get single brand (public). 404 if not found or soft-deleted. |
| 3 | `/brand` | POST | Create brand (Admin). Validates name uniqueness (case-insensitive). Logo upload. |
| 4 | `/brand/:id` | PATCH | Update brand (Admin). Re-checks name uniqueness. Logo upload. |
| 5 | `/brand/:id` | DELETE | Soft-delete brand (Admin). Sets `isDeleted: true`, `isActive: false`. |

### 6.1 GET /brand — Get All Brands (Public)
```text
GET /api/v1/brand?searchTerm=nike&page=1&limit=10
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Brands retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "data": [
        {
            "_id": "brand_id_1",
            "name": "Nike",
            "description": "Sports apparel and footwear",
            "logo": "https://example.com/nike.png",
            "isActive": true,
            "createdBy": { "_id": "user_id", "name": "Admin", "email": "admin@example.com" },
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
    ]
}
```

### 6.2 GET /brand/:id — Get Single Brand (Public)
```text
GET /api/v1/brand/brand_id_1
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Brand retrieved successfully",
    "data": { "...": "same structure as list item above" }
}
```

### 6.3 POST /brand — Create Brand (Admin)
```text
POST /api/v1/brand
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data   // or application/json

Fields (multipart):
  name: "Nike"
  description: "Sports apparel and footwear" (optional, defaults "")
  logo: [file upload]

// or JSON body:
{
    "name": "Nike",
    "description": "Sports apparel and footwear"
}
```
```json
// Response 201 Created
{
    "success": true,
    "message": "Brand created successfully",
    "data": {
        "_id": "brand_id_1",
        "name": "Nike",
        "description": "Sports apparel and footwear",
        "logo": "https://example.com/nike.png",
        "isActive": true,
        "createdBy": "user_id",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
    }
}
```

### 6.4 PATCH /brand/:id — Update Brand (Admin)
```text
PATCH /api/v1/brand/brand_id_1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "name": "Nike Updated",
    "description": "Updated description"
}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Brand updated successfully",
    "data": {
        "_id": "brand_id_1",
        "name": "Nike Updated",
        "description": "Updated description",
        "logo": "https://example.com/nike.png",
        "isActive": true,
        "createdBy": "user_id",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
    }
}
```

### 6.5 DELETE /brand/:id — Delete Brand (Admin)
```text
DELETE /api/v1/brand/brand_id_1
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Brand deleted successfully",
    "data": {
        "_id": "brand_id_1",
        "name": "Nike Updated",
        "description": "Updated description",
        "logo": "https://example.com/nike.png",
        "isActive": false,
        "isDeleted": true,
        "createdBy": "user_id",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
    }
}
```

---

## 7. Category Module (Completed ✔)
**Total Routes: 4**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/category` | GET | Get all active categories (public). Supports parent/subcategory hierarchy. |
| 2 | `/category` | POST | Create category (Admin). Auto-generates slug; validates parent. Icon upload. |
| 3 | `/category/:id` | PATCH | Update category (Admin). Re-validates name uniqueness + parent ref. Icon upload. |
| 4 | `/category/:id` | DELETE | Delete category (Admin). Prevents deletion if subcategories exist; soft-delete. |

### 7.1 GET /category — Get All Categories (Public)
```text
GET /api/v1/category?searchTerm=electronics
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Categories retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "data": [
        {
            "_id": "cat_1",
            "name": "Electronics",
            "slug": "electronics",
            "description": "Electronic devices and accessories",
            "parent": null,
            "isActive": true,
            "createdBy": { "_id": "user_id", "name": "Admin", "email": "admin@example.com" },
            "icon": "electronics-icon.png",
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
    ]
}
```

### 7.2 POST /category — Create Category (Admin)
```text
POST /api/v1/category
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data   // or application/json

Fields (multipart):
  name: "Electronics"
  description: "Electronic devices and accessories"
  icon: [file upload]

// or JSON body:
{
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "icon": "electronics-icon.png"
}
```
```json
// Response 201 Created
{
    "success": true,
    "message": "Category created successfully",
    "data": {
        "_id": "cat_1",
        "name": "Electronics",
        "slug": "electronics",
        "description": "Electronic devices and accessories",
        "parent": null,
        "isActive": true,
        "createdBy": "user_id",
        "icon": "electronics-icon.png",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
    }
}
```

### 7.3 PATCH /category/:id — Update Category (Admin)
```text
PATCH /api/v1/category/cat_1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "description": "Updated description"
}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Category updated successfully",
    "data": { "...": "updated category object" }
}
```

### 7.4 DELETE /category/:id — Delete Category (Admin)
```text
DELETE /api/v1/category/cat_1
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Category deleted successfully",
    "data": {
        "_id": "cat_1",
        "isActive": false,
        "...": "rest of category fields"
    }
}
```

---

## 8. Coupon Module (Completed ✔)
**Total Routes: 6**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/coupon` | POST | Create coupon (Admin). Percentage/fixed discount, min order, max discount, validity dates. |
| 2 | `/coupon` | GET | Get all non-deleted coupons (Admin). Includes expired/inactive. Paginated. |
| 3 | `/coupon/:couponId` | GET | Get single coupon by id (Admin). Includes expired/inactive; hides soft-deleted. |
| 4 | `/coupon/by-code/:code` | GET | Get coupon by code (public). Validates date range + active status. |
| 5 | `/coupon/:couponId` | PATCH | Update coupon by id (Admin). Validates code uniqueness, dates, percentage cap. |
| 6 | `/coupon/:couponId` | DELETE | Soft-delete coupon (Admin). Sets `isDeleted: true` only. |

Route params are consistent: id-based routes use `:couponId`; the public lookup uses `:code` under `/by-code`.

### 8.1 POST /coupon — Create Coupon (Admin)
```text
POST /api/v1/coupon
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "code": "SAVE20",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderAmount": 500,
    "maxDiscountAmount": 200,
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
}
```
```json
// Response 201 Created
{
    "success": true,
    "message": "Coupon created successfully",
    "data": {
        "_id": "coupon_id",
        "code": "SAVE20",
        "discountType": "percentage",
        "discountValue": 20,
        "minOrderAmount": 500,
        "maxDiscountAmount": 200,
        "startDate": "2025-01-01T00:00:00.000Z",
        "endDate": "2025-12-31T00:00:00.000Z",
        "isActive": true,
        "isDeleted": false,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
    }
}
```
Note: Validates code uniqueness (409), percentage ≤ 100, and `endDate` after `startDate`. Code is stored uppercase.

### 8.2 GET /coupon — Get All Coupons (Admin)
```text
GET /api/v1/coupon
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Coupons retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "data": [{ "_id": "coupon_id", "code": "SAVE20", "...": "rest of coupon fields" }]
}
```
Note: Returns all non-deleted coupons, including expired or inactive ones (admin manages them from here).

### 8.3 GET /coupon/:couponId — Get Single Coupon (Admin)
```text
GET /api/v1/coupon/coupon_id
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Coupon retrieved successfully",
    "data": {
        "_id": "coupon_id",
        "code": "SAVE20",
        "discountType": "percentage",
        "discountValue": 20,
        "minOrderAmount": 500,
        "maxDiscountAmount": 200,
        "startDate": "2025-01-01T00:00:00.000Z",
        "endDate": "2025-12-31T00:00:00.000Z",
        "isActive": true,
        "isDeleted": false
    }
}
```
Note: Admin single fetch — no expiry/active check; 404 only if missing or soft-deleted.

### 8.4 GET /coupon/by-code/:code — Get Coupon By Code (Public)
```text
GET /api/v1/coupon/by-code/SAVE20
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Coupon retrieved successfully",
    "data": {
        "_id": "coupon_id",
        "code": "SAVE20",
        "discountType": "percentage",
        "discountValue": 20,
        "minOrderAmount": 500,
        "maxDiscountAmount": 200,
        "startDate": "2025-01-01T00:00:00.000Z",
        "endDate": "2025-12-31T00:00:00.000Z",
        "isActive": true,
        "isDeleted": false
    }
}
```
Note: Checkout validation route. 400 if not yet active, expired, or `isActive: false`.

### 8.5 PATCH /coupon/:couponId — Update Coupon (Admin)
```text
PATCH /api/v1/coupon/coupon_id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "discountValue": 25,
    "maxDiscountAmount": 250
}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Coupon updated successfully",
    "data": { "...": "updated coupon object" }
}
```
Note: Can update code, discount type/value, min/max amounts, dates, `isActive`. Validates: code conflict (409), percentage > 100 (400), `endDate` after `startDate` (400, merged with existing dates).

### 8.6 DELETE /coupon/:couponId — Delete Coupon (Admin)
```text
DELETE /api/v1/coupon/coupon_id
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Coupon deleted successfully",
    "data": {
        "_id": "coupon_id",
        "isDeleted": true,
        "...": "rest of coupon fields"
    }
}
```
Note: Soft delete only — sets `isDeleted: true` (does not touch `isActive`).

---

## 9. Review Module (Completed ✔)
**Total Routes: 5**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/review` | GET | Get all non-flagged reviews (public). Populates user + product. |
| 2 | `/review/:reviewId` | GET | Get single non-flagged review (public). |
| 3 | `/review` | POST | Create review (Customer only). One review per user per product; pushes id to product.reviews; syncs product's averageRating + ratingCount. |
| 4 | `/review/:reviewId/status` | PATCH | Toggle review `isFlagged` (Admin). Flagged reviews are hidden from public reads and excluded from rating. |
| 5 | `/review/:reviewId` | DELETE | Delete review (Admin). Hard deletes; removes id from product.reviews; recalcs rating. |

### 9.1 GET /review — Get All Reviews (Public)
```text
GET /api/v1/review?page=1&limit=10
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Reviews retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 3, "totalPage": 1 },
    "data": [
        {
            "_id": "review_id_1",
            "rating": 4,
            "description": "Great product! Highly recommended.",
            "user": { "_id": "user_id", "name": "John Doe", "email": "john@example.com", "photoUrl": "" },
            "product": { "_id": "product_id", "name": "Smartphone X", "slug": "smartphone-x" },
            "isFlagged": false,
            "flaggedReason": "",
            "isVerifiedPurchase": false,
            "createdAt": "2025-01-15T00:00:00.000Z",
            "updatedAt": "2025-01-15T00:00:00.000Z"
        }
    ]
}
```
Note: Only `isFlagged: false` reviews are returned publicly.

### 9.2 GET /review/:reviewId — Get Single Review (Public)
```text
GET /api/v1/review/review_id_1
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Review retrieved successfully",
    "data": {
        "_id": "review_id_1",
        "rating": 4,
        "description": "Great product! Highly recommended.",
        "user": { "_id": "user_id", "name": "John Doe", "email": "john@example.com", "photoUrl": "" },
        "product": { "_id": "product_id", "name": "Smartphone X", "slug": "smartphone-x" },
        "isFlagged": false,
        "flaggedReason": "",
        "isVerifiedPurchase": false,
        "createdAt": "2025-01-15T00:00:00.000Z",
        "updatedAt": "2025-01-15T00:00:00.000Z"
    }
}
```
Note: 404 if the review does not exist or is flagged.

### 9.3 POST /review — Create Review (Customer)
```text
POST /api/v1/review
Authorization: Bearer <customer_token>
Content-Type: application/json

{
    "rating": 4,
    "description": "Great product! Highly recommended.",
    "product": "product_id"
}
```
```json
// Response 201 Created
{
    "success": true,
    "message": "Review created successfully",
    "data": {
        "_id": "review_id_1",
        "rating": 4,
        "description": "Great product! Highly recommended.",
        "user": { "_id": "user_id", "name": "John Doe", "email": "john@example.com", "photoUrl": "" },
        "product": { "_id": "product_id", "name": "Smartphone X", "slug": "smartphone-x" },
        "isFlagged": false,
        "flaggedReason": "",
        "isVerifiedPurchase": false,
        "createdAt": "2025-01-15T00:00:00.000Z",
        "updatedAt": "2025-01-15T00:00:00.000Z"
    }
}
```
Note: Only customers can create reviews. Admin/manager tokens return `You are not authorized!`. Reviewing the same product twice returns 409. Product must exist, not be deleted/inactive. The review id is pushed to the product's `reviews` array.

### 9.4 PATCH /review/:reviewId/status — Toggle Review Flag (Admin)
```text
PATCH /api/v1/review/review_id_1/status
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Review is now flagged",
    "data": {
        "_id": "review_id_1",
        "isFlagged": true,
        "...": "rest of review fields"
    }
}
```
Note: Toggling recalculates the product's `averageRating`/`ratingCount` (flagged reviews excluded).

### 9.5 DELETE /review/:reviewId — Delete Review (Admin)
```text
DELETE /api/v1/review/review_id_1
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Review deleted successfully",
    "data": {
        "_id": "review_id_1",
        "rating": 4,
        "...": "rest of review fields"
    }
}
```
Note: Hard delete; removes the id from the product's `reviews` array and recalcs the product rating.

---

## 10. Payment Module (Completed ✔)
**Total Routes: 7**

Providers: Stripe (international), SSLCommerz (Bangladesh), bKash (Bangladesh mobile banking).

Amounts are always taken from the order's `finalAmount` — never client-supplied. A paid order (`paymentStatus: "Paid"`) cannot be re-initialized (400). On successful payment, `paymentProvider` (`stripe`/`sslcommerz`/`bkash`) is set on the order.

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/payment/:orderId/stripe/init` | POST | Initiate Stripe (Admin/Customer). Body optional. Uses order currency if Stripe-supported; else converts to USD via FX and stores `fxRate`/`fxBaseCurrency`. |
| 2 | `/payment/stripe/success` | GET/POST | Stripe success callback (`router.all`). Validates session, marks order Paid/Processing, sets `paymentProvider`. |
| 3 | `/payment/stripe/cancel` | GET/POST | Stripe cancel callback (`router.all`). |
| 4 | `/payment/:orderId/sslcommerz/init` | POST | Initiate SSLCommerz (Admin/Customer). Auto-fills customer/shipping fields from the order user's profile; body optional. Amount from `finalAmount`, currency BDT. |
| 5 | `/payment/sslcommerz/validate` | GET/POST | SSLCommerz validate callback (`router.all`). Uses `val_id`; matches order by stored `transactionId`; updates on success. |
| 6 | `/payment/:orderId/bkash/init` | POST | Initiate bKash (Admin/Customer). Body: `customerNumber`. Amount from `finalAmount`. Stores bKash `paymentID` on the order. |
| 7 | `/payment/bkash/validate` | POST | Validate bKash (Admin/Customer). Uses `paymentID`; matches order by stored `transactionId`. |

### 10.1 POST /payment/:orderId/stripe/init — Initiate Stripe (Admin/Customer)
```text
POST /api/v1/payment/order_id_123/stripe/init
Authorization: Bearer <token>
Content-Type: application/json

// body is optional — amount + currency are derived from the order
{}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Stripe payment initiated successfully",
    "data": {
        "success": true,
        "gatewayUrl": "https://checkout.stripe.com/...",
        "sessionId": "cs_test_abc123...",
        "message": "Stripe payment initiated successfully"
    }
}
```
Note: If the order's currency is not Stripe-supported (e.g. `bdt`), the amount is converted to USD via a live FX API and `fxRate` + `fxBaseCurrency` are recorded on the order.

### 10.2 GET|POST /payment/stripe/success — Stripe Success Callback
```text
GET /api/v1/payment/stripe/success?session_id=cs_test_abc123...
// or POST with body { "sessionId": "cs_test_abc123..." }
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Payment validated successfully",
    "data": {
        "success": true,
        "transactionId": "cs_test_abc123...",
        "status": "success",
        "message": "Payment validated successfully"
    }
}
```

### 10.3 GET|POST /payment/stripe/cancel — Stripe Cancel Callback
```text
GET /api/v1/payment/stripe/cancel?session_id=cs_test_abc123...
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Payment validation failed",
    "data": {
        "success": false,
        "status": "cancelled",
        "message": "Payment validation failed"
    }
}
```

### 10.4 POST /payment/:orderId/sslcommerz/init — Initiate SSLCommerz (Admin/Customer)
```text
POST /api/v1/payment/order_id_123/sslcommerz/init
Authorization: Bearer <token>
Content-Type: application/json

// body is optional — customer/shipping fields auto-filled from the order user's profile
{}
```
```json
// Response 200 OK
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
Note: `cus_*`/`ship_*` fields are auto-filled from the user's profile (`name`, `email`, `phoneNo`, `address`, `city`, `state`, `postcode`, `country`) with Dhaka/BD defaults. Any field can be overridden via body. Amount from `finalAmount`, currency BDT.

### 10.5 GET|POST /payment/sslcommerz/validate — SSLCommerz Validate Callback
```text
// POST (SSLCommerz server) or GET (browser redirect)
POST /api/v1/payment/sslcommerz/validate
Content-Type: application/json

{
    "val_id": "val_id_from_callback",
    "tran_id": "ORDER-abc-1234567890"
}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Payment validated successfully",
    "data": {
        "success": true,
        "transactionId": "ORDER-abc-1234567890",
        "status": "success",
        "message": "SSLCommerz payment validated successfully"
    }
}
```

### 10.6 POST /payment/:orderId/bkash/init — Initiate bKash (Admin/Customer)
```text
POST /api/v1/payment/order_id_123/bkash/init
Authorization: Bearer <token>
Content-Type: application/json

{
    "customerNumber": "01712345678"
}
```
```json
// Response 200 OK
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
Note: Amount from `finalAmount`. The bKash `paymentID` is stored on the order as `transactionId` for callback matching.

### 10.7 POST /payment/bkash/validate — Validate bKash (Admin/Customer)
```text
POST /api/v1/payment/bkash/validate
Authorization: Bearer <token>
Content-Type: application/json

{
    "paymentID": "bkash_payment_id_from_callback"
}
```
```json
// Response 200 OK
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
Note: Matches the order by the stored `transactionId` (raw `paymentID`, no prefix).

---

## 11. Settings Module (Completed ✔)
**Total Routes: 4**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/settings` | GET | Get settings (public). Returns the singleton settings doc, cached in memory. |
| 2 | `/settings` | PATCH | Update brand (Admin). Multipart: `data` JSON + optional `logo` + `favicon` files → updates the `brand` sub-doc. |
| 3 | `/settings/:section` | PATCH | Update one section (Admin). Sections: `theme`, `hero`, `testimonials`, `navbar`, `footer`, `contact`, `about`, `limitedOffer`. Invalid section → 400. |
| 4 | `/settings/preset/:niche` | PATCH | Apply a niche preset (Admin). `clothing` \| `perfume_oil` \| `eyewear` — brand + hero + about + contact + footer in one write. Unknown → 400. |

The Settings module is a **single singleton document** (`_id: "singleton"`), created by the seed script (`npm run seed:settings`) prefilled from the `perfume_oil` preset. Each section is a typed sub-schema: `brand` (name/tagline/description/niche/nicheLabel/logo/favicon), `theme` (17 color vars + dark + fonts + radius + globalCss), `hero` (`slides[]`), `testimonials` (`heading` + `items[]`), `navbar` (`links[]` with `children[]` + role `groups`), `footer` (description/columns/socialLinks/copyrightText/newsletter), `contact`, `about` (story/mission/image/stats), `limitedOffer` (enabled/badge/title/subtitle/cta/endsAt). Writes invalidate the in-memory cache. Settings holds site-wide config only — no content collections (products, posts, banners) belong here.

The full settings document format + static default data for the frontend lives in `src/app/modules/settings/docs/settings.json` (and `settings.md`).

### 11.1 GET /settings — Get Settings (Public)
```text
GET /api/v1/settings
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Settings retrieved successfully",
    "data": {
        "_id": "singleton",
        "brand": {
            "name": "Attor",
            "tagline": "Essence of Distinction",
            "description": "Premium perfume oils crafted for the discerning.",
            "niche": "perfume_oil",
            "nicheLabel": "Perfume Oil",
            "logo": "/demo/perfume-oil/logo.png",
            "favicon": ""
        },
        "theme": {
            "colors": { "primary": "oklch(0.514 0.222 16.935)", "...": "17 oklch CSS variables" },
            "dark": { "enabled": false, "colors": {} },
            "fonts": { "family": "Inter", "sizes": { "h1": "2.5rem", "h2": "2rem", "h3": "1.5rem", "body": "1rem", "small": "0.875rem" } },
            "radius": "0.625rem",
            "globalCss": ""
        },
        "hero": {
            "slides": [
                { "image": "/demo/perfume-oil/banner/hero-1.webp", "headline": "Discover Your Signature Scent", "subtext": "...", "ctaText": "Explore Collection", "ctaLink": "/products", "order": 0 }
            ]
        },
        "testimonials": {
            "heading": "What Our Customers Say",
            "items": [
                { "name": "Ayesha Rahman", "role": "Fragrance Collector", "quote": "...", "rating": 5, "avatar": "/demo/perfume-oil/testimonials/tm-3.jpg", "order": 0 }
            ]
        },
        "navbar": {
            "links": [{ "label": "Home", "url": "/", "order": 0, "children": [] }],
            "groups": {
                "public": [{ "label": "Home", "url": "/", "order": 0, "children": [] }],
                "auth": [{ "label": "Login", "url": "/login", "order": 0, "children": [] }],
                "customer": [{ "label": "My Account", "url": "/dashboard/customer", "order": 0, "children": [] }],
                "admin": [{ "label": "Admin Dashboard", "url": "/dashboard/admin", "order": 0, "children": [] }]
            }
        },
        "footer": {
            "description": "Artisanal perfume oils crafted for those who seek the extraordinary...",
            "columns": [{ "title": "Quick Links", "links": [{ "label": "Products", "url": "/products" }] }],
            "socialLinks": [{ "platform": "twitter", "url": "https://twitter.com/attor" }],
            "copyrightText": "© 2026 Attor. All rights reserved.",
            "newsletter": { "enabled": true, "heading": "Stay in the loop" }
        },
        "contact": {
            "address": "123 Perfume Avenue, New York, NY 10001",
            "phone": "+1 (555) 123-4567",
            "email": "hello@attor.com",
            "hours": "Mon–Sat 9am–6pm",
            "mapEmbedUrl": "",
            "social": { "twitter": "https://twitter.com/attor", "instagram": "https://instagram.com/attor", "facebook": "https://facebook.com/attor" }
        },
        "about": {
            "story": "Attor began with a passion for the ancient art of perfumery...",
            "mission": "We believe fragrance is the most intimate form of expression...",
            "image": "/demo/perfume-oil/about.jpeg",
            "stats": [{ "label": "Founded", "value": "2018" }, { "label": "Oud Variants", "value": "30+" }]
        },
        "limitedOffer": {
            "enabled": false,
            "badge": "Limited Time",
            "title": "Summer Sale",
            "subtitle": "Up to 50% off",
            "ctaText": "Shop Now",
            "ctaLink": "/sale",
            "image": "",
            "endsAt": "2026-08-31T23:59:59.000Z"
        },
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
    }
}
```
Note: Cached in memory; second read is served from cache until a write invalidates it. Returns 404 with "run the settings seed script" if not seeded. See `src/app/modules/settings/docs/settings.json` for the full static default.

### 11.2 PATCH /settings — Update Brand (Admin)
```text
PATCH /api/v1/settings
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
  data: { "brand": { "name": "Attor", "tagline": "New tagline", "description": "...", "niche": "clothing", "nicheLabel": "Clothing" } }
  logo: [optional file upload]
  favicon: [optional file upload]
```
```json
// Response 200 OK
{
    "success": true,
    "message": "Settings updated successfully",
    "data": { "...": "whole updated settings document" }
}
```

### 11.3 PATCH /settings/:section — Update Settings Section (Admin)
```text
PATCH /api/v1/settings/hero
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "slides": [
        { "image": "/demo/perfume-oil/banner/hero-1.webp", "headline": "New Hero Title", "subtext": "Summer Sale", "ctaText": "Shop Now", "ctaLink": "/shop", "order": 0 }
    ]
}
```
```json
// Response 200 OK
{
    "success": true,
    "message": "hero settings updated successfully",
    "data": { "...": "whole updated settings document" }
}
```
Note: Valid sections are `theme`, `hero`, `testimonials`, `navbar`, `footer`, `contact`, `about`, `limitedOffer`. Each has its own body schema; unknown section → 400, invalid body → 400. Writes invalidate the cache. Image uploads (multipart `images` field): hero → `slides[i].image`, testimonials → `items[i].avatar`, about/limitedOffer → `image` (positional).

### 11.4 PATCH /settings/preset/:niche — Apply Niche Preset (Admin)
```text
PATCH /api/v1/settings/preset/clothing
Authorization: Bearer <admin_token>
```
```json
// Response 200 OK
{
    "success": true,
    "message": "clothing preset applied successfully",
    "data": { "...": "whole updated settings document" }
}
```
Note: Valid niches: `clothing`, `perfume_oil`, `eyewear`. Applies brand + hero + about + contact + footer in one write. Unknown → 400.

---

## 12. Activity Module (Completed ✔)
**Total Routes: 4**

| # | Route | Method | Description |
|---|-------|--------|-------------|
| 1 | `/activity` | GET | Get all activities (Admin). QueryBuilder: search/filter/sort/paginate. Newest first. |
| 2 | `/activity/:activityId` | GET | Get single activity (Admin). 404 if missing. |
| 3 | `/activity/:activityId/clear` | PATCH | Remove a single activity (Admin). Returns the removed record. |
| 4 | `/activity/clear` | PATCH | Clear activities (Admin). Body: `{ "clearAll": true }` OR `{ "from", "to" }` date range. Empty body/invalid dates → 400. |

The Activity module is the platform's **audit log**. Every important write across modules (Order, Brand, Category, Product, Review, User, Settings, Coupon, Payment) is logged automatically by the service layer via `ActivityServices.logActivity(...)` — no transaction, fire-and-forget after the main write. Activity shape: `module`, `type` (`create`/`update`/`delete`/`status`/`preset`), `message`, `referenceId`, `reference`, `performedBy`, `metadata`, timestamps. All routes are admin-only; no delete route (clear via the two PATCH routes).

No dedicated test-data section — see `src/app/modules/activity/activity.readme.md` for request/response examples.

---

## Route Summary

| Module | Total Routes |
|--------|--------------|
| User | 5 |
| Auth | 6 |
| Product | 5 |
| Order | 9 |
| Meta | 1 |
| Brand | 5 |
| Category | 4 |
| Coupon | 6 |
| Review | 5 |
| Payment | 7 |
| Settings | 4 |
| Activity | 4 |
| **Total** | **61** |

---

## QA Notes / Observations

1. **Resolved**: Payment readme was updated to match the actual code — Stripe uses `/stripe/success` + `/stripe/cancel` callbacks (hosted Checkout, no `/stripe/validate` route), SSL validate is a no-auth `router.all` that always redirects, bKash validate is authenticated and returns JSON.
2. **Resolved**: `bKash/validate` stays authenticated (admin/customer) — the frontend calls it with the `paymentID` from the bKash callback rather than the gateway calling it directly.
3. **Resolved**: Settings readme added and expanded to the full singleton document format (9 sections + preset route) — see `src/app/modules/settings/settings.readme.md` and `docs/settings.json`.
4. **Resolved**: Settings is now a singleton document with typed sub-schemas (`brand`, `theme`, `hero`, `testimonials`, `navbar`, `footer`, `contact`, `about`, `limitedOffer`) — see §11.
5. When using multer it uploads image first then does validation of creating a product/brand/category or not, and it denies but the photo still is uploaded and on the cloud.
6. **Resolved**: Order/Payment/Product/Coupon/Brand/Category module readmes synced to the code (currency + FX fields on orders, server-side pricing, `my-orders` route, coupon `by-code` route, brand `description`/single-get, category single-get, `isDeleted` soft-delete semantics).