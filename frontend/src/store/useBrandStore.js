import { create } from 'zustand';
import brandService from '../services/brand.service';
import profileService from '../services/profile.service';
import { toast } from 'sonner';
import { useAuthStore } from './useAuthStore';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const useBrandStore = create((set, get) => ({
  brands: [],
  activeBrand: null,
  defaultBrandId: null,
  loading: false,

  fetchBrands: async (selectId = null) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) return;

    set({ loading: true });
    try {
      const brands = await brandService.getBrands();
      const brandList = brands || [];
      set({ brands: brandList });

      if (brandList.length > 0) {
        const savedBrandId = selectId || localStorage.getItem(STORAGE_KEYS.ACTIVE_BRAND_ID);
        // Priority: explicit selectId > localStorage > defaultBrandId from profile > first brand
        const userDefaultBrandId = useAuthStore.getState().user?.defaultBrandId;

        if (savedBrandId === 'NONE') {
          set({ activeBrand: null });
        } else {
          const matchedBrand =
            brandList.find(b => b.id === savedBrandId) ||
            (userDefaultBrandId && brandList.find(b => b.id === userDefaultBrandId)) ||
            brandList[0];
          set({ activeBrand: matchedBrand, defaultBrandId: userDefaultBrandId || null });
          localStorage.setItem(STORAGE_KEYS.ACTIVE_BRAND_ID, matchedBrand.id);
        }
      } else {
        set({ activeBrand: null });
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_BRAND_ID);
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error);
      toast.error('Không thể tải danh sách thương hiệu');
    } finally {
      set({ loading: false });
    }
  },

  selectBrand: (brandId) => {
    const matched = get().brands.find(b => b.id === brandId);
    if (matched) {
      set({ activeBrand: matched });
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BRAND_ID, brandId);
      toast.success(`Đã chuyển sang thương hiệu: ${matched.name}`);
    }
  },

  deselectBrand: () => {
    set({ activeBrand: null });
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BRAND_ID, "NONE");
    toast.success("Đã bỏ chọn thương hiệu");
  },

  createBrand: async (brandData) => {
    try {
      const createdBrand = await brandService.createBrand(brandData);
      toast.success("Tạo thương hiệu mới thành công!");
      if (createdBrand && createdBrand.id) {
        await get().fetchBrands(createdBrand.id);
      } else {
        await get().fetchBrands();
      }
      return createdBrand;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Tạo thương hiệu thất bại";
      toast.error(msg);
      throw error;
    }
  },

  updateBrand: async (id, brandData) => {
    try {
      const updatedBrand = await brandService.updateBrand(id, brandData);
      toast.success("Cập nhật thông tin thương hiệu thành công!");
      await get().fetchBrands(get().activeBrand?.id);
      return updatedBrand;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Cập nhật thương hiệu thất bại";
      toast.error(msg);
      throw error;
    }
  },

  deleteBrand: async (id) => {
    try {
      await brandService.deleteBrand(id);
      toast.success("Xóa thương hiệu thành công!");
      
      const nextActiveId = get().activeBrand?.id === id ? null : get().activeBrand?.id;
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_BRAND_ID);
      await get().fetchBrands(nextActiveId);
    } catch (error) {
      const msg = error.response?.data?.message || "Xóa thương hiệu thất bại";
      toast.error(msg);
      throw error;
    }
  },

  refreshBrands: async (selectId = null) => {
    await get().fetchBrands(selectId);
  },

  setDefaultBrand: async (brandId) => {
    try {
      await profileService.setDefaultBrand(brandId);
      // Update auth store user object
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.setState({ user: { ...currentUser, defaultBrandId: brandId } });
      }
      set({ defaultBrandId: brandId });
      const brandName = get().brands.find(b => b.id === brandId)?.name;
      toast.success(`Đã đặt “${brandName}” làm thương hiệu mặc định`);
    } catch (error) {
      toast.error(error.message || 'Không thể thiết lập thương hiệu mặc định');
      throw error;
    }
  },

  clearDefaultBrand: async () => {
    try {
      await profileService.setDefaultBrand(null);
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.setState({ user: { ...currentUser, defaultBrandId: null } });
      }
      set({ defaultBrandId: null });
      toast.success('Đã xóa thương hiệu mặc định');
    } catch (error) {
      toast.error(error.message || 'Không thể xóa thương hiệu mặc định');
    }
  },

  reset: () => {
    set({ brands: [], activeBrand: null, defaultBrandId: null });
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_BRAND_ID);
  }
}));
