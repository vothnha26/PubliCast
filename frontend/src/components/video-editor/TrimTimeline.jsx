import React, { useRef, useState, useEffect } from 'react';
import { useVideoEditor } from '../../context/VideoEditorContext';

/**
 * TrimTimeline — thước thời gian + filmstrip với frame xem trước + tay cầm trim vàng.
 */
export default function TrimTimeline() {
  const { videoRef, videoUrl, duration, trimRange, setTrimRange, splitPoints, setSplitPoints } = useVideoEditor();

  const trackRef          = useRef(null);
  const isDraggingStart   = useRef(false);
  const isDraggingEnd     = useRef(false);
  const [playPct, setPlayPct] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);

  // ─── Frame Thumbnail Extraction ───────────────────────────────────────────
  useEffect(() => {
    if (!videoUrl || !duration || duration <= 0) return;

    let isCancelled = false;
    const count = 10;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 80;
    canvas.height = 45;

    const tempVideo = document.createElement('video');
    tempVideo.src = videoUrl;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;

    const extracted = [];

    const captureFrameAt = (index) => {
      if (isCancelled) return;
      if (index >= count) {
        setThumbnails(extracted);
        return;
      }

      const targetTime = (index / (count - 1)) * (duration * 0.95);
      tempVideo.currentTime = targetTime;
    };

    const onSeeked = () => {
      if (isCancelled) return;
      try {
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.6);
        extracted.push(dataUri);
        setThumbnails([...extracted]);
      } catch (err) {
        console.warn('Could not extract frame thumbnail:', err);
      }
      captureFrameAt(extracted.length);
    };

    tempVideo.addEventListener('seeked', onSeeked);

    tempVideo.addEventListener('loadeddata', () => {
      captureFrameAt(0);
    });

    return () => {
      isCancelled = true;
      tempVideo.removeEventListener('seeked', onSeeked);
    };
  }, [videoUrl, duration]);

  // ─── sync playhead pct ─────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onUpdate = () => setPlayPct(duration ? (v.currentTime / duration) * 100 : 0);
    v.addEventListener('timeupdate', onUpdate);
    return () => v.removeEventListener('timeupdate', onUpdate);
  }, [videoRef, duration]);

  // ─── init end = duration ───────────────────────────────────────────────────
  useEffect(() => {
    if (duration && trimRange.end === 0) {
      setTrimRange(p => ({ ...p, end: duration }));
    }
  }, [duration]);

  // ─── clean split points outside trim range ─────────────────────────────────
  useEffect(() => {
    setSplitPoints(p => {
      const f = p.filter(t => t > trimRange.start && t < trimRange.end);
      return f.length === p.length ? p : f;
    });
  }, [trimRange.start, trimRange.end]);

  // ─── drag logic ────────────────────────────────────────────────────────────
  const startDrag = (type, e) => {
    e.preventDefault();
    if (type === 'start') isDraggingStart.current = true;
    else                  isDraggingEnd.current   = true;

    const onMove = (mv) => {
      if (!trackRef.current || !duration) return;
      const rect = trackRef.current.getBoundingClientRect();
      let t = ((mv.clientX - rect.left) / rect.width) * duration;
      t = Math.max(0, Math.min(duration, t));
      setTrimRange(prev => {
        if (isDraggingStart.current && t < prev.end - 0.5) {
          if (videoRef.current) videoRef.current.currentTime = t;
          return { ...prev, start: t };
        }
        if (isDraggingEnd.current && t > prev.start + 0.5) {
          if (videoRef.current) videoRef.current.currentTime = t;
          return { ...prev, end: t };
        }
        return prev;
      });
    };

    const onUp = () => {
      isDraggingStart.current = false;
      isDraggingEnd.current   = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // click on ruler → seek
  const handleRulerClick = (e) => {
    if (!trackRef.current || !duration) return;
    const rect = trackRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration));
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const startPct = duration ? (trimRange.start / duration) * 100 : 0;
  const endPct   = duration ? (trimRange.end   / duration) * 100 : 100;

  // ─── ruler ticks ──────────────────────────────────────────────────────────
  const rulerTicks = duration
    ? [0, 0.25, 0.5, 0.75, 1].map(r => ({ pct: r * 100, label: fmt(r * duration) }))
    : [];

  return (
    <div className="w-full flex flex-col gap-1 select-none px-1">
      {/* ── Time ruler ─────────────────────────────────────────────────── */}
      <div className="relative h-5 w-full">
        {rulerTicks.map(({ pct, label }) => (
          <span
            key={pct}
            style={{ left: `${pct}%`, transform: pct === 0 ? 'none' : pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}
            className="absolute bottom-0 text-[10px] font-mono text-gray-400"
          >
            {label}
          </span>
        ))}

        {/* playhead label in ruler */}
        {duration > 0 && (
          <span
            style={{ left: `${playPct}%`, transform: 'translateX(-50%)' }}
            className="absolute bottom-0 px-1 py-0.5 bg-gray-900 text-white text-[9px] font-mono rounded pointer-events-none z-30"
          >
            {fmt((playPct / 100) * duration)}
          </span>
        )}
      </div>

      {/* ── Filmstrip track ─────────────────────────────────────────────── */}
      <div
        ref={trackRef}
        onClick={handleRulerClick}
        className="relative h-14 w-full bg-gray-950 rounded-lg overflow-hidden cursor-pointer flex"
      >
        {/* Real Video Frame Thumbnails Filmstrip */}
        {thumbnails.length > 0 ? (
          <div className="absolute inset-0 flex overflow-hidden rounded-lg">
            {thumbnails.map((src, i) => (
              <div key={i} className="flex-1 h-full overflow-hidden border-r border-gray-900/40">
                <img src={src} alt={`frame-${i}`} className="w-full h-full object-cover opacity-90" />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex overflow-hidden rounded-lg">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-gray-800 bg-gradient-to-b from-gray-800/40 via-gray-900/60 to-gray-950"
              />
            ))}
          </div>
        )}

        {/* Active trim overlay (highlight between handles) */}
        {duration > 0 && (
          <div
            className="absolute top-0 h-full border-y-2 border-yellow-400 pointer-events-none z-10 bg-yellow-400/10"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />
        )}

        {/* Playhead pin */}
        {duration > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-black z-20 pointer-events-none"
            style={{ left: `${playPct}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-black -ml-[4px] -mt-1 shadow-md border border-white" />
          </div>
        )}

        {/* Split markers */}
        {duration > 0 && splitPoints.map(sp => (
          <div
            key={sp}
            style={{ left: `${(sp / duration) * 100}%` }}
            className="absolute top-0 h-full w-0.5 bg-indigo-400 z-20 cursor-pointer"
            onClick={e => { e.stopPropagation(); setSplitPoints(p => p.filter(x => x !== sp)); }}
          />
        ))}

        {/* ── START handle ─── */}
        {duration > 0 && (
          <div
            onMouseDown={e => startDrag('start', e)}
            style={{ left: `${startPct}%` }}
            className="absolute top-0 h-full w-3.5 bg-yellow-400 hover:bg-yellow-300 rounded-l-md cursor-ew-resize z-30 flex items-center justify-center -translate-x-full shadow-md"
            title="Trim start"
          >
            <div className="w-0.5 h-5 bg-yellow-800/70 rounded-full" />
          </div>
        )}

        {/* ── END handle ─── */}
        {duration > 0 && (
          <div
            onMouseDown={e => startDrag('end', e)}
            style={{ left: `${endPct}%` }}
            className="absolute top-0 h-full w-3.5 bg-yellow-400 hover:bg-yellow-300 rounded-r-md cursor-ew-resize z-30 flex items-center justify-center shadow-md"
            title="Trim end"
          >
            <div className="w-0.5 h-5 bg-yellow-800/70 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
