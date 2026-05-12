# System Architecture Diagrams

## 1. Login System Architecture - 3 Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Client/Browser                                              │   │
│  │  - HTML Form Login                                           │   │
│  │  - Fetch with credentials: 'include'                         │   │
│  │  - Receive HttpOnly Cookies (accessToken, refreshToken)     │   │
│  │  - Auto-manage tokens                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Express.js API Server                                        │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  Route: POST /api/auth/login                                 │  │
│  │    ↓                                                          │  │
│  │  [1] loginRateLimiter.middleware()                           │  │
│  │      - Check: max 5 failed attempts per 15 minutes           │  │
│  │      - Track by: email + IP address                          │  │
│  │      - Response: 429 if exceeded                             │  │
│  │    ↓                                                          │  │
│  │  [2] loginValidation (express-validator)                     │  │
│  │      - Check: email format valid                             │  │
│  │      - Check: password length ≥ 8                            │  │
│  │      - Response: 400 if validation fails                     │  │
│  │    ↓                                                          │  │
│  │  [3] authController.login()                                  │  │
│  │      - Call: authService.login(email, password)              │  │
│  │      - Response: 200 + cookies + role + redirectUrl         │  │
│  │    ↓                                                          │  │
│  │  Route: GET /api/user/profile                                │  │
│  │    ↓                                                          │  │
│  │  [1] verifyAuth (auth.middleware.js)                         │  │
│  │      - Extract: token from cookie or header                  │  │
│  │      - Verify: jwt.verify(token, ACCESS_TOKEN_SECRET)       │  │
│  │      - Attach: req.user = decoded payload                    │  │
│  │      - Response: 401/403 if invalid                          │  │
│  │    ↓                                                          │  │
│  │  [2] authorizeUser (authorization.middleware.js)             │  │
│  │      - Check: req.user.role === 'USER'                      │  │
│  │      - Response: 403 if wrong role                           │  │
│  │    ↓                                                          │  │
│  │  [3] profileController.getUserProfile()                      │  │
│  │      - Query: userRepository.findById(req.user.id)           │  │
│  │      - Response: 200 + user profile data                     │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Business Logic Classes:                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  authService.js                                               │  │
│  │    - login(email, password) → {accessToken, refreshToken}    │  │
│  │    - refreshTokens(token, userId) → {newTokens}             │  │
│  │    - logout(userId)                                          │  │
│  │                                                              │  │
│  │  jwtUtils.js                                                 │  │
│  │    - generateAccessToken(payload) - 15 min expiry           │  │
│  │    - generateRefreshToken(payload) - 7 days expiry          │  │
│  │    - verifyAccessToken(token)                               │  │
│  │    - verifyRefreshToken(token)                              │  │
│  │    - hashRefreshToken(token) - SHA-256                      │  │
│  │                                                              │  │
│  │  loginRateLimiter.js                                         │  │
│  │    - checkLoginAttempt(email, ip)                           │  │
│  │    - recordFailedAttempt(email, ip)                         │  │
│  │    - resetAttempts(email, ip)                               │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Database (MySQL + Prisma ORM)                               │  │
│  │    User {                                                    │  │
│  │      id: UUID                                               │  │
│  │      email: string (unique)                                 │  │
│  │      fullName: string                                       │  │
│  │      role: 'USER' | 'ADMIN'                                 │  │
│  │      status: 'ACTIVE' | 'INACTIVE' | 'BANNED'               │  │
│  │      accounts: UserAccount[] (password_hash stored here)    │  │
│  │    }                                                        │  │
│  │                                                              │  │
│  │  userRepository.js                                           │  │
│  │    - findByEmail(email) → User | null                       │  │
│  │    - findById(id) → User | null                             │  │
│  │    - findByEmailWithPassword(email) → User + passwordHash   │  │
│  │    - updateStatus(email, status, verifiedAt)               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Redis (Key-Value Store)                                     │  │
│  │    Keys:                                                     │  │
│  │    - login:attempts:{email} → count (TTL: 15 min)           │  │
│  │    - login:attempts:{ip} → count (TTL: 15 min)              │  │
│  │    - refresh:{userId} → SHA256(refreshToken) (TTL: 7 days)  │  │
│  │                                                              │  │
│  │  redisClient.js                                              │  │
│  │    - Used by: loginRateLimiter, authService                 │  │
│  │    - Operations: GET, SET, INCR, DEL, EXPIRE                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

Legend:
  [1] = First middleware/step
  ↓   = Flow direction
  →   = Data passing
```

---

## 2. Login Request Flow Diagram

```
Client                          Server                         Database/Redis
  │                               │                                  │
  │  POST /api/auth/login         │                                  │
  │  {email, password}            │                                  │
  ├──────────────────────────────>│                                  │
  │                               │  checkLoginAttempt()            │
  │                               ├─────────────────────────────────>│
  │                               │<─ allowed, attempts, resetIn ────┤
  │                               │                                  │
  │                               │  [Rate limit check: OK]          │
  │                               │                                  │
  │                               │  [Email validation: OK]          │
  │                               │  [Password validation: OK]       │
  │                               │                                  │
  │                               │  findByEmailWithPassword()       │
  │                               ├─────────────────────────────────>│
  │                               │<─ User {id, email, role, ...} ───┤
  │                               │                                  │
  │                               │  [Status check: ACTIVE]          │
  │                               │                                  │
  │                               │  bcrypt.compare(password, hash)  │
  │                               │  [Password match: ✓]             │
  │                               │                                  │
  │                               │  generateAccessToken()           │
  │                               │  generateRefreshToken()          │
  │                               │  hashRefreshToken()              │
  │                               │                                  │
  │                               │  SET refresh:{userId} <hash>     │
  │                               ├─────────────────────────────────>│
  │                               │<─ OK (TTL: 7 days) ──────────────┤
  │                               │                                  │
  │                               │  recordFailedAttempt() [skipped] │
  │                               │  resetAttempts()                 │
  │                               ├─────────────────────────────────>│
  │                               │<─ OK ─────────────────────────────┤
  │                               │                                  │
  │  200 OK                        │                                  │
  │  Set-Cookie: accessToken       │                                  │
  │  Set-Cookie: refreshToken      │                                  │
  │  {message, role, redirectUrl}  │                                  │
  │<──────────────────────────────┤                                  │
  │                               │                                  │
  ├─────── Redirect to role URL ──>│                                  │
```

---

## 3. Protected Route Access Flow

```
Client                          Server                         Database/Redis
  │                               │                                  │
  │  GET /api/user/profile         │                                  │
  │  (Cookie: accessToken)         │                                  │
  ├──────────────────────────────>│                                  │
  │                               │  [Auth Middleware]              │
  │                               │  - Extract token from cookie    │
  │                               │  - jwt.verify(token, SECRET)    │
  │                               │  - Attach req.user = decoded    │
  │                               │                                  │
  │                               │  [Authorization Middleware]     │
  │                               │  - Check: req.user.role         │
  │                               │  - Role required: 'USER'        │
  │                               │  - Result: ✓ Allowed            │
  │                               │                                  │
  │                               │  [Controller]                   │
  │                               │  getUserProfile(req, res)       │
  │                               │  findById(req.user.id)          │
  │                               ├─────────────────────────────────>│
  │                               │<─ User profile data ──────────────┤
  │                               │                                  │
  │  200 OK                        │                                  │
  │  {message, data: {user}}       │                                  │
  │<──────────────────────────────┤                                  │
```

---

## 4. Token Refresh Flow

```
Client                          Server                         Database/Redis
  │                               │                                  │
  │  POST /api/auth/refresh        │                                  │
  │  (Cookie: refreshToken)        │                                  │
  ├──────────────────────────────>│                                  │
  │                               │  [Extract & Verify]             │
  │                               │  - Get token from cookie        │
  │                               │  - jwt.verify(token, SECRET)    │
  │                               │  - Decode: userId               │
  │                               │                                  │
  │                               │  GET refresh:{userId}           │
  │                               ├─────────────────────────────────>│
  │                               │<─ storedHash ──────────────────┤
  │                               │                                  │
  │                               │  hashRefreshToken(token)        │
  │                               │  Compare: hash === storedHash   │
  │                               │  Result: ✓ Match                │
  │                               │                                  │
  │                               │  findById(userId)               │
  │                               ├─────────────────────────────────>│
  │                               │<─ User {status: ACTIVE} ────────┤
  │                               │                                  │
  │                               │  [Token Generation]             │
  │                               │  - generateAccessToken()        │
  │                               │  - generateRefreshToken()       │
  │                               │  - hashRefreshToken()           │
  │                               │                                  │
  │                               │  DEL refresh:{oldUserId}        │
  │                               ├─────────────────────────────────>│
  │                               │<─ OK ─────────────────────────────┤
  │                               │                                  │
  │                               │  SET refresh:{userId} <newHash> │
  │                               ├─────────────────────────────────>│
  │                               │<─ OK (TTL: 7 days) ──────────────┤
  │                               │                                  │
  │  200 OK                        │                                  │
  │  Set-Cookie: accessToken (new) │                                  │
  │  Set-Cookie: refreshToken(new) │                                  │
  │<──────────────────────────────┤                                  │
```

---

## 5. Rate Limiting Flow

```
Request Counter in Redis (per email & IP)

Attempt 1 (Failed)
  ├─ redis.incr("login:attempts:user@email.com") → 1
  ├─ redis.expire("login:attempts:user@email.com", 900) ✓
  └─ Allowed: YES

Attempt 2 (Failed)
  ├─ redis.incr("login:attempts:user@email.com") → 2
  └─ Allowed: YES (2 < 5)

Attempt 3 (Failed)
  ├─ redis.incr("login:attempts:user@email.com") → 3
  └─ Allowed: YES (3 < 5)

Attempt 4 (Failed)
  ├─ redis.incr("login:attempts:user@email.com") → 4
  └─ Allowed: YES (4 < 5)

Attempt 5 (Failed)
  ├─ redis.incr("login:attempts:user@email.com") → 5
  └─ Allowed: YES (5 == 5, not exceeded yet)

Attempt 6 (Failed)
  ├─ redis.get("login:attempts:user@email.com") → 5
  └─ Allowed: NO ✗
     Response: 429 Too Many Requests
     Response Body: {message, resetIn: 245}

[15 minutes later]
  ├─ redis.get("login:attempts:user@email.com") → nil (expired)
  └─ Counter reset, attempts can be made again

OR [Successful Login]
  ├─ redis.del("login:attempts:user@email.com") ✓
  ├─ redis.del("login:attempts:IP_ADDRESS") ✓
  └─ Counter reset immediately
```

---

## 6. JWT Token Structure

```
ACCESS TOKEN (15 minutes)
┌────────────────────────────────────────────┐
│ Header                                     │
├────────────────────────────────────────────┤
│ {"alg":"HS256","typ":"JWT"}                │
├────────────────────────────────────────────┤
│ Payload                                    │
├────────────────────────────────────────────┤
│ {                                          │
│   "id": "550e8400-e29b-41d4-a716-...",    │
│   "email": "user@example.com",             │
│   "role": "USER",                          │
│   "iat": 1652168000,                       │
│   "exp": 1652169000                        │
│ }                                          │
├────────────────────────────────────────────┤
│ Signature                                  │
├────────────────────────────────────────────┤
│ HMAC-SHA256(                               │
│   base64url(header) + "." +                │
│   base64url(payload),                      │
│   ACCESS_TOKEN_SECRET                      │
│ )                                          │
└────────────────────────────────────────────┘

REFRESH TOKEN (7 days)
┌────────────────────────────────────────────┐
│ Header                                     │
├────────────────────────────────────────────┤
│ {"alg":"HS256","typ":"JWT"}                │
├────────────────────────────────────────────┤
│ Payload                                    │
├────────────────────────────────────────────┤
│ {                                          │
│   "id": "550e8400-e29b-41d4-a716-...",    │
│   "iat": 1652168000,                       │
│   "exp": 1659427200                        │
│ }                                          │
├────────────────────────────────────────────┤
│ Signature                                  │
├────────────────────────────────────────────┤
│ HMAC-SHA256(                               │
│   base64url(header) + "." +                │
│   base64url(payload),                      │
│   REFRESH_TOKEN_SECRET                     │
│ )                                          │
└────────────────────────────────────────────┘

Cookie Storage
┌────────────────────────────────────────────┐
│ accessToken Cookie                         │
├────────────────────────────────────────────┤
│ Name: accessToken                          │
│ Value: <JWT_TOKEN>                         │
│ HttpOnly: true (JS cannot access)          │
│ Secure: true (HTTPS only in production)    │
│ SameSite: Strict (CSRF protection)         │
│ MaxAge: 15 minutes (900 seconds)           │
│ Path: /                                    │
├────────────────────────────────────────────┤
│ refreshToken Cookie                        │
├────────────────────────────────────────────┤
│ Name: refreshToken                         │
│ Value: <JWT_TOKEN>                         │
│ HttpOnly: true                             │
│ Secure: true                               │
│ SameSite: Strict                           │
│ MaxAge: 7 days (604800 seconds)            │
│ Path: /                                    │
└────────────────────────────────────────────┘
```

---

## 7. Authorization Matrix

```
Role    → /user/profile    /admin/profile
         ────────────────  ───────────────
USER      ✓ Allow (200)    ✗ Deny (403)
ADMIN     ✗ Deny (403)     ✓ Allow (200)
```

---

## 8. Error Handling Flow

```
Login Request
    │
    ├─> Rate Limiter Check
    │   ├─ Exceeded? ────> 429 Too Many Requests
    │   └─ OK? ─┐
    │           │
    └──────────>├─> Validation Check
                │   ├─ Invalid email? ──> 400 Bad Request
                │   ├─ Invalid password? > 400 Bad Request
                │   └─ OK? ──┐
                │            │
                └───────────>├─> Database Query
                             │   ├─ User not found? → 401 Invalid Credentials
                             │   └─ Found? ──┐
                             │               │
                             └──────────────>├─> Status Check
                                            │   ├─ INACTIVE? → 403 Account Not Activated
                                            │   ├─ BANNED? ──→ 403 Account Banned
                                            │   └─ ACTIVE? ──┐
                                            │                │
                                            └───────────────>├─> Password Verify
                                                            │   ├─ Invalid? → 401 Invalid Credentials
                                                            │   └─ Valid? ──┐
                                                            │               │
                                                            └──────────────>├─> Success
                                                                           │
                                                                           └─> 200 OK + Tokens
```

---

## 9. Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         app.js                                    │
│  - Express server initialization                                  │
│  - CORS, JSON parser, cookie parser                               │
│  - Routes registration                                            │
└─────────────────┬──────────────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┬────────────────┐
        │                    │                │
        ▼                    ▼                ▼
┌──────────────┐   ┌──────────────────┐   ┌─────────────┐
│ auth.routes  │   │ profile.routes   │   │ other routes│
│              │   │                  │   │             │
│ POST /login  │   │ GET /user/prof   │   │             │
│ POST /refresh│   │ GET /admin/prof  │   │             │
│ POST /logout │   │                  │   │             │
└───┬──────────┘   └────┬─────────────┘   └─────────────┘
    │                   │
    │                   │ ┌─────────────────────┐
    │                   │ │ verifyAuth (JWT)    │
    │                   │ │ authorize (Role)    │
    │                   └─┤ profileController   │
    │                     └─────────────────────┘
    │
    │  ┌────────────────────────────────┐
    ├─>│ Middleware Chain:               │
    │  │ 1. loginRateLimiter            │
    │  │ 2. validation                  │
    │  │ 3. authController.login()      │
    │  └────────────────────────────────┘
    │
    │  ┌────────────────────────────────┐
    └─>│ authService                     │
       │ - login()                      │
       │ - refreshTokens()              │
       │ - logout()                     │
       └────┬──────────────────────────┘
            │
     ┌──────┴──────┬──────────────┐
     │             │              │
     ▼             ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐
│ bcrypt  │  │ jwtUtils │  │ redisClient  │
│         │  │          │  │              │
│compare()│  │generate()│  │ rate limit   │
│hash()   │  │verify()  │  │ refresh token│
└────┬────┘  └────┬─────┘  └──────────────┘
     │            │
     │            └──> Database (Prisma + MySQL)
     │
     └──> userRepository
          - findByEmail()
          - findById()
          - updateStatus()
```

---

## 10. Security Layers

```
┌────────────────────────────────────────────────┐
│ LAYER 1: Transport Security                     │
│ - HTTPS (Secure flag in production)             │
│ - TLS/SSL encryption                           │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ LAYER 2: Cookie Security                       │
│ - HttpOnly: No JS access (prevents XSS)        │
│ - SameSite=Strict: Prevents CSRF               │
│ - Secure: HTTPS only in production             │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ LAYER 3: Token Security                        │
│ - JWT signed with secret (verifies integrity)  │
│ - Short expiry (15 min access token)           │
│ - Token rotation on refresh                    │
│ - Separate secrets for access & refresh       │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ LAYER 4: Password Security                     │
│ - Bcrypt hashing with salt                     │
│ - Secure comparison (constant time)            │
│ - Never logged or exposed                      │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ LAYER 5: Rate Limiting                         │
│ - Max 5 failed attempts per 15 minutes         │
│ - IP + Email tracking                          │
│ - Automatic reset after timeout                │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ LAYER 6: Authorization                         │
│ - Role-based access control (USER/ADMIN)      │
│ - Middleware enforcement                       │
│ - Clear error messages                         │
└────────────────────────────────────────────────┘
```

---

Generated with Mermaid diagram support - these can be visualized in GitHub, GitLab, or compatible markdown renderers.
