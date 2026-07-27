import { useConfirmStore } from '../store/useConfirmStore';

/**
 * useConfirm
 * Custom hook cung cấp hàm confirm() trả về một Promise<boolean>
 * thay thế trực tiếp cho window.confirm() đồng bộ.
 */
export function useConfirm() {
  const showConfirm = useConfirmStore((state) => state.showConfirm);
  return showConfirm;
}
