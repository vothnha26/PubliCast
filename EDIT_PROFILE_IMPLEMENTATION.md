# Edit Profile Implementation Summary

## 📋 Overview
Chức năng **Edit Profile** đã được triển khai hoàn chỉnh theo kiến trúc 3 tầng (Controller-Service-Repository).

## 🎯 Features Implemented
✅ Cập nhật Full Name (fullName)
✅ Cập nhật Avatar URL (avatarUrl)
✅ Validation dữ liệu đầu vào
✅ JWT Token verification
✅ Authorization checks
✅ Error handling
✅ Database integration với Prisma ORM

## 📁 Files Created

### 1. **src/services/profile.service.js** (NEW)
```javascript
class ProfileService {
  async editProfile(userId, profileData)
    - Validate user exists
    - Check account status (not banned)
    - Update profile data
    - Return updated user info
}
```

**Key Methods:**
- `editProfile(userId, profileData)`: Main method để edit profile

## 📝 Files Modified

### 1. **src/middlewares/validation.middleware.js**
Added:
```javascript
const editProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty().withMessage('Full name cannot be empty if provided')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Invalid avatar URL'),
  // ... validation handler
];
```

### 2. **src/repositories/user.repository.js**
Added method:
```javascript
async updateProfile(userId, profileData) {
  return await prisma.user.update({
    where: { id: userId },
    data: profileData
  });
}
```

### 3. **src/controllers/profile.controller.js**
Added:
```javascript
const profileService = require('../services/profile.service');

async editProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, avatarUrl } = req.body;
    
    const updatedUser = await profileService.editProfile(userId, {
      fullName,
      avatarUrl
    });
    
    res.status(200).json({
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ message: error.message });
  }
}
```

### 4. **src/routes/profile.routes.js**
Added route:
```javascript
router.put('/profile/edit', verifyAuth, editProfileValidation, profileController.editProfile);
```

## 🔌 API Endpoint

### PUT /api/profile/edit

**Authentication:** ✅ Required (JWT Token)

**Authorization:** ✅ Any authenticated user

**Request Body:**
```json
{
  "fullName": "John Doe",              // Optional: 2-100 characters
  "avatarUrl": "https://..."           // Optional: Valid URL
}
```

**Success Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
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

## ✔️ Validation Rules

| Field | Type | Length | Requirement |
|-------|------|--------|-------------|
| fullName | String | 2-100 | Optional |
| avatarUrl | String | Any | Optional (must be valid URL) |

## 🔐 Security Features

1. **JWT Verification**: Tất cả requests phải có valid JWT token
2. **Data Validation**: Input validation on both client and server
3. **URL Validation**: Avatar URL phải là valid URL
4. **Account Status Check**: User không thể edit profile nếu account bị banned
5. **SQL Injection Prevention**: Sử dụng Prisma ORM với parameterized queries

## 📊 Architecture

```
HTTP Request (PUT /api/profile/edit)
    ↓
Express Route Handler
    ↓
Validation Middleware (editProfileValidation)
    ↓
Authentication Middleware (verifyAuth)
    ↓
Controller (profileController.editProfile)
    ↓
Service (profileService.editProfile)
    ↓
Repository (userRepository.updateProfile)
    ↓
Prisma Client
    ↓
MySQL Database
    ↓
Response (200 JSON)
```

## 🧪 Testing

### Postman Collection
Added 3 new requests:
1. **10. EDIT PROFILE** - Main edit profile request
2. **TEST: Edit Profile - Invalid URL Format** - Validation test
3. **TEST: Edit Profile - Full Name Too Short** - Validation test

### Test Environment Variables
```
baseUrl=http://localhost:5000/api
email=user@example.com
password=Password123
accessToken=(auto-set after login)
refreshToken=(auto-set after login)
```

### Test Scenarios

**Scenario 1: Successful Edit**
```
1. Login → Get JWT token
2. PUT /profile/edit with fullName and/or avatarUrl
3. Verify 200 response with updated data
```

**Scenario 2: Validation Failure**
```
1. Login → Get JWT token
2. PUT /profile/edit with invalid data
3. Verify 400 response with error details
```

**Scenario 3: Authentication Failure**
```
1. PUT /profile/edit without token
2. Verify 401 response
```

## 📚 Documentation

### Created Files:
1. **docs/EDIT_PROFILE.md** - Full API documentation with use cases and sequence diagrams
2. **docs/EDIT_PROFILE_TESTING.md** - Detailed testing guide

## 🚀 How to Use

### 1. Install Dependencies (if not already installed)
```bash
npm install
```

### 2. Setup Database
```bash
npx prisma migrate dev
```

### 3. Run Server
```bash
npm run dev
```

### 4. Test with Postman
1. Import `postman-collection.json` and `postman-environment.json`
2. Follow the workflow:
   - Register
   - Verify OTP
   - Login
   - Edit Profile
   - Verify changes

### 5. Test with cURL
```bash
curl -X PUT http://localhost:5000/api/profile/edit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fullName": "Jane Doe",
    "avatarUrl": "https://example.com/avatar.jpg"
  }'
```

### 6. Test with Node.js
```javascript
const response = await fetch('http://localhost:5000/api/profile/edit', {
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

## 🐛 Error Responses

### 400 - Validation Failed
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

### 401 - Unauthorized
```json
{
  "message": "Access token required"
}
```

### 403 - Forbidden (Banned Account)
```json
{
  "message": "Account banned"
}
```

### 404 - User Not Found
```json
{
  "message": "User not found"
}
```

### 500 - Server Error
```json
{
  "message": "Internal server error"
}
```

## 📋 Checklist

- ✅ Created profile service with editProfile method
- ✅ Added updateProfile method to user repository
- ✅ Added editProfileValidation middleware
- ✅ Added editProfile controller method
- ✅ Added PUT /api/profile/edit route
- ✅ Updated Postman collection with test requests
- ✅ Created comprehensive API documentation
- ✅ Created detailed testing guide
- ✅ All error handling implemented
- ✅ Security features implemented

## 🔍 Code Quality

- ✅ No syntax errors
- ✅ Follows project conventions
- ✅ Proper error handling
- ✅ Input validation
- ✅ JWT authentication
- ✅ Service layer pattern
- ✅ Repository pattern
- ✅ Comments and documentation

## 📞 Support

For issues or questions:
1. Check EDIT_PROFILE.md for API documentation
2. Check EDIT_PROFILE_TESTING.md for testing guide
3. Review postman-collection.json for test examples
4. Check server logs for detailed error messages

## 📅 Timeline

**Implemented on:** 2026-05-10
**Last Updated:** 2026-05-10
**Status:** ✅ Complete and Ready for Testing

---

**Author:** [Your Name]
**Component:** Edit Profile Feature
**Version:** 1.0
