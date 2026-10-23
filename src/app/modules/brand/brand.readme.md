# Brand Module

## Overview
The Brand module manages product brands. Each brand has a name, an optional description, and an optional logo image. Brands can be soft-deleted by setting `isDeleted: true` and `isActive: false`.

## How It Works
- **List brands** – Public route, returns active brands with pagination
- **Get single brand** – Public route, returns one brand by id
- **Create brand** – Admin-only, validates name uniqueness (case-insensitive), optional logo upload
- **Update brand** – Admin-only, checks name uniqueness before updating, optional logo upload
- **Delete brand** – Admin-only, performs a soft delete (sets `isDeleted: true` and `isActive: false`)
- Brands are linked to products via the brand field

## Test Data

### GET /api/v1/brand (Get All Brands)
**Request:**
```
GET /api/v1/brand?searchTerm=nike&page=1&limit=10
```

**Response:**
```json
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

### GET /api/v1/brand/:id (Get Single Brand)
**Request:**
```
GET /api/v1/brand/brand_id_1
```

**Response:**
```json
{
    "success": true,
    "message": "Brand retrieved successfully",
    "data": { "...": "same structure as list item above" }
}
```
Note: 404 if the brand does not exist or has been soft-deleted (`isDeleted: true`).

### POST /api/v1/brand (Create Brand)
**Request:**
```
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

**Response:**
```json
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

### PATCH /api/v1/brand/:id (Update Brand)
**Request:**
```
PATCH /api/v1/brand/brand_id_1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "name": "Nike Updated",
    "description": "Updated description"
}
```

**Response:**
```json
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

### DELETE /api/v1/brand/:id (Delete Brand)
**Request:**
```
DELETE /api/v1/brand/brand_id_1
Authorization: Bearer <admin_token>
```

**Response:**
```json
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

