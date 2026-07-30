import React, { useState } from 'react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { FINETUNE_FIELDS } from '../../constants/video-editor';

const FIELD_LABELS = {
  brightness: 'Độ sáng',
  contrast: 'Tương phản',
  saturation: 'Bão hòa'
};

export default function FinetunePanel() {
  const { adjustments, setAdjustments } = useVideoEditor();
  const [activeField, setActiveField] = useState(FINETUNE_FIELDS[0]);

  const handleChange = (value) => {
    setAdjustments((prev) => ({ ...prev, [activeField]: Number(value) }));
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-white">Tinh chỉnh (Finetune)</h3>

      <div className="flex items-center gap-2 flex-wrap">
        {FINETUNE_FIELDS.map((field) => (
          <button
            key={field}
            type="button"
            onClick={() => setActiveField(field)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeField === field
                ? 'bg-lime-400 text-black'
                : 'bg-gray-850 text-gray-400 hover:text-gray-200 border border-gray-800'
            }`}
          >
            {FIELD_LABELS[field]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 w-20 shrink-0">{FIELD_LABELS[activeField]}</span>
        <input
          type="range"
          min="-100"
          max="100"
          value={adjustments[activeField] || 0}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 accent-lime-400 cursor-pointer"
        />
        <span className="text-xs font-mono text-gray-300 w-10 text-right">{adjustments[activeField] || 0}</span>
      </div>
    </div>
  );
}
