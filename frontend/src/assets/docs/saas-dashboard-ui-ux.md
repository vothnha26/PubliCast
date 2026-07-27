# SaaS Dashboard – UI/UX Analysis, Role System & Figma Make Prompts
> Inspired by Metricool | Social Media Management + Multi-Platform Livestream  
> Theme: White/Black (Monochrome) | Nền: Trắng/Đen

---

## PHẦN 1 – PHÂN TÍCH UI/UX STYLE METRICOOL

### 1.1 Layout Structure (Bố cục tổng thể)

```
┌──────────────┬────────────────────────────────────────────┐
│   SIDEBAR    │             TOPBAR                         │
│   220px      ├────────────────────────────────────────────┤
│   #0A0A0A    │                                            │
│   (dark)     │         CONTENT AREA                       │
│              │         #F8F8F7 (light gray bg)            │
│              │                                            │
└──────────────┴────────────────────────────────────────────┘
```

**Pattern:** Left sidebar fixed + right scrollable content area  
**Sidebar width:** 220px (collapsible on mobile → 60px icon-only)  
**Topbar height:** 54px cố định  
**Content padding:** 20px top/bottom, 24px left/right

---

### 1.2 Color System (Bảng màu)

#### Primary Palette (Monochrome – White/Black theme)

| Token                  | Hex       | Dùng cho                                        |
|------------------------|-----------|-------------------------------------------------|
| `--sidebar-bg`         | `#0A0A0A` | Sidebar background                              |
| `--sidebar-hover`      | `#161616` | Sidebar item hover                              |
| `--sidebar-active`     | `#FFFFFF` | Active nav item (white pill on dark bg)         |
| `--sidebar-border`     | `#1E1E1E` | Sidebar internal borders                        |
| `--content-bg`         | `#F8F8F7` | Page background (content area)                  |
| `--card-bg`            | `#FFFFFF` | Card/panel background                           |
| `--card-border`        | `#E5E7EB` | Card borders (0.5px)                            |
| `--text-primary`       | `#0A0A0A` | Headings, values, labels chính                  |
| `--text-secondary`     | `#6B7280` | Mô tả, sub-labels                               |
| `--text-tertiary`      | `#9CA3AF` | Hints, placeholder                              |

#### Semantic Colors (chỉ dùng cho trạng thái, không dùng decoration)

| Token           | Hex       | Dùng cho                        |
|-----------------|-----------|---------------------------------|
| `--success`     | `#16A34A` | Tăng trưởng, published, online  |
| `--warning`     | `#D97706` | Pending, scheduled, warning     |
| `--danger`      | `#DC2626` | LIVE badge, errors, rejected    |
| `--info`        | `#2563EB` | Info tooltips, links            |

#### Platform Brand Colors (chỉ dùng cho platform icons)

| Platform  | Hex       |
|-----------|-----------|
| YouTube   | `#FF0000` |
| Facebook  | `#1877F2` |
| TikTok    | `#010101` |
| Instagram | gradient `#f09433 → #e6683c → #dc2743 → #cc2366` |
| Twitch    | `#9146FF` |
| LinkedIn  | `#0A66C2` |
| X/Twitter | `#000000` |

---

### 1.3 Typography

| Element            | Size  | Weight | Color          |
|--------------------|-------|--------|----------------|
| Page title         | 15px  | 500    | text-primary   |
| Section heading    | 13px  | 500    | text-primary   |
| Card label         | 11px  | 400    | text-secondary |
| Stat value         | 22px  | 500    | text-primary   |
| Nav item           | 12.5px| 400    | sidebar text   |
| Body / description | 12px  | 400    | text-secondary |
| Caption / hint     | 10px  | 400    | text-tertiary  |
| Section label      | 10px  | 500    | text-secondary (uppercase, letter-spacing: 0.8px) |

**Font khuyến nghị:** DM Sans hoặc Plus Jakarta Sans  
**Letter spacing:** -0.2px cho titles, 0 cho body, +0.8px cho ALL-CAPS labels  
**Line height:** 1.5 cho body, 1.2 cho headings

---

### 1.4 Spacing & Geometry

| Token             | Value  | Dùng cho                              |
|-------------------|--------|---------------------------------------|
| `--radius-sm`     | 6px    | Badges, chips, small inputs           |
| `--radius-md`     | 8px    | Buttons, form fields, small cards     |
| `--radius-lg`     | 12px   | Panels, main cards                    |
| `--radius-xl`     | 16px   | Modal, large containers               |
| `--radius-full`   | 9999px | Avatars, toggle knobs, dots           |
| `--gap-xs`        | 6px    | Between icons và labels               |
| `--gap-sm`        | 10px   | Between list items                    |
| `--gap-md`        | 16px   | Between cards                         |
| `--gap-lg`        | 24px   | Section separators                    |
| `--border-width`  | 0.5px  | Tất cả borders (không dùng 1px)       |

---

### 1.5 Component Patterns (Metricool-inspired)

#### Nav Item (Sidebar)
```
Default:  bg transparent   | text #777    | icon #777
Hover:    bg #161616        | text #CCC    | icon #CCC
Active:   bg #FFFFFF        | text #0A0A0A | icon #0A0A0A
          border-radius: 7px | padding: 8px 10px
```

#### Stat Card
```
bg: #FFFFFF | border: 0.5px #E5E7EB | border-radius: 12px
padding: 14px 16px
- Label: 11px #6B7280 (margin-bottom: 6px)
- Value: 22px #0A0A0A font-weight: 500
- Delta: 11px green/red (margin-top: 4px)
```

#### Platform Toggle Row (Multi-stream)
```
bg: #0A0A0A (dark panel)
Row: flex align-center gap-8px | padding: 7px 0 | border-bottom: 0.5px #222
- Platform icon: 18x18px rounded-4px brand color
- Name: 12px #DDD flex-1
- Quality badge: 9px #777 bg-#1E1E1E rounded-4px
- Toggle: 30x17px, knob 13x13px
  OFF: track #333, knob #888
  ON:  track #FFFFFF, knob #0A0A0A
```

#### Live Badge
```
background: #DC2626 | color: #FFFFFF
font-size: 9px | font-weight: 600
padding: 2px 6px | border-radius: 4px
letter-spacing: 0.5px
Animated: pulse opacity 1→0.4→1 cycle 1.5s
```

#### Brand Selector (Topbar dropdown)
```
bg: #161616 | border: 0.5px #2A2A2A | border-radius: 8px
padding: 10px 14px | display: flex align-center gap-8px
- Avatar: 24px circle, initials
- Name: 12px #E0E0E0
- Caret: ▾ #666
```

---

### 1.6 UX Patterns quan trọng

1. **Brand-level context:** Mọi data đều scoped theo Brand hiện tại — switcher ở top sidebar
2. **Multi-platform atomic actions:** Mỗi action (schedule, livestream) chọn nhiều platforms trong cùng 1 form
3. **Approval workflow:** Content Creator → gửi review → Reviewer duyệt/từ chối → Auto publish
4. **Real-time indicators:** LIVE badge + pulse animation + viewer count live update
5. **Status dots thay badge:** Dùng dot màu (green/yellow/gray/red) thay vì text badge cho danh sách schedule
6. **Topbar date filters:** Chip group (Today/7d/30d/Custom) thay vì dropdown
7. **Horizontal stat row:** 4 cards ngang ở đầu mỗi trang — số lớn + label nhỏ + delta

---

## PHẦN 2 – HỆ THỐNG ROLE & PHÂN QUYỀN

### 2.1 Danh sách Roles (9 roles)

#### Tầng 1 – Platform Level (Quản trị hệ thống)

**OWNER**
- Vai trò: Chủ tài khoản, toàn quyền tuyệt đối
- Quyền đặc biệt: Billing, nâng/hạ plan, xóa tài khoản, xem audit logs
- Số lượng: Chỉ 1 per account
- Màu hiển thị: `#0A0A0A` (đen tuyệt đối)

**ADMIN**
- Vai trò: Quản trị viên cấp cao
- Quyền: Toàn quyền trừ billing và xóa tài khoản
- Có thể: Tạo/xóa Brand, mời/xóa user, tạo custom roles, kết nối platform
- Màu hiển thị: `#374151`

#### Tầng 2 – Brand Level (Quản lý trong Brand)

**STREAM MANAGER**
- Vai trò: Quản lý toàn bộ livestream của brand
- Quyền: Bắt đầu/kết thúc stream, cài đặt stream key, xem stream analytics, lên lịch stream trên mọi platform
- Không có quyền: Xóa Brand, billing, quản lý user ngoài stream
- Màu hiển thị: `#DC2626` (đỏ – gắn với LIVE)

**CONTENT MANAGER**
- Vai trò: Quản lý nội dung tổng thể
- Quyền: Lên lịch posts + streams, duyệt nội dung, quản lý media library, xem analytics, tạo reports
- Không có quyền: Xóa Brand, billing, manage users
- Màu hiển thị: `#4B5563`

**EDITOR**
- Vai trò: Biên tập viên
- Quyền: Tạo/sửa/xóa posts, lên lịch stream (cần duyệt), reply inbox, cập nhật SmartLinks, tạo ad campaigns
- Không có quyền: Xóa posts đã publish, manage users, brand settings
- Màu hiển thị: `#6B7280`

**CONTENT CREATOR**
- Vai trò: Người tạo nội dung
- Quyền: Tạo posts/streams, submit for review, upload media, xem lịch
- PHẢI submit mọi thứ qua approval trước khi publish
- Không có quyền: Publish trực tiếp, edit người khác, inbox, analytics
- Màu hiển thị: `#9CA3AF`

**STREAM OPERATOR**
- Vai trò: Người vận hành stream (chỉ xử lý livestream)
- Quyền: Xem lịch stream, bắt đầu/kết thúc stream đã được approve, monitor chat
- Không có quyền: Lên lịch stream mới, xem analytics chi tiết, manage posts
- Màu hiển thị: `#EF4444` (đỏ nhạt)

#### Tầng 3 – View/Approval Only

**ANALYST**
- Vai trò: Phân tích dữ liệu
- Quyền: Xem toàn bộ analytics (social + stream), xem reports, export data
- Không có quyền: Chỉnh sửa bất cứ thứ gì
- Màu hiển thị: `#D1D5DB`

**CLIENT**
- Vai trò: Khách hàng / người phê duyệt
- Quyền: Xem analytics cơ bản, approve/reject posts & streams trước khi publish
- Không có quyền: Chỉnh sửa, export, quản lý
- Màu hiển thị: `#E5E7EB`

---

### 2.2 Permission Matrix (Chi tiết quyền theo role)

#### Nhóm quyền: Livestream

| Permission                         | Owner | Admin | Stream Mgr | Content Mgr | Editor | Creator | Operator | Analyst | Client |
|------------------------------------|:-----:|:-----:|:----------:|:-----------:|:------:|:-------:|:--------:|:-------:|:------:|
| Xem lịch stream                    | ✅    | ✅    | ✅         | ✅          | ✅     | ✅      | ✅       | ✅      | ✅     |
| Lên lịch stream mới                | ✅    | ✅    | ✅         | ✅          | ✅*    | ✅*     | ❌       | ❌      | ❌     |
| Bắt đầu / kết thúc stream         | ✅    | ✅    | ✅         | ✅          | ❌     | ❌      | ✅       | ❌      | ❌     |
| Cài đặt stream key / RTMP          | ✅    | ✅    | ✅         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Chọn platforms (YT/FB/TT/IG...)    | ✅    | ✅    | ✅         | ✅          | ✅*    | ✅*     | ❌       | ❌      | ❌     |
| Xem stream analytics real-time     | ✅    | ✅    | ✅         | ✅          | ❌     | ❌      | ✅       | ✅      | ❌     |
| Xem stream analytics lịch sử      | ✅    | ✅    | ✅         | ✅          | ❌     | ❌      | ❌       | ✅      | ❌     |
| Approve/reject lịch stream         | ✅    | ✅    | ✅         | ✅          | ❌     | ❌      | ❌       | ❌      | ✅     |
| Monitor & manage stream chat       | ✅    | ✅    | ✅         | ✅          | ✅     | ❌      | ✅       | ❌      | ❌     |
| Xóa lịch stream                    | ✅    | ✅    | ✅         | ✅          | ❌     | ❌      | ❌       | ❌      | ❌     |

*`✅*` = phải submit for review, không publish trực tiếp

#### Nhóm quyền: Content & Social Media

| Permission                         | Owner | Admin | Stream Mgr | Content Mgr | Editor | Creator | Operator | Analyst | Client |
|------------------------------------|:-----:|:-----:|:----------:|:-----------:|:------:|:-------:|:--------:|:-------:|:------:|
| Xem content calendar               | ✅    | ✅    | ✅         | ✅          | ✅     | ✅      | ✅       | ✅      | ✅     |
| Tạo & lên lịch posts               | ✅    | ✅    | ❌         | ✅          | ✅     | ✅*     | ❌       | ❌      | ❌     |
| Publish ngay (direct publish)      | ✅    | ✅    | ❌         | ✅          | ✅     | ❌      | ❌       | ❌      | ❌     |
| Sửa posts của người khác           | ✅    | ✅    | ❌         | ✅          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Xóa posts                          | ✅    | ✅    | ❌         | ✅          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Submit for review                  | ✅    | ✅    | ❌         | ✅          | ✅     | ✅      | ❌       | ❌      | ❌     |
| Approve/reject posts               | ✅    | ✅    | ❌         | ✅          | ❌     | ❌      | ❌       | ❌      | ✅     |
| Upload media library               | ✅    | ✅    | ❌         | ✅          | ✅     | ✅      | ❌       | ❌      | ❌     |
| Manage media library               | ✅    | ✅    | ❌         | ✅          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Reply Inbox (DMs/comments)         | ✅    | ✅    | ❌         | ✅          | ✅     | ❌      | ❌       | ❌      | ❌     |
| Manage AutoLists                   | ✅    | ✅    | ❌         | ✅          | ✅     | ❌      | ❌       | ❌      | ❌     |

#### Nhóm quyền: Analytics & Reports

| Permission                         | Owner | Admin | Stream Mgr | Content Mgr | Editor | Creator | Operator | Analyst | Client |
|------------------------------------|:-----:|:-----:|:----------:|:-----------:|:------:|:-------:|:--------:|:-------:|:------:|
| Xem analytics tổng hợp (Summary)   | ✅    | ✅    | ✅         | ✅          | ✅     | ❌      | ❌       | ✅      | ✅     |
| Xem analytics chi tiết            | ✅    | ✅    | ✅         | ✅          | ❌     | ❌      | ❌       | ✅      | ❌     |
| Xem Competitor analytics           | ✅    | ✅    | ❌         | ✅          | ❌     | ❌      | ❌       | ✅      | ❌     |
| Tạo & export Reports               | ✅    | ✅    | ✅         | ✅          | ❌     | ❌      | ❌       | ✅      | ❌     |
| Xem Ads analytics                  | ✅    | ✅    | ❌         | ✅          | ✅     | ❌      | ❌       | ✅      | ❌     |

#### Nhóm quyền: Brand & Account Management

| Permission                         | Owner | Admin | Stream Mgr | Content Mgr | Editor | Creator | Operator | Analyst | Client |
|------------------------------------|:-----:|:-----:|:----------:|:-----------:|:------:|:-------:|:--------:|:-------:|:------:|
| Billing & Plan management          | ✅    | ❌    | ❌         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Tạo / xóa Brand                    | ✅    | ✅    | ❌         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Kết nối social platforms           | ✅    | ✅    | ✅         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Mời / xóa team members             | ✅    | ✅    | ❌         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Tạo / sửa custom roles             | ✅    | ✅    | ❌         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Gán role cho user                  | ✅    | ✅    | ❌         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Xem audit logs                     | ✅    | ✅    | ❌         | ❌          | ❌     | ❌      | ❌       | ❌      | ❌     |
| Manage SmartLinks                  | ✅    | ✅    | ❌         | ✅          | ✅     | ❌      | ❌       | ❌      | ❌     |

---

### 2.3 Luồng Approval Workflow

```
Content Creator / Editor
        │
        ▼
   [Submit for Review]
        │
        ▼
Reviewer nhận notification (email + in-app)
        │
   ┌────┴────┐
   ▼         ▼
[APPROVE]  [REJECT + note]
   │              │
   ▼              ▼
Auto Publish   Trả về Creator
(scheduled     (có rejection note)
 time)
```

**Quy tắc approval:**
- Nếu ít nhất 1 reviewer reject → Không publish (dù tất cả còn lại approve)
- Reviewer có thể: Approve, Reject (kèm note), hoặc Edit trực tiếp (nếu có Editor role)
- Bulk approval: Từ Planning > List > Bulk Actions
- Stream approval: Tương tự nhưng approves cả stream key + platforms đã chọn

---

## PHẦN 3 – FIGMA MAKE PROMPTS

### Prompt 1 – App Shell & Sidebar Navigation

```
Design a SaaS dashboard app shell with the following structure:

LEFT SIDEBAR (220px wide, background #0A0A0A):
- Top: Logo area with 28px white rounded-square logo mark + app name "StreamHub" in white 14px/500
- Brand switcher: Dark pill (#161616, border 0.5px #2A2A2A, radius 8px) with avatar initials circle + brand name + chevron caret
- Navigation sections with uppercase 10px gray section labels (letter-spacing 0.8px):
  Section "Overview": Dashboard (chart-bar icon), Planner (calendar icon, badge "12"), Analytics (trending-up icon)
  Section "Livestream": "Live Now" item with pulsing red dot + LIVE badge (red bg, 2 active), Schedule Stream, Stream Analytics, Stream Settings
  Section "Manage": Inbox (badge "5"), Team, Reports, Ads
- Active state: white background pill, black text/icon
- Hover state: #161616 background, #CCC text
- Bottom: User avatar + name + role label + 3-dot menu

RIGHT MAIN AREA:
- Topbar (54px, white bg, border-bottom 0.5px #E5E7EB): page title left, date filter chips center (Today/7 days/30 days — active chip: black bg white text), "Start Livestream" black CTA button right (with broadcast icon)
- Content area background: #F8F8F7

Font: DM Sans or Plus Jakarta Sans. Border-radius: 8px components, 12px cards. All borders 0.5px. Monochrome palette only (black/white/grays + semantic red for LIVE).
```

---

### Prompt 2 – Dashboard Overview Page

```
Design the main dashboard page content area (inside the app shell from Prompt 1):

ROW 1 — Stats Grid (4 equal-width cards, horizontal):
Each card: white bg, 0.5px #E5E7EB border, 12px radius, 14px/16px padding
Card 1: label "Total Viewers" (11px gray), value "48,291" (22px/500 black), delta "↑ 12.4% vs yesterday" (11px green #16A34A)
Card 2: label "Live Streams" (11px gray), value "2" (22px/500 black), note "YouTube + Facebook" (11px gray)
Card 3: label "Scheduled Streams Today" (11px gray), value "5" (22px/500), note "3 remaining" (11px gray)
Card 4: label "Posts Scheduled" (11px gray), value "23" (22px/500), delta "↑ 3 vs last week" (11px green)

ROW 2 — Two-column layout (left 60%, right 40%):

LEFT COLUMN — "Live Now" panel:
- Panel: white bg, 0.5px border, 12px radius, title "Live Streams" + "View All →" link
- 2 stream cards stacked:
  Each card: thumbnail area (80px tall, dark gradient bg #111→#1a1a2e) with "LIVE" red badge top-left + viewer count "👁 12,483" bottom-right in dark pill
  Below thumbnail: stream title (12px/500), platform icons row (small 18px colored squares: YouTube red, Facebook blue, TikTok black)

RIGHT COLUMN (top) — "Platform Settings" dark panel:
- Background #0A0A0A, 12px radius, padding 16px
- Title "Multi-Platform Control" with pulsing red dot
- 7 platform rows (YouTube, Facebook, TikTok, Instagram, Twitch, LinkedIn, X):
  Each row: platform icon (18x18px brand color) + platform name (12px #DDD) + quality badge (9px gray pill) + toggle switch
  Toggle ON: white track, black knob | Toggle OFF: #333 track, #888 knob
  Rows separated by 0.5px #222 border

RIGHT COLUMN (bottom) — "Viewers by Platform" panel:
- White card with horizontal bar chart
- Each row: platform icon + name + progress bar (platform brand color fill) + viewer count right-aligned
- Bars: YouTube 78%, Facebook 48%, TikTok 30%, Instagram 18%, Twitch 10%, LinkedIn 6%, X 4%
```

---

### Prompt 3 – Stream Scheduler (Calendar View)

```
Design a weekly calendar scheduler page for livestream planning:

TOPBAR (inside content area):
- Left: month/week navigation arrows + "May 2025" label
- Center: View toggle chips: "Day | Week | Month"  
- Right: "+ Schedule Stream" black button

CALENDAR GRID:
- 7 columns (Mon → Sun), time rows every 30min from 08:00 → 22:00
- Column headers: day name (Mon) + date number (12) — today highlighted with black circle
- Time labels: left column, 11px gray, aligned to row top
- Grid lines: 0.5px #F0F0EF horizontal, 0.5px #E5E7EB vertical
- Current time indicator: red horizontal line spanning all columns

STREAM EVENT CARDS (inside calendar cells):
- Background: #0A0A0A | text: white | border-radius: 6px
- Padding: 6px 8px | overflow: hidden
- Content: stream title (11px/500), platform icons row (12px colored squares), status dot right-aligned
- Status: red pulsing dot = LIVE | yellow dot = Upcoming | green dot = Completed | gray = Draft
- Height = duration in time slots (60min stream = 2 rows tall)
- On hover: slight brightness increase, cursor pointer

SCHEDULE STREAM SIDE PANEL (slides in from right, 360px wide):
- White bg, left border 0.5px #E5E7EB, shadow-none
- Header: "Schedule Livestream" 15px/500 + X close button
- Form sections:
  [Stream Details]
  - Title input (full width, placeholder "Stream title...")
  - Description textarea (3 rows)
  - Thumbnail upload area (dashed border, drag & drop)
  
  [Date & Time]
  - Date picker (calendar widget, black selected date)
  - Time picker (HH:MM dropdowns)
  - Duration selector (30min / 1hr / 2hr / Custom chips)
  
  [Platform Selection — checkboxes with toggles]
  - YouTube ✅ | Quality: 1080p/720p/480p dropdown
  - Facebook ✅ | Quality: 720p/480p dropdown
  - TikTok ☐  | Quality: 720p dropdown
  - Instagram ☐ | Quality: 720p dropdown
  - Twitch ☐  | Quality: 1080p/720p dropdown
  - LinkedIn ☐ | Quality: 720p dropdown
  - X (Twitter) ☐ | Quality: 480p dropdown
  
  [Stream Key — per platform, collapsible]
  - RTMP URL field (masked ****) + copy icon
  - Stream Key field (masked ****) + copy + refresh icons
  
  [Approval]
  - "Require approval before going live" toggle
  - Reviewer selector (multi-select user search)
  
- Footer: "Save Draft" ghost button + "Schedule Stream" black button

Use DM Sans, monochrome palette, all borders 0.5px.
```

---

### Prompt 4 – Live Stream Monitor Page

```
Design a real-time livestream monitoring page (active during a stream):

FULL-WIDTH HEADER BAR (black bg #0A0A0A):
- Left: pulsing red LIVE badge + stream title "Tech Review Q2 2025 – Official Livestream"
- Center: runtime clock "01:23:47" (monospace font, white, 18px)
- Right: "End Stream" button (red bg #DC2626, white text) + "Share" ghost button

TWO-COLUMN LAYOUT (70% / 30%):

LEFT — Stream Preview:
- Large video preview placeholder (16:9 ratio, dark bg with centered play icon)
- Below preview: 4 platform status cards in a row:
  Each: platform icon + name + colored status dot + viewer count + quality indicator
  Example: YouTube • 🔴 LIVE • 12,483 viewers • 1080p
  Example: Facebook • 🔴 LIVE • 7,291 viewers • 720p
  Example: TikTok • ⚫ Offline • — viewers
  Example: Instagram • 🔴 LIVE • 2,140 viewers • 720p

- Below platform cards: real-time metrics row (4 mini cards):
  Total Viewers | Peak Viewers | Avg Watch Time | New Followers

RIGHT — Live Chat & Controls:
- "Unified Chat" panel (white card, full remaining height):
  - Header: "Live Chat" + platform filter chips (All | YT | FB | IG)
  - Chat messages list (scrollable):
    Each message: platform color dot + username + message text + timestamp
    Messages from different platforms have their platform's brand color dot
  - Bottom: message reply input + send button

- Below chat: "Stream Health" mini panel:
  - Bitrate indicator: green bar
  - Frame rate: 60fps badge
  - Latency: low/medium/high indicator dots
  - CPU/encoder load: progress bar

- "Quick Actions" panel:
  - Add overlay text button
  - Switch scene button  
  - Mute/unmute toggle
  - End on all platforms toggle

Monochrome base. Use red only for LIVE indicators. Platform brand colors only for platform badges.
```

---

### Prompt 5 – Team Management & Roles Page

```
Design a Team Management page with two tabs: "Team Members" and "Roles & Permissions"

TAB 1 — Team Members:
- Top: Search input + "Invite Member" black button right-aligned
- Summary pills row: "9 Total" | "2 Owner/Admin" | "3 Editors" | "4 View-only"

- Users table (white card, full width):
  Columns: Avatar+Name | Email | Role (colored pill badge) | Brands (count badge "3 brands") | Last Active | Actions (3-dot)
  
  Role pill colors:
  Owner: black bg white text
  Admin: #374151 bg white text
  Stream Manager: red tint bg dark red text
  Content Manager: dark gray bg white text
  Editor: gray bg white text
  Content Creator: light gray bg dark text
  Stream Operator: light red bg dark red text
  Analyst: very light gray bg dark gray text
  Client: lightest gray bg dark text
  
  Each row: hover shows light gray bg, 3-dot reveals: Edit Role | Remove from Brand | Resend Invite

TAB 2 — Roles & Permissions:
- Top: "Add Custom Role" black button right-aligned

- Role cards grid (3 columns):
  Each role card (white bg, 0.5px border, 12px radius, padding 12px):
  - Top: colored dot + role name (13px/500) + user count badge ("4 users")
  - Description: 2 lines, 11px gray
  - Hover: "Edit" and "Duplicate" ghost buttons appear bottom-right
  
  9 cards: Owner, Admin, Stream Manager, Content Manager, Editor, Content Creator, Stream Operator, Analyst, Client
  Plus "+" card with dashed border for "Create Custom Role"

- Permission Matrix section (below cards):
  Full-width expandable table: rows = permissions, columns = roles (abbreviated)
  Cell: ✅ checkmark (black) or — (gray dash)
  Sections: Livestream | Content | Analytics | Brand Management
  Each section has a gray section header row
  Table headers sticky on scroll

Font DM Sans. 0.5px borders throughout. No gradients. Monochrome + semantic colors for role pills.
```

---

### Prompt 6 – Analytics Dashboard (Stream + Social combined)

```
Design an Analytics page combining social media metrics and livestream performance:

PAGE HEADER:
- Title "Analytics" + date range picker (30 days default) + "Export Report" ghost button + "Compare" chip toggle

PLATFORM SELECTOR (horizontal scrollable chips):
All | YouTube | Facebook | TikTok | Instagram | Twitch | LinkedIn | X

METRIC SUMMARY ROW (6 stat cards):
Total Reach | Total Impressions | Engagement Rate | Stream Hours | Peak Viewers | New Followers
Each card: white, 12px radius, 22px bold value, 11px gray label, small sparkline chart (5px tall, black bars)

MAIN CHART AREA (white panel, full width):
- Tab bar: "Overview" | "Livestream" | "Posts" | "Audience"
- Large line chart (400px height):
  Multiple lines: one per platform (using platform brand colors)
  X-axis: dates, Y-axis: metric value
  Tooltip on hover: dark pill showing each platform's value
  Legend: platform icons + name + current value aligned horizontally above chart

BOTTOM TWO-COLUMN:
LEFT — "Top Streams" table:
  Columns: Thumbnail | Title | Date | Platforms (icons) | Peak Viewers | Total Watch Time | Status
  Rows: 5 recent streams
  Status pill: Completed (green), Live (red pulse), Scheduled (yellow)

RIGHT — "Audience Breakdown" donut chart panel:
  Large donut (200px diameter), segments by platform with brand colors
  Legend below: platform icon + name + percentage + viewer count
  Center of donut: total number large

Use DM Sans. Monochrome for UI chrome. Platform brand colors ONLY for data visualization (lines, donut segments). All cards white with 0.5px borders.
```

---

## PHẦN 4 – DESIGN TOKENS (Copy vào Figma Variables)

```json
{
  "color": {
    "sidebar": {
      "bg": "#0A0A0A",
      "hover": "#161616",
      "active": "#FFFFFF",
      "border": "#1E1E1E",
      "text-default": "#777777",
      "text-hover": "#CCCCCC",
      "text-active": "#0A0A0A"
    },
    "content": {
      "bg": "#F8F8F7",
      "card-bg": "#FFFFFF",
      "card-border": "#E5E7EB",
      "topbar-bg": "#FFFFFF",
      "topbar-border": "#E5E7EB"
    },
    "text": {
      "primary": "#0A0A0A",
      "secondary": "#6B7280",
      "tertiary": "#9CA3AF",
      "inverse": "#FFFFFF"
    },
    "semantic": {
      "success": "#16A34A",
      "warning": "#D97706",
      "danger": "#DC2626",
      "info": "#2563EB"
    },
    "platform": {
      "youtube": "#FF0000",
      "facebook": "#1877F2",
      "tiktok": "#010101",
      "instagram-start": "#F09433",
      "instagram-end": "#BC1888",
      "twitch": "#9146FF",
      "linkedin": "#0A66C2",
      "twitter-x": "#000000"
    }
  },
  "radius": {
    "sm": "6px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  },
  "spacing": {
    "xs": "6px",
    "sm": "10px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "border": {
    "width": "0.5px",
    "style": "solid"
  },
  "typography": {
    "font-family": "DM Sans, Plus Jakarta Sans, sans-serif",
    "page-title": { "size": "15px", "weight": 500 },
    "section-heading": { "size": "13px", "weight": 500 },
    "stat-value": { "size": "22px", "weight": 500 },
    "nav-item": { "size": "12.5px", "weight": 400 },
    "label": { "size": "11px", "weight": 400 },
    "caption": { "size": "10px", "weight": 400 },
    "section-label": { "size": "10px", "weight": 500, "transform": "uppercase", "letter-spacing": "0.8px" }
  }
}
```

---

## PHẦN 5 – BỔ SUNG FIGMA MAKE PROMPTS (CÁC TRANG CÒN LẠI)

### Tổng hợp toàn bộ 20 trang

| # | Trang | Prompt |
|---|-------|--------|
| 1 | App Shell & Sidebar | Phần 3 – Prompt 1 |
| 2 | Dashboard Overview | Phần 3 – Prompt 2 |
| 3 | Stream Scheduler | Phần 3 – Prompt 3 |
| 4 | Live Monitor | Phần 3 – Prompt 4 |
| 5 | Team Management | Phần 3 – Prompt 5 |
| 6 | Analytics | Phần 3 – Prompt 6 |
| 7 | Content Planner (Post Calendar) | Phần 5 – Prompt 7 |
| 8 | Post Creator / Editor | Phần 5 – Prompt 8 |
| 9 | Media Library | Phần 5 – Prompt 9 |
| 10 | Inbox (Unified Messaging) | Phần 5 – Prompt 10 |
| 11 | Ads Management | Phần 5 – Prompt 11 |
| 12 | Competitors Analysis | Phần 5 – Prompt 12 |
| 13 | Reports | Phần 5 – Prompt 13 |
| 14 | SmartLinks | Phần 5 – Prompt 14 |
| 15 | Stream History / VOD | Phần 5 – Prompt 15 |
| 16 | Notifications Center | Phần 5 – Prompt 16 |
| 17 | Account & Brand Settings | Phần 5 – Prompt 17 |
| 18 | Connect Platforms | Phần 5 – Prompt 18 |
| 19 | Pricing & Plans | Phần 5 – Prompt 19 |
| 20 | Login / Onboarding | Phần 5 – Prompt 20 |

---

### Prompt 7 – Content Planner (Lịch đăng bài)

```
Design a Content Planner page for scheduling social media posts across multiple platforms.

PAGE HEADER:
- Title "Content Planner" left-aligned
- Center: month navigation "< May 2025 >" with today button
- Right: view switcher tabs "Calendar | List | Grid" + "+ Create Post" black button

CALENDAR VIEW (default):
- Full-width monthly calendar grid (7 columns Mon-Sun)
- Day headers: 3-letter day name (gray 10px) + date number
- Today cell: date number in black circle
- Each day cell: min-height 120px, light 0.5px grid lines
- Post cards inside cells (can be multiple per day):
  - Compact card: 6px radius, padding 4px 8px, overflow hidden
  - Left color strip (3px wide): platform brand color
  - Content: thumbnail if image post, text excerpt 1 line (11px), platform icons row, time label (10px gray)
  - Status: published (no badge), scheduled (yellow dot), draft (gray dot), pending review (orange dot), rejected (red dot)
  - Failed to publish: red border + warning icon
- "Show X more" link if day has >4 posts (gray 10px, clickable to expand)

PLATFORM FILTER BAR (below header, above calendar):
- "All Platforms" chip (active: black) + individual platform chips with logo icon:
  Instagram | Facebook | TikTok | YouTube | X | LinkedIn | Twitch
- Status filter chips: All | Scheduled | Published | Draft | Pending | Rejected

LIST VIEW (alternate view):
- Table: Thumbnail (48px square) | Title | Platforms (icon row) | Scheduled Time | Status pill | Engagement (if published) | Actions (3-dot)
- Grouped by date: sticky date header row (gray bg, date label)
- Bulk select checkbox column on left
- Bulk actions bar appears at top when items selected: Approve | Reject | Delete | Reschedule

RIGHT CLICK / POST HOVER CONTEXT MENU:
- Edit | Duplicate | Reschedule | Send for Review | Delete
- Shown as dark pill (#0A0A0A bg, white text, 8px radius)

Empty day cell: dashed border on hover + "+" icon to quick-create post

Font DM Sans. 0.5px borders. Monochrome chrome, platform brand colors for left strip only.
```

---

### Prompt 8 – Post Creator / Editor

```
Design a Post Creator modal/page for creating and scheduling social media posts:

LAYOUT: Full-screen modal overlay (or dedicated page). Two-column split:
- Left 55%: Post composition area
- Right 45%: Live preview panel

LEFT — COMPOSITION AREA:
Top tab bar: "New Post" tab, "+ Add Variation" ghost tab (for A/B)

PLATFORM SELECTOR (top of composition):
- Horizontal scrollable row of platform toggle chips:
  Each chip: platform icon (18px) + platform name + checkbox state
  Selected: black bg white text | Unselected: white bg gray text gray border
  Platforms: Instagram, Facebook, TikTok, YouTube, X, LinkedIn, Twitch
- Warning banner (yellow tint) if selected platforms have conflicting requirements (e.g. aspect ratios)

MEDIA UPLOAD ZONE:
- Large dashed rectangle (16:9 ratio, rounded 12px)
- Center: upload icon + "Drop files here or Browse" 13px text + "Supports JPG, PNG, MP4, GIF" 11px gray
- If media added: thumbnail grid (max 10 images), drag-to-reorder, X to remove each
- Toolbar below zone: Add Image | Add Video | Add from Library | Canva icon (integration)

CAPTION EDITOR:
- Textarea (min 120px height, auto-expand)
- Placeholder: "Write your caption..."
- Below textarea toolbar: 😊 Emoji | # Hashtag suggestions | @ Mention | AI ✨ Generate
- Character counter bottom-right (changes red near limit)
- Platform-specific caption tabs: if multiple platforms selected, tab per platform to customize caption
  e.g. tabs: "All" | "Instagram" | "Facebook" — override per platform

LINK PREVIEW (if URL detected in caption):
- Compact card below caption: thumbnail + title + domain
- Toggle to show/hide link preview (platform-specific)

HASHTAG PANEL (collapsible, below caption):
- Search input "Search or add hashtags..."
- Suggested tags: gray chips, click to add
- Added tags: black chips with X to remove
- Saved hashtag sets: "Load set ▾" dropdown

SCHEDULING SECTION (bottom of left column):
- "Publish" options: radio group
  ● Publish now | ○ Schedule | ○ Save as draft | ○ Submit for review
- If Schedule: date + time picker inline, "Best time" suggestion chip (highlighted in light green)
- Repeat options: One-time | Daily | Weekly | Custom (autolist)

RIGHT — PREVIEW PANEL:
- Platform selector tabs at top (matches selected platforms)
- Device toggle: Mobile | Desktop (small icons)
- Realistic mock phone frame (for mobile preview) or browser chrome (for desktop)
- Post preview rendered inside frame matching selected platform's actual UI style:
  Instagram: square/portrait card with avatar, caption below, like/comment bar
  Facebook: full-width card with reactions bar
  TikTok: vertical 9:16 with overlay UI
  LinkedIn: professional card layout
- Toggle between platforms updates preview live
- "Copy for platform" small ghost button in preview header

BOTTOM ACTION BAR (full width, white bg, top border):
Left: "Cancel" ghost button
Right: "Save Draft" ghost button | "Schedule" / "Publish Now" black button

Font DM Sans. Modal bg: white. Overlay: rgba(0,0,0,0.4). 0.5px borders throughout.
```

---

### Prompt 9 – Media Library

```
Design a Media Library page for managing all uploaded assets:

PAGE HEADER:
- Title "Media Library"
- Right: search input (240px) + filter dropdown "Type: All ▾" + "Sort: Newest ▾" + "Upload Files" black button

FILTER ROW (below header):
- Type chips: All | Images | Videos | GIFs | Stream Thumbnails
- Usage chips: All | Used | Unused
- Platform chips: All | Instagram | Facebook | TikTok | YouTube...

MAIN CONTENT: Masonry or uniform grid (4 columns default)

MEDIA CARDS:
- Thumbnail (full card width, aspect-ratio preserved)
- On hover: dark overlay appears with:
  - Checkbox top-left (bulk select)
  - "Use in Post" button center (white, small)
  - 3-dot menu top-right
- Below thumbnail: filename (11px, truncated), file size (10px gray), date uploaded (10px gray)
- Video cards: duration badge bottom-right (dark pill, white text, e.g. "2:34")
- Used indicator: small colored dot bottom-left (green = used in scheduled post, gray = unused)

BULK ACTIONS BAR (appears when items selected):
- "X items selected" left | Delete | Download | Add to post — right-aligned
- Background: dark bar anchored at bottom of screen

UPLOAD DROPZONE:
- When dragging files over page: full-page overlay appears with dashed border + "Drop files to upload" centered

DETAIL SIDE PANEL (appears on single item click, 300px from right):
- Large preview (top)
- Filename (editable inline)
- Details grid: Type | Size | Dimensions | Uploaded | Used in X posts
- "Copy URL" button
- "Use in Post" black button
- "Download" ghost button
- "Delete" danger ghost button (red text)
- "Posts using this" section: list of post thumbnails + dates

VIEW TOGGLE (grid/list):
- Grid view: 4-column masonry (default)
- List view: table with columns: Preview | Filename | Type | Size | Uploaded | Used in | Actions

Font DM Sans. White bg. 0.5px borders. No gradients. Hover states use rgba(0,0,0,0.5) overlay on thumbnails.
```

---

### Prompt 10 – Inbox (Unified Messaging)

```
Design a unified Inbox page that aggregates DMs and comments from all connected platforms:

THREE-COLUMN LAYOUT:
Left 280px | Center flex | Right 320px

LEFT — CONVERSATION LIST:
- Top: "Inbox" title + "Compose ✏" icon button
- Filter tabs: All | Unread | Comments | DMs | Mentions | Assigned to me
- Platform filter row: small platform icon buttons (toggle active/inactive)
- Search input "Search conversations..."
- Conversation list (scrollable):
  Each item (padding 12px, hover: light gray):
  - Platform color dot (left edge, 3px strip) indicating source platform
  - Avatar (32px circle) + username (12px/500) + time (10px gray right-aligned)
  - Preview text: 1 line truncated (11px gray)
  - Unread: bold username + blue dot indicator left + unread count badge (small black pill)
  - Assigned badge: "Me" or "John" small gray chip
  - Read: normal weight, no indicator
- Empty state: centered icon + "No conversations yet"

CENTER — CONVERSATION THREAD:
- Thread header: platform icon + username + platform label + "Open in [Platform]" link icon
- Post preview card (top of thread, collapsible):
  Thumbnail + post caption excerpt + publish date
- Messages list (scrollable, bottom-anchored):
  - Their messages: avatar left + bubble (gray bg, left-aligned)
  - Your replies: bubble right-aligned (black bg, white text)
  - System messages: centered gray text "Post was liked by 234 people"
  - Each message: timestamp + read receipt (for DMs)
  - Emoji reactions shown below bubble if any
- Reply composer (pinned bottom):
  - Textarea (expandable) + emoji button + attachment icon
  - "Reply" black button
  - Quick replies: ghost chips with saved templates "Thank you! 🙏" "Please DM us 📩"

RIGHT — CONVERSATION DETAILS:
- Contact info card: avatar + username + follower count + platform
- "Assign to" dropdown (team member selector)
- Status: "Open" | "Resolved" | "Spam" — toggle buttons
- Tags: add tags chips (custom labels: VIP, Issue, Question, Feedback)
- Notes (internal, not visible to user):
  Textarea for team notes + "Add note" button
  Notes list: author + timestamp + note text
- Related posts: small thumbnails of posts this user commented on
- "Mark Resolved" ghost button (green text) at bottom

EMPTY STATE (no conversation selected):
- Center panel: centered icon + "Select a conversation to start" gray text

Font DM Sans. Left column bg: #F8F8F7. Center and right: white. 0.5px borders. Platform colors only as 3px left strips.
```

---

### Prompt 11 – Ads Management

```
Design an Ads Management page for managing Google, Facebook, and TikTok ad campaigns:

PAGE HEADER:
- Title "Ads"
- Platform tabs: Facebook Ads | Google Ads | TikTok Ads (tab switcher, underline style)
- Right: date range picker + "Create Campaign" black button

SUMMARY ROW (4 stat cards):
Total Spend | Impressions | Clicks | Conversions
Each card: white, 12px radius, big value, label, delta vs previous period

CAMPAIGNS TABLE (white panel, full width):
- Table header: Campaign Name | Status | Objective | Budget/day | Spend | Impressions | Clicks | CTR | CPC | ROAS | Actions
- Column headers: 10px uppercase gray, sortable (sort icon appears on hover)
- Each campaign row:
  - Status pill left of name: Active (green dot) | Paused (gray dot) | Ended (light gray)
  - Name: 13px/500, click to expand
  - Budget: editable inline on click
  - Metrics: 12px, right-aligned numbers
  - Actions: 3-dot menu (Edit | Pause | Duplicate | Delete)
- Expandable row: click campaign name → Ad Sets sub-table expands below
  Sub-table: Ad Set Name | Audience | Budget | Status | Key Metrics
  Sub-row expands to show individual Ads with creative thumbnails

CHART PANEL (above or below table):
- Line chart showing Spend vs Results over selected date range
- Two Y-axes: left (spend in currency), right (results count)
- Legend: Spend line (black) | Conversions (green) | Clicks (gray dashed)

AD PREVIEW SIDE PANEL (opens on clicking an Ad):
- 300px right panel slides in
- Platform-accurate ad preview mockup (Facebook feed style / Google search style / TikTok style)
- Metrics summary for this specific ad
- "Edit in [Platform]" external link button

EMPTY STATE (no ads connected):
- Centered illustration area (simple geometric shapes, no illustrations)
- "Connect your ad accounts to get started" text
- Connect buttons per platform with platform icon

Font DM Sans. White bg. 0.5px borders. No gradients. Use only semantic green/red for positive/negative metrics.
```

---

### Prompt 12 – Competitors Analysis

```
Design a Competitors Analysis page for benchmarking against competitor social accounts:

PAGE HEADER:
- Title "Competitors"
- Platform selector tabs: Instagram | Twitter/X | Facebook | YouTube | TikTok | Twitch
- Right: date range picker + "+ Add Competitor" black button

COMPETITOR CARDS ROW (horizontal scroll if many):
- Each card: white, 12px radius, 0.5px border
  - Avatar (40px circle) + handle + follower count
  - 4 mini metrics: Posts/week | Avg Engagement | Avg Likes | Avg Comments
  - Trend sparkline (tiny line chart, 5 data points)
  - Remove "×" icon top-right (on hover)
  - "Add Competitor" card: dashed border, centered "+" icon

MY ACCOUNT vs COMPETITORS (benchmark section):
- White panel with title "Performance Benchmark"
- Bar chart: grouped bars per metric (Follower Growth, Engagement Rate, Post Frequency)
  - My account bar: black fill
  - Competitor bars: graduated gray fills
  - X-axis: account names | Y-axis: metric value
- Legend: my account icon + name | competitor names

POSTS COMPARISON TABLE:
- "Top Posts" tab per competitor (tabs at top: My Account | Competitor 1 | Competitor 2...)
- Grid of top 6 posts (2 rows × 3 cols):
  Each: thumbnail + engagement count + date published + post type badge (Photo/Video/Reel/Stream)
- Sorted by: Engagement | Likes | Comments | Views (dropdown)

FOLLOWER GROWTH CHART:
- Multi-line chart, one line per account (my account = black, competitors = gray shades)
- Date range on X-axis, follower count on Y-axis
- Hover tooltip: dark pill showing each account's follower count at that date

ADD COMPETITOR MODAL:
- Search input "Enter @handle or profile URL"
- Platform selector (which platform to track)
- Search results list: avatar + handle + follower count + "Track" button
- Max 10 competitors warning if limit reached

Empty state: illustrated placeholder area with "Track competitors to benchmark your performance"

Font DM Sans. White bg. 0.5px borders. Monochrome: my data = black, competitor data = gray gradient.
```

---

### Prompt 13 – Reports

```
Design a Reports page for creating, managing, and exporting analytics reports:

PAGE HEADER:
- Title "Reports"
- Right: "Create Report" black button

TWO-SECTION LAYOUT:
- Left sidebar 260px: report templates + saved reports list
- Right main area: report builder / preview

LEFT SIDEBAR:
- Section "Templates":
  Template cards (white, 0.5px border, 8px radius):
  - Monthly Performance Report
  - Livestream Summary Report
  - Social Media Overview
  - Ads Performance Report
  - Competitor Benchmark Report
  Each: icon + name (12px/500) + description (10px gray)
  Click: loads template in right panel

- Section "Saved Reports":
  List items: report name + last generated date + format badge (PDF/CSV/Link)
  3-dot menu: Regenerate | Download | Share | Delete

RIGHT — REPORT BUILDER:
- Report title input (large, 18px, editable inline "Untitled Report")
- Subtitle: brand name + date range (editable)
- Date range picker (top right of builder)
- Logo upload (top left: brand logo, drag to upload)

REPORT SECTION BLOCKS (drag-to-reorder, each collapsible):
  Each block card (white, 0.5px border, 12px radius, drag handle left):
  
  Block types (add via "+ Add Section" button):
  ▪ Summary Stats — grid of metric cards
  ▪ Line Chart — metric over time, select which metric
  ▪ Platform Breakdown — bar or pie chart per platform
  ▪ Top Posts — grid of best performing posts
  ▪ Livestream Summary — stream sessions table + total hours/viewers
  ▪ Audience Demographics — age/gender/location charts
  ▪ Ads Performance — campaign metrics table
  ▪ Competitor Snapshot — side-by-side comparison
  ▪ Custom Text Block — rich text editor for notes/commentary

EXPORT PANEL (right side rail, 240px):
- "Export As" section:
  ○ PDF (Download)
  ○ CSV (Raw data)
  ○ Share Link (public URL, toggle: anyone / password protected)
- Schedule delivery toggle:
  - "Send automatically" toggle
  - Frequency: Weekly / Monthly
  - Recipients: email input (multi-add)
  - Day of week / month selector
- "Generate Report" black button

REPORT PREVIEW (below builder):
- White page preview (A4 proportions)
- Shows rendered report as client would see it
- Watermark "Preview" diagonal text in light gray

Font DM Sans. Builder: white bg. Left sidebar: #F8F8F7 bg. 0.5px borders throughout.
```

---

### Prompt 14 – SmartLinks

```
Design a SmartLinks page for creating bio link landing pages:

PAGE HEADER:
- Title "SmartLinks"
- Right: "Create SmartLink" black button

SMARTLINKS LIST (left panel, 280px):
- Each SmartLink card (white, 0.5px border, 8px radius):
  - Preview thumbnail (60x60px, shows mini landing page preview)
  - Name (12px/500) + URL slug (10px gray monospace) 
  - Visits count + Created date
  - Status: Live (green dot) | Draft (gray dot)
  - Active / Inactive toggle
  - 3-dot: Edit | Duplicate | Delete | Copy URL | View Analytics
- "+ Create New" dashed card at bottom

RIGHT — SMARTLINK EDITOR:
Two-column: Editor left (60%) | Live Preview right (40%)

EDITOR SECTIONS:
- Page Title input
- Profile section: avatar upload (round, 80px) + display name + bio textarea (2 rows)
- Background: color picker (solid colors row) or image upload
- Theme: Light / Dark toggle

BUTTONS SECTION:
- Each button card (white, 0.5px border, drag handle):
  - Button label input + URL input
  - Icon picker (emoji or platform icon)
  - Button style: Default | Outline | Filled
  - Toggle: Active / Inactive
- "+ Add Button" ghost button at bottom

ADVANCED SECTIONS (collapsible):
- Header section: upload banner image
- Social icons row: link to platform profiles (icon grid)
- Embed section: YouTube video URL embed
- Analytics: show/hide UTM parameter fields per button

LIVE PREVIEW (right panel):
- Mobile phone frame (realistic outline, no fill)
- SmartLink page rendered inside: profile pic + name + bio + buttons stacked
- Updates live as user types
- "Open in new tab" icon at top of preview panel
- Background matches selected theme

ANALYTICS TAB (alternate view for existing SmartLink):
- Total visits line chart (30 days)
- Button click breakdown: horizontal bar chart (button label + clicks + % share)
- Traffic sources: pie chart (Direct / Instagram / TikTok / Facebook / Other)
- Device breakdown: Mobile vs Desktop donut

Font DM Sans. White bg. 0.5px borders. No gradients in UI chrome (gradient only in preview if user selects gradient bg for their SmartLink).
```

---

### Prompt 15 – Stream History / VOD (Video on Demand)

```
Design a Stream History page showing past livestreams and VOD recordings:

PAGE HEADER:
- Title "Stream History"
- Right: date range picker + platform filter dropdown + search input

STATS ROW (3 cards):
Total Streams | Total Stream Hours | Total Viewers (all-time)

STREAMS TABLE (white panel):
- View toggle: Grid | List (top right of panel)

GRID VIEW (default):
- 3-column card grid
- Each stream card (white, 12px radius, 0.5px border):
  - Thumbnail (16:9, dark bg, play button overlay on hover)
  - Duration badge (top-right of thumb, dark pill "1:24:33")
  - Platform icons row (small, below thumbnail inside card)
  - Stream title (13px/500, 2-line max)
  - Date + start time (11px gray)
  - Peak viewers + total views row (11px, icon + number)
  - Status badge: Completed | Partially Failed | Interrupted (color-coded)

LIST VIEW:
- Table: Thumbnail (72px) | Title | Date | Duration | Platforms | Peak Viewers | Total Views | Status | Actions
- Sortable columns

STREAM DETAIL PAGE (on click, full page or large modal):
- Header: stream title + date + duration + status badge
- Platform status row: each platform's recording status (Recorded / Not recorded / Processing)
- Large video player area (placeholder: dark bg with play icon — note: actual video from platform)
- TABS below player:
  [Overview]: 4 stat cards (Peak Viewers | Avg Concurrent | Total Views | New Followers gained)
  [By Platform]: table showing per-platform breakdown (viewers, watch time, chat messages)
  [Timeline]: viewer count over time — area chart showing rise/fall during stream, with annotations for spike moments
  [Chat Replay]: scrollable chat log with timestamps, platform dots, usernames, messages
  [Stream Health Log]: technical metrics timeline (bitrate, dropped frames, reconnections)
- Bottom action row: "Download VOD" (if stored) | "Share Replay Link" | "Delete Record" (danger)

Empty state (no streams yet): centered icon + "You haven't streamed yet" + "Schedule Your First Stream" black button

Font DM Sans. White bg. 0.5px borders. Monochrome chrome. Platform brand colors for platform badges only.
```

---

### Prompt 16 – Notifications Center

```
Design a Notifications Center page and dropdown:

NOTIFICATION BELL DROPDOWN (in topbar):
- Bell icon with red badge (unread count "5")
- On click: 360px wide dropdown panel, max-height 480px, scrollable
- Header: "Notifications" + "Mark all read" text link (right)
- Filter tabs: All | Streams | Posts | Team | System
- Notification items (each row):
  - Unread: left 3px blue border strip + slightly light bg tint
  - Read: white bg
  - Left icon: circular avatar for user-triggered, platform icon for platform events, system icon for app events
  - Content: bold username/platform + action description (12px) + time ago (10px gray)
  - Action button (small, inline): "Review" | "Approve" | "View Stream" (right-aligned, ghost button)
- "View all notifications" link at bottom

FULL NOTIFICATIONS PAGE (linked from "View all"):
- Title "Notifications"
- Left sidebar (240px): filter categories list
  - All Notifications (total count badge)
  - Livestream Alerts (LIVE started, stream failed, viewer milestone)
  - Content Approvals (pending review, approved, rejected)
  - Team Activity (user invited, role changed, user removed)
  - Publishing (post published, post failed, scheduled post reminder)
  - Platform (platform disconnected, token expired, API limit)
  - System (plan upgrade, billing, feature announcements)

- Main area: notification feed (full width)
  Grouped by date: Today | Yesterday | Last 7 days | Older
  Date group header: sticky, light gray bg, date label

  Notification card (white, 0.5px border, 8px radius, padding 14px):
  - Left: icon (32px circle, bg color by type: red=stream, yellow=review, blue=team, gray=system)
  - Content block: title (13px/500) + description (12px gray, 2 lines) + time (10px gray)
  - Right: action button if applicable + 3-dot (Mark read | Delete)
  - Unread: black dot left of icon

  NOTIFICATION TYPES & ICONS:
  🔴 LIVE Started — "Your stream on YouTube is now live" — [Monitor] button
  🔴 Stream Failed — "Facebook stream disconnected" — [Retry] button
  🟡 Pending Review — "Alex submitted a post for your review" — [Review] button
  ✅ Post Approved — "Your post was approved by Sarah" — [View] button
  ❌ Post Rejected — "Your post was rejected: 'Please revise caption'" — [Edit] button
  📢 Post Published — "3 posts published successfully at 10:00 AM" — [View] link
  ⚠️ Platform Disconnected — "Instagram token expired. Reconnect to continue" — [Reconnect] button
  👥 User Invited — "Maria joined as Editor on Brand TechVN" — [View Team] link
  📈 Viewer Milestone — "Congrats! 10,000 viewers on your YouTube stream" — 
  🔔 Billing — "Your plan renews in 3 days" — [Manage Billing] link

NOTIFICATION PREFERENCES (link from top-right of page):
- Slide-out settings panel (300px right)
- Toggle switches per notification type
- Email digest option: Instant | Daily Summary | Weekly Summary | Never

Font DM Sans. White bg. 0.5px borders. Left strip colors: red (stream), yellow (review/content), black (team), gray (system).
```

---

### Prompt 17 – Account & Brand Settings

```
Design a Settings page with multiple sections:

LAYOUT:
- Left nav sidebar (200px): settings categories list
- Right content (flex): settings form for selected category

LEFT NAV CATEGORIES:
Active state: black text + left black 2px border
- Profile
- Brand Settings
- Connected Platforms
- Notifications  
- Billing & Plan
- Team & Roles (links to Team page)
- API & Integrations
- Danger Zone

PROFILE SETTINGS:
- Avatar upload (80px circle, "Change Photo" overlay on hover)
- Full Name input | Display Name input
- Email input (+ "Verified" green badge | "Resend verification" link)
- Password: current + new + confirm (masked, show/hide toggle)
- Language selector dropdown
- Timezone selector dropdown
- "Save Changes" black button

BRAND SETTINGS:
- Brand Logo upload (rectangular, 200x80px area)
- Brand Name input
- Brand Color picker (for reports/SmartLinks branding)
- Website URL input
- Industry dropdown
- Timezone (per-brand override)
- Brand description textarea
- "Default Hashtags" tags input (applied to all posts)
- Danger: "Delete Brand" red ghost button (with confirmation modal)

CONNECTED PLATFORMS (per-brand):
- Grid of platform connection cards (2 columns):
  Each card (white, 0.5px border, 12px radius):
  - Platform icon (large, 32px) + platform name (14px/500)
  - Connected: green dot + "@username" + "Connected since [date]"
  - Not connected: gray dot + "Not connected"
  - Connected state buttons: "Disconnect" ghost (red text) + "Refresh Token" ghost
  - Disconnected state: "Connect" black button
  Platforms: YouTube, Facebook, Instagram, TikTok, Twitch, LinkedIn, X (Twitter), Google Analytics, Google Ads, Facebook Ads, TikTok Ads
  - Warning badge if token expired: yellow exclamation + "Reconnect required"

BILLING & PLAN:
- Current plan card (black bg, white text):
  Plan name "Pro" | Price "$49/month" | Next renewal date | Usage bar
- Usage stats: Brands used (3/10) | Team members (7/∞) | Posts this month (45/500)
- "Upgrade Plan" button (white bg, black text) | "Manage Billing" ghost button
- Plan comparison table (current vs next tier features)
- Payment method: card icon + last 4 digits + expiry + "Update Card" link
- Billing history: table (Date | Description | Amount | Invoice download)

API & INTEGRATIONS:
- API Key section: masked key field + "Copy" + "Regenerate" (with warning modal)
- Webhook URLs: list of configured webhooks + "Add Webhook" button
- Third-party integrations grid (same card style as connected platforms):
  Canva | Google Drive | Zapier | Slack | Looker Studio

DANGER ZONE (red-tinted section):
- "Export all data" ghost button
- "Delete Account" red button → confirmation modal with "type account name to confirm" pattern

Font DM Sans. Left nav: #F8F8F7 bg. Right content: white bg in form cards. 0.5px borders. Red ONLY in Danger Zone and error states.
```

---

### Prompt 18 – Connect Platforms (Onboarding Step)

```
Design a "Connect Platforms" page used during onboarding and from Settings:

PAGE CONTEXT: Full-page (not modal) during onboarding, or right-panel content in Settings.

ONBOARDING VERSION (full page):
- Centered layout, max-width 680px, padding 40px top
- Progress indicator top: step dots "1 ● 2 ● 3 ○ 4 ○" (filled = completed, current = black filled, future = gray outline)
- Step label: "Step 2 of 4 — Connect your platforms"
- Title: "Which platforms do you manage?" (22px/500)
- Subtitle: "Connect at least one to get started. You can add more later." (14px gray)

PLATFORMS GRID (2 columns × 4 rows = 8 platforms + Ads platforms section):

SOCIAL MEDIA SECTION:
Platform connection cards:
- Card: white bg, 0.5px border, 12px radius, padding 16px
- Layout: platform logo (32px, brand color bg rounded-8px, white icon) left + content right
- Platform name (13px/500) + description (11px gray, 1 line: "Schedule posts, view analytics")
- Right: "Connect" black button | if connected: green dot + "@handle" + "Connected" badge (green text)
- If requires re-auth: yellow warning + "Reconnect" yellow-border button
Cards: YouTube | Facebook | Instagram | TikTok | Twitch | LinkedIn | X (Twitter) | Google Business Profile | Pinterest | Bluesky | Threads

ADS PLATFORMS SECTION (collapsible, "Optional — Connect Ad Accounts"):
Cards: Google Ads | Facebook Ads | TikTok Ads

ANALYTICS SECTION (collapsible, "Optional — Connect Web Analytics"):
Cards: Google Analytics | Looker Studio

CONNECT MODAL (appears on "Connect" click):
- Small modal (440px wide) with platform logo + name at top
- "You'll be redirected to [Platform] to authorize access"
- Permissions requested list: checkmark + permission description per item
- "Continue to [Platform]" black button | "Cancel" ghost button

BOTTOM NAV (onboarding):
- "Skip this step" gray link left
- "Continue →" black button right (enabled when ≥1 platform connected)

SETTINGS VERSION (right panel content):
- Same grid but no progress indicator and no onboarding nav
- "Add Platform" section title instead of full-page title

Font DM Sans. White bg. 0.5px borders. Platform brand colors ONLY for platform icons/logos. Everything else monochrome.
```

---

### Prompt 19 – Pricing & Plans

```
Design a Pricing & Plans page (public marketing page style, but within the app):

PAGE HEADER:
- Title "Choose Your Plan" (centered, 24px/500)
- Subtitle: "Scale your social media and livestream management" (15px gray, centered)
- Billing toggle: "Monthly | Annual (Save 20%)" — toggle switch centered, annual saves highlighted in green badge

PLANS GRID (4 columns, centered, max-width 960px):

PLAN CARDS:
Card 1 — Free:
- Price: $0 / month
- Subtitle: "Perfect to get started"
- Features list (checkmark items, 12px)
- CTA: "Current Plan" gray disabled button (if on free)

Card 2 — Starter:
- Price: $19 / month (or $15.20/mo annual)
- Subtitle: "For solo creators"
- Features list
- CTA: "Upgrade to Starter" black button

Card 3 — Pro (MOST POPULAR):
- HIGHLIGHTED CARD: black border (2px), "Most Popular" pill badge (black bg, white text) above card
- Price: $49 / month
- Subtitle: "For growing teams"
- Features list (with additional items vs Starter, highlighted in bold)
- CTA: "Upgrade to Pro" black button (filled)
- Card slightly elevated (subtle offset — use 1px border, not shadow)

Card 4 — Agency:
- Price: Custom / Contact us
- Subtitle: "For agencies & enterprises"
- Features list
- CTA: "Contact Sales" ghost button

EACH PLAN CARD STRUCTURE:
- Plan name (14px/500) + subtitle (11px gray)
- Price block: "$XX" (28px/500) + "/month" (13px gray) | "Billed annually" note (10px gray)
- Divider line
- Feature list: checkmark icon + feature label (12px)
  ✅ Active feature | ── Not available (gray dash)
- Feature groups: "Social Media" | "Livestream" | "Team" | "Analytics"

FEATURE COMPARISON TABLE (below cards, collapsible "See full comparison ▾"):
- Full table: rows = features, columns = 4 plans
- Section header rows: "Social Media" | "Livestream" | "Analytics" | "Team" | "Support"
- Cells: ✅ | number (e.g. "10 brands") | "Unlimited" | — 
- Current plan column highlighted with light gray bg
- Sticky header with plan names

FAQ SECTION (below table):
- 2-column accordion
- 4-6 common questions: "Can I change plans?", "What happens if I cancel?", etc.
- Each Q: bold 13px | A: 12px gray, expand/collapse

Font DM Sans. White bg (page and cards). Black border ONLY on Pro (highlighted) card. No gradients. Semantic green for savings/discounts only.
```

---

### Prompt 20 – Login / Onboarding Flow

```
Design the Login and Onboarding screens:

SCREEN A — Login Page:
- Full-page split layout: Left 45% dark (#0A0A0A) | Right 55% white
- Left panel:
  - Logo top-left (white logo mark + app name)
  - Center: large quote or value prop headline (white, 24px, centered vertically)
    e.g. "Manage your social media and livestreams — all in one place"
  - Feature highlights list: 3 items with checkmark icons (white text, 13px)
  - Bottom: "Trusted by 50,000+ creators" + small avatar row (stacked circles)
- Right panel:
  - Logo top-right (black logo mark + app name, repeated for mobile consideration)
  - Form centered vertically:
    - "Welcome back" (18px/500, black)
    - "Log in to your account" (13px gray)
    - Email input (full width, label above, placeholder)
    - Password input (full width, show/hide eye icon inside)
    - "Forgot password?" link (right-aligned, 11px)
    - "Log in" black button (full width, 42px height)
    - Divider: "— or —"
    - "Continue with Google" white button (0.5px border, Google G icon left, full width)
    - "Continue with Apple" black button (Apple icon left, full width)
    - Bottom: "Don't have an account? Sign up →"

SCREEN B — Signup Page:
- Same split layout (dark left, white right)
- Left: same branding + different value prop text
- Right form:
  - "Create your account" (18px/500)
  - Full name input
  - Email input
  - Password input (strength indicator bar below: weak/medium/strong)
  - "I agree to Terms of Service and Privacy Policy" checkbox
  - "Create Account" black button (full width)
  - Divider + social login options (same as login)
  - "Already have an account? Log in →"

SCREEN C — Onboarding Step 1: "What describes you best?"
- Centered card layout (white, max-width 560px, 40px padding, 16px radius)
- Progress dots top (4 steps)
- "Tell us about yourself" heading (20px/500)
- Role selection grid (2 columns, 2 rows = 4 options):
  Each option card (white, 0.5px border, 12px radius, 16px padding):
  - Large icon (simple geometric, 32px)
  - Label: "Solo Creator" / "Marketing Team" / "Agency" / "Brand"
  - Description: 11px gray, 1 line
  - Selected state: black border (1.5px) + black checkmark top-right
- "Continue →" black button (bottom right)

SCREEN D — Onboarding Step 2: "Connect Platforms"
- Same centered card layout
- (Use content from Prompt 18 — onboarding version)

SCREEN E — Onboarding Step 3: "Create your first Brand"
- Brand Name input (large, auto-focused)
- Brand Logo upload (dashed circle, 80px, centered)
- Industry dropdown
- Website URL input
- "Finish Setup →" black button

SCREEN F — Onboarding Complete:
- Centered success state:
- Large checkmark icon (black circle, white check, 64px)
- "You're all set! 🎉" heading
- "Your workspace is ready. Let's schedule your first post or livestream."
- Two CTA buttons: "Schedule a Post" (black, filled) | "Set up a Stream" (ghost)

Font DM Sans. Left panels: #0A0A0A. Right panels and onboarding cards: white. No gradients. All borders 0.5px. Input height: 42px. Button height: 42px.
```

---

*Tổng hợp bởi Claude Sonnet 4.6 | Dựa trên phân tích Metricool app.metricool.com*
*Cập nhật: bổ sung đủ 20 trang — Phần 5 (Prompt 7–20)*