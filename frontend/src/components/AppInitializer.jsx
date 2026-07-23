import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useBrandStore } from '../store/useBrandStore';
import { STORAGE_KEYS } from '../constants/storageKeys';

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
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('refreshToken');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
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
