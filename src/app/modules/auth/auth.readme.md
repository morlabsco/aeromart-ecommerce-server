# Auth Module

## Overview
The Auth module handles user authentication and account security. It provides login, token refresh, password change, and password reset via OTP verification. Authentication uses JWT access/refresh token pairs with httpOnly cookies.

## How It Works
- **Login** – Authenticates user credentials, tracks client info (device, browser, IP), updates last login timestamp, and returns access + refresh tokens. Refresh token is set as an httpOnly cookie.
- **Refresh Token** – Exchanges a valid refresh token for a new access token without requiring re-login.
- **Change Password** – Authenticated users can change their password by providing their old password and a new one. Old password is validated before updating.
- **Forgot Password** – Sends a 6-digit OTP to the user's email. The OTP is stored as a signed JWT (5-minute expiry).
- **Verify OTP** – Verifies the OTP from the email against the stored JWT token. On success, returns a reset token (signed JWT) for the password reset step.
- **Reset Password** – Accepts the reset token and a new password. Verifies the token, then updates the password.

## Test Data

### POST /api/v1/auth/login (Login)
**Request:**
```
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "customer@example.com",
    "password": "123456"
}
```

Client info is automatically captured via the `clientInfoParser` middleware.

**Response:**
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

### POST /api/v1/auth/refresh-token (Refresh Token)
**Request:**
```
POST /api/v1/auth/refresh-token
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
    "success": true,
    "message": "User logged in successfully!",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### POST /api/v1/auth/change-password (Change Password)
**Request:**
```
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "oldPassword": "123456",
    "newPassword": "newpassword123"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Password changed successfully!",
    "data": null
}
```

### POST /api/v1/auth/forgot-password (Forgot Password)
**Request:**
```
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
    "email": "customer@example.com"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Check your email to reset your password",
    "data": null
}
```

### POST /api/v1/auth/verify-otp (Verify OTP)
**Request:**
```
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
    "email": "customer@example.com",
    "otp": "483291"
}
```

**Response:**
```json
{
    "success": true,
    "message": "OTP verified successfully.",
    "data": {
        "resetToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### POST /api/v1/auth/reset-password (Reset Password)
**Request:**
```
POST /api/v1/auth/reset-password
Content-Type: application/json

{
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "newPassword": "newpassword123"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Password reset successfully!",
    "data": {
        "message": "Password changed successfully"
    }
}
```
