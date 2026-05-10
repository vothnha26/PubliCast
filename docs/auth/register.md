# Module Xác Thực: Đăng Ký & Kích Hoạt (Auth - Register)

Tài liệu này chi tiết về module Đăng ký tài khoản, quy trình xác thực OTP qua Email và các kiến thức kỹ thuật cốt lõi đã áp dụng.

---

## 🛠️ Công Nghệ & Kỹ Thuật Áp Dụng

Module này được xây dựng dựa trên các tiêu chuẩn Senior nhằm đảm bảo tính bảo mật và khả năng mở rộng:

- **SOLID Principles**: Tuân thủ nghiêm ngặt (đặc biệt là SRP và OCP).
- **Design Patterns**:
  - **Strategy Pattern**: Quản lý linh hoạt các phương thức gửi Email (Gmail, SMTP, Ethereal).
  - **Repository Pattern**: Tách biệt logic truy vấn dữ liệu khỏi Business Logic.
- **Security**:
  - **BcryptJS**: Mã hóa mật khẩu an toàn.
  - **Rate Limiting**: Giới hạn 5 requests/15 phút để chống Brute-force/Spam.
  - **Validation**: Kiểm tra dữ liệu đầu vào bằng `express-validator`.
- **Hạ tầng**: Redis (Lưu trữ OTP tạm thời), MySQL (Lưu trữ thông tin User).

---

## 📁 Cấu Trúc Module

```text
src/
├── controllers/
│   └── auth.controller.js      # Tiếp nhận và phản hồi request
├── services/
│   ├── auth.service.js        # Logic nghiệp vụ (Register, Verify OTP)
│   ├── otp.service.js         # Quản lý mã OTP với Redis
│   └── email.service.js       # Gửi thông báo (Sử dụng Strategy Pattern)
├── repositories/
│   └── user.repository.js     # Thao tác dữ liệu với Prisma
├── middlewares/
│   ├── validation.middleware.js # Kiểm tra tính hợp lệ của dữ liệu
│   └── rate-limit.middleware.js # Giới hạn tần suất request
└── utils/
    └── constants.js           # Quản lý hằng số, thông báo lỗi (No Magic Strings)
```

---

## 🔄 Quy Trình Hoạt Động (Workflow)

Để hiểu rõ luồng đi của dữ liệu, hãy tham khảo sơ đồ trình tự:
👉 [Xem Sơ Đồ Trình Tự (PlantUML)](./register-sequence.puml)

### Luồng Đăng ký (Register)

1. **Validation**: Kiểm tra email hợp lệ, mật khẩu tối thiểu 8 ký tự, khớp mật khẩu.
2. **Database Check**: Kiểm tra email đã tồn tại trong hệ thống hay chưa.
3. **Password Hashing**: Mã hóa mật khẩu trước khi lưu.
4. **User Creation**: Lưu user vào MySQL với trạng thái `INACTIVE`.
5. **OTP Generation**: Sinh mã 6 số ngẫu nhiên, lưu vào Redis (hết hạn sau 10 phút).
6. **Email Dispatch**: Gửi mã OTP về Gmail thật của người dùng.

### Luồng Xác minh (Verify OTP)

1. **Redis Fetch**: Lấy mã OTP đã lưu từ Redis dựa trên email.
2. **Comparison**: So sánh mã người dùng nhập với mã trong Redis.
3. **Status Update**: Nếu khớp, cập nhật User thành `ACTIVE` và xóa mã trong Redis.

---

## 🚀 Hướng Dẫn Kiểm Thử Với Postman

Để kiểm thử thủ công các API của module này, bạn có thể thực hiện theo các bước sau:

### 1. Đăng ký tài khoản (Register)

- **Method:** `POST`
- **URL:** `{{base_url}}/api/auth/register`
- **Body (raw JSON):**

```json
{
  "name": "Nguyen Van A",
  "email": "test@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

- **Kết quả mong đợi (201 Created):** Email chứa mã OTP sẽ được gửi về địa chỉ trên.

### 2. Xác minh OTP (Verify OTP)

- **Method:** `POST`
- **URL:** `{{base_url}}/api/auth/verify-otp`
- **Body (raw JSON):**

```json
{
  "email": "test@example.com",
  "otp": "123456"
}
```

- **Lưu ý:** Thay `123456` bằng mã OTP thực tế bạn nhận được trong Gmail.

### 💡 Mẹo nhỏ khi test:

- **Rate Limit**: Nếu bạn nhận được lỗi `429 Too Many Requests`, hãy đợi 15 phút hoặc restart server để reset giới hạn (5 requests/15 phút).
- **Environment**: Nên tạo một Environment trong Postman với biến `base_url` là `http://localhost:3000`.

---

## 🧪 Hướng Dẫn Kiểm Thử (Testing)

... (rest of testing section) ...

---

## 📝 Hướng Dẫn Sử Dụng API (Code Mẫu)

Dưới đây là cách tích hợp API của module này vào ứng dụng Frontend (React/Vanilla JS):

### 1. Gọi API Đăng ký (Register)

```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Thành công:", result.message);
      // Chuyển hướng sang trang nhập OTP
    } else {
      console.error("Lỗi:", result.errors || result.message);
    }
  } catch (error) {
    console.error("Lỗi kết nối:", error);
  }
};
```

### 2. Gọi API Xác minh OTP (Verify OTP)

```javascript
const verifyOTP = async (email, otp) => {
  try {
    const response = await fetch("http://localhost:3000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const result = await response.json();
    if (response.ok) {
      alert("Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay.");
    } else {
      alert("Lỗi: " + result.message);
    }
  } catch (error) {
    console.error("Lỗi:", error);
  }
};
```

---

## 📝 Lưu Ý Cho Developer

- **Môi trường**: Luôn nạp `dotenv.config()` đầu tiên tại `server.js`.
- **Cấu hình Email**: Đảm bảo biến `GMAIL_USER` và `GMAIL_PASS` (App Password) trong `.env` chính xác.
- **Magic Strings**: Tuyệt đối không viết trực tiếp chuỗi thông báo, hãy dùng `ERROR_MESSAGES` trong `constants.js`.
