# Meta Module

## Overview
The Meta module provides administrative dashboard metadata and analytics. It aggregates data from all other modules (products, orders, users, brands, categories, reviews) to give a comprehensive overview of the e-commerce platform health.

## How It Works
The module queries counts and aggregations across multiple collections in real-time:
- **User count** – Active registered users
- **Product count** – Active products
- **Order count** – Total orders placed
- **Revenue** – Sum of `finalAmount` from paid orders
- **Category/Brand/Review counts** – Active records from each module
- **Recent orders** – Orders placed in the last 7 days
- **Low stock products** – Products with stock < 5

## Test Data

### GET /api/v1/meta (Get Metadata)

**Request:**
```
GET /api/v1/meta
Authorization: Bearer <admin_token>
```

**Response:**
```json
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
