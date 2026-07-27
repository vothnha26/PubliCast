/**
 * BrandContext — Backward-compat shim.
 * Logic khởi tạo (fetchBrands/reset) đã được chuyển vào AppInitializer.
 * useBrand() là alias của useBrandStore() để không phải đổi import toàn bộ file.
 */
export { useBrandStore as useBrand } from '../store/useBrandStore';
