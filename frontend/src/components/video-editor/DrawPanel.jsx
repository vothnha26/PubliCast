import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool, Eraser, Spline, Minus, ArrowUpRight, Square, Circle, Type, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { useDragScroll } from '../../hooks/useDragScroll';

const DRAW_TOOLS = [
  { id: 'sharpie',   label: 'Sharpie',   icon: PenTool },
  { id: 'eraser',    label: 'Eraser',    icon: Eraser },
  { id: 'path',      label: 'Path',      icon: Spline },
  { id: 'line',      label: 'Line',      icon: Minus },
  { id: 'arrow',     label: 'Arrow',     icon: ArrowUpRight },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse',   label: 'Ellipse',   icon: Circle },
  { id: 'text',      label: 'Text',      icon: Type },
];

const LINE_WIDTH_OPTIONS = [
  { id: 2,  label: 'Extra small' },
  { id: 4,  label: 'Small' },
  { id: 6,  label: 'Medium small' },
  { id: 8,  label: 'Medium' },
  { id: 12, label: 'Medium large' },
  { id: 16, label: 'Large' },
  { id: 24, label: 'Extra large' },
];

export default function DrawPanel() {
  const { drawColor, setDrawColor, drawWidth, setDrawWidth, drawTool, setDrawTool } = useVideoEditor();

  const [color, setColor] = useState(drawColor || '#FF3B30');
  const [selectedLineWidth, setSelectedLineWidth] = useState(LINE_WIDTH_OPTIONS[1]); // Small (4px)
  const [isLineWidthOpen, setIsLineWidthOpen] = useState(false);
  const [activeDrawTool, setActiveDrawTool] = useState(drawTool || 'sharpie');

  const dropdownRef = useRef(null);
  const { scrollRef, dragHandlers, scrollByAmount } = useDragScroll();

  // Sync color & width to context
  useEffect(() => {
    setDrawColor(color);
  }, [color, setDrawColor]);

  useEffect(() => {
    setDrawWidth(selectedLineWidth.id);
  }, [selectedLineWidth, setDrawWidth]);

  useEffect(() => {
    setDrawTool(activeDrawTool);
  }, [activeDrawTool, setDrawTool]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsLineWidthOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 py-1 select-none font-sans relative">
      {/* Coming Soon Overlay — Draw-on-video canvas is not yet implemented */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[2px] rounded-xl pointer-events-none">
        <div className="flex flex-col items-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-md">
          <span className="text-lg">✏️</span>
          <span className="text-xs font-extrabold text-gray-800 uppercase tracking-widest">Draw — Coming Soon</span>
          <span className="text-[10px] text-gray-400 text-center max-w-[200px] leading-tight">
            Canvas vẽ trên video đang được phát triển. Hiện tại bạn có thể sử dụng tính năng Draw trong Image Editor.
          </span>
        </div>
      </div>

      {/* Upper row: Color picker ring & Line Width Dropdown */}
      <div className="flex items-center justify-center gap-8 py-1">
        {/* Color Picker Group */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] text-gray-500 font-medium">color</span>
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-200 shadow-sm cursor-pointer overflow-hidden hover:scale-105 transition">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 w-12 h-12 -left-2 -top-2 opacity-0 cursor-pointer"
            />
            {/* Circular Ring with center dot matching screenshot */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-inner"
              style={{ backgroundColor: color }}
            >
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            </div>
          </div>
        </div>

        {/* Line Width Dropdown Group */}
        <div className="flex flex-col items-center gap-1 relative" ref={dropdownRef}>
          <span className="text-[11px] text-gray-500 font-medium">line width</span>
          <button
            type="button"
            onClick={() => setIsLineWidthOpen(!isLineWidthOpen)}
            className="flex items-center gap-2 px-4 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-xs font-semibold text-gray-800 hover:border-gray-300 transition cursor-pointer"
          >
            <span>{selectedLineWidth.label}</span>
            <ChevronDown size={14} className="text-gray-600" />
          </button>

          {/* Line Width Dropdown Menu */}
          {isLineWidthOpen && (
            <div className="absolute bottom-full mb-2 w-44 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {LINE_WIDTH_OPTIONS.map((opt) => {
                const isSelected = selectedLineWidth.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedLineWidth(opt);
                      setIsLineWidthOpen(false);
                    }}
                    className={`w-full text-left px-5 py-2 text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-gray-300 text-black font-extrabold'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tool Pills Bar: Sharpie, Eraser, Path, Line, Arrow, Rectangle, Ellipse, Text */}
      <div className="relative w-full flex items-center justify-center px-4 mt-1">
        <button
          onClick={() => scrollByAmount(-200)}
          className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 shrink-0 transition cursor-pointer z-10 mr-1"
          title="Cuộn sang trái"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={scrollRef}
          {...dragHandlers}
          className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-1 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {DRAW_TOOLS.map(({ id, label, icon: Icon }) => {
            const isSelected = activeDrawTool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveDrawTool(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-gray-300 text-black border-transparent font-extrabold shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:text-black hover:bg-gray-100'
                }`}
              >
                <Icon size={14} strokeWidth={2} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollByAmount(200)}
          className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 shrink-0 transition cursor-pointer z-10 ml-1"
          title="Cuộn sang phải"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
