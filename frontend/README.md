# Frontend React + Tailwind - Auth UI

Frontend dự án nhóm: Login, Register, Forgot Password, Profile với **React.js**, **TailwindCSS**, **Redux Hooks**, **Axios**, **React Router**.

## Yêu cầu

- Node.js 18+
- pnpm (hoặc npm)

## Cài đặt

```bash
# Cài dependencies
pnpm install
# hoặc
npm install

# Tạo file .env (nếu cần)
# VITE_API_BASE_URL=http://localhost:4000
```

## Chạy ứng dụng

```bash
# Dev server (http://localhost:5173)
pnpm dev

# Build production
pnpm build
```

## Cấu trúc

```
src/
├── app/          # Store, RootApp, App (Dashboard)
├── components/   # UI components, ProtectedRoute, AuthLayout
├── features/     # Redux auth slice & async thunks
├── pages/auth/   # Login, Register, ForgotPassword, Profile
├── api/          # Axios instance
├── hooks.ts      # Redux typed hooks
└── styles/       # TailwindCSS
```

## Tính năng

- ✅ Đăng nhập / Đăng ký / Quên mật khẩu / Profile
- ✅ Redux Hooks quản lý state auth
- ✅ Axios + async thunks gọi API
- ✅ Protected Routes (yêu cầu token)
- ✅ Dark UI theme (TailwindCSS)
