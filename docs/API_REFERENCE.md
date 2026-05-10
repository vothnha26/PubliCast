# Login System - API Reference

## Base URL

```
http://localhost:5000/api/auth
```

## Authentication Methods

All endpoints use **HttpOnly Cookies** for token storage:

- `accessToken` - JWT token (15-minute expiry)
- `refreshToken` - JWT token (7-day expiry)

## Endpoints

---

## POST /auth/login

Authenticate user with email and password.

### Request

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Parameters

| Parameter | Type   | Required | Description                             |
| --------- | ------ | -------- | --------------------------------------- |
| email     | string | Yes      | User email address (valid email format) |
| password  | string | Yes      | User password (minimum 8 characters)    |

### Response - Success (200)

```json
{
  "message": "Login successful",
  "role": "USER",
  "redirectUrl": "/user/profile",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "USER"
  }
}
```

**Headers Set**:

```
Set-Cookie: accessToken=<jwt_token>; Path=/; HttpOnly; SameSite=Strict; Max-Age=900
Set-Cookie: refreshToken=<jwt_token>; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800
```

### Response - Validation Error (400)

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Invalid email address",
      "path": "email",
      "location": "body"
    },
    {
      "type": "field",
      "value": "short",
      "msg": "Password must be at least 8 characters long",
      "path": "password",
      "location": "body"
    }
  ]
}
```

### Response - Invalid Credentials (401)

```json
{
  "message": "Invalid email or password"
}
```

### Response - Account Not Activated (403)

```json
{
  "message": "Account not activated. Please verify your email first."
}
```

### Response - Account Banned (403)

```json
{
  "message": "Your account has been banned"
}
```

### Response - Rate Limit Exceeded (429)

```json
{
  "message": "Too many login attempts. Please try again later.",
  "resetIn": 300
}
```

### Rate Limiting

- **Max attempts**: 5 failed login attempts per 15 minutes
- **Tracked by**: Email address and IP address
- **Reset**: After successful login or 15-minute window expires

---

## POST /auth/forgot-password

Request an OTP to reset password. The API always returns `200` for valid email format, even if the email does not exist, to avoid leaking account information.

### Request

```http
POST /api/auth/forgot-password HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Response - Success (200)

```json
{
  "message": "OTP sent if email exists"
}
```

### Response - Validation Error (400)

```json
{
  "message": "Validation failed",
  "errors": []
}
```

### Rate Limiting

- **Max requests**: 3 requests per 15 minutes
- **Tracked by**: IP address

---

## POST /auth/reset-password

Verify forgot-password OTP and set a new password.

### Request

```http
POST /api/auth/reset-password HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

### Response - Success (200)

```json
{
  "message": "Password reset successfully"
}
```

### Response - OTP Expired (400)

```json
{
  "message": "OTP has expired, please request again"
}
```

### Response - Invalid OTP (400)

```json
{
  "message": "Invalid OTP. 2 attempts remaining",
  "remainingAttempts": 2
}
```

After 3 wrong OTP attempts, the OTP is deleted and the user must request a new one.

### Response - New Password Same As Old (400)

```json
{
  "message": "New password must differ from old"
}
```

### Rate Limiting

- **Max requests**: 5 requests per 15 minutes
- **Tracked by**: IP address

---

## POST /auth/refresh

Refresh access token using refresh token.

### Request

```http
POST /api/auth/refresh HTTP/1.1
Cookie: refreshToken=<jwt_token>
```

### Parameters

No body parameters required. Token is read from cookies.

### Response - Success (200)

```json
{
  "message": "Token refreshed successfully"
}
```

**Headers Set**:

```
Set-Cookie: accessToken=<new_jwt_token>; Path=/; HttpOnly; SameSite=Strict; Max-Age=900
Set-Cookie: refreshToken=<new_jwt_token>; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800
```

**Note**: New refresh token is issued (token rotation)

### Response - Missing Token (401)

```json
{
  "message": "Refresh token required"
}
```

### Response - Invalid Token (401)

```json
{
  "message": "Invalid refresh token"
}
```

### Response - Token Expired (401)

```json
{
  "message": "Refresh token expired"
}
```

---

## POST /auth/logout

Logout user and invalidate refresh token.

### Request

```http
POST /api/auth/logout HTTP/1.1
Cookie: accessToken=<jwt_token>; refreshToken=<jwt_token>
```

### Response - Success (200)

```json
{
  "message": "Logout successful"
}
```

**Headers Set**:

```
Set-Cookie: accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
Set-Cookie: refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

### Response - Not Authenticated (401)

```json
{
  "message": "Authentication required"
}
```

---

## GET /user/profile

Get authenticated user's profile.

**Requires**: `USER` role

### Request

```http
GET /api/user/profile HTTP/1.1
Cookie: accessToken=<jwt_token>
Authorization: Bearer <jwt_token>
```

### Response - Success (200)

```json
{
  "message": "User profile retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-05-10T10:30:00Z"
  }
}
```

### Response - Not Authenticated (401)

```json
{
  "message": "Access token required"
}
```

### Response - Invalid Role (403)

```json
{
  "message": "Access denied. Only USER roles are allowed."
}
```

### Response - User Not Found (404)

```json
{
  "message": "User not found"
}
```

---

## GET /admin/profile

Get authenticated admin's profile.

**Requires**: `ADMIN` role

### Request

```http
GET /api/admin/profile HTTP/1.1
Cookie: accessToken=<jwt_token>
Authorization: Bearer <jwt_token>
```

### Response - Success (200)

```json
{
  "message": "Admin profile retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "avatarUrl": "https://example.com/admin-avatar.jpg",
    "role": "ADMIN",
    "status": "ACTIVE",
    "createdAt": "2026-05-10T08:00:00Z"
  }
}
```

### Response - Not Authenticated (401)

```json
{
  "message": "Access token required"
}
```

### Response - Invalid Role (403)

```json
{
  "message": "Access denied. Only ADMIN roles are allowed."
}
```

---

## Error Codes Summary

| Code | Message                   | Meaning                       |
| ---- | ------------------------- | ----------------------------- |
| 400  | Validation failed         | Input validation error        |
| 401  | Invalid email or password | Credentials don't match       |
| 401  | Access token required     | Missing authentication        |
| 401  | Access token expired      | Token expired, need refresh   |
| 401  | Invalid refresh token     | Refresh token is invalid      |
| 400  | OTP has expired           | Forgot-password OTP expired   |
| 400  | Invalid OTP               | Forgot-password OTP mismatch  |
| 400  | New password must differ  | New password equals old one   |
| 403  | Account not activated     | Email not verified yet        |
| 403  | Account banned            | Account is banned             |
| 403  | Access denied             | Insufficient role permissions |
| 404  | User not found            | User doesn't exist            |
| 429  | Too many login attempts   | Rate limit exceeded           |
| 500  | Internal server error     | Server error                  |

---

## Authentication Flow Diagram

```
┌──────────────────┐
│   Client/Browser │
└────────┬─────────┘
         │
         │ 1. POST /login {email, password}
         │
         ▼
┌──────────────────────────────────┐
│   Rate Limiter Middleware        │
│   (check: max 5 attempts/15min)   │
└────────┬────────────────────────┘
         │
         │ 2. POST /login {email, password}
         │
         ▼
┌──────────────────────────────────┐
│   Validation Middleware          │
│   (check: email, password length) │
└────────┬────────────────────────┘
         │
         │ 3. POST /login {email, password}
         │
         ▼
┌──────────────────────────────────┐
│   Auth Controller.login()        │
│   - Find user in DB              │
│   - Verify password (bcrypt)     │
│   - Generate tokens (JWT)        │
│   - Store refresh in Redis       │
│   - Set HttpOnly cookies         │
└────────┬────────────────────────┘
         │
         │ 4. 200 OK + cookies set
         │
         ▼
┌──────────────────────────────────┐
│   Client receives response       │
│   - role, redirectUrl, user data │
│   - cookies auto-saved           │
└────────┬────────────────────────┘
         │
         │ 5. Redirect to /user/profile or /admin/profile
         │
         ▼
┌──────────────────────────────────┐
│   GET /user/profile (with cookie)│
└────────┬────────────────────────┘
         │
         │ 6. GET /user/profile
         │
         ▼
┌──────────────────────────────────┐
│   Auth Middleware                │
│   (verify JWT from cookie)       │
│   req.user = decoded             │
└────────┬────────────────────────┘
         │
         │ 7. GET /user/profile + req.user
         │
         ▼
┌──────────────────────────────────┐
│   Authorization Middleware       │
│   (check: role === USER)         │
└────────┬────────────────────────┘
         │
         │ 8. GET /user/profile + req.user
         │
         ▼
┌──────────────────────────────────┐
│   Profile Controller             │
│   (return user profile)          │
└────────┬────────────────────────┘
         │
         │ 9. 200 OK { user data }
         │
         ▼
┌──────────────────┐
│   Client/Browser │
└──────────────────┘
```

---

## Token Payload Structure

### Access Token

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1652168000,
  "exp": 1652169000
}
```

- **iat**: Issued at timestamp
- **exp**: Expiration timestamp (15 minutes from issue)

### Refresh Token

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1652168000,
  "exp": 1659427200
}
```

- **iat**: Issued at timestamp
- **exp**: Expiration timestamp (7 days from issue)

---

## Cookie Details

### Access Token Cookie

```
Name: accessToken
Value: <JWT_TOKEN>
Domain: localhost (or your domain)
Path: /
Expires/Max-Age: 15 minutes
HttpOnly: true (not accessible via JavaScript)
Secure: true (HTTPS only in production)
SameSite: Strict (CSRF protection)
```

### Refresh Token Cookie

```
Name: refreshToken
Value: <JWT_TOKEN>
Domain: localhost (or your domain)
Path: /
Expires/Max-Age: 7 days
HttpOnly: true
Secure: true (HTTPS only in production)
SameSite: Strict
```

---

## Best Practices

### 1. Frontend Implementation

```javascript
// Login
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // Important: send cookies
  body: JSON.stringify({ email, password }),
});

// Access protected endpoint
const profile = await fetch("/api/user/profile", {
  method: "GET",
  credentials: "include", // Important: send cookies
});

// Handle token expiry
if (response.status === 401) {
  // Refresh token
  const refreshResponse = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (refreshResponse.ok) {
    // Retry original request
  } else {
    // Redirect to login
  }
}

// Logout
await fetch("/api/auth/logout", {
  method: "POST",
  credentials: "include",
});
```

### 2. Security Headers

Server automatically sets secure cookie flags:

- ✅ HttpOnly - Prevents XSS attacks
- ✅ Secure - HTTPS only (production)
- ✅ SameSite=Strict - CSRF protection

### 3. Token Refresh Strategy

- Access token expires after 15 minutes
- Client detects 401 response
- Call `/api/auth/refresh` to get new token
- New refresh token is issued (rotation)
- Retry original request

---

## Rate Limiting Details

### Algorithm

- **Window**: 15 minutes (900 seconds)
- **Max Attempts**: 5 failed attempts
- **Tracked By**: Email + IP address (both checked)
- **Storage**: Redis with auto-expiry

### Reset Conditions

1. **Successful Login**: Attempts reset to 0
2. **Time Window**: Auto-reset after 15 minutes
3. **Manual Reset**: Via Redis command (admin only)

### Response When Limited

```json
{
  "message": "Too many login attempts. Please try again later.",
  "resetIn": 540
}
```

`resetIn` = seconds until rate limit resets

---

## Testing with cURL

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt
```

### Access Profile

```bash
curl -X GET http://localhost:5000/api/user/profile \
  -b cookies.txt
```

### Refresh Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

---

## Webhook/Event Hooks (Future)

Consider implementing:

- `auth.login.success` - Triggered after successful login
- `auth.login.failed` - Triggered after failed login
- `auth.logout` - Triggered on logout
- `auth.token.refresh` - Triggered on token refresh
- `auth.token.expired` - Triggered when token expires

---

## Version History

### v1.0.0 (Current)

- JWT-based authentication
- Rate limiting (5 attempts/15 min)
- Role-based authorization (USER/ADMIN)
- Token refresh mechanism
- HttpOnly secure cookies
- Profile endpoints

### Future Versions

- [ ] Multi-factor authentication
- [ ] Social OAuth integration
- [ ] Device management
- [ ] Login history
- [ ] Email notifications
