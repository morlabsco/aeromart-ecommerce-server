# Activity Module

## Overview
The Activity module is an **audit log** that records every important write operation across the platform: orders, brands, categories, products, reviews, users, coupons, payments, and settings. It lets admins see what changed, who changed it, and when — and to clear the log (fully or by date range) when needed.

## How It Works
- **Logging** – Other module services call `ActivityServices.logActivity(...)` after a successful write (create / update / delete / status change / preset apply). No transaction is used — the activity write is fire-and-forget after the main operation succeeds, so the log never blocks the primary write.
- **List activities** – Admin-only. Supports search, filter by module/type, sort, and pagination via QueryBuilder. Newest first.
- **Get single activity** – Admin-only.
- **Clear single activity** – Admin-only. Removes one activity record.
- **Clear activities** – Admin-only. Two modes: `{ "clearAll": true }` deletes everything, or `{ "from": "...", "to": "..." }` deletes records created in that date range. An empty body is rejected (400) so the log can't be wiped accidentally.

### Activity shape
| Field | Type | Description |
|---|---|---|
| `module` | enum | `Order` \| `Brand` \| `Category` \| `Product` \| `Review` \| `User` \| `Settings` \| `Coupon` \| `Payment` |
| `type` | enum | `create` \| `update` \| `delete` \| `status` \| `preset` |
| `message` | string | Human-readable summary |
| `referenceId` | ObjectId \| null | The affected document's `_id` (null when N/A) |
| `reference` | string | Short reference (e.g. an orderId like `DE07D08M0001U`) |
| `performedBy` | ObjectId \| null | The user who performed the action (null = guest/system) |
| `metadata` | object | Extra context (e.g. old → new status) |
| `createdAt` / `updatedAt` | date | Timestamps |

## Test Data

### GET /api/v1/activity (Get All Activities)
**Request:**
```
GET /api/v1/activity?module=Order&type=create&page=1&limit=10
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Activities retrieved successfully",
    "meta": { "page": 1, "limit": 10, "total": 12, "totalPage": 2 },
    "data": [
        {
            "_id": "activity_id",
            "module": "Order",
            "type": "create",
            "message": "Order DE07D08M0001U was created",
            "referenceId": "order_id",
            "reference": "DE07D08M0001U",
            "performedBy": "user_id",
            "metadata": { "finalAmount": 1649.98 },
            "createdAt": "2026-08-07T10:00:00.000Z",
            "updatedAt": "2026-08-07T10:00:00.000Z"
        }
    ]
}
```

### GET /api/v1/activity/:activityId (Get Single Activity)
**Request:**
```
GET /api/v1/activity/activity_id
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Activity retrieved successfully",
    "data": { "...": "activity object (same shape as list item)" }
}
```
Note: 404 if the activity does not exist.

### PATCH /api/v1/activity/:activityId/clear (Clear Single Activity)
**Request:**
```
PATCH /api/v1/activity/activity_id/clear
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Activity cleared successfully",
    "data": { "...": "the removed activity object" }
}
```

### PATCH /api/v1/activity/clear (Clear Activities)
**Request — clear everything:**
```
PATCH /api/v1/activity/clear
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "clearAll": true
}
```

**Request — clear a date range:**
```
PATCH /api/v1/activity/clear
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "from": "2026-08-01T00:00:00.000Z",
    "to": "2026-08-07T23:59:59.999Z"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Activities cleared successfully",
    "data": { "deletedCount": 12 }
}
```
Note: `from`/`to` are inclusive date filters on `createdAt`. An empty body or invalid dates → 400.

## Notes
- All routes require the `admin` role (audit log is sensitive).
- No delete route exists — clearing is done via the two `PATCH` routes above.
- The log is append-only by design: activities are never updated, only created and cleared.
