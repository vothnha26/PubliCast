# Edit Profile - API Documentation

## Overview
Chức năng Edit Profile cho phép người dùng cập nhật thông tin hồ sơ của mình sau khi đã đăng nhập.

## Features
- ✅ Cập nhật Full Name
- ✅ Cập nhật Avatar URL
- ✅ Validation dữ liệu đầu vào
- ✅ Authorization (chỉ user đã đăng nhập)
- ✅ JWT Token verification
- ✅ Error handling

## Use Case Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Edit Profile                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │ Authenticated│
                    │    User      │
                    └──────────────┘
                          │
                ┌─────────┴──────────┐
                │                    │
                ▼                    ▼
          ┌─────────────┐    ┌─────────────┐
          │  Update     │    │   Cancel    │
          │  Profile    │    │             │
          └──────┬──────┘    └─────────────┘
                 │
       ┌─────────┴──────────────┐
       │                        │
       ▼                        ▼
   ┌────────┐           ┌──────────────┐
   │Validate│           │ Check Status │
   │  Data  │           │  (Not Banned)│
   └────┬───┘           └──────┬───────┘
        │                      │
        └──────────┬───────────┘
                   ▼
            ┌──────────────┐
            │ Update in DB │
            └──────┬───────┘
                   ▼
            ┌──────────────┐
            │Return Result │
            └──────────────┘
```

## Sequence Diagram

```
User          Client          API Server      Database
 │              │                  │               │
 │─ Edit Data ──│                  │               │
 │              │─ PUT /api/       │               │
 │              │ profile/edit     │               │
 │              │ (with JWT Token) │               │
 │              │                  │               │
 │              │                  ├─ Verify JWT  │
 │              │                  │               │
 │              │                  ├─ Validate    │
 │              │                  │   Data       │
 │              │                  │               │
 │              │                  │─ Check User  │
 │              │                  │   Exists     │
 │              │                  │  (Query DB)  │
 │              │                  │               │
 │              │                  │  ┌──────────┤
 │              │                  │  │           │
 │              │                  │<─┤ User OK   │
 │              │                  │               │
 │              │                  ├─ Update     │
 │              │                  │  Profile    │
 │              │                  │─────────────┤
 │              │                  │             │
 │              │                  │  ┌─────────┤
 │              │                  │  │          │
 │              │                  │<─┤Updated   │
 │              │                  │             │
 │              │<─ 200 JSON ──────┤             │
 │              │  Updated Data    │             │
 │              │                  │             │
 │─ Success ────│                  │             │
```

## API Endpoint

### PUT /api/profile/edit

**Authentication:** Required (JWT Token)

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "fullName": "John Doe",          // Optional: 2-100 characters
  "avatarUrl": "https://..."       // Optional: Valid URL
}
```

**Success Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": "https://...",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-05-09T...",
    "updatedAt": "2026-05-10T..."
  }
}
```

**Error Responses:**

#### 400 - Validation Failed
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "ab",
      "msg": "Full name must be between 2 and 100 characters",
      "path": "fullName",
      "location": "body"
    }
  ]
}
```

#### 401 - Unauthorized
```json
{
  "message": "Access token required"
}
```

#### 403 - Account Banned
```json
{
  "message": "Account banned"
}
```

#### 404 - User Not Found
```json
{
  "message": "User not found"
}
```

#### 500 - Server Error
```json
{
  "message": "Internal server error"
}
```

## Validation Rules

| Field | Rules |
|-------|-------|
| fullName | Optional, 2-100 characters |
| avatarUrl | Optional, must be valid URL |

## Implementation Details

### Architecture: 3-Tier Architecture

1. **Controller Layer** (`src/controllers/profile.controller.js`)
   - Handles HTTP requests/responses
   - Calls service layer

2. **Service Layer** (`src/services/profile.service.js`)
   - Business logic
   - Data validation
   - Authorization checks

3. **Repository Layer** (`src/repositories/user.repository.js`)
   - Database operations
   - Query builders

### Middleware Stack
- `verifyAuth`: Verify JWT token
- `editProfileValidation`: Validate request data

### Database Operation
- Uses Prisma ORM
- Updates `users` table

## Testing

### Prerequisites
1. User must be registered and activated (verified with OTP)
2. User must have valid JWT token from login

### Test Steps
1. Login to get access token
2. Make PUT request to `/api/profile/edit`
3. Include JWT token in Authorization header or cookie
4. Verify response contains updated profile data

## Example cURL Request

```bash
curl -X PUT http://localhost:3000/api/profile/edit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fullName": "Jane Doe",
    "avatarUrl": "https://example.com/avatar.jpg"
  }'
```

## Example Node.js Request

```javascript
const response = await fetch('http://localhost:3000/api/profile/edit', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    fullName: 'Jane Doe',
    avatarUrl: 'https://example.com/avatar.jpg'
  })
});

const data = await response.json();
console.log(data);
```

## Security Considerations

1. **JWT Verification**: All requests must include valid JWT token
2. **Data Validation**: Input validation on both client and server
3. **URL Validation**: Avatar URL must be valid
4. **Account Status Check**: User cannot edit profile if account is banned
5. **SQL Injection Prevention**: Uses Prisma ORM parameterized queries

## File Changes Summary

### Created Files:
- `src/services/profile.service.js`

### Modified Files:
- `src/middlewares/validation.middleware.js` (added editProfileValidation)
- `src/repositories/user.repository.js` (added updateProfile method)
- `src/controllers/profile.controller.js` (added editProfile method)
- `src/routes/profile.routes.js` (added PUT route)

## Notes
- Avatar URL validation uses isURL() from express-validator
- fullName is trimmed before storing
- Both fields are optional - at least one must be provided
- Returns 400 if no fields are provided
