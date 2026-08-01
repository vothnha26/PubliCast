import React, { useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Scissors } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { FILTER_PRESETS } from '../../constants/video-editor';

export default function VideoPreviewArea() {
  const {
    videoRef,
    videoUrl,
    setDuration,
    trimRange,
    textOverlays,
    activeOverlayId,
    subtitles,
    setVideoRatio,
    cropX, setCropX,
    keyframes,
    filterPreset,
    adjustments,
    setSplitPoints,
    zoomLevel,
    saveAudio,
    activeTab,
    rotation,
    scaleVal,
    flipH,
    flipV,
    setVideoDimensions
  } = useVideoEditor();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState(null);

  // Metadata handler
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setVideoRatio(v.videoWidth / v.videoHeight || 16 / 9);
    setVideoDimensions({ width: v.videoWidth || 576, height: v.videoHeight || 1024 });
  };

  // Sync video audio mute with saveAudio toggle if muted
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!saveAudio) {
      v.muted = true;
      setIsMuted(true);
    } else {
      v.muted = false;
      setIsMuted(false);
    }
  }, [saveAudio, videoRef]);

  // Time update loop
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onUpdate = () => {
      const cur = v.currentTime;
      const end = trimRange.end || v.duration || 10;
      if (cur >= end) v.currentTime = trimRange.start;
      if (keyframes.length > 0) {
        setCropX(interpolateCropX(cur) * 100);
      }
    };
    v.addEventListener('timeupdate', onUpdate);
    return () => v.removeEventListener('timeupdate', onUpdate);
  }, [videoRef, trimRange, keyframes]);

  // Subtitle sync
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !subtitles.length) { setActiveSubtitle(null); return; }
    const onUpdate = () => {
      const t = v.currentTime;
      setActiveSubtitle(subtitles.find(s => t >= s.startTime && t <= s.endTime) || null);
    };
    v.addEventListener('timeupdate', onUpdate);
    return () => v.removeEventListener('timeupdate', onUpdate);
  }, [videoRef, subtitles]);

  const interpolateCropX = (time) => {
    if (!keyframes.length) return cropX / 100;
    const s = [...keyframes].sort((a, b) => a.time - b.time);
    if (time <= s[0].time) return s[0].cropX;
    if (time >= s[s.length - 1].time) return s[s.length - 1].cropX;
    for (let i = 0; i < s.length - 1; i++) {
      if (time >= s[i].time && time <= s[i + 1].time) {
        const t = (time - s[i].time) / (s[i + 1].time - s[i].time);
        return s[i].cropX + (s[i + 1].cropX - s[i].cropX) * t;
      }
    }
    return cropX / 100;
  };

  const getFilterStyle = () => {
    let f = '';
    const presetObj = FILTER_PRESETS.find((p) => p.backendPreset === filterPreset || p.id === filterPreset);
    if (presetObj && presetObj.filterCss && presetObj.filterCss !== 'none') {
      f += presetObj.filterCss + ' ';
    }

    if (adjustments) {
      if (adjustments.brightness) f += `brightness(${100 + adjustments.brightness}%) `;
      if (adjustments.contrast) f += `contrast(${100 + adjustments.contrast}%) `;
      if (adjustments.saturation) f += `saturate(${100 + adjustments.saturation}%) `;
    }

    return f.trim() || 'none';
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); setIsPlaying(false); }
    else {
      const start = trimRange.start;
      const end   = trimRange.end || v.duration || 10;
      if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
      v.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSplit = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    if (t <= trimRange.start || t >= trimRange.end) return;
    setSplitPoints(prev => prev.includes(t) ? prev : [...prev, t].sort((a, b) => a - b));
  };

  const transformStyle = `scale(${zoomLevel / 100 * (scaleVal / 100)}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-card select-none">
      <div
        className="relative shadow-md rounded-xl overflow-visible bg-black transition-transform duration-150"
        style={{ transform: transformStyle }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          style={{ filter: getFilterStyle(), display: 'block', maxHeight: '42vh', maxWidth: '100%' }}
          className="object-contain rounded-xl"
        />

        {activeTab === 'TRIM' && (
          <>
            <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-black rounded-full shadow-md z-40 border-2 border-white cursor-nwse-resize" />
            <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-black rounded-full shadow-md z-40 border-2 border-white cursor-nesw-resize" />
            <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-black rounded-full shadow-md z-40 border-2 border-white cursor-nesw-resize" />
            <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-black rounded-full shadow-md z-40 border-2 border-white cursor-nwse-resize" />
          </>
        )}

        {textOverlays.map(ov => (
          <div
            key={ov.id}
            style={{
              left: `${ov.x}%`, top: `${ov.y}%`,
              color: ov.color || '#fff', fontSize: `${ov.size || 18}px`,
              transform: 'translate(-50%,-50%)'
            }}
            className={`absolute select-none font-bold whitespace-nowrap px-2 py-0.5 rounded z-30 ${
              activeOverlayId === ov.id ? 'ring-2 ring-yellow-400 bg-black/40' : ''
            }`}
          >
            {ov.text}
          </div>
        ))}

        {activeSubtitle && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/75 text-white text-sm font-medium rounded-lg max-w-[85%] text-center pointer-events-none z-30">
            {activeSubtitle.text}
          </div>
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-sm border border-border rounded-full flex items-center gap-1.5 px-2.5 py-1.5 shadow-lg z-40">
          <button
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-muted hover:bg-gray-200 flex items-center justify-center text-foreground cursor-pointer transition"
          >
            {isPlaying
              ? <Pause size={13} className="fill-gray-800" />
              : <Play size={13} className="fill-gray-800 ml-0.5" />}
          </button>

          <button
            onClick={toggleMute}
            className="w-7 h-7 rounded-full bg-muted hover:bg-gray-200 flex items-center justify-center text-foreground cursor-pointer transition"
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          <button
            onClick={handleSplit}
            className="flex items-center gap-1 pl-2 pr-3 py-1 rounded-full bg-muted hover:bg-gray-200 text-foreground text-[11px] font-semibold cursor-pointer transition"
          >
            <Scissors size={12} />
            <span>Split</span>
          </button>
        </div>
      </div>
    </div>
  );
}
