# Category Module

## Overview
The Category module manages product categories with hierarchical support. Categories can have a parent category (subcategories), an icon, and description. Soft-deletion is used for safety.

## How It Works
- **List categories** – Public route, returns active categories with parent reference
- **Get single category** – Public route, returns one category by id
- **Create category** – Admin-only, auto-generates slug from name, validates parent if given
- **Update category** – Admin-only, re-validates name uniqueness and parent reference
- **Delete category** – Admin-only, prevents deletion if subcategories exist, soft-deletes
- Slug is auto-generated from the name before saving

## Test Data

### GET /api/v1/category (Get All Categories)
**Request:**
```
GET /api/v1/category?searchTerm=electronics
```

**Response:**
```json
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

### GET /api/v1/category/:id (Get Single Category)
**Request:**
```
GET /api/v1/category/cat_1
```

**Response:**
```json
{
    "success": true,
    "message": "Category retrieved successfully",
    "data": { "...": "same structure as list item above" }
}
```

### POST /api/v1/category (Create Category)
**Request:**
```
POST /api/v1/category
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "icon": "electronics-icon.png"
}
```

**Response:**
```json
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

### PATCH /api/v1/category/:id (Update Category)
**Request:**
```
PATCH /api/v1/category/cat_1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "description": "Updated description"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Category updated successfully",
    "data": { ... }
}
```

### DELETE /api/v1/category/:id (Delete Category)
**Request:**
```
DELETE /api/v1/category/cat_1
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Category deleted successfully",
    "data": {
        "_id": "cat_1",
        "isActive": false,
        ...
    }
}
```
