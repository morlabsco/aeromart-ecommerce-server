# User Module

## Overview
The User module manages user registration, profiles, and account administration. Supports three roles: `admin`, `manager`, and `customer`. Registration auto-logs in the user and tracks client info (device, browser, IP).

## How It Works
- **Register** – Creates a new user account. Only `customer` role is allowed via registration (admin is seeded separately). Password is hashed with bcrypt. On success, auto-login returns access + refresh tokens.
- **Get All Users** – Admin-only. Lists all users with search, filter, sort, and pagination via QueryBuilder.
- **My Profile** – Authenticated user retrieves their own profile.
- **Update Profile** – Authenticated user updates their profile info (name, gender, DOB, address, etc.). Supports profile photo upload via Multer/Cloudinary.
- **Update User Status** – Admin-only. Toggles a user's `isActive` status to activate/deactivate accounts.

## Test Data

### POST /api/v1/user/register (Register User)
**Request:**
```
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

Client info is automatically captured via the `clientInfoParser` middleware — the above is the shape it populates.

**Response:**
```json
{
    "success": true,
    "message": "User registration completed successfully!",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### GET /api/v1/user (Get All Users)
**Request:**
```
GET /api/v1/user?searchTerm=john&page=1&limit=10
Authorization: Bearer <admin_token>
```

**Response:**
```json
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

### GET /api/v1/user/me (My Profile)
**Request:**
```
GET /api/v1/user/me
Authorization: Bearer <access_token>
```

**Response:**
```json
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

### PATCH /api/v1/user/update-profile (Update Profile)
**Request:**
```
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
Note: To **remove** the current photo, send `photoUrl: ""` (in the `data` JSON, or as a plain field if JSON) — the backend sets `photoUrl` to `null`. A new `profilePhoto` upload overrides it.

**Response:**
```json
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

### PATCH /api/v1/user/:id/status (Update User Status)
**Request:**
```
PATCH /api/v1/user/user_id/status
Authorization: Bearer <admin_token>
```

**Response (if deactivating):**
```json
{
    "success": true,
    "message": "User is now inactive",
    "data": {
        "_id": "user_id",
        "isActive": false,
        "name": "John Doe",
        "email": "customer@example.com",
        ...
    }
}
```
