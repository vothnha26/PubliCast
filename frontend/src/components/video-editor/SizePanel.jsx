import React from 'react';
import { useVideoEditor } from '../../context/VideoEditorContext';

export default function SizePanel() {
  const {
    rotation, setRotation,
    scaleVal, setScaleVal,
    activeSizeSubTab, setActiveSizeSubTab,
    videoDimensions
  } = useVideoEditor();

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 py-2 select-none relative">
      {/* Rotation Dial Slider / Ticks */}
      {activeSizeSubTab === 'rotation' ? (
        <div className="flex flex-col items-center gap-1.5 w-full max-w-lg">
          <div className="relative w-full flex items-center justify-center">
            {/* Range slider styled like degree ticks */}
            <input
              type="range"
              min="-180"
              max="180"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          {/* Degree Indicator */}
          <span className="text-xs font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            {rotation > 0 ? `+${rotation}°` : `${rotation}°`}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 w-full max-w-lg">
          <div className="relative w-full flex items-center justify-center">
            <input
              type="range"
              min="50"
              max="200"
              value={scaleVal}
              onChange={(e) => setScaleVal(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          <span className="text-xs font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            {scaleVal}%
          </span>
        </div>
      )}

      {/* Sub-tab Pill: Rotation vs Scale */}
      <div className="flex items-center justify-center bg-muted p-0.5 rounded-full border border-border text-xs font-semibold">
        <button
          onClick={() => setActiveSizeSubTab('rotation')}
          className={`px-4 py-1 rounded-full transition cursor-pointer ${
            activeSizeSubTab === 'rotation'
              ? 'bg-gray-300 text-black font-extrabold shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Rotation
        </button>

        <button
          onClick={() => setActiveSizeSubTab('scale')}
          className={`px-4 py-1 rounded-full transition cursor-pointer ${
            activeSizeSubTab === 'scale'
              ? 'bg-gray-300 text-black font-extrabold shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Scale
        </button>
      </div>

      {/* Resolution Indicator Text (bottom right) */}
      <div className="absolute right-4 bottom-2 text-xs font-mono font-semibold text-muted-foreground">
        {videoDimensions.width || 576} × {videoDimensions.height || 1024}
      </div>
    </div>
  );
}
