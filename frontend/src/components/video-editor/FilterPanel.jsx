import React from 'react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { FILTER_PRESETS } from '../../constants/video-editor';

export default function FilterPanel() {
  const { filterPreset, setFilterPreset } = useVideoEditor();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">Bộ lọc (Filter)</h3>
      <div className="grid grid-cols-3 gap-3">
        {FILTER_PRESETS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setFilterPreset(filter.backendPreset)}
            className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
              filterPreset === filter.backendPreset
                ? 'border-lime-400 bg-lime-400/5'
                : 'border-gray-800 hover:border-gray-700 bg-gray-900/50'
            }`}
          >
            <div
              className={`w-full aspect-square rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 ${filter.class}`}
            />
            <span className={`text-[11px] font-medium ${filterPreset === filter.backendPreset ? 'text-lime-400' : 'text-gray-400'}`}>
              {filter.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
