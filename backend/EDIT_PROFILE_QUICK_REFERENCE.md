# Edit Profile - Quick Reference Guide

## 🚀 Quick Start

### Step 1: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123"}'
```

### Step 2: Edit Profile
```bash
curl -X PUT http://localhost:5000/api/profile/edit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fullName":"John Doe Updated",
    "avatarUrl":"https://example.com/avatar.jpg"
  }'
```

### Step 3: Verify
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📌 Endpoint Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| PUT | `/api/profile/edit` | ✅ JWT | Edit profile |
| GET | `/api/user/profile` | ✅ JWT | View user profile |
| GET | `/api/admin/profile` | ✅ JWT (ADMIN only) | View admin profile |

## ✅ Validation Rules

```javascript
fullName: {
  required: false,
  min: 2,
  max: 100,
  example: "John Doe"
}

avatarUrl: {
  required: false,
  format: "valid URL",
  example: "https://example.com/avatar.jpg"
}
```

## 🔄 Request/Response Example

### Request
```http
PUT /api/profile/edit HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

{
  "fullName": "Jane Smith",
  "avatarUrl": "https://cdn.example.com/users/jane.jpg"
}
```

### Response (200 OK)
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@example.com",
    "fullName": "Jane Smith",
    "avatarUrl": "https://cdn.example.com/users/jane.jpg",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-05-09T10:30:00.000Z",
    "updatedAt": "2026-05-10T14:22:15.000Z"
  }
}
```

## ❌ Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 200 | Success | ✅ Request OK |
| 400 | Validation failed | Check input format |
| 401 | Unauthorized | Login and get token |
| 403 | Forbidden | Token expired or account banned |
| 404 | User not found | Invalid user ID in token |
| 500 | Server error | Check server logs |

## 💡 Usage Examples

### Example 1: Update Full Name Only
```json
{
  "fullName": "Alice Johnson"
}
```

### Example 2: Update Avatar Only
```json
{
  "avatarUrl": "https://example.com/profile-pic.jpg"
}
```

### Example 3: Update Both
```json
{
  "fullName": "Bob Wilson",
  "avatarUrl": "https://example.com/bob.png"
}
```

## 🔐 Security Headers Required

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## 📱 JavaScript Fetch Example

```javascript
async function editProfile(fullName, avatarUrl) {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('/api/profile/edit', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName,
      avatarUrl
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Profile updated:', data.data);
    return data.data;
  } else {
    console.error('❌ Error:', data.message);
    throw new Error(data.message);
  }
}

// Usage
editProfile('John Doe', 'https://example.com/avatar.jpg')
  .then(profile => console.log('Updated:', profile))
  .catch(error => console.error('Failed:', error));
```

## 🐍 Python Requests Example

```python
import requests
import json

def edit_profile(token, full_name=None, avatar_url=None):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {}
    if full_name:
        payload['fullName'] = full_name
    if avatar_url:
        payload['avatarUrl'] = avatar_url
    
    response = requests.put(
        'http://localhost:5000/api/profile/edit',
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        print('✅ Profile updated:', response.json())
        return response.json()
    else:
        print('❌ Error:', response.json())
        return None

# Usage
edit_profile(token, 'John Doe', 'https://example.com/avatar.jpg')
```

## 🧪 Postman Quick Test

1. **Set Environment Variables:**
   - `baseUrl`: http://localhost:5000/api
   - `accessToken`: (auto-filled after login)

2. **Run Requests in Order:**
   ```
   5. LOGIN
   ↓ (copies accessToken)
   10. EDIT PROFILE
   ↓
   6. GET USER PROFILE
   ```

3. **Verify Changes:**
   - Response should show updated fullName and avatarUrl
   - `updatedAt` should be current timestamp

## 🔧 Troubleshooting

### Problem: 401 Unauthorized
```
✅ Solution: Login first to get JWT token
✅ Solution: Check token is not expired
✅ Solution: Verify Authorization header format
```

### Problem: 400 Validation Error
```
✅ Solution: fullName must be 2-100 characters
✅ Solution: avatarUrl must be valid HTTP URL
✅ Solution: At least one field must be provided
```

### Problem: 403 Forbidden
```
✅ Solution: Token might be expired, refresh it
✅ Solution: Account might be banned
✅ Solution: Try logging in again
```

### Problem: 500 Server Error
```
✅ Solution: Check server logs
✅ Solution: Verify database connection
✅ Solution: Check Prisma migrations
```

## 📊 Database Query

Verify changes in database:

```sql
SELECT id, email, full_name, avatar_url, updated_at 
FROM users 
WHERE id = 'your-user-id' 
LIMIT 1;
```

## 🎯 Performance Tips

- Update only changed fields
- Compress avatar images before uploading
- Use CDN for avatar URLs
- Cache user profile locally

## 📚 Related Endpoints

- `POST /api/auth/register` - Register user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - Login user
- `GET /api/user/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

## 🔗 Related Documentation

- See [EDIT_PROFILE.md](./docs/EDIT_PROFILE.md) for full API documentation
- See [EDIT_PROFILE_TESTING.md](./docs/EDIT_PROFILE_TESTING.md) for detailed testing guide
- See [EDIT_PROFILE_IMPLEMENTATION.md](./EDIT_PROFILE_IMPLEMENTATION.md) for implementation details

---

**Quick Links:**
- API Base URL: `http://localhost:5000/api`
- Edit Profile Endpoint: `PUT /profile/edit`
- Postman Collection: `postman-collection.json`
- Test Environment: `postman-environment.json`

**Status:** ✅ Ready for Production
