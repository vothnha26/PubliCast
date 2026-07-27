/**
 * AuthContext — Backward-compat shim.
 * Logic khởi tạo đã được chuyển vào AppInitializer.
 * useAuth() là alias của useAuthStore() để không phải đổi import toàn bộ file.
 */
export { useAuthStore as useAuth } from '../store/useAuthStore';
