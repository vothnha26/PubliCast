# PubliCast - Shared Repository Architecture & Context

Tài liệu này cung cấp bối cảnh cấu trúc (Architecture Context) của toàn bộ dự án PubliCast. Hãy gửi file này kèm theo yêu cầu (prompt) cho bất kỳ AI Agent nào khi bắt đầu làm việc để họ nắm được cấu trúc dự án mà không cần quét lại toàn bộ thư mục.

---

## 🏗️ 1. Cấu Trúc Thư Mục Dự Án (Repository Structure)

Dự án được tổ chức theo mô hình Monorepo đơn giản chia làm 2 thư mục chính:

### A. Backend (`/backend`)
Tổ chức code theo mô hình **Route -> Controller -> Service -> Repository/Prisma**:
- `src/server.js` & `src/app.js`: Cấu hình máy chủ Express, Middleware (CORS, Cookie, Parser) và khởi tạo Socket.io.
- `src/routes/`: Định nghĩa endpoint API (chia theo module như `auth`, `workspace`, `social`...).
- `src/controllers/`: Tiếp nhận request, validate tham số, gọi Service tương ứng và phản hồi client.
- `src/services/`: Chứa toàn bộ business logic. Áp dụng các Design Pattern (Strategy, Factory, Facade) để xử lý đa nền tảng mạng xã hội.
- `src/queues/`: Cấu hình hàng đợi BullMQ (Redis) cho các tiến trình chạy nền như đồng bộ số liệu tự động.
- `prisma/schema.prisma`: Định nghĩa cấu trúc cơ sở dữ liệu.

### B. Frontend (`/frontend`)
Tổ chức code theo mô hình **Pages -> Components -> Context/Store**:
- `src/main.jsx` & `src/App.jsx`: Điểm khởi chạy ứng dụng và quản lý luồng Route chính.
- `src/pages/`:
  - `auth/`: Đăng ký, đăng nhập.
  - `workspace/`: Dashboard chính, Lên lịch Planner, Post Creator, Cài đặt cá nhân.
  - `manage/`: Inbox (Unified Inbox), Reports (Analytics), Competitors, Team Management, SmartLinks.
- `src/components/`: Chứa các UI components dùng chung hoặc chuyên biệt cho từng trang.
- `src/context/`: Quản lý các state phức tạp dùng chung cho nhiều component (Ví dụ: `PostCreatorFormContext.jsx`).
- `src/store/`: Quản lý Global State bằng **Zustand** (Ví dụ: `useAuthStore.js`).

---

## 🗄️ 2. Lược Đồ Cơ Sở Dữ Liệu (Database Schema Context)

Hệ thống sử dụng **PostgreSQL** kết hợp với **Prisma ORM**. Dưới đây là các Model quan trọng định nghĩa trong `prisma/schema.prisma`:

- **User**: Thông tin tài khoản người dùng, email, hashed password, vai trò hệ thống (Admin/User).
- **Workspace (Không gian làm việc)**:
  - Một Workspace có nhiều thành viên (thông qua bảng liên kết `WorkspaceMember` quản lý vai trò OWNER, ADMIN, MEMBER, EDITOR).
  - Chứa danh sách các `Brand` (Thương hiệu) con trực thuộc.
- **Brand (Thương hiệu)**:
  - Quản lý các kênh kết nối mạng xã hội (`PlatformConnection`).
- **PlatformConnection (Kênh kết nối)**:
  - Lưu trữ Access Token, Refresh Token, platformId (Facebook Page ID, YouTube Channel ID...) của các kênh đã liên kết.
- **Post (Bài viết)**:
  - Quản lý trạng thái (`draft`, `scheduled`, `publishing`, `published`, `failed`, `review`).
  - Lưu trữ caption, tiêu đề, danh sách file media (`postMedia`), ngày giờ đặt lịch (`scheduledAt`).
  - Gắn kết với các `Brand` và các nền tảng sẽ đăng (`selectedPlatforms`).
- **PostMetricHistory (Lịch sử chỉ số)**:
  - Lưu trữ lịch sử chỉ số tương tác theo thời gian thực (Views, Likes, Comments, Shares) phục vụ vẽ biểu đồ Analytics.

---

## ⚙️ 3. Quy Ước Viết Code & Quy Tắc Thiết Kế (Coding Conventions)

1. **SOLID Principles**: Tất cả các Agent bắt buộc phải tuân thủ nghiêm ngặt nguyên tắc SOLID.
2. **Design Patterns**:
   - Khi gặp logic rẽ nhánh cho nhiều mạng xã hội khác nhau (ví dụ: render preview hay xử lý đăng bài), bắt buộc phải áp dụng **Strategy Pattern** hoặc **Factory Pattern**.
   - Tuyệt đối không viết các khối `if/else` lồng nhau quá sâu để kiểm tra platform.
3. **No Magic Strings**: Tất cả hằng số về tên platform (`facebook`, `youtube`, `instagram`...), trạng thái bài viết... phải được khai báo trong các file constants (ví dụ: `frontend/src/constants/` hoặc `backend/src/constants/`).
4. **Automated Validation**: Mọi thay đổi logic nghiệp vụ quan trọng ở backend phải có unit test đi kèm viết bằng Jest (mocking Prisma Client).

---

## 🔗 4. Điểm Tích Hợp Chính (Core Integrations)

- **Meta Webhook (Facebook/Instagram)**:
  - Backend nhận webhook tại endpoint `/api/social/webhook/facebook`.
  - Được xử lý bằng strategy tương ứng trong service layer để cập nhật dữ liệu bình luận vào DB, đồng thời kích hoạt Socket.io gửi tin nhắn về giao diện Inbox trên frontend theo thời gian thực.
- **Đồng bộ Hàng đợi (BullMQ)**:
  - Xử lý tác vụ đồng bộ chỉ số kênh định kỳ hàng giờ.
- **Media Upload**:
  - Hỗ trợ lưu trữ file cục bộ trong thư mục `uploads` trong môi trường phát triển (Dev) trước khi chuyển tiếp lên các kho lưu trữ đám mây.
