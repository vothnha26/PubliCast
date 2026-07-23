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

  // Kiểm tra auth một lần khi app khởi động
  useEffect(() => {
    // Auth is fully established via HttpOnly cookies (see api.js's
    // withCredentials) — checkAuth() below authenticates via cookie alone,
    // no ?token= query param is ever needed here.
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
