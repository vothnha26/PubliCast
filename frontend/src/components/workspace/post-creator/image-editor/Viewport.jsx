import * as React from "react";
import { Focus, Check, X, Trash2 } from "lucide-react";

export function Viewport({
  cropBox,
  activeTab,
  activeDrawTool,
  textPosition,
  textInputVal,
  setTextInputVal,
  handleAddText,
  setTextPosition,
  drawCanvasRef,
  handleDrawStart,
  handleDrawMove,
  handleDrawEnd,
  stickers,
  activeStickerId,
  handleStickerMouseDown,
  handleResizeSticker,
  handleRemoveSticker,
  censures,
  activeCensureId,
  handleCensureMouseDown,
  handleResizeCensure,
  handleRemoveCensure,
  activeFrame,
  frameColor,
  frameSize,
  frameOffset1 = 0,
  frameRadius,
  handleImageMouseDown,
  handleCornerMouseDown,
  imageUrl,
  imageStyle,
  filterClass,
  stretchStyle,
  adjustments = {}
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-12 relative overflow-auto bg-[#F9F9F8]">
      
      {/* Sizable Photo Box Wrapper with Border frame styled */}
      <div 
        style={{ width: `${cropBox.width}px`, height: `${cropBox.height}px` }}
        className="relative shadow-2xl transition-all duration-75 bg-black/5"
      >
        {/* 4 Corner Drag Handles (Always active for free stretching/scaling) */}
        <button 
          onMouseDown={(e) => handleCornerMouseDown(e, 'tl')}
          className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-black border-2 border-white z-40 cursor-nwse-resize shadow-md"
        />
        <button 
          onMouseDown={(e) => handleCornerMouseDown(e, 'tr')}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-black border-2 border-white z-40 cursor-nesw-resize shadow-md"
        />
        <button 
          onMouseDown={(e) => handleCornerMouseDown(e, 'bl')}
          className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-black border-2 border-white z-40 cursor-nesw-resize shadow-md"
        />
        <button 
          onMouseDown={(e) => handleCornerMouseDown(e, 'br')}
          className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-black border-2 border-white z-40 cursor-nwse-resize shadow-md"
        />

        {/* Center Focus Selection Indicator (Only show in size tab) */}
        {activeTab === 'size' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-black z-30 border border-gray-100 pointer-events-none">
            <Focus size={20} />
          </div>
        )}

        {/* Text Tool Input Box */}
        {textPosition && activeTab === 'draw' && activeDrawTool === 'text' && (
          <div 
            style={{ left: `${textPosition.x}px`, top: `${textPosition.y}px` }}
            className="absolute z-50 bg-white border border-gray-200 p-2 shadow-lg rounded-xl flex items-center gap-1.5"
          >
            <input 
              type="text" 
              placeholder="Enter text..." 
              value={textInputVal}
              onChange={(e) => setTextInputVal(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-100 rounded-lg focus:outline-none focus:border-black font-bold"
            />
            <button 
              onClick={handleAddText}
              className="p-1 bg-black text-white hover:bg-neutral-800 rounded-lg"
            >
              <Check size={12} />
            </button>
            <button 
              onClick={() => setTextPosition(null)}
              className="p-1 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Stretching preview container */}
        <div style={stretchStyle} className="w-full h-full absolute inset-0 overflow-hidden">
          {/* Draw Canvas Overlay */}
          <canvas
            ref={drawCanvasRef}
            width={cropBox.width}
            height={cropBox.height}
            onMouseDown={handleDrawStart}
            onMouseMove={handleDrawMove}
            onMouseUp={handleDrawEnd}
            onMouseLeave={handleDrawEnd}
            className={`absolute inset-0 z-30 w-full h-full ${
              activeTab === 'draw' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
            }`}
          />

          {/* Stickers Render Overlay */}
          <div className="absolute inset-0 z-30 w-full h-full pointer-events-none overflow-hidden">
            {stickers.map((st) => (
              <div
                key={st.id}
                onMouseDown={(e) => handleStickerMouseDown(e, st.id)}
                style={{ 
                  left: `calc(50% + ${st.x}px)`, 
                  top: `calc(50% + ${st.y}px)`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${st.size}px`
                }}
                className={`pointer-events-auto select-none cursor-move absolute flex items-center justify-center p-1 border ${
                  activeStickerId === st.id ? 'border-dashed border-black bg-white/40 rounded-lg' : 'border-transparent'
                }`}
              >
                <span>{st.emoji}</span>
                {activeStickerId === st.id && (
                  <div className="absolute -top-6 -right-6 flex gap-1 z-50 scale-75">
                    <button
                      onClick={() => handleResizeSticker(st.id, 5)}
                      className="w-5 h-5 rounded bg-black text-white flex items-center justify-center text-[10px] font-black"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleResizeSticker(st.id, -5)}
                      className="w-5 h-5 rounded bg-black text-white flex items-center justify-center text-[10px] font-black"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleRemoveSticker(st.id)}
                      className="w-5 h-5 rounded bg-red-600 text-white flex items-center justify-center"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Censure Render Overlay */}
          <div className="absolute inset-0 z-30 w-full h-full pointer-events-none overflow-hidden">
            {censures.map((c) => (
              <div
                key={c.id}
                onMouseDown={(e) => handleCensureMouseDown(e, c.id)}
                style={{ 
                  left: `calc(50% + ${c.x}px)`, 
                  top: `calc(50% + ${c.y}px)`,
                  width: `${c.w}px`,
                  height: `${c.h}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`pointer-events-auto select-none cursor-move absolute border ${
                  activeCensureId === c.id ? 'border-2 border-yellow-400 bg-black/90' : 'border-black bg-black'
                } flex items-center justify-center shadow-lg`}
              >
                <span className="text-[7px] font-black text-white tracking-widest uppercase opacity-75">CENSURE</span>
                {activeCensureId === c.id && (
                  <>
                    <div 
                      onMouseDown={(e) => handleResizeCensure(e, c.id)}
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full cursor-se-resize border border-white"
                    />
                    <button
                      onClick={() => handleRemoveCensure(c.id)}
                      className="absolute -top-6 -right-2 p-1 rounded bg-red-600 text-white z-50 flex items-center justify-center"
                    >
                      <Trash2 size={8} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Simulated frame styling on viewport */}
          {activeFrame !== 'none' && (
            <div 
              style={{ 
                inset: `${frameOffset1 || 0}%`,
                borderColor: activeFrame === 'lumber' ? '#8B5A2B' : frameColor,
                borderWidth: `${Math.max(1, frameSize)}px`,
                borderRadius: activeFrame === 'hook' ? '12px' : '0px'
              }}
              className={`absolute z-20 pointer-events-none transition-all duration-150 ${
                activeFrame === 'inset' ? 'border-dashed' : 'border-solid'
              } ${
                activeFrame === 'bevel' ? 'shadow-inner border-gray-800' : ''
              } ${
                activeFrame === 'zebra' ? 'border-double' : ''
              } ${
                activeFrame === 'mat' ? 'border-4' : ''
              } ${
                activeFrame === 'film' ? 'border-x-0 border-y-4 border-black' : ''
              } ${
                activeFrame === 'polaroid' ? 'border-b-[24px] border-white shadow-md' : ''
              }`}
            />
          )}

          {/* Actual Image within clipping container with drag handler */}
          <div 
            onMouseDown={handleImageMouseDown}
            className="w-full h-full overflow-hidden flex items-center justify-center relative select-none"
          >
            <img 
              src={imageUrl} 
              style={imageStyle}
              className={`w-full h-full object-cover select-none ${filterClass}`}
              alt="Main viewport preview" 
              draggable={false}
            />
            {adjustments?.vignette !== undefined && Math.abs(adjustments.vignette) > 0 && (
              <div 
                style={{ 
                  background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${Math.min(0.9, Math.abs(adjustments.vignette) / 50)}) 100%)` 
                }}
                className="absolute inset-0 z-15 pointer-events-none" 
              />
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
