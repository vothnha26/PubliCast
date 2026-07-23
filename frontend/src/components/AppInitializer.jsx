import { useEffect } from 'react';
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

  // Kiểm tra auth một lần khi app khởi động. Auth is cookie-based
  // (checkAuth() calls a cookie-authenticated endpoint) — the backend no
  // longer appends ?token=/&refreshToken= to any redirect, so there's
  // nothing left to read from the URL here.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch brands khi auth thay đổi
  useEffect(() => {
    if (isAuthenticated) {
      fetchBrands();
    } else {
      resetBrands();
    }
  }, [isAuthenticated, fetchBrands, resetBrands]);

  return null;
}
