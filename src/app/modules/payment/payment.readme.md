# Payment Module

## Overview
The Payment module handles payment processing through three providers: **Stripe** (international, hosted Checkout), **SSLCommerz** (Bangladesh), and **bKash** (Bangladesh mobile banking). Every provider follows the same two-step pattern: **initiate** (return a gateway URL for the browser to redirect to) and **validate** (confirm the transaction on the gateway callback and mark the order Paid).

## How It Works
1. **Initiate** – Authenticated user calls `POST /payment/:orderId/<provider>/init`. The module loads the order, derives the charge amount **from the order's `finalAmount`** (never client-supplied), calls the provider API, and returns a `gatewayUrl` for the frontend to redirect the browser to. The gateway reference (`stripeSessionId`, `sslSessionKey`, or bKash `transactionId`) is stored on the order for callback matching.
2. **Validate** – The gateway redirects the browser (or posts) back to the validation route. On success, the order's `paymentStatus` becomes `Paid`, `status` becomes `Processing`, and `paymentProvider` (`stripe` / `sslcommerz` / `bkash`) is set. The browser is then redirected to the frontend's `/payment/success` or `/payment/failed` page.

### Provider Details

**Stripe** – Hosted **Checkout Session** flow. Init creates a checkout session and returns its `gatewayUrl`. Validation retrieves the session by `session_id` and checks `payment_status === "paid"`.

**SSLCommerz** – Uses the `sslcommerz-lts` package. Init auto-fills all `cus_*`/`ship_*` fields from the order user's profile (overridable). Validation uses `val_id` (and `tran_id` for order matching) from the gateway callback.

**bKash** – Tokenized checkout API. Init obtains a bearer token, creates a checkout session, and returns the `bkashURL`. Validation executes the payment using `paymentID`.

### Currency strategy (Stripe)
Stripe only supports a subset of currencies. If the order's currency is **not** Stripe-supported (e.g. `bdt`), the `finalAmount` is converted to **USD** via a free FX API (`open.er-api.com`, no key) at init time, rounded to 2 decimals, and the conversion metadata (`fxRate`, `fxBaseCurrency`) is persisted on the order for reconciliation. The charge amount and currency are always derived from the order — never from the client.

### Guards
An already-paid order (`paymentStatus: "Paid"`) cannot be re-initialized → `400 This order has already been paid!`. Missing order → `404`.

## Test Data

### POST /api/v1/payment/:orderId/stripe/init (Initiate Stripe)
**Request:**
```
POST /api/v1/payment/order_id_123/stripe/init
Authorization: Bearer <token>
Content-Type: application/json

// body is optional — amount + currency are derived from the order
{}
```

**Response:**
```json
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
Note: Redirect the browser to `gatewayUrl`. Stripe redirects back to `/api/v1/payment/stripe/success?session_id=...` (or `/stripe/cancel`). The `sessionId` is stored on the order as `stripeSessionId` for callback matching. If the order currency is unsupported (e.g. BDT), the amount is converted to USD and `fxRate`/`fxBaseCurrency` are recorded on the order.

### GET|POST /api/v1/payment/stripe/success (Stripe Success Callback)
**Request (browser redirect after payment):**
```
GET /api/v1/payment/stripe/success?session_id=cs_test_abc123...
```
or **POST** (frontend SDK) with body `{ "sessionId": "cs_test_abc123..." }`.

**Behavior:**
- On success, marks the order `Paid`/`Processing`, sets `paymentProvider: "stripe"` and `transactionId` (the session id), then **redirects the browser** to `<frontend_url>/payment/success?tran_id=...`.
- On failure, redirects to `<frontend_url>/payment/failed`.
- When called via POST, returns JSON instead of redirecting.

### GET|POST /api/v1/payment/stripe/cancel (Stripe Cancel Callback)
```
GET /api/v1/payment/stripe/cancel?session_id=cs_test_abc123...
```
Same handler as success — validation of a non-paid session redirects to the frontend's `/payment/failed` page.

### POST /api/v1/payment/:orderId/sslcommerz/init (Initiate SSLCommerz)
**Request:**
```
POST /api/v1/payment/order_id_123/sslcommerz/init
Authorization: Bearer <token>
Content-Type: application/json

// body is optional — customer/shipping fields are auto-filled from the order user's profile
{}
```

**Response:**
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
Note: Amount from `finalAmount`, currency BDT. `cus_*`/`ship_*` fields are auto-filled from the user's profile (`name`, `email`, `phoneNo`, `address`, `city`, `state`, `postcode`, `country`) with Dhaka/BD defaults; any field can be overridden via body. A `tran_id` is generated and stored on the order as `transactionId`; the gateway `sessionkey` is stored as `sslSessionKey`.

### GET|POST /api/v1/payment/sslcommerz/validate (SSLCommerz Validate Callback)
**Request (SSLCommerz server POST or browser GET redirect):**
```
POST /api/v1/payment/sslcommerz/validate
Content-Type: application/json

{
    "val_id": "val_id_from_callback",
    "tran_id": "DE0402AM31072026A7K9"
}
```
or `GET /api/v1/payment/sslcommerz/validate?val_id=...&tran_id=...`

**Behavior:**
- No auth required — this is the gateway callback.
- On success, finds the order by the stored `transactionId` (the raw unprefixed `tran_id`), marks it `Paid`/`Processing`, sets `paymentProvider: "sslcommerz"`, then **redirects** to `<frontend_url>/payment/success?tran_id=...`.
- On failure/missing `val_id`, redirects to `<frontend_url>/payment/failed?tran_id=...`.

### POST /api/v1/payment/:orderId/bkash/init (Initiate bKash)
**Request:**
```
POST /api/v1/payment/order_id_123/bkash/init
Authorization: Bearer <token>
Content-Type: application/json

{
    "customerNumber": "01712345678"
}
```

**Response:**
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
Note: Amount from `finalAmount`, currency BDT. The bKash `paymentID` is returned as `transactionId` and stored on the order as `transactionId` for callback matching. The gateway `callbackURL` is configured server-side (`config.bkash.callback_url`).

### POST /api/v1/payment/bkash/validate (Validate bKash)
**Request:**
```
POST /api/v1/payment/bkash/validate
Authorization: Bearer <token>
Content-Type: application/json

{
    "paymentID": "bkash_payment_id_from_callback"
}
```

**Response:**
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
Note: Authenticated route. Matches the order by the stored `transactionId` (raw `paymentID`, no prefix) and marks it `Paid`/`Processing` on success.

## Frontend Flow (all providers)
1. Create the order, then call the provider's `init` endpoint with the order id.
2. Redirect the browser to the returned `gatewayUrl`.
3. The gateway redirects back to the backend validation/callback route, which updates the order and **redirects the browser to the frontend**:
   - Success → `<frontend_url>/payment/success?tran_id=...`
   - Failure → `<frontend_url>/payment/failed` (or `?tran_id=...` for SSLCommerz)
4. The frontend success page reads `tran_id` and can call `GET /order/my-orders` / `GET /order/:orderId` to confirm the order is `Paid` / `Processing`.
