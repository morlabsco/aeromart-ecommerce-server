# Coupon Module

## Overview
The Coupon module manages promotional coupon codes. Coupons can offer percentage-based or fixed-amount discounts with configurable minimum order amounts, maximum discount caps, and validity date ranges.

## How It Works
- **Create coupon** – Admin creates coupons with discount rules
- **List coupons** – Admin views all non-deleted coupons (including expired/inactive) with pagination
- **Get by id** – Admin views a single coupon (no expiry/active check)
- **Get by code** – Public route to validate a coupon code; checks date range and active status
- **Update coupon** – Admin updates coupon details by id
- **Delete coupon** – Soft delete (isDeleted flag), coupons are excluded from queries by default
- Coupons auto-validate their date range upon creation

## Test Data

### POST /api/v1/coupon (Create Coupon)
**Request:**
```
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

**Response:**
```json
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

### GET /api/v1/coupon (Get All Coupons)
**Request:**
```
GET /api/v1/coupon
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Coupons retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "data": [{ "_id": "coupon_id", "code": "SAVE20", ... }]
}
```

### GET /api/v1/coupon/:couponId (Get Coupon By Id — Admin)
**Request:**
```
GET /api/v1/coupon/coupon_id
Authorization: Bearer <admin_token>
```

**Response:**
```json
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

### GET /api/v1/coupon/by-code/:code (Get Coupon By Code — Public)
**Request:**
```
GET /api/v1/coupon/by-code/SAVE20
```

**Response:**
```json
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

### PATCH /api/v1/coupon/:couponId (Update Coupon)
**Request:**
```
PATCH /api/v1/coupon/coupon_id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "discountValue": 25,
    "maxDiscountAmount": 250
}
```

**Response:**
```json
{
    "success": true,
    "message": "Coupon updated successfully",
    "data": { "...": "updated coupon object" }
}
```

### DELETE /api/v1/coupon/:couponId (Delete Coupon)
**Request:**
```
DELETE /api/v1/coupon/coupon_id
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Coupon deleted successfully",
    "data": {
        "_id": "coupon_id",
        "isDeleted": true,
        "isActive": false,
        ...
    }
}
```
