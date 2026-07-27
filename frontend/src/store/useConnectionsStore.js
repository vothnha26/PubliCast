import { create } from 'zustand';

export const useConnectionsStore = create((set) => ({
  isOpen: false,
  defaultBrandId: null,

  openConnections: (brandId = null) => set({ defaultBrandId: brandId, isOpen: true }),
  closeConnections: () => set({ isOpen: false, defaultBrandId: null })
}));
