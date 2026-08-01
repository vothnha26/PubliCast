import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { useDragScroll } from '../../hooks/useDragScroll';

const FINETUNE_OPTIONS = [
  { key: 'brightness',  label: 'Brightness'  },
  { key: 'contrast',    label: 'Contrast'    },
  { key: 'saturation',  label: 'Saturation'  },
  { key: 'exposure',    label: 'Exposure'    },
  { key: 'temperature', label: 'Temperature' },
  { key: 'gamma',       label: 'Gamma'       },
  { key: 'clarity',     label: 'Clarity'     },
  { key: 'vignette',    label: 'Vignette'    },
];

export default function FinetunePanel() {
  const { adjustments, setAdjustments } = useVideoEditor();
  const [activeField, setActiveField] = useState('brightness');
  const { scrollRef, dragHandlers, scrollByAmount } = useDragScroll();

  const curVal = adjustments[activeField] ?? 0;

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setAdjustments((prev) => ({ ...prev, [activeField]: val }));
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 py-1 select-none">
      {/* Slider & Value Indicator */}
      <div className="w-full max-w-lg flex flex-col items-center gap-1.5 px-4">
        {/* Value badge indicator */}
        <div className="bg-black text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-md shadow-sm">
          {curVal > 0 ? `+${curVal}` : curVal}
        </div>

        {/* Range Slider with center tick mark */}
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min="-50"
            max="50"
            value={curVal}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
          {/* Center tick indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-400 pointer-events-none rounded-full" />
        </div>
      </div>

      {/* Pill Options with Drag-to-Scroll & Hidden Scrollbars */}
      <div className="relative w-full flex items-center justify-center px-4 mt-1">
        <button
          onClick={() => scrollByAmount(-200)}
          className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 mr-1"
          title="Cuộn sang trái"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={scrollRef}
          {...dragHandlers}
          className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-1 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {FINETUNE_OPTIONS.map(({ key, label }) => {
            const isSelected = activeField === key;
            const hasCustomValue = (adjustments[key] ?? 0) !== 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveField(key)}
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
          onClick={() => scrollByAmount(200)}
          className="w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted shrink-0 transition cursor-pointer z-10 ml-1"
          title="Cuộn sang phải"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
