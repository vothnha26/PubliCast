import { useRef } from 'react';

/**
 * Custom hook for smooth mouse drag-to-scroll functionality across horizontal panel containers.
 * Reusable across FilterPanel, FinetunePanel, DrawPanel, StickerPanel, SettingsPanel, etc.
 */
export function useDragScroll() {
  const scrollRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseLeaveOrUp = () => {
    isMouseDownRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const scrollByAmount = (amt) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amt, behavior: 'smooth' });
    }
  };

  return {
    scrollRef,
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseLeave: handleMouseLeaveOrUp,
      onMouseUp: handleMouseLeaveOrUp,
      onMouseMove: handleMouseMove
    },
    scrollByAmount
  };
}

export default useDragScroll;
