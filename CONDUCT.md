# 📘 PubliCast — Tài Liệu Hướng Dẫn Phát Triển (CONDUCT)

> Nền tảng quản lý mạng xã hội đa kênh — tương tự Metricool  
> Kiến trúc: Monorepo · Express.js + Prisma · React.js (Vite) + Tailwind CSS  
> GitHub: https://github.com/vothnha26/PubliCast

---

## 📐 I. KIẾN TRÚC DỰ ÁN

```
PubliCast/
├── backend/                    # Express.js + Prisma ORM (MySQL) + BullMQ (Redis)
│   ├── prisma/schema.prisma    # Database schema
│   ├── src/
│   │   ├── controllers/        # Nhận request, validate, gọi service
│   │   ├── services/           # Logic nghiệp vụ (Route → Controller → Service)
│   │   ├── routes/             # Định nghĩa API endpoints
│   │   ├── middlewares/        # Auth, rate-limit, error handling
│   │   └── utils/              # Helper functions
│   └── tests/                  # Jest + Supertest
│
├── frontend/                   # React.js SPA (Vite) + Tailwind CSS
│   └── src/
│       ├── pages/              # Các trang chính (manage/, workspace/, admin/)
│       ├── components/         # UI components tái sử dụng
│       ├── context/            # React Context (ThemeContext, BrandContext...)
│       ├── hooks/              # Custom hooks
│       ├── services/           # API service layer
│       └── constants/          # Hằng số toàn cục (không magic strings)
│
├── conductor/                  # Task tracking & planning
├── docs/                       # Tài liệu kỹ thuật
├── test_selenium/              # Selenium E2E tests
├── e2e-tests/                  # Playwright E2E tests
└── CONDUCT.md                  # File này — hướng dẫn phát triển
```

---

## 🧠 II. NGUYÊN TẮC PHÁT TRIỂN BẮT BUỘC

### 1. Quy trình Feature-by-Feature
Mọi tính năng mới **BẮT BUỘC** đi theo quy trình sau:

```
Sequence Diagram → Backend Code → Frontend Integration → Automated Testing → Commit
```

### 2. SOLID & Design Patterns
- **SRP**: Mỗi file/class chỉ làm một việc — file > 300 dòng là dấu hiệu cần tách
- **OCP**: Khi thêm platform mới (TikTok, Instagram...) → thêm Strategy mới, không sửa code cũ
- **Strategy Pattern**: Bắt buộc khi xử lý logic phân nhánh theo platform/provider
- **Factory Pattern**: Bắt buộc khi tạo nhiều loại object cùng interface (ví dụ: ChartFactory)
- **Facade Pattern**: Khi cần đóng gói nhiều service phức tạp thành interface đơn giản

### 3. Không Magic Strings
```js
// ❌ SAI
if (platform === 'facebook') { ... }

// ✅ ĐÚNG
import { PLATFORM_TYPES } from '@/constants/platforms';
if (platform === PLATFORM_TYPES.FACEBOOK) { ... }
```

### 4. CSS Variables — Không Hardcode Màu
```jsx
// ❌ SAI — Không hỗ trợ Dark Mode
<div className="bg-white text-gray-900 border-gray-100">

// ✅ ĐÚNG — Dark Mode tự động hoạt động
<div className="bg-[var(--card)] text-[var(--foreground)] border-[var(--border)]">
```

### 5. Automated Testing
- **Backend**: Jest + Supertest cho mọi API endpoint mới
- **Frontend**: `npm run build` phải thành công sau mọi thay đổi
- **E2E**: Selenium/Playwright cho các user flow quan trọng

---

## 🌿 III. QUY ƯỚC GIT

### Đặt tên Branch
```
feature/<tên-tính-năng>       # Tính năng mới
bugfix/PC-<số>-<mô-tả>        # Sửa bug
refactor/<tên-module>          # Tái cấu trúc
```

### Commit Message Convention
```
feat(<scope>): mô tả ngắn gọn bằng tiếng Anh

feat(inbox): add TikTok platform support
fix(reports): resolve skeleton loader flicker
refactor(ai-service): apply Strategy Pattern for LLM providers
chore(deps): upgrade recharts to 2.13.0
```

### Quy trình Merge
```
feature branch → develop → main
```
Mỗi PR cần:
- [ ] `npm run test` backend PASS
- [ ] `npm run build` frontend PASS
- [ ] Code review từ 1 người khác
- [ ] Không có conflict với `develop`

---

## 🗺️ IV. BẢN ĐỒ CÁC MODULE HIỆN TẠI

| Module | File chính | Trạng thái | Ghi chú |
|--------|-----------|------------|---------|
| Post Creator | `workspace/PostCreator.jsx` | ✅ Hoàn thiện | 29 sub-components |
| AI Copilot | `workspace/post-creator/AICopilotPopover.jsx` | ✅ Built | Cần gắn vào ComposerBody |
| Content Planner | `workspace/planner/` | ✅ Hoàn thiện | Day/Week/Month views |
| AI Assistant | `workspace/AIAssistant.jsx` | ✅ Hoàn thiện | 1242 dòng, cần tách |
| Inbox | `manage/Inbox.jsx` | 🔧 Đang tối ưu | Thiếu TikTok |
| Reports | `manage/Reports.jsx` | 🔧 Đang tái cấu trúc | 3493 dòng, cần tách tiếp |
| Dashboard | `manage/Dashboard.jsx` | ✅ Hoàn thiện | Strategy Pattern ✅ |
| Analytics | `manage/Analytics.jsx` | ❌ Chưa xây | Đang redirect sang MediaLibrary |
| Competitors | `manage/Competitors.jsx` | ✅ Hoàn thiện | 4 platforms |
| Smart Links | `manage/SmartLinks.jsx` | ✅ Hoàn thiện | Bio-link builder |
| Hashtag Manager | `workspace/HashtagManager.jsx` | 🔧 Đang tối ưu | Trending dùng mock data |
| Team Management | `manage/TeamManagement.jsx` | ✅ Hoàn thiện | 982 dòng, cần tách |
| Ads Manager | `manage/Ads.jsx` | ✅ Hoàn thiện | Duplicate trong Placeholder.jsx |
| Dark Mode | `context/ThemeContext.jsx` | 🔧 Đang mở rộng | CSS vars chưa phủ hết pages |
| Auto-Reply | `services/social/inbox/strategies/` | 🔧 Đang mở rộng | Mới có Facebook |

---

## 🤖 V. PROMPTS CHO AI AGENTS

> Dùng các prompt dưới đây khi giao việc cho AI Agent.  
> Luôn đính kèm **Section I, II, III** ở trên làm Shared Context.

---

### 🤖 AGENT A — Dark Mode Full Coverage + AI Copilot Integration
**Branch:** `feature/dark-mode-content-coverage`  
**Khu vực:** `frontend/src/` — không đụng backend, không conflict với Agent B & C

```
Bạn là Agent A trong dự án PubliCast tại D:/Fullit/projects/PubliCast.
Đọc file CONDUCT.md để hiểu quy ước dự án trước khi bắt đầu.

NHIỆM VỤ:

--- NHÓM 1: Gắn AI Copilot vào giao diện soạn thảo ---

Bối cảnh:
- `AICopilotPopover.jsx` đã tồn tại và hoàn chỉnh tại:
  frontend/src/components/workspace/post-creator/AICopilotPopover.jsx
- Nó gọi đúng API /ai/generate, có tone selector, hiển thị kết quả
- Nhưng CHƯA được import vào ComposerBody.jsx

Việc cần làm:
1. Đọc ComposerBody.jsx — tìm biến `showAICopilot` và nút trigger Sparkles
2. Import và render <AICopilotPopover> khi showAICopilot === true
3. Truyền props: onInsertText (chèn text vào textarea), onClose, selectedPlatforms, brandId

--- NHÓM 2: Dark Mode CSS Variables Coverage ---

Quy tắc thay thế (áp dụng nhất quán — xem CONDUCT.md Section II):
- bg-white → bg-[var(--card)]
- bg-[#F8F8F7] / bg-gray-50 → bg-[var(--background)]
- text-gray-900 / text-[#0A0A0A] → text-[var(--foreground)]
- border-gray-100 / border-gray-200 → border-[var(--border)]
- text-gray-500 / text-gray-400 → text-[var(--muted-foreground)]

Files cần cập nhật (theo thứ tự ưu tiên):
1. frontend/src/App.jsx (dòng 110, 133)
2. frontend/src/pages/manage/Inbox.jsx
3. frontend/src/pages/workspace/planner/ListView.jsx
4. frontend/src/pages/workspace/planner/WeeklyCalendarView.jsx
5. frontend/src/pages/manage/Dashboard.jsx

Việc bổ sung:
- Xóa component AdsPage duplicate trong frontend/src/pages/manage/Placeholder.jsx

QUY TRÌNH BẮT BUỘC:
1. Vẽ Sequence Diagram (markdown) cho luồng AI Copilot
2. Thực hiện code
3. npm run build tại frontend/
4. git add -A && git commit -m "feat(agent-a): wire AICopilot to ComposerBody + dark mode CSS variables coverage"
5. git push origin feature/dark-mode-content-coverage
```

---

### 🤖 AGENT B — Reports.jsx Full Modularization
**Branch:** `feature/reports-modular-refactor`  
**Khu vực:** `frontend/src/pages/manage/Reports.jsx` + `frontend/src/components/manage/reports/`  
**Không đụng backend, không conflict với Agent A & C**

```
Bạn là Agent B trong dự án PubliCast tại D:/Fullit/projects/PubliCast.
Đọc file CONDUCT.md để hiểu quy ước dự án trước khi bắt đầu.

NHIỆM VỤ: Hoàn thiện tái cấu trúc Reports.jsx (hiện 3493 dòng, 190KB)

Đã có sẵn tại frontend/src/components/manage/reports/:
- PerformanceOverviewWidget.jsx ✅
- AudienceDemographicsWidget.jsx ✅
- ExportOptionsModal.jsx ✅
- ChartFactory.jsx ✅ (Factory Pattern cho Recharts)
- constants.js ✅

Cần tạo thêm:
1. ReportStepperHeader.jsx
   - Props: currentStep (1|2|3), onStepChange, templateName
   - Hiển thị: Step 1 "Chọn Widgets" → Step 2 "Thương hiệu" → Step 3 "Màu sắc & Preview"

2. WidgetSelectorPanel.jsx
   - Props: selectedWidgets, onToggleWidget, availableChannels
   - Danh sách widget có thể bật/tắt theo từng platform

3. BrandingConfigPanel.jsx
   - Props: brandingConfig, onChange
   - Upload logo, chọn background (màu/ảnh)

4. ColorSchemePanel.jsx
   - Props: colorScheme, onChange
   - Color picker primary/secondary/accent + font selector

5. ReportTemplateCard.jsx
   - Props: template, onSelect, onEdit, onDelete, isActive
   - Card hiển thị 1 template với thumbnail

6. EmailAutomationSection.jsx (nếu chưa tách)
   - Toggle gửi email, lịch gửi hàng tháng, danh sách email nhận

Skeleton Loaders (thêm vào mỗi Widget khi isLoading === true):
- 4 KPI card skeletons (rectangle animate-pulse)
- Chart area skeleton (rectangle lớn animate-pulse)
- Table row skeletons (3-5 dòng animate-pulse)

Dark Mode cho Reports:
- Áp dụng CSS variables: bg-white → bg-[var(--card)], etc. (xem CONDUCT.md Section II)

MỤC TIÊU: Reports.jsx sau tái cấu trúc phải < 500 dòng

QUY TRÌNH BẮT BUỘC:
1. Vẽ Sequence Diagram cho luồng 3 bước tạo report
2. Tách từng component — verify không lỗi sau mỗi lần tách
3. npm run build tại frontend/
4. git add -A && git commit -m "feat(agent-b): split Reports.jsx into modular components + skeleton loaders + dark mode"
5. git push origin feature/reports-modular-refactor
6. Báo cáo: số dòng Reports.jsx trước và sau khi tách
```

---

### 🤖 AGENT C — Inbox TikTok + Hashtag Real API + Auto-Reply Đa Nền Tảng
**Branch:** `feature/inbox-tiktok-hashtag-api`  
**Khu vực:** `frontend/src/pages/manage/Inbox.jsx` + `frontend/src/pages/workspace/HashtagManager.jsx` + `backend/src/`  
**Chạy song song hoàn toàn với Agent A & B**

```
Bạn là Agent C trong dự án PubliCast tại D:/Fullit/projects/PubliCast.
Đọc file CONDUCT.md để hiểu quy ước dự án trước khi bắt đầu.

NHIỆM VỤ (làm theo thứ tự):

--- NHÓM 1: Hashtag Manager — Thay Mock Data bằng API thật ---

Vấn đề: HashtagManager.jsx có hằng số TREND_MOCK_HASHTAGS hardcode
Tab "Trending" không gọi API thật

Backend — tạo mới:
1. Endpoint: GET /api/hashtags/trending?platform=INSTAGRAM&limit=20
2. Tạo thư mục backend/src/services/workspace/hashtag/trending/ với Strategy Pattern:
   - BaseTrendingStrategy.js (interface/abstract)
   - InstagramTrendingStrategy.js
   - TikTokTrendingStrategy.js
   - MockTrendingStrategy.js (fallback — dữ liệu realistic, không hardcode)
3. Viết test Jest cho endpoint trending

Frontend:
1. Xóa TREND_MOCK_HASHTAGS trong HashtagManager.jsx
2. Gọi API khi user click tab "Trending"
3. Thêm loading skeleton + error state

--- NHÓM 2: Inbox — Thêm TikTok + Fix UX ---

Backend:
1. Kiểm tra inbox.service.js — xem TikTok comment fetching đã có chưa
2. Nếu chưa: thêm TikTok vào getInboxItems() với Strategy Pattern

Frontend:
1. Thêm TIKTOK vào filter buttons trong Inbox.jsx
2. Thay window.confirm() → await confirm() từ useConfirm hook
   (hook đã có tại frontend/src/hooks/useConfirm.js)

--- NHÓM 3: Auto-Reply — Mở rộng sang Instagram ---

Vấn đề: Auto-Reply check cứng facebookAccountId — chỉ hoạt động cho Facebook

Backend:
1. Đọc backend/src/services/social/inbox/strategies/auto-reply/
2. Refactor: thay facebookAccountId → socialAccountId (generic) + field platform
3. Tạo instagram-comment.strategy.js — lắng nghe Instagram comment webhook

Frontend:
1. Auto-Reply Settings Panel trong Inbox.jsx — thêm dropdown chọn Platform
2. Filter social accounts theo platform đã chọn

QUY TRÌNH BẮT BUỘC:
1. Vẽ Sequence Diagram cho từng nhóm
2. npm run test (backend) sau mỗi nhóm backend
3. npm run build (frontend) sau khi xong tất cả
4. Commit riêng từng nhóm:
   - "feat(agent-c): hashtag trending API with Strategy Pattern"
   - "feat(agent-c): inbox TikTok support + fix window.confirm UX"
   - "feat(agent-c): auto-reply multi-platform Strategy Pattern refactor"
5. git push origin feature/inbox-tiktok-hashtag-api
```

---

## 📊 VI. TRẠNG THÁI CÁC SPRINT

### Sprint Hiện Tại — Optimization Round 2
| Agent | Branch | Trạng thái | Nhiệm vụ |
|-------|--------|------------|----------|
| Agent A | `feature/dark-mode-content-coverage` | 🔲 Chờ | Dark Mode Coverage + AI Copilot integration |
| Agent B | `feature/reports-modular-refactor` | 🔲 Chờ | Reports.jsx full modularization |
| Agent C | `feature/inbox-tiktok-hashtag-api` | 🔲 Chờ | Inbox TikTok + Hashtag API + Auto-Reply |

### Sprint Đã Hoàn Thành
| Agent | Branch | Tính năng |
|-------|--------|-----------|
| Agent 1 | `feature/post-creator-ai-copilot` | AI Copilot backend + AICopilotPopover component |
| Agent 2 | `feature/reports-modular-ui` | Reports ChartFactory + Widget components |
| Agent 3 | `feature/global-dark-mode` | ThemeContext + ThemeSwitcher UI |
| Agent 4 | `feature/meta-comment-auto-reply` | Facebook Auto-Reply Strategy Pattern |

---

## 🔧 VII. LỆNH PHÁT TRIỂN HAY DÙNG

```bash
# Backend
cd backend
npm run dev          # Khởi động dev server
npm run test         # Chạy tất cả test Jest
npm run test -- --testPathPattern="inbox"  # Chạy test cụ thể

# Frontend
cd frontend
npm run dev          # Khởi động Vite dev server
npm run build        # Build production (validation bắt buộc)
npm run preview      # Preview production build

# Database
cd backend
npx prisma migrate dev --name <tên-migration>
npx prisma studio    # Mở DB GUI trên browser

# Git workflow
git checkout develop
git pull origin develop
git checkout -b feature/<tên-tính-năng>
# ... code ...
git add -A
git commit -m "feat(<scope>): mô tả"
git push origin feature/<tên-tính-năng>
```

---

## 📋 VIII. CHECKLIST TRƯỚC KHI MERGE PR

- [ ] `npm run test` backend — tất cả PASS
- [ ] `npm run build` frontend — thành công, không warning
- [ ] Không còn magic strings — dùng constants
- [ ] Không hardcode màu sắc — dùng CSS variables
- [ ] File mới < 300 dòng (ngoại lệ phải có lý do)
- [ ] Sequence Diagram đã được vẽ và lưu trong PR description
- [ ] Không có console.log() sót lại trong production code
- [ ] `window.confirm()` / `window.alert()` đã thay bằng custom hooks

---

*Tài liệu này được cập nhật liên tục. Mọi thay đổi quy ước phát triển phải được cập nhật vào đây.*
