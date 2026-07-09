# Kế hoạch & Checklist: Sửa lỗi UI/UX và tối ưu hóa Planner

Tài liệu này quản lý lộ trình xử lý các vấn đề giao diện, trải nghiệm người dùng (UX) và logic bị lỗi/thiếu trong module **Planner** và **Dashboard**.

---

## 📅 Phân chia Sprint & Trạng thái

### Sprint 1: Critical Fixes & Cleanup 🟢
- [ ] **Dọn dẹp code:** Xóa bỏ file legacy `src/pages/workspace/ContentPlanner.jsx` (dead code, đã được thay thế bằng cấu trúc routing trong `planner/`).
- [ ] **Planner Layout Timezone:** Sửa timezone hiển thị từ hardcode thành hiển thị thời gian thực theo cấu hình trình duyệt hoặc user settings (`PlannerLayout.jsx`).
- [ ] **Mở Modal Analytics trên Grid:** Khi click vào bài đăng đã publish (`status === 'published'`) trên `WeeklyGrid.jsx` hoặc `MonthlyGrid.jsx` thì mở `PostAnalyticsDetailModal` thay vì `PostCreator`.
- [ ] **Đồng bộ PlatformIcon:** Cập nhật `HistoryView.jsx` và `PostsLibraryView.jsx` sử dụng `<PlatformIcon>` thay vì logic map thô hoặc icon fallback `PlayCircle`.

### Sprint 2: UX Enhancements 🔵
- [ ] **Responsive Height:** Thay đổi chiều cao cố định `h-[750px]` của Grid Calendar thành chiều cao co giãn linh hoạt (`h-[calc(100vh-280px)]` hoặc tương tự) để tối ưu trên màn hình nhỏ.
- [ ] **Confirm duyệt hàng loạt:** Thêm confirm dialog khi người dùng nhấn "Approve" nhiều bài viết cùng lúc ở `ListView.jsx`.
- [ ] **Brand Info trong Preview Feed:** Tích hợp dữ liệu của brand hiện tại (`activeBrand`) vào mockup Instagram Preview thay vì để text cứng `publicast_creator` và avatar mặc định.

### Sprint 3: Data & Integrations 🟡
- [ ] **Upgrade Banner Limit:** Kết nối API để hiển thị giới hạn bài viết thực tế của workspace thay vì hardcode `limit={20}`.
- [ ] **Dashboard Chart Data:** Thay thế dữ liệu fake hàng tuần của chart dashboard bằng dữ liệu real time-series lấy từ API metrics.

---

## 🛠️ Chi tiết kỹ thuật cần thực hiện

### 1. Sửa Timezone và Giờ động trong `PlannerLayout.jsx`
- Sử dụng `useState` và `useEffect` thiết lập bộ đếm thời gian cập nhật mỗi phút.
- Sử dụng `Intl.DateTimeFormat().resolvedOptions().timeZone` để lấy timezone mặc định của trình duyệt nếu user chưa cấu hình trong hệ thống.
- Format định dạng hiển thị: `hh:mm a - Timezone`.

### 2. Tích hợp Post Analytics Modal vào Calendar Grid
- Trong `WeeklyCalendarView.jsx`, truyền `setAnalyticsModal` vào `WeeklyGrid` hoặc xử lý tập trung hàm `handlePostClick`.
- Logic đề xuất:
  ```js
  const handlePostClick = (post) => {
    if (post.status?.toLowerCase() === 'published') {
      setAnalyticsModal({ open: true, post });
    } else {
      openPostCreator({ post });
    }
  };
  ```

### 3. Sửa responsive height cho grid
- Xóa class Tailwind `h-[750px]` cứng nhắc.
- Dùng `flex-1 min-h-0` trên các div cha và grid để grid tự scroll bên trong mà không làm tràn toàn bộ trang web.
