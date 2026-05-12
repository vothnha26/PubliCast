# Edit Profile - Testing Guide

## Quick Start

### 1. Setup Environment
- Import `postman-environment.json` vào Postman
- Cập nhật `baseUrl` nếu cần (default: `http://localhost:5000/api`)
- Cập nhật `email` và `password` cho test user của bạn

### 2. Test Workflow

#### Scenario 1: Complete Flow
```
1. REGISTER
   ↓
2. VERIFY OTP (check email for OTP code, typically 123456 in dev)
   ↓
3. LOGIN (lấy JWT tokens)
   ↓
4. GET USER PROFILE (verify you're logged in)
   ↓
5. EDIT PROFILE (update fullName and/or avatarUrl)
   ↓
6. GET USER PROFILE (verify changes)
```

#### Scenario 2: Only Edit Profile (if already logged in)
```
1. LOGIN (lấy access token)
2. EDIT PROFILE (update profile data)
3. GET USER PROFILE (verify changes)
```

### 3. Test Cases

#### 3.1 Success Test
**Request:**
```http
PUT http://localhost:5000/api/profile/edit
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "fullName": "Updated Name",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Expected Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "fullName": "Updated Name",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-05-10T...",
    "updatedAt": "2026-05-10T..."
  }
}
```

#### 3.2 Validation Errors

**Test: Invalid Avatar URL**
```json
{
  "fullName": "John Doe",
  "avatarUrl": "not-a-valid-url"
}
```
Expected: `400 Bad Request`

**Test: Full Name Too Short**
```json
{
  "fullName": "A"
}
```
Expected: `400 Bad Request`

**Test: Full Name Too Long**
```json
{
  "fullName": "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco"
}
```
Expected: `400 Bad Request`

#### 3.3 Authentication Errors

**Test: Missing Token**
```http
PUT http://localhost:5000/api/profile/edit
Content-Type: application/json

{
  "fullName": "John Doe"
}
```
Expected: `401 Unauthorized` - "Access token required"

**Test: Invalid Token**
```http
PUT http://localhost:5000/api/profile/edit
Authorization: Bearer invalid_token_here
Content-Type: application/json

{
  "fullName": "John Doe"
}
```
Expected: `403 Forbidden` - "Invalid or expired token"

**Test: Expired Token**
(Use a token that has expired)
Expected: `401 Unauthorized` - "Access token expired. Please refresh."

#### 3.4 Account Status Errors

**Test: Banned Account**
(If your account is banned)
Expected: `403 Forbidden` - "Account banned"

#### 3.5 User Not Found

**Test: Invalid User ID in Token**
(Manually modify token payload - not recommended in production)
Expected: `404 Not Found` - "User not found"

### 4. Postman Collection Tests

The collection includes automated test scripts for:
- ✅ Successful profile update
- ✅ Validation error handling
- ✅ Authentication error handling
- ✅ Invalid URL format rejection
- ✅ Full name length validation

### 5. Running Tests in Postman

1. **Using Postman Runner:**
   - Open Postman → Collections → Select collection
   - Click "Run"
   - Select environment "PubliCast Login API - Development"
   - Run the requests in order

2. **Using Postman CLI:**
   ```bash
   npm install -g newman
   newman run postman-collection.json -e postman-environment.json
   ```

### 6. Key Validation Rules

| Field | Rules | Examples |
|-------|-------|----------|
| fullName | Optional, 2-100 chars | ✅ "John Doe", ❌ "A", ❌ "Lorem ipsum..." |
| avatarUrl | Optional, valid URL | ✅ "https://example.com/avatar.jpg", ❌ "not-a-url" |

### 7. Response Examples

**Success (200):**
```json
{
  "message": "Profile updated successfully",
  "data": { ... }
}
```

**Validation Error (400):**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "invalid-url",
      "msg": "Invalid avatar URL",
      "path": "avatarUrl",
      "location": "body"
    }
  ]
}
```

**Unauthorized (401):**
```json
{
  "message": "Access token required"
}
```

**Forbidden (403):**
```json
{
  "message": "Invalid or expired token"
}
```

**Not Found (404):**
```json
{
  "message": "User not found"
}
```

### 8. Database Verification

After editing profile, you can verify in the database:

```sql
SELECT id, email, full_name, avatar_url, role, status, updated_at 
FROM users 
WHERE email = 'your-email@example.com';
```

You should see:
- `full_name`: Updated value
- `avatar_url`: Updated value
- `updated_at`: Current timestamp

### 9. Debugging Tips

1. **Check Token Validity:**
   - Use jwt.io to decode the token
   - Verify it contains your user ID and email
   - Check expiration time

2. **Enable Postman Console:**
   - View → Show Postman Console
   - Check request/response details
   - See validation test results

3. **Check Server Logs:**
   - Monitor Node.js server output for errors
   - Look for validation errors or database issues

4. **Database Issues:**
   - Verify Prisma migration is up to date
   - Check database connection string
   - Run `npx prisma db push` if needed

### 10. Troubleshooting

**Problem: 401 Unauthorized**
- ✅ Make sure you logged in first (5. LOGIN request)
- ✅ Verify token is not expired
- ✅ Check Authorization header format: `Bearer <token>`

**Problem: 400 Validation Failed**
- ✅ Check field lengths
- ✅ Verify avatar URL format (must start with http:// or https://)
- ✅ Ensure fullName is not empty string

**Problem: 404 User Not Found**
- ✅ Verify database has the user
- ✅ Check token is for correct user
- ✅ Ensure user was registered and verified

**Problem: 403 Account Banned**
- ✅ Contact admin to unban account
- ✅ Or use different user account for testing

---

**Created by:** [Your Name]
**Last Updated:** 2026-05-10
**API Version:** 1.0
