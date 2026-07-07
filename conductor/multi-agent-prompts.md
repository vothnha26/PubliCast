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

### Hiện trạng:
- Trang báo cáo chính nằm ở: `frontend/src/pages/manage/Reports.jsx`.
- File này hiện tại quá lớn (>2000 dòng code), gây giật lag và khó bảo trì.

### Yêu cầu chi tiết:
1. **Tách nhỏ component**:
   - Trích xuất các Widget biểu đồ và các phần cấu hình xuất báo cáo thành các component con đặt trong thư mục mới: `frontend/src/components/manage/reports/`.
   - Ví dụ tách ra các file như: `PerformanceOverviewWidget.jsx`, `AudienceDemographicsWidget.jsx`, `ExportOptionsModal.jsx`...
2. **Làm đẹp giao diện (UI/UX)**:
   - Sử dụng Recharts hoặc Chart.js để vẽ lại các biểu đồ với tone màu hiện đại, gradient mềm mại (tránh màu sắc đơn điệu).
   - Thêm hiệu ứng hover, loading skeleton đẹp mắt khi biểu đồ đang tải dữ liệu.
3. **Đảm bảo kiểm thử**:
   - Chạy lệnh `npm run build` ở thư mục `frontend` để kiểm tra lỗi build sau khi tách file.

Hãy bắt đầu bằng việc đọc file `frontend/src/pages/manage/Reports.jsx` và lập kế hoạch refactor nhé.
```

---

### 🤖 2. PROMPT CHO AGENT 3 (Giao diện Sáng/Tối - Dark Mode)
> **Copy toàn bộ đoạn dưới đây gửi cho Agent 3:**
```markdown
Chào bạn, bạn là Agent 3. Nhiệm vụ của bạn là **Thiết lập hệ thống Theme (Light/Dark Mode) toàn cục** cho dự án PubliCast.

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

Hãy bắt đầu bằng việc phân tích cấu trúc CSS hiện tại của dự án để lên kế hoạch triển khai.
```

---

## ⚡ Nhiệm Vụ Tiếp Theo Của Tôi (Agent 1)

Sau khi bạn phân phối việc cho 2 Agent trên, tôi (Agent 1) sẽ lập tức bắt tay vào việc **Tích hợp AI Content Generator & Copilot** vào màn hình soạn thảo `Post Creator`.

Vui lòng cho tôi biết bạn đã sẵn sàng duyệt kế hoạch này chưa nhé!
