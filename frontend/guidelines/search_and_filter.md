# Hướng dẫn Xây dựng Chức năng Tìm kiếm & Lọc Dữ liệu Đa điều kiện

Tài liệu này trình bày giải pháp kỹ thuật để tích hợp chức năng Tìm kiếm (Search) và Lọc (Filter) đa điều kiện vào dự án PubliCast, bao gồm cả luồng xử lý từ Frontend (React) đến Backend (Express + Prisma).

> **Lưu ý quan trọng:** Toàn bộ code trong guideline này tuân theo kiến trúc **Controller → Service → Repository** hiện có của dự án.

---

## 1. Tổng quan Kiến trúc

Để một hệ thống lọc đa điều kiện hoạt động hiệu quả, chúng ta cần:

```
Frontend (React)                    Backend (Express + Prisma)
┌─────────────────┐    HTTP GET     ┌──────────────────────────────────┐
│ useFilters Hook │───────────────► │ Route                            │
│ (URL Params)    │  ?search=...    │   └── Controller (parse params)  │
│                 │  &platform=...  │         └── Service (build query)│
│ Debounced Input │  &page=1        │               └── Repository     │
│ Select Filters  │                 │                     └── Prisma   │
│ Pagination      │ ◄───────────── │                          └── DB  │
└─────────────────┘  JSON response  └──────────────────────────────────┘
```

- **Frontend:** Quản lý state bộ lọc qua URL Query Parameters (shareable, F5-safe).
- **API:** Thiết kế endpoint nhận các query string động.
- **Backend:** Dịch query string thành truy vấn cơ sở dữ liệu động theo pattern Controller → Service → Repository.

---

## 2. Chuẩn bị Database Schema (Prisma)

Trước khi triển khai Search & Filter, cần đảm bảo model trong `schema.prisma` có đánh index cho các cột thường xuyên dùng để lọc/sắp xếp.

### 2.1. Ví dụ Model Post

```prisma
// prisma/schema.prisma

model Post {
  id                 String     @id @default(uuid())
  brandId            String
  createdByUserId    String
  title              String
  caption            String?    @db.Text
  type               PostType
  status             PostStatus @default(DRAFT)
  targetPlatforms    String     @db.Text
  scheduledAt        DateTime?
  publishedAt        DateTime?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  brand             Brand              @relation(fields: [brandId], references: [id], onDelete: Cascade)
  creator           User               @relation("PostCreator", fields: [createdByUserId], references: [id], onDelete: Restrict)

  // Đánh index cho các cột thường xuyên lọc/sắp xếp
  @@index([brandId])
  @@index([status])
  @@index([createdByUserId])
  @@index([createdAt])
  @@map("posts")
}

enum PlatformType {
  INSTAGRAM
  FACEBOOK
  TIKTOK
  LINKEDIN
  TWITTER_X
  YOUTUBE
  // ...
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PENDING_APPROVAL
  APPROVED
  PUBLISHED
  FAILED
  REJECTED
}
```

> **Tại sao cần `@@index`?** Khi dữ liệu lớn (hàng chục ngàn bản ghi), query `WHERE status = 'PUBLISHED'` sẽ chậm nếu cột `status` không được đánh index. Index giúp MySQL tìm kiếm nhanh hơn hàng trăm lần.

---

## 3. Triển khai tại Backend (Express + Prisma)

Backend cần nhận các tham số từ URL (ví dụ: `?search=video&platform=YOUTUBE&status=DRAFT&page=1`) và xây dựng câu truy vấn động.

### 3.1. Repository Layer — Truy vấn dữ liệu

Repository chỉ chịu trách nhiệm tương tác với database qua Prisma.

```javascript
// src/repositories/post.repository.js
const prisma = require('../config/prisma');

class PostRepository {
  /**
   * Tìm kiếm bài đăng với điều kiện lọc động
   * @param {Object} where - Prisma where conditions
   * @param {Object} options - { skip, take, orderBy, include }
   * @returns {Promise<[Post[], number]>} - [data, totalCount]
   */
  async findMany(where, options = {}) {
    const { skip = 0, take = 10, orderBy = { createdAt: 'desc' }, include } = options;

    // Thực thi 2 query song song: lấy data + đếm tổng số
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({ where, skip, take, orderBy, include }),
      prisma.post.count({ where })
    ]);

    return [posts, totalCount];
  }

  async findById(id) {
    return prisma.post.findUnique({
      where: { id },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } }
    });
  }
}

module.exports = new PostRepository();
```

### 3.2. Service Layer — Xây dựng query động

Service chịu trách nhiệm xây dựng object `where` động và xử lý business logic.

```javascript
// src/services/post.service.js
const postRepository = require('../repositories/post.repository');

// Whitelist các cột cho phép sắp xếp (chống injection)
const ALLOWED_SORT_FIELDS = ['createdAt', 'title', 'status', 'platform', 'publishedAt'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

class PostService {
  /**
   * Lấy danh sách bài đăng với bộ lọc đa điều kiện
   * @param {Object} params - Các tham số từ query string (đã parse)
   * @returns {Promise<Object>} - { data, meta }
   */
  async getPosts(params) {
    const {
      search,
      platform,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // --- 1. Validate & Sanitize tham số ---
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc';

    // --- 2. Xây dựng object WHERE động ---
    const where = {};

    // Điều kiện 1: Tìm kiếm text (toàn văn)
    // Lưu ý: MySQL với collation utf8mb4_unicode_ci đã case-insensitive sẵn.
    // Nếu dùng PostgreSQL, thêm `mode: 'insensitive'` vào mỗi điều kiện.
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { content: { contains: search.trim() } }
      ];
    }

    // Điều kiện 2: Lọc chính xác (Exact match)
    if (platform) {
      where.platform = platform;
    }

    if (status) {
      where.status = status;
    }

    // Điều kiện 3: Lọc theo khoảng thời gian (Range)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) {
          where.createdAt.gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) {
          where.createdAt.lte = parsedEnd;
        }
      }
      // Nếu không có điều kiện nào hợp lệ, xóa key createdAt
      if (Object.keys(where.createdAt).length === 0) {
        delete where.createdAt;
      }
    }

    // --- 3. Tính toán phân trang ---
    const skip = (safePage - 1) * safeLimit;

    // --- 4. Gọi Repository ---
    const [posts, totalCount] = await postRepository.findMany(where, {
      skip,
      take: safeLimit,
      orderBy: { [safeSortBy]: safeSortOrder },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    // --- 5. Trả kết quả với metadata phân trang ---
    return {
      data: posts,
      meta: {
        total: totalCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit)
      }
    };
  }
}

module.exports = new PostService();
```

### 3.3. Controller Layer — Xử lý HTTP request/response

Controller chỉ chịu trách nhiệm nhận request, gọi service, và trả response.

```javascript
// src/controllers/post.controller.js
const postService = require('../services/post.service');

class PostController {
  async getPosts(req, res) {
    try {
      // Truyền toàn bộ query params cho Service xử lý
      const result = await postService.getPosts(req.query);

      res.status(200).json(result);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }
}

module.exports = new PostController();
```

### 3.4. Route

```javascript
// src/routes/post.routes.js
const express = require('express');
const postController = require('../controllers/post.controller');
const { verifyAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// GET /api/posts?search=video&platform=YOUTUBE&status=DRAFT&page=1&limit=10
router.get('/posts', verifyAuth, postController.getPosts);

module.exports = router;
```

Đừng quên mount route trong `app.js`:

```javascript
// src/app.js
const postRoutes = require('./routes/post.routes');
// ...
app.use('/api', postRoutes);
```

---

## 4. Triển khai tại Frontend (React/Vite)

### 4.1. Custom Hook `useFilters` — Quản lý state bộ lọc qua URL

Cách tốt nhất để lưu trạng thái bộ lọc là dùng **URL Search Params**. Người dùng có thể F5, Back/Forward, hoặc chia sẻ link mà bộ lọc vẫn được giữ nguyên.

```javascript
// src/hooks/useFilters.js
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook quản lý bộ lọc qua URL Search Params.
 * @param {Object} defaultFilters - Giá trị mặc định cho các filter
 * @returns {{ filters, updateFilters, clearFilters, searchParamsString }}
 */
export function useFilters(defaultFilters = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Chuyển URL params thành Object, merge với defaults
  const filters = { ...defaultFilters };
  for (const [key, value] of searchParams.entries()) {
    filters[key] = value;
  }

  // Cập nhật 1 hoặc nhiều filter
  const updateFilters = useCallback((newFilters) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === null || value === '' || value === undefined) {
          params.delete(key); // Xóa filter nếu không có giá trị
        } else {
          params.set(key, String(value));
        }
      });

      // Luôn reset về trang 1 khi đổi bộ lọc (trừ khi đang đổi page)
      if (!('page' in newFilters)) {
        params.set('page', '1');
      }

      return params;
    });
  }, [setSearchParams]);

  // Xóa toàn bộ filter
  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
    // Dùng làm dependency cho useEffect (string so sánh by value, không gây infinite loop)
    searchParamsString: searchParams.toString()
  };
}
```

> **Tại sao trả về `searchParamsString`?**
> Object `filters` tạo mới mỗi lần render → dùng làm dependency của `useEffect` sẽ gây **infinite loop**.
> `searchParams.toString()` trả về string, so sánh by value → an toàn để dùng làm dependency.

### 4.2. Custom Hook `useDebounce` — Tránh spam API khi gõ

```javascript
// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * Hook debounce: trả về giá trị sau khi người dùng ngừng thay đổi một khoảng thời gian.
 * @param {any} value - Giá trị cần debounce
 * @param {number} delay - Thời gian chờ (ms), mặc định 300ms
 * @returns {any} - Giá trị đã debounce
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### 4.3. Áp dụng vào Component Giao diện

Kết hợp `useFilters` + `useDebounce` + Toast (sonner) để tạo bộ lọc hoàn chỉnh.

```javascript
// src/pages/workspace/ContentPlanner.jsx (Ví dụ)
import { useState, useEffect } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useDebounce } from '../../hooks/useDebounce';
import apiService from '../../services/api';
import { toast } from 'sonner';

export function ContentPlannerPage() {
  const { filters, updateFilters, clearFilters, searchParamsString } = useFilters({
    page: '1',
    limit: '10'
  });

  const [data, setData] = useState({ data: [], meta: {} });
  const [loading, setLoading] = useState(false);

  // --- Debounced Search ---
  // Giữ state riêng cho input tìm kiếm, debounce trước khi cập nhật URL
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Khi giá trị debounced thay đổi → cập nhật URL params
  useEffect(() => {
    // Chỉ update nếu giá trị thực sự khác với URL hiện tại
    if (debouncedSearch !== (filters.search || '')) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // --- Fetch dữ liệu mỗi khi URL params thay đổi ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // searchParamsString đã là query string sẵn
        const response = await apiService.get(`/posts?${searchParamsString}`);
        setData(response.data);
      } catch (error) {
        toast.error(error.message || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParamsString]); // ✅ Dùng string, không dùng object → không infinite loop

  const currentPage = parseInt(filters.page) || 1;
  const totalPages = data.meta?.totalPages || 1;

  return (
    <div className="p-6">
      {/* ═══ THANH TÌM KIẾM VÀ LỌC ═══ */}
      <div className="flex gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm flex-wrap">

        {/* Tìm kiếm Text (Debounced) */}
        <input
          type="text"
          placeholder="Tìm kiếm bài viết..."
          className="border p-2 rounded flex-1 min-w-[200px]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Lọc Nền tảng */}
        <select
          className="border p-2 rounded w-48"
          value={filters.platform || ''}
          onChange={(e) => updateFilters({ platform: e.target.value })}
        >
          <option value="">Tất cả nền tảng</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="TIKTOK">TikTok</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="LINKEDIN">LinkedIn</option>
        </select>

        {/* Lọc Trạng thái */}
        <select
          className="border p-2 rounded w-48"
          value={filters.status || ''}
          onChange={(e) => updateFilters({ status: e.target.value })}
        >
          <option value="">Mọi trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="SCHEDULED">Đã lên lịch</option>
          <option value="PUBLISHED">Đã đăng</option>
          <option value="FAILED">Thất bại</option>
        </select>

        {/* Nút Xóa Lọc */}
        <button
          onClick={() => {
            clearFilters();
            setSearchTerm(''); // Reset cả input tìm kiếm
          }}
          className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
        >
          Xóa lọc
        </button>
      </div>

      {/* ═══ HIỂN THỊ DỮ LIỆU ═══ */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0A0A0A]" />
        </div>
      ) : data.data?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Không tìm thấy kết quả nào.
        </div>
      ) : (
        <div className="grid gap-4">
          {data.data?.map((post) => (
            <div key={post.id} className="border p-4 rounded-xl bg-white hover:shadow-md transition-shadow">
              <h3 className="font-medium text-[#0A0A0A]">{post.title}</h3>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{post.platform}</span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{post.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ PHÂN TRANG ═══ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            disabled={currentPage <= 1}
            onClick={() => updateFilters({ page: currentPage - 1 })}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Trang trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {currentPage} / {totalPages} ({data.meta?.total || 0} kết quả)
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => updateFilters({ page: currentPage + 1 })}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Trang sau →
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Các Best Practices (Thực hành Tốt nhất)

### 5.1. Debounce cho ô Input Tìm kiếm

- **Tại sao?** Nếu gọi API mỗi khi người dùng gõ 1 phím, từ "livestream" sẽ gọi **10 lần API** liên tục.
- **Giải pháp:** Dùng custom hook `useDebounce` (xem mục 4.2) với delay 300ms.
- **Không dùng `onBlur`** — UX kém vì buộc user click ra ngoài mới search.

### 5.2. Đánh Index trong Database

Trong `schema.prisma`, hãy đảm bảo các model có `@@index` cho các cột thường xuyên lọc/sắp xếp:

```prisma
// Ví dụ thực tế từ schema hiện tại
model AuditLog {
  // ...
  @@index([brandId])
  @@index([userId])
}

model Post {
  // ...
  @@index([brandId])
  @@index([createdByUserId])
}
```

### 5.3. Lưu trạng thái vào URL (Bắt buộc)

Dùng `useSearchParams` (React Router) thay vì `useState` cho bộ lọc:
- ✅ Shareable — gửi link cho đồng nghiệp giữ nguyên filter
- ✅ F5-safe — tải lại trang không mất filter
- ✅ Back/Forward — trình duyệt hoạt động đúng

### 5.4. Validate Query Params ở Backend

Luôn validate và sanitize trước khi đưa vào Prisma:

```javascript
// ✅ Whitelist cột cho phép sort
const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';

// ✅ Giới hạn limit để tránh query quá nặng
const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

// ✅ Validate date format
const parsedDate = new Date(startDate);
if (isNaN(parsedDate.getTime())) { /* bỏ qua */ }
```

### 5.5. Xử lý `null`/`undefined` cẩn thận

Khi xây dựng object `where` cho Prisma, khởi tạo rỗng `{}` và chỉ gán khi có giá trị thực:

```javascript
// ❌ Sai: truyền undefined vào Prisma có thể gây lỗi
const where = { status: params.status }; // status có thể undefined

// ✅ Đúng: chỉ gán khi có giá trị
const where = {};
if (params.status) where.status = params.status;
```

### 5.6. Case-Insensitive Search

- **MySQL** với collation `utf8mb4_unicode_ci` (mặc định) → **đã case-insensitive sẵn**, không cần xử lý thêm.
- **PostgreSQL** → cần thêm `mode: 'insensitive'`:
  ```javascript
  { title: { contains: search, mode: 'insensitive' } }
  ```

### 5.7. Tránh Infinite Loop trong `useEffect`

```javascript
// ❌ Bug: filters là object mới mỗi lần render → infinite loop
useEffect(() => { fetchData(); }, [filters]);

// ✅ Fix: dùng searchParamsString (string so sánh by value)
useEffect(() => { fetchData(); }, [searchParamsString]);
```

### 5.8. Bảo mật & Đa khách thuê (Multi-tenancy)

Trong các module thuộc Workspace (Planner, Stream, Media), **luôn luôn** phải lọc theo `brandId` để đảm bảo user không thấy dữ liệu của Brand khác:

```javascript
// ✅ Bắt buộc trong Service
async getPosts(params, brandId) {
  const where = { brandId }; // Luôn gán brandId đầu tiên
  // ... sau đó mới thêm các điều kiện search/filter khác
}
```

### 5.9. Tìm kiếm Toàn cục (Universal Search)

Khi tìm kiếm trên nhiều model cùng lúc (như thanh Topbar), sử dụng `Promise.all` để tối ưu hiệu năng:

```javascript
const [users, brands, logs] = await Promise.all([
  prisma.user.findMany({ where: { name: { contains: q } }, take: 5 }),
  prisma.brand.findMany({ where: { name: { contains: q } }, take: 5 }),
  prisma.auditLog.findMany({ where: { action: { contains: q } }, take: 5 })
]);
```

---

## 6. Tổng hợp các Trang cần áp dụng Search & Filter

Sau khi phân tích toàn bộ giao diện frontend, dưới đây là **tất cả các trang** cần tích hợp Search & Filter, phân loại theo nhóm.

### Bảng tổng hợp

| # | Trang | Path | Search | Bộ lọc | Phân trang | Trạng thái |
|---|-------|------|--------|--------|------------|------------|
| 1 | **Audit Log** | `/admin/audit` | ✅ | Category, Status, Date | ✅ | ✅ Done |
| 2 | **Universal Search** | (Topbar) | ✅ | Phân quyền (Admin/User) | ❌ | ✅ Done |
| 3 | **Stream History** | `/history` | ✅ | Platform, Status, Date | ✅ | ✅ Done |
| 4 | **Content Planner** | `/planner` | ✅ | Platform, Status, Date | ✅ | ✅ Done |
| 5 | **Media Library** | `/media-library` | ✅ | Type, Used, Sort | ✅ | ✅ Done |
| 6 | **Team Management** | `/manage/team` | ✅ | Role | ❌ | ✅ Done |
| 7 | **Inbox** | `/manage/inbox` | ✅ | Platform, Tab, Status | ❌ | ✅ Done |
| 8 | **Notifications** | `/notifications` | ❌ | Category, Read | ❌ | ✅ Done |
| 9 | **Admin Products** | `/admin/products` | ✅ | Status | ❌ | ✅ Done |
| 10 | **Revenue Dashboard** | `/admin/revenue` | ❌ | Date range, Group by | ❌ | ✅ Done |

---

### 6.1. 🎬 Stream History — `/history`

**Hiện trạng:** Dùng mảng cứng `STREAMS[]` (6 items), không có search/filter.

**Cần thêm:**

| Filter | Loại | Giá trị |
|--------|------|---------|
| `search` | Text (debounced) | Tìm theo title |
| `platform` | Select | YouTube, Facebook, TikTok, Instagram, Twitch, LinkedIn |
| `status` | Select | completed, partially-failed |
| `startDate` / `endDate` | Date picker | Khoảng thời gian |
| `sortBy` | Select | date, peak, views, duration |
| `page` / `limit` | Pagination | Mặc định 10/page |

- **URL ví dụ:** `/history?search=tech&platform=YOUTUBE&status=completed&page=1`
- **Backend (Service):**
  ```javascript
  // src/services/stream.service.js
  if (search && search.trim()) {
    where.title = { contains: search.trim() };
  }
  if (platform) where.platform = platform;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.startedAt = {};
    if (startDate) where.startedAt.gte = new Date(startDate);
    if (endDate) where.startedAt.lte = new Date(endDate);
  }
  ```
- **Frontend:** Thêm search bar + filter selects phía trên danh sách streams. Giữ nguyên toggle Grid/List view.

---

### 6.2. 🖼️ Media Library — `/media-library`

**Hiện trạng:** Đã có search + type filter **client-side** (`useState` + `.filter()`). Cần chuyển sang **server-side** khi lượng media lớn.

**Cần chuyển đổi:**

| Filter | Loại | Giá trị |
|--------|------|---------|
| `search` | Text (debounced) | Tìm theo filename |
| `type` | Tab buttons | All, Images, Videos, GIFs |
| `sortBy` | Select | Newest, Oldest, Name, Size |
| `used` | Toggle | Đã dùng / Chưa dùng |
| `page` / `limit` | Pagination | Mặc định 20/page (grid) |

- **URL ví dụ:** `/media-library?search=thumbnail&type=image&sortBy=createdAt&sortOrder=desc&page=1`
- **Backend (Service):**
  ```javascript
  // src/services/media.service.js
  if (search && search.trim()) {
    where.filename = { contains: search.trim() };
  }
  if (type && type !== 'all') {
    where.type = type.toUpperCase(); // IMAGE, VIDEO, GIF
  }
  if (used !== undefined) {
    where.usedInPostCount = used === 'true' ? { gt: 0 } : { equals: 0 };
  }
  ```
- **Frontend:** Thay `useState + .filter()` hiện tại bằng `useFilters` hook. Các tab buttons (All/Images/Videos/GIFs) gọi `updateFilters({ type: ... })`.

---

### 6.3. 📅 Content Planner — `/planner`

**Hiện trạng:** Chưa có search/filter. Đây là trang chính đã mô tả chi tiết ở Mục 4.3.

- **URL ví dụ:** `/planner?search=video&platform=YOUTUBE&status=DRAFT&page=1`
- Xem code mẫu đầy đủ ở **Mục 4.3**.

---

### 6.4. 👥 Team Management — `/manage/team`

**Hiện trạng:** Đã có search client-side (theo name/email). Chưa có filter theo role.

**Cần thêm:**

| Filter | Loại | Giá trị |
|--------|------|---------|
| `search` | Text (debounced) | Tìm theo name, email |
| `role` | Select | Owner, Admin, Stream Manager, Content Manager, Editor, Content Creator, Stream Operator, Analyst, Client |

- **URL ví dụ:** `/manage/team?search=sarah&role=Admin`
- **Backend (Service):**
  ```javascript
  // src/services/team.service.js
  if (search && search.trim()) {
    where.OR = [
      { user: { fullName: { contains: search.trim() } } },
      { user: { email: { contains: search.trim() } } }
    ];
  }
  if (role) where.role = { name: role };
  ```
- **Frontend:** Thêm select filter cho role bên cạnh search bar hiện có. Thay `useState(search)` + `.filter()` bằng `useFilters`.

> **Lưu ý:** Nếu team < 50 người, client-side filter vẫn ổn. Chỉ cần chuyển sang server-side khi team lớn.

---

### 6.5. 💬 Inbox — `/manage/inbox`

**Hiện trạng:** Đã có filter client-side:
- Tab filter: All, Unread, Comments, DMs, Mentions
- Platform filter: All, YouTube, Facebook, Instagram, TikTok, X
- Search bar (chưa hoạt động — chỉ có UI)

**Cần kết nối API:**

| Filter | Loại | Giá trị |
|--------|------|---------|
| `search` | Text (debounced) | Tìm theo user, nội dung tin nhắn |
| `platform` | Icon buttons | All, YouTube, Facebook, Instagram, TikTok, X |
| `tab` | Tab buttons | All, Unread, Comments, DMs, Mentions |
| `status` | Sidebar | open, resolved, spam |
| `assigned` | Select | Me, Unassigned, specific member |

- **URL ví dụ:** `/manage/inbox?platform=Instagram&tab=Unread&status=open`
- **Backend (Service):**
  ```javascript
  // src/services/inbox.service.js
  if (search && search.trim()) {
    where.OR = [
      { senderName: { contains: search.trim() } },
      { lastMessage: { contains: search.trim() } }
    ];
  }
  if (platform && platform !== 'All') where.platform = platform;
  if (tab === 'Unread') where.unreadCount = { gt: 0 };
  if (tab === 'DMs') where.type = 'DIRECT_MESSAGE';
  if (tab === 'Comments') where.type = 'COMMENT';
  if (tab === 'Mentions') where.type = 'MENTION';
  if (status) where.status = status;
  if (assigned === 'Me') where.assignedToId = userId; // từ req.user.id
  else if (assigned === 'Unassigned') where.assignedToId = null;
  ```
- **Frontend:** Chuyển tất cả filter state hiện tại (`platformFilter`, `tabFilter`) sang `useFilters` hook.

---

### 6.6. 🔔 Notifications — `/notifications`

**Hiện trạng:** Đã có filter category client-side (sidebar: All, Livestream, Content, Team, Platform, System).

**Cần thêm:**

| Filter | Loại | Giá trị |
|--------|------|---------|
| `category` | Sidebar buttons | all, stream, content, team, platform, system |
| `read` | Toggle | Chỉ chưa đọc |

- **URL ví dụ:** `/notifications?category=stream&read=false`
- **Frontend:** Thay `useState(activeCategory)` bằng `useFilters({ category: 'all' })`. Ít data nên **client-side filter là đủ**, chỉ cần đồng bộ với URL.

---

### 6.7. 🛡️ Audit Log — `/admin/audit`

**Hiện trạng:** Đã có filter category (All/Security/Billing/Team/Content) + search bar (chưa hoạt động). Pagination UI có nhưng chưa kết nối.

**Cần kết nối API:**

| Filter | Loại | Giá trị |
|--------|------|---------|
| `search` | Text (debounced) | Tìm theo action, IP, targetId, User name |
| `category` | Tab buttons | Lọc theo `targetType` (User, Brand, Post, ...) |
| `userId` | Select | Lọc theo người thực hiện |
| `startDate` / `endDate` | Date picker | Khoảng thời gian `createdAt` |
| `page` / `limit` | Pagination | Mặc định 50/page |

- **URL ví dụ:** `/admin/audit?search=192.168.1.1&targetType=Post&page=1`
- **Backend (Service):**
  ```javascript
  // src/services/auditLog.service.js
  if (search && search.trim()) {
    where.OR = [
      { action: { contains: search.trim() } },
      { ipAddress: { contains: search.trim() } },
      { targetId: { contains: search.trim() } },
      { user: { name: { contains: search.trim() } } }
    ];
  }
  if (category) where.targetType = category;
  ```
- **Frontend:** Kết nối search bar + category tabs vào `useFilters`. Kết nối pagination buttons (Previous/Next) với `updateFilters({ page })`.

---

### 6.8. 📦 Admin Products — `/admin/products`

**Hiện trạng:** Ma trận Module × Platform, không có search/filter.

**Cần thêm:**

| Filter | Loại | Giá trị |
|--------|------|---------|
| `search` | Text (debounced) | Tìm theo module name, SKU |
| `status` | Select | Active, Inactive |

- **URL ví dụ:** `/admin/products?search=Analytics&status=Active`
- **Frontend:** Dùng `useFilters` client-side (data ít). Filter sẽ ẩn/hiện các row trong ma trận dựa trên module name match.

---

### 6.9. 💰 Admin Pricing — `/admin/pricing`

- **URL ví dụ:** `/admin/pricing?search=stream&plan=PRO`
- **Frontend:** Client-side filter đủ cho trang này.

---

### 6.10. 📊 Revenue Dashboard — `/admin/revenue`

- **URL ví dụ:** `/admin/revenue?startDate=2026-01-01&endDate=2026-05-21&groupBy=month`
- **Frontend:** Chủ yếu dùng date range filter để thay đổi dữ liệu biểu đồ. Dùng `useFilters` để giữ state trên URL.

---

## 7. Ưu tiên triển khai

Dựa trên mức độ dữ liệu và tính cấp thiết, thứ tự triển khai đề xuất:

| Ưu tiên | Trang | Lý do |
|---------|-------|-------|
| 🔴 Cao | **Audit Log** | Dữ liệu lớn nhất (2,847+ events), cần server-side bắt buộc |
| 🔴 Cao | **Stream History** | Dữ liệu tăng nhanh theo thời gian, cần pagination |
| 🟡 Trung bình | **Content Planner** | Trang chính của hệ thống, cần S&F đa điều kiện |
| 🟡 Trung bình | **Media Library** | Chuyển từ client-side sang server-side khi file nhiều |
| 🟡 Trung bình | **Inbox** | Đã có UI filter, cần kết nối API |
| 🟢 Thấp | **Team Management** | Client-side filter vẫn ổn (team thường < 50 người) |
| 🟢 Thấp | **Notifications** | Ít data, client-side đủ |
| 🟢 Thấp | **Admin Products/Pricing/Revenue** | Dữ liệu ít, client-side đủ |

---

## 8. Checklist Triển khai

Sử dụng checklist này khi triển khai Search & Filter cho một trang mới:

- [ ] **Schema:** Tạo/cập nhật model Prisma với `@@index` cho các cột lọc
- [ ] **Repository:** Tạo method `findMany(where, options)` trả về `[data, count]`
- [ ] **Service:** Tạo method build `where` động + validate params
- [ ] **Controller:** Nhận `req.query`, gọi Service, trả JSON
- [ ] **Route:** Đăng ký route GET với middleware `verifyAuth`
- [ ] **app.js:** Mount route mới
- [ ] **Frontend Hook:** Dùng `useFilters` + `useDebounce`
- [ ] **Frontend Component:** Tạo UI filter bar + data display + pagination
- [ ] **Test:** Kiểm tra các trường hợp: không filter, 1 filter, nhiều filter, search rỗng, page vượt quá