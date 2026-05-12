# Login System Documentation (UC-02)

## Overview

This document describes the complete Login system implementation with JWT authentication, validation, rate limiting, and role-based authorization.

## Architecture

### 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                         │
│  Form Login → HttpOnly Cookie (accessToken, refreshToken)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                BUSINESS LOGIC LAYER                         │
│  Rate Limiter → Validation → Auth Controller → JWT Utils    │
│  → Verify Token MW → Authorization(role) MW                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATA ACCESS LAYER                          │
│  User Model (DB) + Redis (Refresh Token) + JWT Sign/Verify  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. JWT Utilities (`src/utils/jwt.utils.js`)

Manages JWT token generation and verification:

- **`generateAccessToken(payload)`** - Generate 15-minute access token
- **`generateRefreshToken(payload)`** - Generate 7-day refresh token
- **`hashRefreshToken(token)`** - SHA-256 hash for Redis storage
- **`verifyAccessToken(token)`** - Validate access token
- **`verifyRefreshToken(token)`** - Validate refresh token
- **`getTokenExpiry(type)`** - Get token expiry in milliseconds

### 2. Login Rate Limiter (`src/middlewares/login-rate-limit.middleware.js`)

Prevents brute-force attacks:

- **Max Attempts**: 5 failed login attempts per 15 minutes
- **Tracking**: By email and IP address
- **Storage**: Redis with automatic expiry
- **Response**: 429 status with `resetIn` field

**Usage in Routes**:

```javascript
router.post(
  "/login",
  loginRateLimiter.middleware(),
  loginValidation,
  controller,
);
```

### 3. Validation Middleware (`src/middlewares/validation.middleware.js`)

Validates request data:

- **Email**: Valid email format (normalized)
- **Password**: Minimum 8 characters
- **Errors**: Returns 400 with error details

**Login Validation**:

```javascript
body("email").isEmail().normalizeEmail();
body("password").isLength({ min: 8 });
```

### 4. Auth Middleware (`src/middlewares/auth.middleware.js`)

Verifies JWT tokens from cookies or headers:

- **Source**: Cookie (`accessToken`) or Header (`Authorization: Bearer <token>`)
- **Verification**: Uses `ACCESS_TOKEN_SECRET`
- **Success**: Attaches `req.user` with decoded payload
- **Error**: Returns 401 or 403

**Exported Functions**:

- `verifyAuth` - Middleware function

### 5. Authorization Middleware (`src/middlewares/authorization.middleware.js`)

Enforces role-based access control:

- **Roles**: USER or ADMIN
- **Factory**: `authorize(...roles)` creates role-specific middleware
- **Helpers**: `authorizeAdmin`, `authorizeUser`, `authorizeAny`

**Usage**:

```javascript
router.get("/admin/profile", verifyAuth, authorizeAdmin, controller);
router.get("/user/profile", verifyAuth, authorizeUser, controller);
```

### 6. Auth Service (`src/services/auth.service.js`)

Business logic for authentication:

**Methods**:

#### `login(email, password)`

- Validates credentials
- Checks account status (ACTIVE/INACTIVE/BANNED)
- Generates access and refresh tokens
- Stores hashed refresh token in Redis
- Returns tokens and user data

#### `refreshTokens(refreshToken, userId)`

- Validates refresh token signature
- Verifies token exists in Redis
- Generates new token pair (rotation)
- Updates Redis with new token

#### `logout(userId)`

- Deletes refresh token from Redis

### 7. Auth Controller (`src/controllers/auth.controller.js`)

HTTP request handlers:

#### `login(req, res)`

- Calls auth service
- Sets HttpOnly cookies for tokens
- Returns role-based redirect URL
- Records failed attempts on error

#### `refreshToken(req, res)`

- Extracts refresh token from cookie
- Calls service to generate new tokens
- Updates cookies

#### `logout(req, res)`

- Calls service to delete refresh token
- Clears all cookies

### 8. Profile Controller (`src/controllers/profile.controller.js`)

Returns user/admin profile data:

- **`getUserProfile(req, res)`** - For `/api/user/profile`
- **`getAdminProfile(req, res)`** - For `/api/admin/profile`

## API Endpoints

### Authentication Endpoints

#### 1. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200)**:

```json
{
  "message": "Login successful",
  "role": "USER",
  "redirectUrl": "/user/profile",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "User Name",
    "role": "USER"
  }
}
```

**Set-Cookie Headers**:

- `accessToken` (HttpOnly, 15 minutes)
- `refreshToken` (HttpOnly, 7 days)

**Error Responses**:

- `400` - Validation failed
- `401` - Invalid credentials or user not found
- `403` - Account not activated or banned
- `429` - Too many login attempts

#### 2. Refresh Token

```http
POST /api/auth/refresh
Cookie: refreshToken=...
```

**Success Response (200)**:

```json
{
  "message": "Token refreshed successfully"
}
```

**Set-Cookie Headers**:

- New `accessToken`
- New `refreshToken` (rotation)

#### 3. Logout

```http
POST /api/auth/logout
Cookie: accessToken=...; refreshToken=...
```

**Success Response (200)**:

```json
{
  "message": "Logout successful"
}
```

### Profile Endpoints

#### Get User Profile

```http
GET /api/user/profile
Cookie: accessToken=...
```

**Success Response (200)**:

```json
{
  "message": "User profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "User Name",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-05-10T10:00:00Z"
  }
}
```

#### Get Admin Profile

```http
GET /api/admin/profile
Cookie: accessToken=...
```

**Success Response (200)**:

```json
{
  "message": "Admin profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "fullName": "Admin Name",
    "role": "ADMIN",
    "status": "ACTIVE",
    "createdAt": "2026-05-10T10:00:00Z"
  }
}
```

## Data Flow

### Login Flow (Main)

```
1. Client submits: POST /api/auth/login { email, password }
   ↓
2. Rate Limiter checks: max 5 attempts / 15 minutes per IP/email
   ├─ Failed? → 429 Too Many Requests
   └─ Passed? → continue
   ↓
3. Validation checks: email format, password length
   ├─ Failed? → 400 Bad Request
   └─ Passed? → continue
   ↓
4. Auth Controller queries database for user by email
   ├─ Not found? → 401 Invalid credentials
   └─ Found? → continue
   ↓
5. Check account status
   ├─ INACTIVE? → 403 Account not activated
   ├─ BANNED? → 403 Account banned
   └─ ACTIVE? → continue
   ↓
6. Verify password (bcrypt.compare)
   ├─ Invalid? → 401 Invalid credentials
   └─ Valid? → continue
   ↓
7. Generate tokens:
   - Access Token: {id, email, role} + 15m expiry
   - Refresh Token: {id} + 7d expiry
   ↓
8. Hash refresh token (SHA-256)
   ↓
9. Store in Redis: SET refresh:<userId> <hash> EX 604800
   ↓
10. Set HttpOnly cookies
   ↓
11. Reset rate limit counters
   ↓
12. Return 200 with role and redirectUrl
```

### Authorization Flow (Subsequent Requests)

```
1. Client sends request with Cookie: accessToken=...
   ↓
2. verifyAuth middleware:
   - Extract token from cookie
   - jwt.verify(token, ACCESS_TOKEN_SECRET)
   ├─ Invalid? → 403 Forbidden
   ├─ Expired? → 401 Access token expired
   └─ Valid? → attach req.user = decoded
   ↓
3. authorize(role) middleware:
   - Check req.user.role
   ├─ Not allowed? → 403 Forbidden
   └─ Allowed? → continue to controller
   ↓
4. Controller executes business logic
```

### Token Refresh Flow

```
1. Client detects access token expired
   ↓
2. POST /api/auth/refresh with Cookie: refreshToken=...
   ↓
3. Extract refresh token from cookie
   ↓
4. jwt.verify(refreshToken, REFRESH_TOKEN_SECRET)
   ├─ Invalid? → 401 Invalid refresh token
   └─ Valid? → continue
   ↓
5. Hash token and check in Redis: GET refresh:<userId>
   ├─ Not found or mismatch? → 401 Refresh token not found
   └─ Found? → continue
   ↓
6. Get user from database
   ├─ Inactive? → 401 User not found or inactive
   └─ Active? → continue
   ↓
7. Generate new token pair (rotation)
   ↓
8. Delete old token from Redis
   ↓
9. Store new token hash in Redis
   ↓
10. Set new HttpOnly cookies
   ↓
11. Return 200
```

## Database Schema

### User Model (Prisma)

```prisma
model User {
  id          String        @id @default(uuid())
  email       String        @unique
  fullName    String        @map("full_name")
  avatarUrl   String?       @map("avatar_url")
  role        Role          @default(USER)     // USER or ADMIN
  status      Status        @default(INACTIVE) // ACTIVE, INACTIVE, BANNED
  verifiedAt  DateTime?     @map("verified_at")
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  accounts    UserAccount[]
  @@map("users")
}

enum Role {
  USER
  ADMIN
}

enum Status {
  ACTIVE
  INACTIVE
  BANNED
}
```

### Redis Keys

**Login Attempts**:

- Key: `login:attempts:${email}` - Count of failed attempts by email
- Key: `login:attempts:${ip}` - Count of failed attempts by IP
- Expiry: 15 minutes (900 seconds)
- Max Value: 5

**Refresh Tokens**:

- Key: `refresh:${userId}` - SHA-256 hashed refresh token
- Expiry: 7 days (604800 seconds)
- Value: Token hash for verification

## Environment Variables

```env
# JWT Secrets (use strong random strings, min 32 chars)
ACCESS_TOKEN_SECRET=your_access_token_secret_here_min_32_characters
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here_min_32_characters

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Node environment
NODE_ENV=development|production

# Server
PORT=5000
```

## Security Features

### 1. **Password Security**

- Hashed with bcrypt (salt rounds: 10)
- Never stored in plain text
- Compared securely with bcrypt.compare()

### 2. **Token Security**

- JWT signed with SECRET keys
- Stored in HttpOnly cookies (not accessible via JS)
- SameSite: Strict (prevents CSRF)
- Secure flag (HTTPS only in production)
- Short expiry times (15 min for access)

### 3. **Rate Limiting**

- Max 5 failed attempts per 15 minutes
- Tracked by both email and IP
- Incremental backoff with resetIn field
- Automatic Redis expiry

### 4. **Token Rotation**

- New refresh token on every token refresh
- Old token is invalidated
- Detected token reuse would require new login

### 5. **Authorization**

- Role-based access control (RBAC)
- Separate endpoints for USER and ADMIN
- Clear error messages for access denial

## Testing

### Run Tests

```bash
npm test -- tests/login.integration.test.js
```

### Test Coverage

The integration test suite includes:

1. **Login Tests**
   - Valid credentials
   - Invalid credentials
   - Non-existent email
   - Missing fields
   - Invalid email format
   - Inactive account
   - Admin redirect

2. **Authorization Tests**
   - User profile access (USER role)
   - Admin profile access (ADMIN role)
   - Cross-role access denial

3. **Rate Limiting Tests**
   - Allow first 5 attempts
   - Block 6th attempt with 429
   - Reset after successful login

4. **Token Tests**
   - Valid JWT generation
   - HttpOnly cookie setting
   - Token verification

5. **Logout Tests**
   - Successful logout
   - Unauthenticated logout rejection

## Example Implementation

### Frontend Login Example

```javascript
// Login form submission
async function handleLogin(email, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Important: send cookies
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (response.ok) {
    // Redirect based on role
    window.location.href = data.redirectUrl;
  } else {
    // Show error message
    console.error(data.message);
  }
}

// Accessing protected endpoint
async function getProfile() {
  const response = await fetch("/api/user/profile", {
    method: "GET",
    credentials: "include", // Important: send cookies with auth
  });

  return response.json();
}

// Refresh token when expired
async function refreshToken() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  return response.ok;
}
```

### Backend Middleware Usage Example

```javascript
const express = require("express");
const { verifyAuth } = require("./middlewares/auth.middleware");
const { authorizeAdmin } = require("./middlewares/authorization.middleware");

const router = express.Router();

// Protected route - any authenticated user
router.get("/dashboard", verifyAuth, (req, res) => {
  res.json({ user: req.user });
});

// Protected route - admin only
router.delete("/users/:id", verifyAuth, authorizeAdmin, (req, res) => {
  // Admin-only logic
});
```

## Troubleshooting

### Token Expired Errors

- Client should call `/api/auth/refresh` when they receive 401 with "expired" message
- New tokens will be automatically set in cookies

### Rate Limit Errors (429)

- Wait the duration specified in `resetIn` field (seconds)
- System automatically resets after 15 minutes

### Cookie Not Being Set

- Ensure `credentials: 'include'` in fetch/axios calls (frontend)
- Check browser console for cookie settings
- Verify `NODE_ENV=production` for Secure flag

### Authorization Failures (403)

- Verify user's role matches endpoint requirements
- Check that user account status is ACTIVE
- Ensure token hasn't expired

## Future Enhancements

1. **Multi-factor Authentication (MFA)**
   - TOTP/Google Authenticator support
   - Email/SMS verification

2. **Social Login**
   - Google OAuth integration
   - GitHub OAuth integration

3. **Session Management**
   - Device tracking
   - Active sessions list
   - Remote logout capability

4. **Advanced Rate Limiting**
   - Adaptive rate limiting based on risk
   - Geographical IP checking

5. **Audit Logging**
   - Login/logout event logging
   - Failed attempt tracking
   - IP change notifications

6. **Token Blacklist**
   - Explicit token revocation
   - Early logout without Redis

## References

- [JWT.io](https://jwt.io/) - JWT documentation
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [bcryptjs Documentation](https://www.npmjs.com/package/bcryptjs)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
