import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useBrandStore } from '../store/useBrandStore';

/**
 * AppInitializer - Khởi tạo trạng thái toàn cục khi app mount.
 * Thay thế AuthProvider và BrandProvider vốn chỉ là wrapper rỗng.
 *
 * Không render UI — chỉ xử lý side-effects.
 */
export function AppInitializer() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  const resetBrands = useBrandStore((state) => state.reset);
  const wasAuthenticated = useRef(false);

  // Gọi checkAuth() và fetchBrands() song song ngay khi app mount, thay vì
  // chờ checkAuth() xong mới bắt đầu fetchBrands() — cả 2 endpoint chỉ cần
  // cookie session, không phụ thuộc vào response của nhau. fetchBrands() tự
  // im lặng bỏ qua nếu chưa đăng nhập (401/403), nên gọi mù không gây lỗi
  // hiển thị. Việc này phá vỡ waterfall profile → brands → metrics/billing/...
  useEffect(() => {
    checkAuth();
    fetchBrands();
  }, [checkAuth, fetchBrands]);

  // Dọn brands khi user logout thật sự (đã từng isAuthenticated=true rồi
  // chuyển về false) — không chạy ở lần mount đầu tiên (isAuthenticated khởi
  // tạo là false), tránh xóa mất kết quả fetchBrands() vừa gọi song song ở trên.
  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticated.current = true;
    } else if (wasAuthenticated.current) {
      resetBrands();
      wasAuthenticated.current = false;
    }
  }, [isAuthenticated, resetBrands]);

  return null;
}
