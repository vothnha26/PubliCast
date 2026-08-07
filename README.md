# PubliCast

PubliCast là nền tảng quản lý mạng xã hội đa kênh (social media management) — lên lịch đăng bài, quản lý hộp thư đến hợp nhất, báo cáo hiệu suất, SmartLinks (bio-link builder), và các tính năng cộng tác nhóm (approval workflow, phân quyền theo brand), tương tự Metricool/Buffer.

Monorepo gồm backend Express.js + Prisma và frontend React (Vite), cùng bộ test Selenium E2E.

## Mục lục

- [Kiến trúc](#kiến-trúc)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt & chạy dự án](#cài-đặt--chạy-dự-án)
- [Biến môi trường](#biến-môi-trường)
- [Kiểm thử](#kiểm-thử)
- [Nền tảng mạng xã hội được hỗ trợ](#nền-tảng-mạng-xã-hội-được-hỗ-trợ)
- [Quy ước phát triển & đóng góp](#quy-ước-phát-triển--đóng-góp)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)

## Kiến trúc

```
┌─────────────────┐        REST API (cookie-based auth)        ┌──────────────────┐
│  frontend/       │ ───────────────────────────────────────▶ │  backend/         │
│  React + Vite     │ ◀─────────────────────────────────────── │  Express + Prisma │
└─────────────────┘        SSE (notifications) · WebSocket      └──────────────────┘
                                                                          │
                                                          ┌───────────────┼───────────────┐
                                                          ▼               ▼               ▼
                                                       MySQL           Redis        Social APIs
                                                  (dữ liệu chính)  (cache, nonce,   (Facebook, YouTube,
                                                                    rate-limit,      Instagram, TikTok,
                                                                    outbox queue)    Threads...)
```

- **Backend** theo kiến trúc lớp `Route → Controller → Service → Repository`, dùng **Strategy Pattern** cho logic phân nhánh theo nền tảng (đăng bài, đồng bộ inbox, làm mới token, v.v.) và **outbox pattern** (qua bảng `OutboxEvent` + dispatcher) để đảm bảo các side-effect bất đồng bộ (webhook, thông báo) không bị mất khi transaction DB commit.
- **Frontend** là SPA React, xác thực bằng cookie HTTP-only (không lưu token ở localStorage), theme sáng/tối qua CSS variables.
- **Tích hợp bên thứ ba**: các nền tảng mạng xã hội qua OAuth, và một dự án riêng biệt (**Convo**) qua giao thức HMAC-signed request/webhook.

## Công nghệ sử dụng

**Backend** (`backend/`)
- Node.js + Express.js
- Prisma ORM + MySQL
- Redis (cache, rate-limit, nonce dedup, BullMQ-style outbox)
- JWT (access/refresh token qua cookie) + OTP 2FA (otplib)
- Jest + Supertest (test)

**Frontend** (`frontend/`)
- React 18 + Vite
- Tailwind CSS (CSS variables cho dark mode)
- Radix UI / MUI components
- ESLint + Prettier

**E2E**
- Selenium WebDriver (`test_selenium/`)

## Yêu cầu môi trường

- Node.js ≥ 18
- MySQL 8.0 (server chạy sẵn, hoặc container Docker của riêng bạn — dự án không kèm `docker-compose.yml`)
- Redis (tùy chọn ở dev — có thể bật `USE_MEMORY_REDIS=true` để dùng in-memory fallback thay vì Redis thật)

## Cài đặt & chạy dự án

### 1. Clone & cài dependencies

```bash
git clone https://github.com/vothnha26/PubliCast.git
cd PubliCast

cd backend && npm install
cd ../frontend && npm install
```

### 2. Cấu hình biến môi trường

```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env
```

Điền các giá trị bắt buộc trong `.env` — xem chi tiết ở [Biến môi trường](#biến-môi-trường).

### 3. Khởi tạo database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed      # tạo dữ liệu mẫu (plan, product, tài khoản test)
```

### 4. Chạy dev server

```bash
# Terminal 1 — backend (mặc định cổng 3000)
cd backend
npm run dev

# Terminal 2 — frontend (mặc định cổng 5173)
cd frontend
npm run dev
```

Truy cập `http://localhost:5173`.

## Biến môi trường

File mẫu đầy đủ: [`backend/.env.example`](backend/.env.example). Các nhóm chính:

| Nhóm | Biến quan trọng | Ghi chú |
|---|---|---|
| Server | `PORT`, `NODE_ENV`, `FRONTEND_URL`, `BACKEND_BASE_URL` | |
| Database | `DATABASE_URL` | Chuỗi kết nối MySQL qua Prisma |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `USE_MEMORY_REDIS` | Đặt `USE_MEMORY_REDIS=true` nếu không có Redis ở dev |
| Auth | `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `JWT_SECRET` | Tối thiểu 32 ký tự ngẫu nhiên, không dùng chung giữa các môi trường |
| Email | `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` | SMTP cho OTP/thông báo |
| OAuth mạng xã hội | `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_APP_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET` | |
| Lưu trữ media | `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | |
| Thanh toán | `PAYMENT_GATEWAY`, `VIETQR_*`, `SEPAY_API_KEY` | VietQR + SePay webhook |

**Không bao giờ commit file `.env`** — đã có trong `.gitignore`.

## Kiểm thử

```bash
# Backend — Jest + Supertest
cd backend
npm run test
npm run test -- --testPathPattern="inbox"   # chạy 1 nhóm test cụ thể

# Frontend — lint + build (không có unit test riêng, build thành công là điều kiện bắt buộc)
cd frontend
npm run lint
npm run build

# E2E — Selenium
cd test_selenium
npm install
npm test
```

CI chạy các bước tương đương qua GitHub Actions (`.github/workflows/`).

## Nền tảng mạng xã hội được hỗ trợ

Facebook · Instagram · YouTube · TikTok · Threads

Danh sách nền tảng và cấu hình giới hạn (caption length, kích thước file...) được định nghĩa tại `backend/src/utils/constants.js` (`PLATFORMS`) và bảng `PlatformLimit` trong database — hoàn toàn data-driven, không hardcode trong logic gating.

## Quy ước phát triển & đóng góp

Toàn bộ quy ước bắt buộc khi phát triển (SOLID, Strategy/Factory Pattern, không magic string, không hardcode màu, quy tắc đặt tên branch, commit message, checklist trước khi merge PR) được mô tả chi tiết tại **[CONDUCT.md](CONDUCT.md)** — đọc file này trước khi gửi PR.

Tài liệu kỹ thuật khác:
- [`backend/README.md`](backend/README.md) — chi tiết setup backend (Prisma, cấu trúc thư mục backend)
- [`frontend/ATTRIBUTIONS.md`](frontend/ATTRIBUTIONS.md) — bản quyền/nguồn gốc asset frontend

## Cấu trúc thư mục

```
PubliCast/
├── backend/                    # Express.js + Prisma (MySQL) + Redis
│   ├── prisma/
│   │   ├── schema.prisma       # Định nghĩa toàn bộ database schema
│   │   ├── migrations/         # Lịch sử migration
│   │   └── seed.js             # Dữ liệu mẫu
│   ├── src/
│   │   ├── controllers/        # Nhận request, validate, gọi service
│   │   ├── services/           # Logic nghiệp vụ
│   │   ├── repositories/       # Truy vấn Prisma
│   │   ├── routes/             # Định nghĩa API endpoints
│   │   ├── middlewares/        # Auth, rate-limit, error handling
│   │   ├── constants/          # Hằng số dùng chung (error codes, outbox events...)
│   │   └── utils/              # Helper functions
│   ├── scripts/                # CLI script vận hành (rotate secret, seed populated data...)
│   └── tests/                  # Jest + Supertest
│
├── frontend/                   # React (Vite) + Tailwind CSS
│   └── src/
│       ├── pages/               # manage/, workspace/, admin/, landing/
│       ├── components/          # UI components tái sử dụng
│       ├── context/             # React Context (BrandContext, ThemeContext...)
│       ├── hooks/                # Custom hooks
│       ├── services/             # API service layer
│       ├── constants/            # Hằng số toàn cục (platform registry, product IDs...)
│       └── i18n/                 # Đa ngôn ngữ (vi/en)
│
├── test_selenium/               # Selenium E2E tests
├── docs/local/                  # Tài liệu khảo sát/audit nội bộ (không sync git, xem .gitignore)
├── .github/workflows/           # CI/CD (test, lint, deploy)
├── CONDUCT.md                   # Quy ước phát triển bắt buộc
└── README.md                    # File này
```
