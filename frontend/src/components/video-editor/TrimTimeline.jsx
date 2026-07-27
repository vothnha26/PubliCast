import React, { useRef, useState, useEffect } from 'react';
import { useVideoEditor } from '../../context/VideoEditorContext';

export default function TrimTimeline() {
  const {
    videoRef,
    duration,
    trimRange,
    setTrimRange
  } = useVideoEditor();

  const timelineRef = useRef(null);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  const isDraggingStartRef = useRef(false);
  const isDraggingEndRef = useRef(false);

  const handleTimelineMouseDown = (type, e) => {
    e.preventDefault();
    if (type === 'start') {
      setIsDraggingStart(true);
      isDraggingStartRef.current = true;
    } else {
      setIsDraggingEnd(true);
      isDraggingEndRef.current = true;
    }

    const handleMouseMove = (moveEvent) => {
      if (!timelineRef.current || !duration) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      let targetTime = (clickX / rect.width) * duration;
      targetTime = Math.max(0, Math.min(duration, targetTime));

      setTrimRange(prev => {
        if (isDraggingStartRef.current) {
          if (targetTime < prev.end - 0.5) {
            if (videoRef.current) videoRef.current.currentTime = targetTime;
            return { ...prev, start: targetTime };
          }
        } else if (isDraggingEndRef.current) {
          if (targetTime > prev.start + 0.5) {
            if (videoRef.current) videoRef.current.currentTime = targetTime;
            return { ...prev, end: targetTime };
          }
        }
        return prev;
      });
    };

    const handleMouseUp = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
      isDraggingStartRef.current = false;
      isDraggingEndRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Đồng bộ duration ban đầu khi load video
  useEffect(() => {
    if (duration && trimRange.end === 0) {
      setTrimRange(prev => ({ ...prev, end: duration }));
    }
  }, [duration, setTrimRange, trimRange.end]);

  return (
    <div className="bg-[#0E0E15] border border-gray-800/80 rounded-2xl p-5 space-y-4 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white">Cắt video (Trim Video)</h3>
        <div className="flex justify-between gap-6 text-xs font-mono text-gray-400">
          <span>Bắt đầu: {trimRange.start.toFixed(1)}s</span>
          <span>Thời lượng: {(trimRange.end - trimRange.start).toFixed(1)}s</span>
          <span>Kết thúc: {trimRange.end.toFixed(1)}s</span>
        </div>
      </div>

      {/* Timeline Slider Box */}
      <div 
        ref={timelineRef}
        className="relative h-7 bg-gray-850 rounded-xl border border-gray-800 overflow-visible cursor-pointer select-none"
      >
        {/* Selected Range Fill */}
        {duration > 0 && (
          <div 
            style={{ 
              left: `${(trimRange.start / duration) * 100}%`,
              width: `${((trimRange.end - trimRange.start) / duration) * 100}%` 
            }}
            className="absolute top-0 bottom-0 bg-lime-400/20 border-l border-r border-lime-400 z-0"
          />
        )}

        {/* Start Handle */}
        {duration > 0 && (
          <div 
            onMouseDown={(e) => handleTimelineMouseDown('start', e)}
            style={{ left: `${(trimRange.start / duration) * 100}%` }}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-7 rounded-lg cursor-ew-resize flex items-center justify-center shadow-lg border z-20 transition-all ${
              isDraggingStart ? 'bg-lime-300 border-lime-400 scale-105' : 'bg-lime-400 border-lime-500 hover:bg-lime-300'
            }`}
          >
            <div className="w-[2px] h-3 bg-black/45" />
          </div>
        )}

        {/* End Handle */}
        {duration > 0 && (
          <div 
            onMouseDown={(e) => handleTimelineMouseDown('end', e)}
            style={{ left: `${(trimRange.end / duration) * 100}%` }}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-7 rounded-lg cursor-ew-resize flex items-center justify-center shadow-lg border z-20 transition-all ${
              isDraggingEnd ? 'bg-lime-300 border-lime-400 scale-105' : 'bg-lime-400 border-lime-500 hover:bg-lime-300'
            }`}
          >
            <div className="w-[2px] h-3 bg-black/45" />
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-500 text-center">
        Mẹo: Nhấp và kéo các tay cầm màu xanh lá để khoanh vùng đoạn video bạn muốn cắt.
      </p>
    </div>
  );
}
