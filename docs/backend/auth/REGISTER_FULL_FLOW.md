# 📋 Module Đăng Ký & Kích Hoạt Tài Khoản (Full-stack Documentation)

Tài liệu này tổng hợp toàn bộ kiến thức, logic xử lý và kiến trúc hệ thống cho tính năng Đăng ký (Register) và Xác thực OTP (Verify OTP), bao gồm cả Backend và Frontend.

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture)

Hệ thống tuân thủ nguyên tắc **SOLID** và áp dụng các Design Patterns sau:
- **Strategy Pattern (Backend)**: Linh hoạt trong việc chuyển đổi phương thức gửi Email (Gmail, SMTP, Console Log).
- **Repository Pattern (Backend)**: Tách biệt logic truy vấn dữ liệu (Prisma) khỏi logic nghiệp vụ.
- **Redux Toolkit (Frontend)**: Quản lý trạng thái xác thực tập trung, xử lý các tác vụ không đồng bộ (Async Thunk).

---

## 🔄 Luồng Hoạt Động Cốt Lõi (Workflows)

### 1. Luồng Đăng Ký (Registration)
1.  **FE**: Thu thập dữ liệu (Name, Email, Password, Confirm Password). Kiểm tra khớp mật khẩu.
2.  **BE**: 
    *   Chuẩn hóa Email (chuyển về chữ thường).
    *   Mã hóa mật khẩu bằng `BcryptJS`.
    *   Lưu User vào MySQL với trạng thái `INACTIVE`.
    *   Sinh OTP 6 số, lưu vào **Redis** (hết hạn sau 10 phút).
    *   Gửi Email chứa mã OTP.

### 2. Luồng Xác Thực OTP & Tự Động Đăng Nhập (Auto-login)
1.  **FE**: Chuyển hướng sang `/verify-otp`, truyền email qua `sessionStorage`.
2.  **BE**:
    *   Kiểm tra mã OTP trong Redis.
    *   Nếu đúng: Cập nhật trạng thái User thành `ACTIVE`.
    *   **Tự động tạo Token**: Sinh Access Token & Refresh Token ngay lập tức.
    *   Lưu Refresh Token vào Redis.
    *   Thiết lập **HttpOnly Cookies** để lưu phiên đăng nhập.
3.  **FE**: Nhận thông tin người dùng thành công, cập nhật Redux Store và chuyển thẳng vào `/profile`.

### 3. Luồng Gửi Lại OTP với Cơ Chế Chống Spam (Throttle)
1.  **Quy tắc**: Chỉ được phép gửi lại mã sau mỗi 60 giây.
2.  **BE (Redis)**: Lưu một khóa `resend-otp-throttle:email` với thời gian sống (TTL) là 60s. Nếu khóa tồn tại, từ chối yêu cầu (429).
3.  **FE (LocalStorage)**: Lưu mốc thời gian (Timestamp) được phép gửi lại tiếp theo. Đảm bảo F5 trang bộ đếm ngược không bị reset.

---

## 🛠️ Triển Khai Chi Tiết (Implementation)

### 📂 Backend (Node.js/Express)

#### **Auth Service (`auth.service.js`)**
Đảm bảo tính nhất quán dữ liệu bằng cách chuẩn hóa email:
```javascript
async register(name, email, password) {
  const normalizedEmail = email.toLowerCase();
  // ... xử lý lưu db và gửi OTP
}
```

#### **Xử lý Tự động đăng nhập (`auth.controller.js`)**
Thiết lập Cookie bảo mật ngay sau khi Verify:
```javascript
res.cookie('accessToken', token, { httpOnly: true, secure: true, sameSite: 'strict' });
```

### 📂 Frontend (React/Vite)

#### **Quản lý Trạng thái (`authSlice.ts`)**
Sử dụng `AsyncThunk` để gọi API và lưu trữ thông tin User vào Global State:
```typescript
export const verifyOTP = createAsyncThunk('auth/verifyOTP', async (payload) => {
  const data = await verifyOTPRequest(payload);
  return data; // Chứa thông tin User và Message
});
```

#### **Giao diện Xác thực (`VerifyOTP.tsx`)**
- **Persistence**: Sử dụng `sessionStorage` để giữ email và `localStorage` để giữ countdown.
- **UX**: Tự động chuyển hướng và hiển thị thông báo bằng `sonner`.

---

## 🔒 Bảo Mật & Tối Ưu UX

| Tính năng | Giải pháp kỹ thuật | Mục đích |
| :--- | :--- | :--- |
| **Chống Brute-force** | `express-rate-limit` | Giới hạn số lần thử đăng ký/đăng nhập từ 1 IP. |
| **Bảo mật Token** | `HttpOnly Cookies` | Ngăn chặn tấn công XSS lấy cắp Access Token. |
| **Nhất quán dữ liệu** | `Email Normalization` | Tránh lỗi mã OTP không khớp do khác biệt chữ hoa/thường. |
| **UX liền mạch** | `Auto-login` | Giảm bớt 1 bước đăng nhập sau khi kích hoạt thành công. |
| **UX bền vững** | `Storage Persistence` | Giữ trạng thái ứng dụng ổn định ngay cả khi reload trang. |

---

## 🧪 Hướng Dẫn Kiểm Thử (Testing)

1.  **Test Đăng ký**: Truy cập `/register`, nhập thông tin. Kiểm tra log Backend để lấy mã OTP (nếu không dùng Gmail thật).
2.  **Test Gửi lại**: Nhấn "Gửi lại mã", kiểm tra xem nút có bị khóa 60s không. Thử F5 trang để xem đồng hồ có chạy tiếp không.
3.  **Test Xác thực**: Nhập mã OTP. Kiểm tra xem có được chuyển thẳng vào `/profile` mà không cần qua `/login` không.
4.  **Test Bảo mật**: Thử đăng nhập bằng tài khoản chưa kích hoạt, hệ thống phải tự động đưa bạn về trang `/verify-otp`.

---
*Tài liệu được cập nhật ngày 12/05/2026 bởi Gemini CLI Assistant.*
