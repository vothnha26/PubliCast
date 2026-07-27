import { create } from 'zustand';

/**
 * useConfirmStore
 * Quản lý trạng thái và luồng dữ liệu bất đồng bộ (Promise) cho Confirm Dialog toàn cục.
 * Áp dụng Facade Pattern để cô lập logic điều khiển.
 */
export const useConfirmStore = create((set, get) => ({
  isOpen: false,
  title: '',
  description: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy',
  secondaryText: '',
  variant: 'destructive',
  resolve: null,

  showConfirm: (options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        title: options.title || 'Xác nhận',
        description: options.description || '',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy',
        secondaryText: options.secondaryText || '',
        variant: options.variant || 'destructive',
        resolve,
      });
    });
  },

  onConfirm: () => {
    const { resolve } = get();
    if (resolve) resolve(true);
    set({ isOpen: false, resolve: null });
  },

  onSecondary: () => {
    const { resolve } = get();
    if (resolve) resolve(false);
    set({ isOpen: false, resolve: null });
  },

  onCancel: () => {
    const { resolve, secondaryText } = get();
    if (resolve) {
      resolve(secondaryText ? null : false);
    }
    set({ isOpen: false, resolve: null });
  }
}));
