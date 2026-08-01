import * as React from "react";
import { 
  Plus, ChevronLeft, ChevronRight, Upload, Image as ImageIcon, Lock, Unlock,
  PenTool, Eraser, Spline, Minus, ArrowUpRight, Square, Circle, Type, ChevronDown 
} from "lucide-react";
import { useDragScroll } from "../../../../hooks/useDragScroll";

export const FILTER_PRESETS = [
  // Color Group
  { id: 'none', name: 'Default', category: 'Color', class: '' },
  { id: 'chrome', name: 'Chrome', category: 'Color', class: 'saturate-[1.6] contrast-[1.25] brightness-[1.05]' },
  { id: 'fade', name: 'Fade', category: 'Color', class: 'contrast-[0.85] brightness-[1.1] saturate-[0.8]' },
  { id: 'cold', name: 'Cold', category: 'Color', class: 'saturate-[0.9] hue-rotate-[15deg] brightness-[1.05]' },
  { id: 'warm', name: 'Warm', category: 'Color', class: 'sepia-[0.35] saturate-[1.4] hue-rotate-[-10deg]' },
  { id: 'pastel', name: 'Pastel', category: 'Color', class: 'saturate-[0.7] brightness-[1.15] contrast-[0.9]' },

  // Mono Group
  { id: 'mono', name: 'Mono', category: 'Mono', class: 'grayscale' },
  { id: 'noir', name: 'Noir', category: 'Mono', class: 'grayscale contrast-[1.5] brightness-[0.85]' },
  { id: 'stark', name: 'Stark', category: 'Mono', class: 'grayscale contrast-[2.0]' },
  { id: 'wash', name: 'Wash', category: 'Mono', class: 'grayscale brightness-[1.2] contrast-[0.8]' },

  // Tone Group
  { id: 'sepia', name: 'Sepia', category: 'Tone', class: 'sepia' },
  { id: 'rust', name: 'Rust', category: 'Tone', class: 'sepia-[0.8] saturate-[1.4] hue-rotate-[-20deg]' },
  { id: 'blues', name: 'Blues', category: 'Tone', class: 'hue-rotate-[180deg] sepia-[0.3] saturate-[1.2]' }
];

export const EMOJI_STICKERS = ['🔥', '🚀', '❤️', '👍', '🎉', '😎', '💯', '✨', '👏', '🌟', '💥', '💬', '💡', '📌', '🎯', '⚡', '🎈', '🤩'];

export const LOGO_ITEMS = [
  {
    id: 'threads',
    name: 'Threads',
    svg: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.879 12.355c-.295.845-.884 1.545-1.667 1.982-1.002.56-2.29.68-3.483.32-1.428-.43-2.52-1.57-2.88-2.99-.4-1.58.07-3.23 1.22-4.32 1.09-1.03 2.65-1.48 4.14-1.2 1.25.24 2.3.99 2.92 2.08.31.54.49 1.15.54 1.78h-2.15c-.04-.33-.14-.65-.31-.94-.34-.59-.92-.99-1.59-1.12-.81-.15-1.65.1-2.24.66-.62.59-.88 1.48-.67 2.33.2.82.83 1.47 1.66 1.7 1.06.3 2.12-.13 2.7-.93.18-.25.32-.54.41-.85h2.15c-.15.93-.57 1.79-1.22 2.47z"/>
      </svg>
    )
  },
  {
    id: 'facebook',
    name: 'Facebook',
    svg: (
      <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  },
  {
    id: 'instagram',
    name: 'Instagram',
    svg: (
      <svg className="w-5 h-5 fill-[#E4405F]" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
  },
  {
    id: 'twitter',
    name: 'Twitter',
    svg: (
      <svg className="w-5 h-5 fill-[#1DA1F2]" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z"/>
      </svg>
    )
  },
  {
    id: 'x',
    name: 'X',
    svg: (
      <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    svg: (
      <svg className="w-5 h-5 fill-[#0A66C2]" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    )
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    svg: (
      <svg className="w-5 h-5 fill-[#E60023]" viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
      </svg>
    )
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    svg: (
      <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.96-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.34 1.53-1.38 2.53-.08 1.08.38 2.16 1.19 2.87.82.72 1.96.97 3.01.7 1.03-.25 1.91-1.02 2.24-2.03.17-.55.23-1.13.22-1.71.02-4.97.01-9.94.01-14.91z"/>
      </svg>
    )
  },
  {
    id: 'youtube',
    name: 'YouTube',
    svg: (
      <svg className="w-5 h-5 fill-[#FF0000]" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  {
    id: 'twitch',
    name: 'Twitch',
    svg: (
      <svg className="w-5 h-5 fill-[#9146FF]" viewBox="0 0 24 24">
        <path d="M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    )
  }
];

export const FRAME_PRESETS = [
  { id: 'none', name: 'None' },
  { id: 'mat', name: 'Mat' },
  { id: 'bevel', name: 'Bevel' },
  { id: 'line', name: 'Line' },
  { id: 'zebra', name: 'Zebra' },
  { id: 'lumber', name: 'Lumber' },
  { id: 'inset', name: 'Inset' },
  { id: 'film', name: 'Film' },
  { id: 'hook', name: 'Hook' },
  { id: 'polaroid', name: 'Polaroid' }
];

export const DRAW_TOOLS = [
  { id: 'sharpie',   label: 'Sharpie',   icon: PenTool },
  { id: 'eraser',    label: 'Eraser',    icon: Eraser },
  { id: 'path',      label: 'Path',      icon: Spline },
  { id: 'line',      label: 'Line',      icon: Minus },
  { id: 'arrow',     label: 'Arrow',     icon: ArrowUpRight },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse',   label: 'Ellipse',   icon: Circle },
  { id: 'text',      label: 'Text',      icon: Type },
];

export const LINE_WIDTH_OPTIONS = [
  { id: 2,  label: 'Extra small' },
  { id: 4,  label: 'Small' },
  { id: 6,  label: 'Medium small' },
  { id: 8,  label: 'Medium' },
  { id: 12, label: 'Medium large' },
  { id: 16, label: 'Large' },
  { id: 24, label: 'Extra large' },
];

export const FINETUNE_OPTIONS = [
  { key: 'brightness',  label: 'Brightness'  },
  { key: 'contrast',    label: 'Contrast'    },
  { key: 'saturation',  label: 'Saturation'  },
  { key: 'exposure',    label: 'Exposure'    },
  { key: 'temperature', label: 'Temperature' },
  { key: 'gamma',       label: 'Gamma'       },
  { key: 'clarity',     label: 'Clarity'     },
  { key: 'vignette',    label: 'Vignette'    },
];

export function SettingsPanel({
  activeTab,
  adjustMode,
  setAdjustMode,
  scaleVal,
  setScaleVal,
  rotation = 0,
  setRotation,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  saturate,
  setSaturate,
  adjustments = {},
  setAdjustments,
  finetuneActiveField = 'brightness',
  setFinetuneActiveField,
  activeFilter,
  setActiveFilter,
  imageUrl,
  handleAddSticker,
  activeDrawTool,
  setActiveDrawTool,
  drawColor,
  setDrawColor,
  drawWidth,
  setDrawWidth,
  showColorDropdown,
  setShowColorDropdown,
  showLineWidthDropdown,
  setShowLineWidthDropdown,
  setTextPosition,
  activeFrame,
  setActiveFrame,
  frameColor,
  setFrameColor,
  frameSize,
  setFrameSize,
  frameOffset1,
  setFrameOffset1,
  frameOffset2,
  setFrameOffset2,
  frameRadius,
  setFrameRadius,
  frameAmount,
  setFrameAmount,
  showFrameColorPicker,
  setShowFrameColorPicker,
  handleAddCensure,
  keepRatio,
  setKeepRatio,
  resizeWidth,
  handleResizeWidthChange,
  resizeHeight,
  handleResizeHeightChange,
  imgSize
}) {
  const frameScroll = useDragScroll();
  const finetuneScroll = useDragScroll();
  const filterScroll = useDragScroll();
  const stickerScroll = useDragScroll();
  const drawScroll = useDragScroll();
  const lineWidthDropdownRef = React.useRef(null);
  
  const [stickerSubTab, setStickerSubTab] = React.useState('logos');
  const [isLineWidthOpen, setIsLineWidthOpen] = React.useState(false);

  const curVal = adjustments[finetuneActiveField] ?? 0;

  const handleFinetuneSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (setAdjustments) {
      setAdjustments((prev) => ({ ...prev, [finetuneActiveField]: val }));
    }
  };

  const handleStickerFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && handleAddSticker) {
      const url = URL.createObjectURL(file);
      handleAddSticker(url);
    }
  };

  const selectedLineWidthObj = LINE_WIDTH_OPTIONS.find(l => l.id === drawWidth) || LINE_WIDTH_OPTIONS[1];

  return (
    <div className="h-44 bg-card border-t border-border flex flex-col items-center justify-center px-8 shrink-0 space-y-4 font-sans">
      {/* Frame Tab - Exactly matched to user screenshot */}
      {activeTab === 'frame' && (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-1 select-none font-sans animate-in fade-in duration-300">
          {/* Upper control row: color, size, offset */}
          <div className="flex items-center justify-center gap-14 text-xs font-medium text-muted-foreground">
            {/* Color Circle Picker */}
            <div className="flex flex-col items-center gap-1 relative">
              <span className="text-[11px] font-normal text-muted-foreground">color</span>
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 shadow-sm cursor-pointer overflow-hidden hover:scale-105 transition">
                <input
                  type="color"
                  value={frameColor || '#FFFFFF'}
                  onChange={(e) => setFrameColor(e.target.value)}
                  className="absolute inset-0 w-10 h-10 -left-1 -top-1 opacity-0 cursor-pointer"
                />
                <div
                  className="w-5 h-5 rounded-full border border-border shadow-inner"
                  style={{ backgroundColor: frameColor || '#FFFFFF' }}
                />
              </div>
            </div>

            {/* Size Slider */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-normal text-muted-foreground">size</span>
              <span className="text-xs font-semibold text-foreground">{frameSize}%</span>
              <input
                type="range"
                min="1"
                max="15"
                value={frameSize}
                onChange={(e) => setFrameSize(Number(e.target.value))}
                className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>

            {/* Offset Slider */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-normal text-muted-foreground">offset</span>
              <span className="text-xs font-semibold text-foreground">{frameOffset1}%</span>
              <input
                type="range"
                min="0"
                max="50"
                value={frameOffset1}
                onChange={(e) => setFrameOffset1(Number(e.target.value))}
                className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>
          </div>

          {/* Scrollable Frame Presets Container */}
          <div className="relative w-full flex items-center justify-center px-4 mt-1">
            <button
              onClick={() => frameScroll.scrollByAmount(-200)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 mr-1"
              title="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              ref={frameScroll.scrollRef}
              {...frameScroll.dragHandlers}
              className="flex-1 flex items-center justify-center gap-2.5 overflow-x-auto py-1 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-4xl"
            >
              {FRAME_PRESETS.map((preset) => {
                const isSelected = activeFrame === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setActiveFrame(preset.id)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer border shrink-0 ${
                      isSelected
                        ? 'border-dashed border-yellow-400 bg-yellow-50/20 shadow-sm'
                        : 'border-dashed border-gray-300 hover:border-gray-400 bg-card'
                    }`}
                  >
                    <div className="w-11 h-13 border border-gray-300 rounded bg-card flex items-center justify-center relative p-1">
                      {preset.id === 'none' && (
                        <div className="w-full h-full border border-dashed border-gray-300 rounded flex items-center justify-center bg-muted/50">
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-tighter">None</span>
                        </div>
                      )}
                      {preset.id === 'mat' && <div className="w-full h-full border-4 border-black bg-muted" />}
                      {preset.id === 'bevel' && <div className="w-full h-full border-2 border-gray-800 shadow-inner bg-muted" />}
                      {preset.id === 'line' && <div className="w-full h-full border border-black bg-muted" />}
                      {preset.id === 'zebra' && <div className="w-full h-full border-double border-4 border-black bg-muted" />}
                      {preset.id === 'lumber' && <div className="w-full h-full border-2 border-[#8B5A2B] bg-amber-50" />}
                      {preset.id === 'inset' && <div className="w-full h-full border border-dashed border-black bg-muted" />}
                      {preset.id === 'film' && <div className="w-full h-full border border-black bg-muted flex flex-col justify-between"><div className="h-1 w-full bg-black" /><div className="h-1 w-full bg-black" /></div>}
                      {preset.id === 'hook' && <div className="w-full h-full border border-black bg-muted rounded-md" />}
                      {preset.id === 'polaroid' && <div className="w-full h-full border border-gray-300 bg-card flex flex-col"><div className="flex-1 bg-muted" /><div className="h-2.5 w-full bg-card" /></div>}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => frameScroll.scrollByAmount(200)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 ml-1"
              title="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Draw Tab - Exactly mapped to video editor */}
      {activeTab === 'draw' && (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-1 select-none font-sans animate-in fade-in duration-300">
          {/* Upper row: Color picker ring & Line Width Dropdown */}
          <div className="flex items-center justify-center gap-8 py-1">
            {/* Color Picker Group */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground font-medium">color</span>
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-border shadow-sm cursor-pointer overflow-hidden hover:scale-105 transition">
                <input
                  type="color"
                  value={drawColor || '#FF3B30'}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="absolute inset-0 w-12 h-12 -left-2 -top-2 opacity-0 cursor-pointer"
                />
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-inner"
                  style={{ backgroundColor: drawColor || '#FF3B30' }}
                >
                  <div className="w-2.5 h-2.5 bg-card rounded-full" />
                </div>
              </div>
            </div>

            {/* Line Width Dropdown Group */}
            <div className="flex flex-col items-center gap-1 relative" ref={lineWidthDropdownRef}>
              <span className="text-[11px] text-muted-foreground font-medium">line width</span>
              <button
                type="button"
                onClick={() => setIsLineWidthOpen(!isLineWidthOpen)}
                className="flex items-center gap-2 px-4 py-1 bg-card border border-border rounded-full shadow-sm text-xs font-semibold text-foreground hover:border-gray-300 transition cursor-pointer"
              >
                <span>{selectedLineWidthObj.label}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>

              {isLineWidthOpen && (
                <div className="absolute bottom-full mb-2 w-44 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {LINE_WIDTH_OPTIONS.map((opt) => {
                    const isSelected = drawWidth === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDrawWidth(opt.id);
                          setIsLineWidthOpen(false);
                        }}
                        className={`w-full text-left px-5 py-2 text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-gray-300 text-black font-extrabold'
                            : 'hover:bg-muted text-foreground'
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

          {/* Bottom Tool Pills Bar with Icons */}
          <div className="relative w-full flex items-center justify-center px-4 mt-1">
            <button
              onClick={() => drawScroll.scrollByAmount(-200)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 mr-1"
              title="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              ref={drawScroll.scrollRef}
              {...drawScroll.dragHandlers}
              className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-1 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-3xl"
            >
              {DRAW_TOOLS.map(({ id, label, icon: Icon }) => {
                const isSelected = activeDrawTool === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveDrawTool(id);
                      if (setTextPosition) setTextPosition(null);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-gray-300 text-black border-transparent font-extrabold shadow-sm'
                        : 'bg-muted text-muted-foreground border-border hover:text-black hover:bg-muted'
                    }`}
                  >
                    <Icon size={14} strokeWidth={2} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => drawScroll.scrollByAmount(200)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 ml-1"
              title="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Size Tab - Exactly mapped to video editor */}
      {activeTab === 'size' && (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-2 select-none relative animate-in fade-in duration-300">
          {adjustMode === 'rotation' ? (
            <div className="flex flex-col items-center gap-1.5 w-full max-w-lg">
              <div className="relative w-full flex items-center justify-center">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation && setRotation(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
              <span className="text-xs font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                {rotation > 0 ? `+${rotation}°` : `${rotation}°`}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 w-full max-w-lg">
              <div className="relative w-full flex items-center justify-center">
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={scaleVal}
                  onChange={(e) => setScaleVal(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
              <span className="text-xs font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                {scaleVal.toFixed(2)}x
              </span>
            </div>
          )}

          {/* Sub-tab Pill: Rotation vs Scale */}
          <div className="flex items-center justify-center bg-muted p-0.5 rounded-full border border-border text-xs font-semibold">
            <button
              onClick={() => setAdjustMode('rotation')}
              className={`px-4 py-1 rounded-full transition cursor-pointer ${
                adjustMode === 'rotation'
                  ? 'bg-gray-300 text-black font-extrabold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rotation
            </button>
            <button
              onClick={() => setAdjustMode('scale')}
              className={`px-4 py-1 rounded-full transition cursor-pointer ${
                adjustMode === 'scale'
                  ? 'bg-gray-300 text-black font-extrabold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Scale
            </button>
          </div>

          <div className="absolute right-4 bottom-2 text-xs font-mono font-semibold text-muted-foreground">
            {imgSize.w || 0} × {imgSize.h || 0}
          </div>
        </div>
      )}

      {/* Finetune Tab */}
      {activeTab === 'finetune' && (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-1 select-none animate-in fade-in duration-300">
          <div className="w-full max-w-lg flex flex-col items-center gap-1 px-4">
            <div className="text-foreground text-xs font-mono font-black px-2 py-0.5 rounded-md">
              {curVal > 0 ? `+${curVal}` : curVal}
            </div>

            <div className="relative w-full flex items-center">
              <input
                type="range"
                min="-50"
                max="50"
                value={curVal}
                onChange={handleFinetuneSliderChange}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-400 pointer-events-none rounded-full" />
            </div>
          </div>

          <div className="relative w-full flex items-center justify-center px-4 mt-1">
            <button
              onClick={() => finetuneScroll.scrollByAmount(-200)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 mr-1"
              title="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              ref={finetuneScroll.scrollRef}
              {...finetuneScroll.dragHandlers}
              className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-1 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-3xl"
            >
              {FINETUNE_OPTIONS.map(({ key, label }) => {
                const isSelected = finetuneActiveField === key;
                const hasCustomValue = (adjustments[key] ?? 0) !== 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFinetuneActiveField && setFinetuneActiveField(key)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-gray-300 text-black border-transparent font-extrabold shadow-sm'
                        : hasCustomValue
                        ? 'bg-muted text-black border-gray-300 font-bold'
                        : 'bg-muted text-muted-foreground border-border hover:text-black hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => finetuneScroll.scrollByAmount(200)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 ml-1"
              title="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filter Tab */}
      {activeTab === 'filter' && (
        <div className="w-full flex items-center justify-center px-4 relative select-none animate-in fade-in duration-300">
          <button
            onClick={() => filterScroll.scrollByAmount(-250)}
            className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 mr-2"
            title="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={filterScroll.scrollRef}
            {...filterScroll.dragHandlers}
            className="flex-1 flex items-center gap-3 overflow-x-auto py-2 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-4xl"
          >
            {FILTER_PRESETS.map((filter) => {
              const isSelected = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex flex-col items-center gap-1.5 shrink-0 p-1.5 rounded-2xl transition-all cursor-pointer border ${
                    isSelected 
                      ? 'border-gray-800 bg-muted/70 shadow-sm scale-105' 
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
                    <img 
                      src={imageUrl} 
                      className={`w-full h-full object-cover ${filter.class}`} 
                      alt={filter.name} 
                    />
                  </div>
                  <span className={`text-[10px] tracking-tight ${isSelected ? 'font-black text-black' : 'font-semibold text-muted-foreground'}`}>
                    {filter.name}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => filterScroll.scrollByAmount(250)}
            className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 ml-2"
            title="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Sticker Tab - Exactly mapped to video editor */}
      {activeTab === 'sticker' && (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-2 select-none font-sans animate-in fade-in duration-300">
          <div className="relative w-full flex items-center justify-center px-4">
            {stickerSubTab !== 'select-image' && (
              <button
                onClick={() => stickerScroll.scrollByAmount(-200)}
                className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 mr-1"
                title="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <div
              ref={stickerScroll.scrollRef}
              {...stickerScroll.dragHandlers}
              className="flex-1 flex items-center justify-center gap-3 overflow-x-auto py-2 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-3xl"
            >
              {stickerSubTab === 'logos' && (
                <div className="flex items-center gap-3 shrink-0">
                  {LOGO_ITEMS.map((logo) => (
                    <button
                      key={logo.id}
                      onClick={() => handleAddSticker(logo.name)}
                      className="w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:scale-110 transition cursor-pointer hover:shadow-md shrink-0"
                      title={`Add logo ${logo.name}`}
                    >
                      {logo.svg}
                    </button>
                  ))}
                </div>
              )}

              {stickerSubTab === 'emojis' && (
                <div className="flex items-center gap-3 shrink-0">
                  {EMOJI_STICKERS.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddSticker(emoji)}
                      className="w-10 h-10 rounded-full bg-muted border border-border text-xl flex items-center justify-center hover:scale-125 transition cursor-pointer shrink-0"
                      title="Add Emoji"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {stickerSubTab === 'select-image' && (
                <div className="flex items-center justify-center py-1">
                  <label className="flex items-center gap-2 px-5 py-2 rounded-full border border-dashed border-gray-300 bg-muted hover:bg-muted text-foreground text-xs font-semibold cursor-pointer transition">
                    <Upload size={14} />
                    <span>Upload sticker image from computer</span>
                    <input type="file" accept="image/*" onChange={handleStickerFileUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {stickerSubTab !== 'select-image' && (
              <button
                onClick={() => stickerScroll.scrollByAmount(200)}
                className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 ml-1"
                title="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Sub-tab Pill: Select Image / Emojis / Logos */}
          <div className="flex items-center justify-center bg-muted p-0.5 rounded-full border border-border text-xs font-semibold">
            <button
              onClick={() => setStickerSubTab('select-image')}
              className={`flex items-center gap-1.5 px-4 py-1 rounded-full transition cursor-pointer ${
                stickerSubTab === 'select-image'
                  ? 'bg-gray-300 text-black font-extrabold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon size={13} />
              <span>Select Image</span>
            </button>

            <button
              onClick={() => setStickerSubTab('emojis')}
              className={`px-4 py-1 rounded-full transition cursor-pointer ${
                stickerSubTab === 'emojis'
                  ? 'bg-gray-300 text-black font-extrabold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Emojis
            </button>

            <button
              onClick={() => setStickerSubTab('logos')}
              className={`px-4 py-1 rounded-full transition cursor-pointer ${
                stickerSubTab === 'logos'
                  ? 'bg-gray-300 text-black font-extrabold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Logos
            </button>
          </div>
        </div>
      )}

      {/* Censure Tab */}
      {activeTab === 'censure' && (
        <div className="w-full flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <button
            onClick={handleAddCensure}
            className="px-6 py-2 rounded-xl bg-black text-yellow-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-800 transition-all cursor-pointer shadow-md"
          >
            <Plus size={12} /> Add Censure Box
          </button>
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
            Drag box to position. Drag yellow dot to resize.
          </span>
        </div>
      )}

      {/* Resize Tab - Exactly mapped to video editor */}
      {activeTab === 'resize' && (
        <div className="w-full flex items-center justify-center py-2 select-none font-sans animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-between bg-gray-200/70 border border-gray-300 rounded-xl px-4 py-1.5 w-32 shadow-inner transition hover:border-gray-400">
              <input
                type="number"
                value={resizeWidth}
                onChange={(e) => handleResizeWidthChange(Number(e.target.value))}
                className="w-16 bg-transparent text-sm font-semibold text-foreground text-center focus:outline-none"
              />
              <span className="text-xs font-bold text-muted-foreground">W</span>
            </div>

            <button
              type="button"
              onClick={() => setKeepRatio(!keepRatio)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                keepRatio ? 'text-black bg-gray-200/80 shadow-sm' : 'text-muted-foreground hover:text-black hover:bg-muted'
              }`}
              title={keepRatio ? 'Aspect ratio locked' : 'Free aspect ratio'}
            >
              {keepRatio ? <Lock size={15} strokeWidth={2.2} /> : <Unlock size={15} strokeWidth={2.2} />}
            </button>

            <div className="flex items-center justify-between bg-gray-200/70 border border-gray-300 rounded-xl px-4 py-1.5 w-32 shadow-inner transition hover:border-gray-400">
              <input
                type="number"
                value={resizeHeight}
                onChange={(e) => handleResizeHeightChange(Number(e.target.value))}
                className="w-16 bg-transparent text-sm font-semibold text-foreground text-center focus:outline-none"
              />
              <span className="text-xs font-bold text-muted-foreground">H</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
