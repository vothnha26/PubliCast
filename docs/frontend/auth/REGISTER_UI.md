# 🎨 Frontend: Giao Diện & Tích Hợp Đăng Ký

Tài liệu về triển khai UI/UX và luồng tích hợp API cho tính năng đăng ký tại Frontend.

---

## 🛠️ Công Nghệ & Thư Viện
- **UI Framework**: React (Vite) + TailwindCSS
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM (v7)
- **Notifications**: Sonner (Toast)
- **Persistence**: LocalStorage & SessionStorage

---

## ✨ Các Tính Năng Nổi Bật

### 1. Luồng Xác Thực Thông Minh (Smart Redirect)
Tại trang **Login**, nếu người dùng nhập tài khoản chưa kích hoạt:
- Hệ thống nhận diện lỗi từ Backend.
- Hiển thị Toast thông báo.
- Tự động chuyển hướng sang `/verify-otp` sau 1.5 giây.
- Truyền Email đã nhập sang trang xác thực.

### 2. Giữ Trạng Thái Khi Reload (F5 Persistence)
- **Email**: Được lưu vào `sessionStorage` để không bị mất khi load lại trang.
- **Countdown**: Lưu mốc thời gian (Timestamp) được phép gửi lại mã tiếp theo vào `localStorage`. 
- **Kết quả**: Khi F5 trang, đồng hồ đếm ngược vẫn chạy đúng số giây còn lại.

### 3. Bộ Đếm Ngược Gửi Lại (Resend Countdown)
Nút "Gửi lại mã" được thiết kế với 2 trạng thái:
- **Đang chờ**: Hiển thị "Gửi lại mã sau Xs" và bị disabled.
- **Sẵn sàng**: Nút sáng lên màu tím, cho phép nhấn gọi API.

---

## 📂 Cấu Trúc Thành Phần (Components)

### 1. `Register.tsx`
- Form đăng ký với các trường: Name, Email, Password, Confirm Password.
- Validation phía client (Khớp mật khẩu).

### 2. `VerifyOTP.tsx`
- Ô nhập mã 6 số.
- Logic đếm ngược và gọi API Resend.
- Xóa sạch Storage sau khi xác thực thành công.

### 3. `authSlice.ts`
- Quản lý trạng thái `loading` và `error`.
- Lưu thông tin User vào Global State ngay sau khi Verify thành công (Auto-login).

---
*Cập nhật: 12/05/2026*
