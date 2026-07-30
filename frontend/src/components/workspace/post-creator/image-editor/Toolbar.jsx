import * as React from "react";
import { Undo2, RotateCw, RotateCcw } from "lucide-react";

export function Toolbar({
  scaleVal,
  flipH,
  flipV,
  canUndo,
  canRedo,
  handleUndo,
  handleRedo,
  handleReset,
  handleZoomOut,
  handleZoomIn,
  handleRotate90,
  handleFlipH,
  handleFlipV
}) {
  return (
    <div className="h-14 flex items-center justify-between border-b border-gray-100/50 bg-white px-8 shrink-0 select-none">
      {/* Reset History Icon */}
      <button
        onClick={handleReset}
        title="Reset modifications"
        className="p-2 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-black transition-all cursor-pointer"
      >
        <RotateCcw size={16} />
      </button>

      {/* Central adjustments group (Undo/Redo & Zoom ratio) */}
      <div className="flex items-center gap-6">
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Hoàn tác)"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canUndo ? 'text-gray-700 hover:text-black hover:bg-white' : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <Undo2 size={14} />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Làm lại)"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer rotate-180 ${
              canRedo ? 'text-gray-700 hover:text-black hover:bg-white' : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <Undo2 size={14} />
          </button>
        </div>

        <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100 text-[10px] font-black text-gray-600">
          <button onClick={handleZoomOut} className="px-2.5 py-1 hover:bg-white rounded-md cursor-pointer" title="Thu nhỏ">-</button>
          <span className="px-3 min-w-[48px] text-center">{Math.round(scaleVal * 100)}%</span>
          <button onClick={handleZoomIn} className="px-2.5 py-1 hover:bg-white rounded-md cursor-pointer" title="Phóng to">+</button>
        </div>
      </div>

      {/* Transform action icons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRotate90}
          title="Rotate 90°"
          className="p-2 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 text-gray-700 transition-all cursor-pointer"
        >
          <RotateCw size={14} />
        </button>

        <button
          type="button"
          onClick={handleFlipH}
          title="Flip Horizontal"
          className={`p-2 border rounded-xl transition-all cursor-pointer ${
            flipH ? 'border-black bg-black/5 text-black' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l-4-4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleFlipV}
          title="Flip Vertical"
          className={`p-2 border rounded-xl transition-all cursor-pointer ${
            flipV ? 'border-black bg-black/5 text-black' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8v12m0 0l-4-4m4 4l-4 4m6 0V4m0 0l4 4m-4-4l-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
