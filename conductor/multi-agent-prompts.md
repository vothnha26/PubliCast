# PubliCast - Multi-Agent Task Distribution & Copy-Paste Prompts

Tài liệu này phân chia công việc chi tiết cho **3 AI Agent (bao gồm cả tôi - Agent 1)** và cung cấp sẵn **Prompt mẫu (Tiếng Việt)** để bạn chỉ cần copy-paste cho từng con AI bắt đầu làm việc ngay lập tức.

---

## 📌 Phân Chia Vai Trò Tổng Quan

| Agent | Vai trò / Phân hệ đảm nhận | Nhánh Git khuyến nghị |
| :--- | :--- | :--- |
| **Agent 1 (Là tôi hiện tại)** | **AI Content Generator & Copilot** (Tích hợp AI tạo caption/hashtag vào Post Creator) | `feature/post-creator-ai-copilot` |
| **Agent 2** | **Modularize & Beautify Reports** (Chia nhỏ và làm đẹp trang Báo cáo Analytics) | `feature/reports-modular-ui` |
| **Agent 3** | **Global Dark Mode & Theme System** (Hệ thống giao diện Sáng/Tối toàn dự án) | `feature/global-dark-mode` |

---

## 💬 Prompt Mẫu Copy-Paste Cho Từng Agent

### 🤖 1. PROMPT CHO AGENT 2 (Phân hệ Analytics/Reports)
> **Copy toàn bộ đoạn dưới đây gửi cho Agent 2:**
```markdown
Chào bạn, bạn là Agent 2. Nhiệm vụ của bạn là **Tái cấu trúc (Modularize) và làm đẹp giao diện trang Reports** của dự án PubliCast.

### ⚠️ BẮT ĐẦU CÔNG VIỆC (MANDATORY STARTUP PROCESS):
Trước khi thực hiện bất kỳ hành động code nào, bạn bắt buộc phải:
1. Đọc tài liệu bối cảnh cấu trúc dự án tại: `conductor/publicast-shared-context.md`.
2. Đọc kỹ quy trình làm việc và quy tắc tránh xung đột nhánh tại: `conductor/multi-agent-management-guide.md`.
3. Thực hiện **Bước 1 của Quy trình Cập nhật Trạng thái**: Dùng công cụ chỉnh sửa để cập nhật bảng Task Tracking ở mục 3 của file `conductor/multi-agent-management-guide.md` (chuyển trạng thái của Agent 2 từ `💤 Chờ chạy` thành `⏳ Đang làm`), tạo commit riêng cho sự thay đổi này và đẩy lên nhánh Git của bạn trước.

### Yêu cầu chi tiết:
1. **Tách nhỏ component**:
   - Trích xuất các Widget biểu đồ và các phần cấu hình xuất báo cáo thành các component con đặt trong thư mục mới: `frontend/src/components/manage/reports/`.
   - Ví dụ tách ra các file như: `PerformanceOverviewWidget.jsx`, `AudienceDemographicsWidget.jsx`, `ExportOptionsModal.jsx`...
2. **Làm đẹp giao diện (UI/UX)**:
   - Sử dụng Recharts hoặc Chart.js để vẽ lại các biểu đồ với tone màu hiện đại, gradient mềm mại (tránh màu sắc đơn điệu).
   - Thêm hiệu ứng hover, loading skeleton đẹp mắt khi biểu đồ đang tải dữ liệu.
3. **Đảm bảo kiểm thử**:
   - Chạy lệnh `npm run build` ở thư mục `frontend` để kiểm tra lỗi build sau khi tách file.
4. **Cập nhật hoàn tất**:
   - Sau khi hoàn thành và build thành công, hãy cập nhật trạng thái của bạn trong bảng Task Tracking của file `conductor/multi-agent-management-guide.md` thành `✅ Hoàn thành` trước khi kết thúc lượt.
```

---

### 🤖 2. PROMPT CHO AGENT 3 (Giao diện Sáng/Tối - Dark Mode)
> **Copy toàn bộ đoạn dưới đây gửi cho Agent 3:**
```markdown
Chào bạn, bạn là Agent 3. Nhiệm vụ của bạn là **Thiết lập hệ thống Theme (Light/Dark Mode) toàn cục** cho dự án PubliCast.

### ⚠️ BẮT ĐẦU CÔNG VIỆC (MANDATORY STARTUP PROCESS):
Trước khi thực hiện bất kỳ hành động code nào, bạn bắt buộc phải:
1. Đọc tài liệu bối cảnh cấu trúc dự án tại: `conductor/publicast-shared-context.md`.
2. Đọc kỹ quy trình làm việc và quy tắc tránh xung đột nhánh tại: `conductor/multi-agent-management-guide.md`.
3. Thực hiện **Bước 1 của Quy trình Cập nhật Trạng thái**: Dùng công cụ chỉnh sửa để cập nhật bảng Task Tracking ở mục 3 của file `conductor/multi-agent-management-guide.md` (chuyển trạng thái của Agent 3 từ `💤 Chờ chạy` thành `⏳ Đang làm`), tạo commit riêng cho sự thay đổi này và đẩy lên nhánh Git của bạn trước.

### Yêu cầu chi tiết:
1. **Định nghĩa biến màu sắc (CSS Variables)**:
   - Chỉnh sửa `frontend/src/index.css` để thiết lập hệ màu sắc tương phản cao cho cả chế độ Sáng (Light) và Tối (Dark). Sử dụng biến CSS dạng `--color-bg-primary`, `--color-text-primary`...
2. **Xây dựng Context**:
   - Tạo context `ThemeContext.jsx` tại `frontend/src/context/` để lưu trạng thái theme (light / dark / system) vào LocalStorage.
3. **Cập nhật Layout chính**:
   - Bọc `App` trong `ThemeProvider`.
   - Thêm nút switch toggle Theme (icon Mặt trời / Mặt trăng) tinh tế ở Sidebar hoặc Header chính.
4. **Áp dụng thử nghiệm**:
   - Áp dụng theme này lên các trang chính như Dashboard (`frontend/src/pages/workspace/Dashboard.jsx`) và Planner.
5. **Đảm bảo kiểm thử**:
   - Chạy `npm run build` để xác thực không bị lỗi cú pháp CSS hay JSX.
6. **Cập nhật hoàn tất**:
   - Sau khi hoàn thành và build thành công, hãy cập nhật trạng thái của bạn trong bảng Task Tracking của file `conductor/multi-agent-management-guide.md` thành `✅ Hoàn thành` trước khi kết thúc lượt.
```
