import * as React from "react";
import { Plus } from "lucide-react";

export const FILTER_PRESETS = [
  { id: 'none', name: 'Original', class: '' },
  { id: 'grayscale', name: 'Grayscale', class: 'grayscale' },
  { id: 'sepia', name: 'Sepia', class: 'sepia' },
  { id: 'invert', name: 'Invert', class: 'invert' },
  { id: 'warm', name: 'Warm', class: 'sepia-[0.3] saturate-[1.3] hue-rotate-[-10deg]' },
  { id: 'cool', name: 'Cool', class: 'saturate-[0.9] hue-rotate-[10deg] brightness-[1.05]' },
  { id: 'dramatic', name: 'Dramatic', class: 'contrast-[1.2] brightness-[0.9]' }
];

export const EMOJI_STICKERS = ["😃", "❤️", "⭐", "👍", "😎", "🎉", "🔥", "🚀", "💡", "💥", "❌", "🔒", "☀️", "👑", "👀", "🍀"];

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
  { id: 'sharpie', name: 'Sharpie' },
  { id: 'eraser', name: 'Eraser' },
  { id: 'path', name: 'Path' },
  { id: 'line', name: 'Line' },
  { id: 'arrow', name: 'Arrow' },
  { id: 'rectangle', name: 'Rectangle' },
  { id: 'ellipse', name: 'Ellipse' },
  { id: 'text', name: 'Text' }
];

export const DRAW_COLORS = ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#000000", "#FFFFFF"];

export function SettingsPanel({
  activeTab,
  adjustMode,
  setAdjustMode,
  scaleVal,
  setScaleVal,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  saturate,
  setSaturate,
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
  return (
    <div className="h-44 bg-white border-t border-gray-100 flex flex-col items-center justify-center px-8 shrink-0 space-y-4">
      {/* Tab Frame settings slider */}
      {activeTab === 'frame' && (
        <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-8 justify-center text-[10px] font-bold text-gray-500 select-none relative">
            <div className="flex flex-col items-center gap-1.5 relative">
              <span>color</span>
              <button 
                onClick={() => setShowFrameColorPicker(!showFrameColorPicker)}
                style={{ backgroundColor: frameColor }}
                className="w-5 h-5 rounded-full border border-gray-200 cursor-pointer shadow-sm"
              />
              {showFrameColorPicker && (
                <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-white border border-gray-100 p-2 rounded-xl flex gap-1.5 shadow-lg z-50">
                  {["#FFFFFF", "#000000", "#FF0000", "#0000FF", "#FFFF00", "#FF00FF"].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setFrameColor(c);
                        setShowFrameColorPicker(false);
                      }}
                      style={{ backgroundColor: c }}
                      className="w-4 h-4 rounded-full border border-gray-200 cursor-pointer"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-1">
              <span>size</span>
              <input 
                type="range" min="1" max="10" value={frameSize} 
                onChange={(e) => setFrameSize(Number(e.target.value))}
                className="w-16 h-1 accent-black" 
              />
              <span className="text-black font-black text-[9px]">{frameSize}%</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span>offset</span>
              <input 
                type="range" min="0" max="50" value={frameOffset1} 
                onChange={(e) => setFrameOffset1(Number(e.target.value))}
                className="w-16 h-1 accent-black" 
              />
              <span className="text-black font-black text-[9px]">{frameOffset1}%</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span>offset</span>
              <input 
                type="range" min="0" max="50" value={frameOffset2} 
                onChange={(e) => setFrameOffset2(Number(e.target.value))}
                className="w-16 h-1 accent-black" 
              />
              <span className="text-black font-black text-[9px]">{frameOffset2}%</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span>radius</span>
              <input 
                type="range" min="0" max="25" value={frameRadius} 
                onChange={(e) => setFrameRadius(Number(e.target.value))}
                className="w-16 h-1 accent-black" 
              />
              <span className="text-black font-black text-[9px]">{frameRadius}%</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span>amount</span>
              <input 
                type="range" min="1" max="5" value={frameAmount} 
                onChange={(e) => setFrameAmount(Number(e.target.value))}
                className="w-16 h-1 accent-black" 
              />
              <span className="text-black font-black text-[9px]">{frameAmount}</span>
            </div>
          </div>

          <div className="w-full flex items-center justify-center gap-2 overflow-x-auto pb-1 max-w-4xl">
            {FRAME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setActiveFrame(preset.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 border rounded-xl transition-all cursor-pointer ${
                  activeFrame === preset.id ? 'border-yellow-400 bg-yellow-50/50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="w-12 h-14 border border-gray-300 rounded bg-white flex items-center justify-center relative p-1.5">
                  {preset.id === 'none' && <span className="text-[7px] text-gray-300 uppercase">None</span>}
                  {preset.id === 'mat' && <div className="w-full h-full border-[3px] border-black bg-gray-50" />}
                  {preset.id === 'bevel' && <div className="w-full h-full border border-black shadow bg-gray-50" />}
                  {preset.id === 'line' && <div className="w-full h-full border border-black bg-gray-50" />}
                  {preset.id === 'zebra' && <div className="w-full h-full border-double border-4 border-black bg-gray-50" />}
                  {preset.id === 'lumber' && <div className="w-full h-full border-2 border-[#8B5A2B] bg-amber-50" />}
                  {preset.id === 'inset' && <div className="w-full h-full border border-dashed border-black bg-gray-50" />}
                  {preset.id === 'film' && <div className="w-full h-full border border-black bg-gray-50 flex flex-col justify-between"><div className="h-0.5 w-full bg-black" /><div className="h-0.5 w-full bg-black" /></div>}
                  {preset.id === 'hook' && <div className="w-full h-full border border-black bg-gray-50 rounded" />}
                  {preset.id === 'polaroid' && <div className="w-full h-full border border-gray-300 bg-white flex flex-col"><div className="flex-1 bg-gray-50 border border-gray-100" /><div className="h-2 w-full bg-white" /></div>}
                </div>
                <span className="text-[9px] font-black text-gray-500">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Draw settings slider */}
      {activeTab === 'draw' && (
        <div className="w-full flex flex-col items-center gap-3.5 animate-in fade-in duration-300">
          <div className="flex items-center gap-8 justify-center text-[10px] font-bold text-gray-500 select-none relative">
            <div className="flex items-center gap-2 relative">
              <span>color</span>
              <button 
                onClick={() => setShowColorDropdown(!showColorDropdown)}
                style={{ backgroundColor: drawColor }}
                className="w-5 h-5 rounded-full border border-gray-200 cursor-pointer shadow-sm"
              />
              {showColorDropdown && (
                <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-white border border-gray-100 p-2 rounded-xl flex gap-1.5 shadow-lg z-50">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setDrawColor(c);
                        setShowColorDropdown(false);
                      }}
                      style={{ backgroundColor: c }}
                      className="w-4 h-4 rounded-full border border-gray-200 cursor-pointer"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 relative">
              <span>line width</span>
              <button 
                onClick={() => setShowLineWidthDropdown(!showLineWidthDropdown)}
                className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-black font-black text-[9px] flex items-center gap-1 cursor-pointer"
              >
                {drawWidth === 4 ? 'Small' : drawWidth === 8 ? 'Medium' : 'Large'}
              </button>
              {showLineWidthDropdown && (
                <div className="absolute bottom-7 left-0 bg-white border border-gray-100 p-1.5 rounded-xl flex flex-col gap-1 shadow-lg z-50 min-w-[70px]">
                  <button onClick={() => { setDrawWidth(4); setShowLineWidthDropdown(false); }} className="px-2 py-1 text-left text-[9px] hover:bg-gray-50 font-bold">Small</button>
                  <button onClick={() => { setDrawWidth(8); setShowLineWidthDropdown(false); }} className="px-2 py-1 text-left text-[9px] hover:bg-gray-50 font-bold">Medium</button>
                  <button onClick={() => { setDrawWidth(12); setShowLineWidthDropdown(false); }} className="px-2 py-1 text-left text-[9px] hover:bg-gray-50 font-bold">Large</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-full border border-gray-100 text-[10px] font-bold text-gray-500 gap-1.5">
            {DRAW_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveDrawTool(tool.id);
                  setTextPosition(null);
                }}
                className={`px-5 py-1.5 rounded-full cursor-pointer transition-all ${
                  activeDrawTool === tool.id 
                    ? 'bg-neutral-800 text-white font-black shadow-sm' 
                    : 'hover:text-black hover:bg-gray-50/50'
                }`}
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size tab */}
      {activeTab === 'size' && (
        <div className="w-full flex flex-col items-center space-y-3 animate-in fade-in duration-300">
          {adjustMode === 'rotation' ? (
            <div className="flex items-center gap-1.5 text-gray-300 font-mono text-[9px] select-none">
              <span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span>
              <span className="text-gray-400 font-bold text-[10px] mx-2">0°</span>
              <span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span>
            </div>
          ) : (
            <div className="w-full max-w-xs flex items-center gap-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">Scale</span>
              <input 
                type="range" min="0.5" max="2.5" step="0.05" value={scaleVal} 
                onChange={(e) => setScaleVal(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <span className="text-[9px] font-bold text-gray-700 shrink-0 w-8 text-right">{scaleVal.toFixed(2)}x</span>
            </div>
          )}
          
          <div className="flex bg-gray-50 border border-gray-100/80 p-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
            <button 
              onClick={() => setAdjustMode('rotation')}
              className={`px-6 py-1.5 rounded-full cursor-pointer transition-all ${
                adjustMode === 'rotation' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black'
              }`}
            >
              Rotation
            </button>
            <button 
              onClick={() => setAdjustMode('scale')}
              className={`px-6 py-1.5 rounded-full cursor-pointer transition-all ${
                adjustMode === 'scale' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black'
              }`}
            >
              Scale
            </button>
          </div>
        </div>
      )}

      {/* Finetune tab */}
      {activeTab === 'finetune' && (
        <div className="w-full max-w-md grid grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase">
              <span>Brightness</span>
              <span>{brightness}%</span>
            </div>
            <input 
              type="range" min="50" max="150" value={brightness} 
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase">
              <span>Contrast</span>
              <span>{contrast}%</span>
            </div>
            <input 
              type="range" min="50" max="150" value={contrast} 
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase">
              <span>Saturate</span>
              <span>{saturate}%</span>
            </div>
            <input 
              type="range" min="50" max="150" value={saturate} 
              onChange={(e) => setSaturate(Number(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>
        </div>
      )}

      {/* Filter tab */}
      {activeTab === 'filter' && (
        <div className="w-full flex items-center justify-center gap-3 overflow-x-auto pb-1 max-w-2xl animate-in fade-in duration-300">
          {FILTER_PRESETS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex flex-col items-center gap-1 shrink-0 p-1.5 border rounded-xl transition-all cursor-pointer ${
                activeFilter === filter.id ? 'border-black bg-black/5' : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="w-11 h-11 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                <img src={imageUrl} className={`w-full h-full object-cover ${filter.class}`} alt={filter.name} />
              </div>
              <span className="text-[8px] font-black text-gray-600 tracking-tight">{filter.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sticker tab */}
      {activeTab === 'sticker' && (
        <div className="w-full flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-2xl">
            {EMOJI_STICKERS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleAddSticker(emoji)}
                className="text-2xl hover:scale-125 transition-transform p-1.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm cursor-pointer shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Click emoji to add. Drag to position.</span>
        </div>
      )}

      {/* Censure tab */}
      {activeTab === 'censure' && (
        <div className="w-full flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <button
            onClick={handleAddCensure}
            className="px-6 py-2 rounded-xl bg-black text-yellow-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-800 transition-all cursor-pointer shadow-md"
          >
            <Plus size={12} /> Add Censure Box
          </button>
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
            Drag box to position. Drag yellow dot to resize.
          </span>
        </div>
      )}

      {/* Resize tab */}
      {activeTab === 'resize' && (
        <div className="w-full max-w-md flex items-center justify-between gap-6 animate-in fade-in duration-300">
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-gray-500 uppercase">
            <input
              type="checkbox"
              checked={keepRatio}
              onChange={(e) => setKeepRatio(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            <span>Keep ratio</span>
          </label>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-gray-400">W:</span>
              <input
                type="number"
                value={resizeWidth}
                onChange={(e) => handleResizeWidthChange(Number(e.target.value))}
                className="w-16 px-1.5 py-1 text-xs border border-gray-100 rounded-lg text-center font-bold focus:outline-none focus:border-black"
              />
            </div>
            <span className="text-gray-300 text-xs">×</span>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-gray-400">H:</span>
              <input
                type="number"
                value={resizeHeight}
                onChange={(e) => handleResizeHeightChange(Number(e.target.value))}
                className="w-16 px-1.5 py-1 text-xs border border-gray-100 rounded-lg text-center font-bold focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
            Original: {imgSize.w} × {imgSize.h} px
          </span>
        </div>
      )}
    </div>
  );
}
