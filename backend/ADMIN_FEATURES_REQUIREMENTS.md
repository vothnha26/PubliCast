# Yêu cầu Backend cho các tính năng Admin

## Tổng quan

Tài liệu này định nghĩa các API endpoints, database schema, và kiến trúc backend cần thiết để triển khai ba tính năng Admin chính (tuân thủ **SOLID Principles**):

1. **Quản lý giá** (`/admin/pricing`)
2. **Quản lý sản phẩm** (`/admin/products`)
3. **Bảng điều khiển doanh thu** (`/admin/revenue`)

---

## I. KIẾN TRÚC BACKEND (Tuân thủ SOLID)

### Cấu trúc folder:

```
backend/
├── src/
│   ├── controllers/
│   │   ├── admin.plans.controller.js
│   │   ├── admin.products.controller.js
│   │   ├── admin.revenue.controller.js
│   │   └── admin.discount.controller.js
│   │
│   ├── services/
│   │   ├── admin.plans.service.js
│   │   ├── admin.products.service.js
│   │   ├── admin.revenue.service.js
│   │   └── admin.discount.service.js
│   │
│   ├── repositories/
│   │   ├── plans.repository.js
│   │   ├── products.repository.js
│   │   ├── platforms.repository.js
│   │   ├── transactions.repository.js
│   │   └── subscriptions.repository.js
│   │
│   ├── validators/                    # 🔴 S - Tách riêng theo resource
│   │   ├── plan.validator.js
│   │   ├── product.validator.js
│   │   ├── discount.validator.js
│   │   └── platform.validator.js
│   │
│   ├── calculators/                   # 🔴 S - Mỗi calculator một trách nhiệm
│   │   ├── mrr.calculator.js
│   │   ├── churn.calculator.js
│   │   ├── conversion.calculator.js
│   │   ├── arpu.calculator.js
│   │   └── clv.calculator.js
│   │
│   ├── analyzers/                     # 🔴 S - Tách analyzer riêng
│   │   ├── geography.analyzer.js
│   │   ├── heatmap.analyzer.js
│   │   └── transaction.analyzer.js
│   │
│   ├── constants/                     # 🟠 O - Mở rộng qua constants
│   │   ├── plan-status.js
│   │   ├── subscription-tier.js
│   │   ├── discount-type.js
│   │   ├── support-level.js
│   │   └── transaction-status.js
│   │
│   ├── interfaces/                    # 🟡 L & I - Abstraction
│   │   ├── base.repository.interface.ts
│   │   ├── base.service.interface.ts
│   │   ├── metric-calculator.interface.ts
│   │   └── analyzer.interface.ts
│   │
│   ├── config/
│   │   ├── ioc-container.js           # 🟣 D - Dependency Injection
│   │   ├── database.js
│   │   └── redis.js
│   │
│   ├── middlewares/
│   │   ├── admin-auth.middleware.js
│   │   ├── admin-audit.middleware.js
│   │   └── error-handler.middleware.js
│   │
│   ├── routes/
│   │   ├── admin.plans.routes.js
│   │   ├── admin.products.routes.js
│   │   ├── admin.revenue.routes.js
│   │   └── admin.discount.routes.js
│   │
│   └── app.js
│
├── prisma/
│   └── schema.prisma
│
└── tests/
    ├── unit/
    │   ├── calculators/
    │   ├── validators/
    │   └── services/
    ├── integration/
    │   ├── admin.plans.test.js
    │   ├── admin.products.test.js
    │   └── admin.revenue.test.js
    └── e2e/
        └── admin-features.test.js
```

---

## II. DATABASE SCHEMA

### Bảng: Plans (Gói đăng ký)

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),
  description TEXT,
  trial_days INT,
  status ENUM('active', 'inactive', 'deprecated'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_plans_status ON plans(status);
```

### Bảng: PlanFeatures (Tính năng gói)

```sql
CREATE TABLE plan_features (
  id UUID PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name VARCHAR(255),
  category VARCHAR(100),
  included BOOLEAN,
  limit_value INT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_plan_features_plan_id ON plan_features(plan_id);
```

### Bảng: DiscountCodes (Mã giảm giá)

```sql
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type ENUM('percentage', 'fixed'),
  discount_value DECIMAL(10,2),
  expiry_date DATE,
  max_uses INT,
  used_count INT DEFAULT 0,
  active BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_discount_codes_active ON discount_codes(active);
CREATE INDEX idx_discount_codes_expiry ON discount_codes(expiry_date);
```

### Bảng: Products (Sản phẩm)

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status ENUM('active', 'beta', 'deprecated'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_products_status ON products(status);
```

### Bảng: Platforms (Nền tảng)

```sql
CREATE TABLE platforms (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  icon VARCHAR(255),
  api_version VARCHAR(50),
  status ENUM('active', 'maintenance', 'inactive'),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_platforms_status ON platforms(status);
```

### Bảng: ProductPlatformMatrix (Ma trận sản phẩm-nền tảng)

```sql
CREATE TABLE product_platform_matrix (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  is_available BOOLEAN,
  support_level ENUM('full', 'partial', 'planned', 'unavailable'),
  release_date DATE,
  limitations TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, platform_id)
);
CREATE INDEX idx_product_matrix_product ON product_platform_matrix(product_id);
CREATE INDEX idx_product_matrix_platform ON product_platform_matrix(platform_id);
```

### Bảng: Modules (Mô-đun/Tính năng)

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255),
  description TEXT,
  tier ENUM('free', 'pro', 'agency'),
  release_status ENUM('stable', 'beta', 'experimental'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_modules_product_id ON modules(product_id);
```

### Bảng: Transactions (Giao dịch)

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  status ENUM('success', 'failed', 'pending'),
  type ENUM('subscription', 'refund', 'addon_charge'),
  payment_method VARCHAR(50),
  transaction_ref VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);
```

### Nâng cấp: Subscriptions (Thêm cột)

```sql
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS (
  plan_id UUID REFERENCES plans(id),
  discount_code_id UUID REFERENCES discount_codes(id),
  trial_start_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  converted_at TIMESTAMP,
  churn_date TIMESTAMP
);
```

---

## III. API ENDPOINTS

### 1. Quản lý giá

```
GET    /api/admin/plans
POST   /api/admin/plans
PUT    /api/admin/plans/:planId
DELETE /api/admin/plans/:planId

GET    /api/admin/plans/:planId/features
POST   /api/admin/plans/:planId/features
PUT    /api/admin/features/:featureId
DELETE /api/admin/features/:featureId

GET    /api/admin/discounts
POST   /api/admin/discounts
PUT    /api/admin/discounts/:discountId
DELETE /api/admin/discounts/:discountId
```

### 2. Quản lý sản phẩm

```
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:productId
DELETE /api/admin/products/:productId

GET    /api/admin/platforms
POST   /api/admin/platforms
PUT    /api/admin/platforms/:platformId
DELETE /api/admin/platforms/:platformId

GET    /api/admin/product-matrix
POST   /api/admin/product-matrix
```

### 3. Bảng điều khiển doanh thu

```
GET /api/admin/revenue/overview?period=30d
GET /api/admin/revenue/plan-breakdown?period=30d
GET /api/admin/revenue/subscribers?page=1&limit=20
GET /api/admin/revenue/geography?period=30d
GET /api/admin/revenue/transactions?limit=20&status=all
GET /api/admin/revenue/heatmap?duration=12
```

---

## IV. RESPONSE FORMAT

```javascript
{
  success: boolean,
  data: { ... } | [...],
  error?: { code: string, message: string },
  metadata?: { timestamp: date, version: string }
}
```

---

## V. HƯỚNG DẪN TRIỂN KHAI TUÂN THỦ SOLID

### 🔴 **S - Single Responsibility Principle**

Tách các file theo trách nhiệm:

```javascript
// ❌ SAI: Tất cả validators trong 1 file
utils / validators.js(1000 + dòng);

// ✅ ĐÚNG: Tách thành các file nhỏ
validators / plan.validator.js;
validators / product.validator.js;
validators / discount.validator.js;
calculators / mrr.calculator.js;
calculators / churn.calculator.js;
calculators / conversion.calculator.js;
```

---

### 🟠 **O - Open/Closed Principle**

Dùng Constants thay vì hardcode:

```javascript
// constants/plan-status.js
const PLAN_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DEPRECATED: "deprecated",
};
module.exports = Object.freeze(PLAN_STATUS);

// constants/subscription-tier.js
const TIERS = {
  FREE: "free",
  PRO: "pro",
  AGENCY: "agency",
};
module.exports = Object.freeze(TIERS);
```

---

### 🟡 **L - Liskov Substitution Principle**

Tạo base interface/class:

```typescript
// interfaces/base.repository.interface.ts
interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T>;
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// repositories/plans.repository.js
class PlansRepository implements IRepository<Plan> { ... }
```

---

### 🟢 **I - Interface Segregation Principle**

Tách interface nhỏ, không "béo":

```typescript
// ❌ SAI: Interface quá lớn
interface IRevenueService {
  getOverview(): Promise<any>;
  getPlanBreakdown(): Promise<any>;
  getGeography(): Promise<any>;
  getTransactions(): Promise<any>;
}

// ✅ ĐÚNG: Tách interface nhỏ
interface IMRRCalculator {
  calculate(planId?: string): Promise<number>;
}

interface IChurnCalculator {
  calculate(planId?: string): Promise<number>;
}
```

---

### 🟣 **D - Dependency Inversion Principle**

Dùng IoC Container (Awilix):

```javascript
// config/ioc-container.js
import { createContainer, asClass } from "awilix";

const container = createContainer();

container.register({
  // Repositories
  plansRepository: asClass(PlansRepository).singleton(),
  productsRepository: asClass(ProductsRepository).singleton(),

  // Validators
  planValidator: asClass(PlanValidator).singleton(),

  // Calculators
  mrrCalculator: asClass(MRRCalculator).singleton(),
  churnCalculator: asClass(ChurnCalculator).singleton(),

  // Services
  adminPlansService: asClass(AdminPlansService).singleton(),

  // Controllers
  adminPlansController: asClass(AdminPlansController).singleton(),
});

export default container;
```

**Sử dụng:**

```javascript
// routes/admin.plans.routes.js
import container from "../config/ioc-container";
const { adminPlansController } = container.cradle;

router.get("/", (req, res) => adminPlansController.list(req, res));
router.post("/", (req, res) => adminPlansController.create(req, res));
```

---

## VI. ƯỚI TIÊN TRIỂN KHAI

### Phase 1 (MVP - Tuần 1-2) 🔴

- [ ] Setup database schema
- [ ] Implement Plans CRUD
- [ ] Implement Revenue Overview endpoint
- [ ] Admin auth middleware

### Phase 2 (Tuần 3) 🟠

- [ ] Plan Features & Discounts CRUD
- [ ] Products & Platforms CRUD
- [ ] Integration tests

### Phase 3 (Tuần 4) 🟡

- [ ] Revenue Analytics (geography, heatmap)
- [ ] Caching layer (Redis)

### Phase 4 (Tuần 5) 🟣

- [ ] Admin audit logging
- [ ] Performance optimization

---

## VII. CHECKLIST SOLID

- [ ] Tách validators thành các file riêng (S)
- [ ] Tách calculators thành các file riêng (S)
- [ ] Dùng Constants thay vì hardcode (O)
- [ ] Tạo base interfaces cho repositories (L)
- [ ] Tách interfaces nhỏ cho analytics (I)
- [ ] Cài đặt Awilix IoC Container (D)
- [ ] Viết unit tests cho calculators
- [ ] Setup admin auth middleware
- [ ] Setup error handling middleware

---

## VIII. CÔNG CỤ & LỰA CHỌN CÔNG NGHỆ

**Bắt buộc:**

- Express.js
- Prisma
- Node.js 18+

**Khuyến nghị:**

- Awilix (IoC Container)
- Jest (Testing)
- Redis (Caching)
- Joi (Validation)

---

**Status:** 🟢 Tuân thủ SOLID - Ready to implement
