# Login API - Quick Start Guide

## Prerequisites

1. **Node.js** (v14+) and npm
2. **MySQL** database running
3. **Redis** server running
4. **.env** file configured with required variables

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/publicast"

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# JWT Secrets (generate strong random strings)
ACCESS_TOKEN_SECRET=your_long_random_secret_at_least_32_characters
REFRESH_TOKEN_SECRET=your_long_random_secret_at_least_32_characters

# Environment
NODE_ENV=development
PORT=5000
```

### 3. Setup Database

```bash
# Run Prisma migrations
npx prisma migrate dev

# (Optional) Seed test data
npx prisma db seed
```

### 4. Start the Server

**Development** (with auto-reload):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

Server will be running at `http://localhost:5000`

## Testing the Login Flow

### 1. Create a Test User

First, register a user via the registration endpoint (assumes registration is implemented):

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

Then verify OTP (after receiving email):

```bash
POST http://localhost:5000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

### 2. Login

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response**:

```json
{
  "message": "Login successful",
  "role": "USER",
  "redirectUrl": "/user/profile",
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "USER"
  }
}
```

### 3. Access Protected Profile

Save the cookies from login response, then:

```bash
GET http://localhost:5000/api/user/profile
Cookie: accessToken=<token_from_login>; refreshToken=<token_from_login>
```

**Response**:

```json
{
  "message": "User profile retrieved successfully",
  "data": {
    "id": "uuid-here",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-05-10T10:00:00Z"
  }
}
```

### 4. Refresh Token (After 15 minutes)

When access token expires:

```bash
POST http://localhost:5000/api/auth/refresh
Cookie: refreshToken=<token_from_login>
```

New tokens will be set in cookies automatically.

### 5. Logout

```bash
POST http://localhost:5000/api/auth/logout
Cookie: accessToken=<token_from_login>; refreshToken=<token_from_login>
```

**Response**:

```json
{
  "message": "Logout successful"
}
```

## Using with Postman/Thunder Client

### 1. Import Collection

Create a new collection with these requests:

**Register**

```
POST {{baseUrl}}/api/auth/register
Body (JSON):
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test@123456",
  "confirmPassword": "Test@123456"
}
```

**Verify OTP**

```
POST {{baseUrl}}/api/auth/verify-otp
Body (JSON):
{
  "email": "test@example.com",
  "otp": "123456"
}
```

**Login**

```
POST {{baseUrl}}/api/auth/login
Body (JSON):
{
  "email": "test@example.com",
  "password": "Test@123456"
}
```

**Get Profile**

```
GET {{baseUrl}}/api/user/profile
```

Note: Cookies will be auto-managed by Postman after login

**Refresh Token**

```
POST {{baseUrl}}/api/auth/refresh
```

**Logout**

```
POST {{baseUrl}}/api/auth/logout
```

### 2. Set Up Variables

Create an environment with:

- `baseUrl` = `http://localhost:5000`
- `accessToken` = (auto-set from login response)
- `refreshToken` = (auto-set from login response)

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/login.integration.test.js

# Run with verbose output
npm test -- tests/login.integration.test.js --verbose

# Run with coverage
npm test -- --coverage
```

## Common Issues & Solutions

### 429 Too Many Login Attempts

**Problem**: You get "Too many login attempts" after several failed logins

**Solution**:

- Wait 15 minutes for the rate limit to reset
- Or clear Redis: `redis-cli FLUSHDB`
- Or reset specific key: `redis-cli DEL login:attempts:<your-email>`

### 401 Invalid Access Token

**Problem**: Token verification fails

**Possible Causes**:

1. Token expired - Call `/api/auth/refresh`
2. Token tampered - Login again
3. Wrong SECRET in `.env` - Check configuration

**Solution**:

1. Ensure `ACCESS_TOKEN_SECRET` is set correctly in `.env`
2. If changed, all existing tokens become invalid
3. Users need to login again

### 403 Account Not Activated

**Problem**: Can't login after registration

**Reason**: Account status is INACTIVE (waiting for OTP verification)

**Solution**:

1. Check email for OTP
2. Call `/api/auth/verify-otp` with correct OTP
3. After verification, status changes to ACTIVE
4. Now you can login

### Cookie Not Saving

**Problem**: Cookies not persisted by client

**Frontend Solutions**:

1. Ensure `credentials: 'include'` in fetch/axios

   ```javascript
   fetch(url, {
     credentials: "include", // Important!
   });
   ```

2. Check browser cookie settings:
   - Cookies not blocked by privacy settings
   - Domain/Path match API domain

3. Verify HttpOnly flag in response:
   - Check Network tab → Set-Cookie headers
   - Should include `HttpOnly; SameSite=Strict`

### Database Connection Error

```
Error: Can't reach database server
```

**Solution**:

1. Verify MySQL is running: `mysql -u root -p`
2. Check DATABASE_URL is correct in `.env`
3. Ensure database exists: `CREATE DATABASE publicast;`

### Redis Connection Error

```
Error: Redis Client Error
```

**Solution**:

1. Verify Redis is running: `redis-cli ping` should return "PONG"
2. Check REDIS_HOST and REDIS_PORT in `.env`
3. Default is `127.0.0.1:6379`

## Performance Tips

1. **Token Caching**: Store tokens in memory/localStorage (not recommended for sensitive data)
2. **Rate Limit Tuning**: Adjust MAX_FAILED_ATTEMPTS in `login-rate-limit.middleware.js`
3. **Database Indexing**: Ensure `users.email` is indexed for faster lookups
4. **Redis Cleanup**: Implement periodic cleanup of expired rate limit keys

## Security Checklist

- ✅ JWT secrets are minimum 32 characters
- ✅ `NODE_ENV=production` in production
- ✅ HTTPS enabled in production (Secure flag for cookies)
- ✅ Database user has limited permissions
- ✅ Redis protected with password (if remote)
- ✅ Rate limiting enabled and configured
- ✅ HttpOnly cookies enabled
- ✅ SameSite=Strict for CSRF protection

## Next Steps

1. **Implement Registration** - Already have register endpoint
2. **Add Email Verification** - OTP already implemented
3. **Add Logout Handler** - Implemented in this release
4. **Add Password Reset** - Consider implementing
5. **Add Device Management** - Track multiple logins
6. **Add Two-Factor Authentication** - Enhance security

## Support

For issues:

1. Check logs: `npm run dev` shows console output
2. Check database: `npx prisma studio`
3. Check Redis: `redis-cli`
4. Review code: Check `/src` directory structure
