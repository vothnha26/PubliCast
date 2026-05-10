# Hướng Dẫn Sử Dụng & Tài Liệu Công Nghệ - PubliCast

Tài liệu này tổng hợp các công nghệ đã sử dụng và các bước để thiết lập dự án dành cho bạn và 3 thành viên còn lại trong team.

---

## 🛠️ Công Nghệ Đã Sử Dụng

Dự án hiện tại đang áp dụng các công nghệ hiện đại, đảm bảo tính mở rộng (Scalability) và tuân thủ nguyên tắc SOLID:

- **Ngôn ngữ & Framework:** NodeJS, ExpressJS.
- **Cơ sở dữ liệu:** MySQL 8.0 (Được đóng gói trong Docker).
- **ORM & Migration:** **Prisma** (Thay thế cho Sequelize vì tính tiện dụng, tự động sinh code và type-safe).
- **Bộ nhớ đệm (Dự kiến):** Redis (Dùng để lưu mã OTP xác thực tạm thời).
- **Công cụ Dev:** Docker, Git.

---

## 📁 Cấu Trúc Dự Án Hiện Tại

```text
PubliCast/
├── prisma/
│   ├── migrations/         # Lịch sử các file migration SQL do Prisma tự sinh
│   └── schema.prisma       # File "Bản đồ" định nghĩa cấu trúc Database
├── .env.example            # File mẫu chứa các biến môi trường
├── .gitignore              # Các file/thư mục bỏ qua không đẩy lên Git
├── docker-compose.yml      # File cấu hình chạy MySQL bằng Docker
├── login-sequence.puml     # Use Case Diagram (Sơ đồ ca sử dụng)
├── package.json            # Quản lý thư viện dự án
└── README.md               # File hướng dẫn này
```

---

## 🚀 Các Bước Thiết Lập Dự Án (Dành cho người mới)

Khi 3 thành viên còn lại kéo code từ GitHub về, họ chỉ cần thực hiện các bước sau để chạy dự án:

### Bước 1: Cài đặt thư viện

```bash
npm install
```

_(Lệnh này cũng sẽ tự động sinh ra Prisma Client trong `node_modules` của họ)._

### Bước 2: Khởi động Database (Docker)

Đảm bảo Docker đã được bật trên máy. Chạy lệnh sau để kéo và chạy MySQL:

```bash
docker compose up -d
```

_Lưu ý: MySQL được cấu hình chạy ở cổng `3307` để tránh trùng lặp với MySQL có sẵn trên máy._

### Bước 3: Tạo file `.env`

Nhân bản file `.env.example` thành `.env` để sử dụng:

```bash
# Trên Windows (PowerShell)
copy .env.example .env

# Trên Linux/macOS
cp .env.example .env
```

### Bước 4: Khởi tạo Database (Migration)

Chạy lệnh sau để Prisma tự động tạo các bảng `users` và `user_accounts` trong MySQL của họ:

```bash
npx prisma migrate dev
```

---

## 📝 Hướng Dẫn Code Với Prisma (Cơ bản)

Để sử dụng Database trong code, hãy tuân thủ nguyên tắc Singleton (chỉ tạo 1 instance):

**Tạo file `src/prisma.js`:**

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
module.exports = prisma;
```

**Sử dụng trong file logic:**

```javascript
const prisma = require("./prisma");

// Lấy danh sách user
const users = await prisma.user.findMany();

// Tạo user mới
const newUser = await prisma.user.create({
  data: {
    email: "test@example.com",
    fullName: "Nguyen Van A",
  },
});
```

Chúc team bạn làm việc hiệu quả! 🚀
