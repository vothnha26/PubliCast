import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { FILTER_PRESETS } from '../../constants/video-editor';
import { useDragScroll } from '../../hooks/useDragScroll';

export default function FilterPanel() {
  const { filterPreset, setFilterPreset, videoUrl } = useVideoEditor();
  const { scrollRef, dragHandlers, scrollByAmount } = useDragScroll();

  return (
    <div className="w-full flex items-center justify-center py-2 select-none">
      <div className="relative w-full flex items-center justify-center px-4">
        {/* Left Arrow Button */}
        <button
          onClick={() => scrollByAmount(-240)}
          className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 mr-1"
          title="Cuộn sang trái"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Scrollable Container (Native Scrollbar Completely Hidden + Mouse Drag-Scrubbing) */}
        <div
          ref={scrollRef}
          {...dragHandlers}
          className="flex-1 flex items-center gap-3 overflow-x-auto py-1 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {FILTER_PRESETS.map((filter) => {
            const isSelected = filterPreset === filter.backendPreset || (filterPreset === 'none' && filter.id === 'default');
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setFilterPreset(filter.backendPreset)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                {/* Thumbnail Container */}
                <div
                  className={`w-16 h-16 rounded-xl overflow-hidden shadow-sm transition-all duration-150 border-2 ${
                    isSelected
                      ? 'border-black ring-2 ring-black/20 scale-105'
                      : 'border-transparent group-hover:scale-105 group-hover:border-gray-300'
                  }`}
                >
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      style={{ filter: filter.filterCss }}
                      className="w-full h-full object-cover pointer-events-none"
                      muted
                    />
                  ) : (
                    <div
                      style={{ filter: filter.filterCss }}
                      className="w-full h-full bg-gradient-to-br from-amber-400 via-emerald-500 to-indigo-600"
                    />
                  )}
                </div>

                {/* Filter Label */}
                <span className={`text-[11px] font-medium transition ${isSelected ? 'text-black font-bold' : 'text-muted-foreground group-hover:text-black'}`}>
                  {filter.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => scrollByAmount(240)}
          className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 ml-1"
          title="Cuộn sang phải"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
