# PubliCast - Project Roadmap, Architecture Audit & Multi-Agent Parallel Plan

Tài liệu này cung cấp cái nhìn toàn diện về hiện trạng dự án PubliCast, phân tích cấu trúc kiến trúc hiện tại, chỉ ra các vùng nghẽn kỹ thuật và đề xuất lộ trình nâng cấp (UI/UX & Tính năng) được thiết kế đặc biệt để **nhiều AI Agent có thể làm việc song song** mà không gây xung đột (merge conflicts).

---

## 📊 1. Tổng quan Trạng thái Dự án (Current Module Status)

PubliCast là một nền tảng quản trị và tối ưu hóa mạng xã hội đa kênh (Facebook, Instagram, YouTube, TikTok, LinkedIn, Telegram, Discord, Threads). Hệ thống bao gồm 2 phần chính:
- **Backend (Node.js/Express/Prisma)**: Cung cấp API, xử lý Webhook Meta, đồng bộ số liệu nền tảng tự động qua BullMQ.
- **Frontend (Vite/React/Vanilla CSS & Tailwind)**: Quản trị đa không gian làm việc (Workspaces), lên lịch bài viết, phân tích chỉ số và quản lý hộp thư chung.

### Bản đồ Trạng thái các Phân hệ:

| Phân hệ (Module) | Trạng thái hiện tại | Công nghệ chủ chốt | Đánh giá & Rủi ro |
| :--- | :--- | :--- | :--- |
| **Auth & Workspace** | Hoàn thành cơ bản | JWT, bcryptjs, Prisma | Hoạt động ổn định, cần cải tiến cơ chế phân quyền (RBAC). |
| **Post Creator** | Đã refactor & Tinh chỉnh xong | Context API, Strategy Pattern | Cực kỳ sạch sẽ sau Sprint 7. Dễ dàng mở rộng thêm các nền tảng mới. |
| **Content Planner** | Hoàn thành | FullCalendar, DnD | Hoạt động tốt. Cần tối ưu responsive trên tablet/mobile. |
| **Unified Inbox** | Đã tích hợp Webhook | Socket.io, Meta Graph API | Có độ trễ nhất định. Cần tối ưu hóa hiệu năng WebSocket khi tải tin nhắn lớn. |
| **Analytics & Reports** | Đã có dữ liệu TikTok thực | Chart.js/Recharts, PDF Export | File `Reports.jsx` quá lớn (208kB), cần modular hóa để tránh giật lag UI. |
| **SmartLinks & Ads** | Hoàn thành | UTM Builder, URL Shortener | Hoạt động ổn định. Giao diện Ads Manager còn khá đơn giản. |
| **Competitor Benchmarking** | Hoàn thành | Web scraping / APIs | Cần xử lý chống block IP khi cào dữ liệu đối thủ. |
| **Media Library** | Hoàn thành | Local Storage (Dev) | Hỗ trợ upload video/ảnh tốt. Cần tích hợp AWS S3/Cloudinary cho Production. |

---

## 🛠️ 2. Đề xuất Nâng cấp Giao diện & Tính năng (Upgrades Roadmap)

Để PubliCast trở nên vượt trội và mang tính đột phá, dưới đây là các đề xuất nâng cấp phân theo 3 nhóm:

### A. Nâng cấp Trải nghiệm Người dùng (UI/UX)
1. **Dark Mode & Theme System**: Tích hợp hệ thống theme (Light/Dark/System) đồng bộ toàn diện trên tất cả các trang, sử dụng CSS Variables để chuyển đổi mượt mà.
2. **Modular hóa trang Reports (Báo cáo)**: File `Reports.jsx` hiện đang chứa hơn 2000 dòng code. Cần tách nhỏ các Widget biểu đồ ra thành các sub-components độc lập như cách đã làm với `PostCreator.jsx`.
3. **Micro-interactions trên Planner**: Thêm các animation chuyển động khi kéo thả bài viết trên lịch (Calendar Grid) và hiệu ứng chuyển trang mượt mà (Page transitions) sử dụng `framer-motion`.

### B. Nâng cấp Tính năng (Features)
1. **AI Content Generator & Copilot**:
   - Tích hợp mô hình ngôn ngữ lớn (LLM - Gemini/OpenAI API) trực tiếp vào `PostCreator` để:
     - Tự động viết caption dựa trên prompt.
     - Tự động sửa giọng văn (chuyên nghiệp, hài hước, trang trọng).
     - Gợi ý bộ Hashtag thịnh hành dựa trên nội dung bài viết.
2. **Meta Webhook Auto-Reply**:
   - Cho phép người dùng cấu hình kịch bản tự động trả lời bình luận của khách hàng trên Facebook/Instagram thông qua AI Agent hoặc mẫu soạn sẵn.
3. **Hỗ trợ Cloud Storage thực tế**:
   - Tích hợp AWS S3 / Cloudinary trực tiếp để lưu trữ file media cho môi trường production thay vì lưu local file trong folder `uploads`.

---

## 🚀 3. Kế hoạch Phân chia Công việc cho Nhiều AI Agent làm song song (Multi-Agent Parallel Plan)

Để phân bổ cho **nhiều AI Agent chạy cùng lúc** mà không bị đè mã nguồn lên nhau, ta chia dự án thành các nhánh tính năng độc lập, tập trung vào các file khác nhau:

### 🤖 Agent A: AI Copilot Integration (Phân hệ Post Creator)
- **Mục tiêu**: Tích hợp tính năng AI tạo nội dung/caption và sửa giọng văn ngay tại khung soạn thảo.
- **Khu vực hoạt động**:
  - `frontend/src/components/workspace/post-creator/ComposerBody.jsx` (Thêm nút AI và giao diện popup chọn giọng văn).
  - `backend/src/routes/workspace/ai.routes.js` [NEW] & `backend/src/controllers/workspace/ai.controller.js` [NEW].
- **Tránh xung đột**: Agent này không sửa logic lõi của Planner hay Analytics.

### 🤖 Agent B: Modularize & Beautify Reports (Phân hệ Analytics/Reports)
- **Mục tiêu**: Tách file monolithic `Reports.jsx` (208kB) thành các component widget nhỏ hơn và làm đẹp giao diện biểu đồ báo cáo.
- **Khu vực hoạt động**:
  - `frontend/src/pages/manage/Reports.jsx` (Refactor).
  - Tạo thư mục `frontend/src/components/manage/reports/` [NEW] để chứa các widget như: `PerformanceOverviewWidget.jsx`, `AudienceDemographicsWidget.jsx`, `ExportOptions.jsx`.
- **Tránh xung đột**: Hoạt động hoàn toàn độc lập trong phân hệ quản lý Analytics, không liên quan đến Post Creator.

### 🤖 Agent C: Theme System & Dark Mode (Toàn cục Frontend)
- **Mục tiêu**: Triển khai hệ thống CSS Variables và context chọn theme (Sáng/Tối) cho toàn bộ ứng dụng.
- **Khu vực hoạt động**:
  - `frontend/src/index.css` (Định nghĩa biến màu sắc light/dark).
  - `frontend/src/context/ThemeContext.jsx` [NEW].
  - Các layout wrapper chính: `frontend/src/layouts/` hoặc sidebar chuyển đổi theme.
- **Tránh xung đột**: Agent C chỉ chỉnh sửa style và cung cấp context theme, không thay đổi logic nghiệp vụ của các component con.

---

## 🧪 4. Kế hoạch Kiểm thử & Xác minh (Verification Plan)

Khi triển khai song song nhiều Agent:
1. **Kiểm tra biên dịch**: Tất cả các Agent trước khi merge code bắt buộc phải chạy thành công:
   ```bash
   npm run build
   ```
2. **Kiểm thử tự động**:
   - Đảm bảo bộ test Jest chạy thành công 100%:
     ```bash
     npm run test
     ```
   - Chạy kiểm thử luồng hoạt động UI bằng Selenium trong thư mục `test_selenium`.
