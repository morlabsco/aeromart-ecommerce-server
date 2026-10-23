# Review Module

## Overview
The Review module handles product reviews and ratings. Customers submit reviews with a rating (1-5) and description. Each user can only submit **one review per product**, and only customers with a **verified purchase** of the product (a `Processing`/`Shipped`/`Completed` order containing it) can submit a review at all. When a review is created, the product's average rating and rating count are automatically updated.

## How It Works
- **List reviews** – Public route, returns non-flagged reviews with user and product details
- **Get single review** – Public route, returns a specific non-flagged review
- **My reviews** – Customer-only. Returns the authenticated customer's own reviews (including flagged ones) with pagination
- **Create review** – Customer-only. Validates: product exists + active, the user **has not already reviewed it**, and the user has a **verified purchase** of the product
- **Verified purchase** – Required to review: the user must have a `Processing`/`Shipped`/`Completed` order containing that product (a `Pending` or `Cancelled` order does not count). Without one, review creation is rejected (403) and `isVerifiedPurchase` is always `true` on created reviews
- **Rating sync** – Creating a review triggers an aggregation to recalculate the product's `averageRating` and `ratingCount`

## Test Data

### GET /api/v1/review (Get All Reviews)
**Request:**
```
GET /api/v1/review?page=1&limit=10
```

**Response:**
```json
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

### GET /api/v1/review/:reviewId (Get Single Review)
**Request:**
```
GET /api/v1/review/review_id_1
```

**Response:**
```json
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

### GET /api/v1/review/my-reviews (My Reviews — Customer)
**Request:**
```
GET /api/v1/review/my-reviews?page=1&limit=10
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
    "success": true,
    "message": "My reviews retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "data": [
        {
            "_id": "review_id_1",
            "rating": 4,
            "description": "Great product! Highly recommended.",
            "user": { "_id": "user_id", "name": "John Doe", "email": "john@example.com", "photoUrl": "" },
            "product": { "_id": "product_id", "name": "Smartphone X", "slug": "smartphone-x" },
            "isFlagged": false,
            "flaggedReason": "",
            "isVerifiedPurchase": true,
            "createdAt": "2025-01-15T00:00:00.000Z",
            "updatedAt": "2025-01-15T00:00:00.000Z"
        }
    ]
}
```
Note: Only the authenticated customer's own reviews, including flagged ones.

### POST /api/v1/review (Create Review)
**Request:**
```
POST /api/v1/review
Authorization: Bearer <user_token>
Content-Type: application/json

{
    "rating": 4,
    "description": "Great product! Highly recommended.",
    "product": "product_id"
}
```

**Response:**
```json
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
        "isVerifiedPurchase": true,
        "createdAt": "2025-01-15T00:00:00.000Z",
        "updatedAt": "2025-01-15T00:00:00.000Z"
    }
}
```
Note: A **verified purchase is required** — the customer must have a `Processing`/`Shipped`/`Completed` order containing this product (a `Pending` or `Cancelled` order does not count). `isVerifiedPurchase` is always `true` on created reviews. Errors: 404 "Product not found!" / 400 "Product is not available!" / 409 "You have already reviewed this product!" / 403 "Only customers who purchased this product can review it!".
