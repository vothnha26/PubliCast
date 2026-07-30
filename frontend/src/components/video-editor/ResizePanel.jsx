import React, { useState, useRef } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';

export default function ResizePanel() {
  const { resize, setResize, setIsResizeDirty, videoRatio } = useVideoEditor();
  const [isAspectLocked, setIsAspectLocked] = useState(true);
  const lastEditedRef = useRef('width');

  const applyChange = (field, value) => {
    const num = value === '' ? null : Number(value);
    lastEditedRef.current = field;
    setIsResizeDirty(true);

    setResize((prev) => {
      const next = { ...prev, [field]: num };
      if (isAspectLocked && num) {
        const ratio = videoRatio || 16 / 9;
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
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-white">Đổi kích thước (Resize)</h3>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-gray-850 px-3 py-2 rounded-xl border border-gray-800 flex-1">
          <span className="text-xs text-gray-400">W:</span>
          <input
            type="number"
            value={resize.width ?? ''}
            onChange={(e) => applyChange('width', e.target.value)}
            className="w-full bg-transparent text-sm font-mono text-white text-center focus:outline-none"
            placeholder="auto"
          />
          <span className="text-xs text-gray-500">px</span>
        </div>

        <button
          type="button"
          onClick={() => setIsAspectLocked((prev) => !prev)}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isAspectLocked ? 'bg-lime-400 text-black' : 'bg-gray-850 text-gray-400 border border-gray-800'
          }`}
          title={isAspectLocked ? 'Đang khóa tỉ lệ' : 'Tỉ lệ tự do'}
        >
          {isAspectLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center gap-1.5 bg-gray-850 px-3 py-2 rounded-xl border border-gray-800 flex-1">
          <span className="text-xs text-gray-400">H:</span>
          <input
            type="number"
            value={resize.height ?? ''}
            onChange={(e) => applyChange('height', e.target.value)}
            className="w-full bg-transparent text-sm font-mono text-white text-center focus:outline-none"
            placeholder="auto"
          />
          <span className="text-xs text-gray-500">px</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        Để trống cả hai để giữ nguyên kích thước gốc. Bật khóa để giữ tỉ lệ khung hình khi chỉnh 1 chiều.
      </p>
    </div>
  );
}
