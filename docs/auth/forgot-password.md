# Module Xac Thuc: Quen Mat Khau (UC-03)

Tai lieu nay mo ta chuc nang quen mat khau theo cung kien truc voi module dang ky va dang nhap hien co.

---

## Cong Nghe Tai Su Dung

- **Express Router/Controller/Service/Repository**: giu dung form 3 tang cua project.
- **Redis**: luu OTP dat lai mat khau va so lan nhap sai.
- **Nodemailer Strategy**: tai su dung `email.service.js`.
- **BcryptJS**: hash mat khau moi va kiem tra mat khau moi khac mat khau cu.
- **express-validator**: validate email, OTP, newPassword, confirmPassword.
- **express-rate-limit**: gioi han tan suat request theo IP.

---

## Endpoint

### 1. Yeu Cau OTP

- **Method:** `POST`
- **URL:** `/api/auth/forgot-password`
- **Rate limit:** 3 lan / 15 phut / IP

```json
{
  "email": "user@example.com"
}
```

**Thanh cong:**

```json
{
  "message": "OTP sent if email exists"
}
```

Neu email khong ton tai hoac tai khoan chua active, API van tra `200` de khong lo thong tin nguoi dung.

### 2. Dat Lai Mat Khau

- **Method:** `POST`
- **URL:** `/api/auth/reset-password`
- **Rate limit:** 5 lan / 15 phut / IP

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

**Thanh cong:**

```json
{
  "message": "Password reset successfully"
}
```

---

## Workflow

### Forgot Password

1. Validate email.
2. Tim user active theo email.
3. Neu user ton tai, sinh OTP 6 so.
4. Luu Redis key `forgot-otp:<email>` voi TTL 5 phut.
5. Xoa counter nhap sai cu `forgot-otp-attempts:<email>`.
6. Gui OTP qua email.
7. Tra ve thong bao generic.

### Reset Password

1. Validate email, OTP, mat khau moi va confirm password.
2. Lay OTP tu Redis theo key `forgot-otp:<email>`.
3. Neu OTP het han, tra `400`.
4. Neu OTP sai, tang counter `forgot-otp-attempts:<email>`.
5. Sai qua 3 lan thi xoa OTP va bat buoc yeu cau lai.
6. Neu OTP dung, kiem tra user active va local account.
7. Neu mat khau moi trung mat khau cu, tra `400`.
8. Hash mat khau moi bang bcrypt.
9. Cap nhat `password_hash` trong bang `user_accounts`.
10. Xoa OTP, counter va refresh token `refresh:<userId>` de logout cac session cu.

---

## Redis Keys

| Key | Purpose | TTL |
| --- | --- | --- |
| `forgot-otp:<email>` | OTP dat lai mat khau | 5 phut |
| `forgot-otp-attempts:<email>` | So lan nhap OTP sai | 5 phut |

---

## Postman

Collection da co them:

- `3. FORGOT PASSWORD (Request OTP)`
- `4. RESET PASSWORD`

Environment co them bien `newPassword`.
