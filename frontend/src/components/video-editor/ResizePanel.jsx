import React, { useState, useRef } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';

export default function ResizePanel() {
  const { resize, setResize, setIsResizeDirty, videoRatio } = useVideoEditor();
  const [isAspectLocked, setIsAspectLocked] = useState(true);
  const lastEditedRef = useRef('width');

  const widthVal = resize.width ?? 576;
  const heightVal = resize.height ?? 1024;

  const applyChange = (field, value) => {
    const num = value === '' ? null : Number(value);
    lastEditedRef.current = field;
    setIsResizeDirty(true);

    setResize((prev) => {
      const next = { ...prev, [field]: num };
      if (isAspectLocked && num) {
        const ratio = videoRatio || 9 / 16;
        if (field === 'width') {
          next.height = Math.round(num / ratio);
        } else {
          next.width = Math.round(num * ratio);
        }
      }
      return next;
    });
  };

  return (
    <div className="w-full flex items-center justify-center py-2 select-none font-sans">
      <div className="flex items-center gap-3">
        {/* Width Input Pill */}
        <div className="flex items-center justify-between bg-gray-200/70 border border-gray-300 rounded-xl px-4 py-1.5 w-32 shadow-inner transition hover:border-gray-400">
          <input
            type="number"
            value={widthVal}
            onChange={(e) => applyChange('width', e.target.value)}
            className="w-16 bg-transparent text-sm font-semibold text-gray-800 text-center focus:outline-none"
          />
          <span className="text-xs font-bold text-gray-500">W</span>
        </div>

        {/* Lock Aspect Ratio Toggle Button */}
        <button
          type="button"
          onClick={() => setIsAspectLocked((prev) => !prev)}
          className={`p-2 rounded-xl transition cursor-pointer ${
            isAspectLocked ? 'text-black bg-gray-200/80 shadow-sm' : 'text-gray-400 hover:text-black hover:bg-gray-100'
          }`}
          title={isAspectLocked ? 'Đang khóa tỉ lệ khung hình' : 'Tỉ lệ khung hình tự do'}
        >
          {isAspectLocked ? <Lock size={15} strokeWidth={2.2} /> : <Unlock size={15} strokeWidth={2.2} />}
        </button>

        {/* Height Input Pill */}
        <div className="flex items-center justify-between bg-gray-200/70 border border-gray-300 rounded-xl px-4 py-1.5 w-32 shadow-inner transition hover:border-gray-400">
          <input
            type="number"
            value={heightVal}
            onChange={(e) => applyChange('height', e.target.value)}
            className="w-16 bg-transparent text-sm font-semibold text-gray-800 text-center focus:outline-none"
          />
          <span className="text-xs font-bold text-gray-500">H</span>
        </div>
      </div>
    </div>
  );
}
