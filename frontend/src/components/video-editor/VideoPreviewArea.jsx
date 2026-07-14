import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { ASPECT_RATIOS } from '../../constants/video-editor';

export default function VideoPreviewArea() {
  const {
    videoRef,
    videoUrl,
    duration, setDuration,
    aspectRatio,
    trimRange,
    bgMusic,
    textOverlays,
    setTextOverlays,
    activeOverlayId,
    setActiveOverlayId,
    subtitles,
    videoRatio, setVideoRatio,
    cropX, setCropX,
    keyframes, setKeyframes,
    isPreviewMode, setIsPreviewMode
  } = useVideoEditor();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioPreviewRef = useRef(null);
  const videoContainerRef = useRef(null);
  const progressBarRef = useRef(null);
  const timeDisplayRef = useRef(null);

  // Lấy Metadata khi video loaded
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setVideoRatio(video.videoWidth / video.videoHeight || 16/9);
  };

  // Sync background music và auto-loop trong trim range + nội suy cropX
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const start = trimRange.start;
      const end = trimRange.end || video.duration || 10;

      // 1. Cập nhật DOM trực tiếp cho Progress Bar
      if (progressBarRef.current) {
        const pct = (current / video.duration) * 100 || 0;
        progressBarRef.current.style.width = `${pct}%`;
      }

      // 2. Cập nhật DOM trực tiếp cho Time Display
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = `${formatTime(current)} / ${formatTime(video.duration || 0)}`;
      }

      // 3. Nội suy vị trí CropX nếu có keyframes
      if (keyframes.length > 0) {
        const interpolated = interpolateCropX(current);
        setCropX(interpolated * 100);
      }

      // 4. Đồng bộ nhạc nền
      if (audioPreviewRef.current && isPlaying) {
        const musicTime = Math.max(0, current - start);
        if (Math.abs(audioPreviewRef.current.currentTime - musicTime) > 0.3) {
          audioPreviewRef.current.currentTime = musicTime;
        }
        if (audioPreviewRef.current.paused) {
          audioPreviewRef.current.play().catch(() => {});
        }
      }

      // 5. Tự động lặp lại trong khoảng Trim
      if (current >= end) {
        video.currentTime = start;
        if (audioPreviewRef.current) {
          audioPreviewRef.current.currentTime = 0;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef, trimRange, isPlaying, keyframes, cropX]);

  // Cập nhật âm lượng nhạc nền
  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = (bgMusic.volume || 50) / 100;
    }
  }, [bgMusic.volume]);

  // Tính toán nội suy cropX dựa trên keyframes
  const interpolateCropX = (time) => {
    if (keyframes.length === 0) return cropX / 100;
    if (keyframes.length === 1) return keyframes[0].cropX;

    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (time <= sorted[0].time) return sorted[0].cropX;
    if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].cropX;

    for (let i = 0; i < sorted.length - 1; i++) {
      const k1 = sorted[i];
      const k2 = sorted[i + 1];
      if (time >= k1.time && time <= k2.time) {
        const tPct = (time - k1.time) / (k2.time - k1.time);
        return k1.cropX + (k2.cropX - k1.cropX) * tPct;
      }
    }
    return cropX / 100;
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      const start = trimRange.start;
      const end = trimRange.end || video.duration || 10;
      if (video.currentTime < start || video.currentTime >= end) {
        video.currentTime = start;
      }
      video.play().catch(() => {});
      if (audioPreviewRef.current) {
        audioPreviewRef.current.currentTime = Math.max(0, video.currentTime - start);
        audioPreviewRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = parseFloat(e.target.value);
    video.volume = vol;
    if (vol === 0) {
      setIsMuted(true);
      video.muted = true;
    } else {
      setIsMuted(false);
      video.muted = false;
    }
  };

  // Drag and Drop Text Overlays
  const handleTextMouseDown = (id, e) => {
    e.preventDefault();
    setActiveOverlayId(id);
    const container = videoContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const overlay = textOverlays.find(o => o.id === id);
    if (!overlay) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = overlay.x || 50;
    const initialY = overlay.y || 50;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const deltaXPct = (deltaX / rect.width) * 100;
      const deltaYPct = (deltaY / rect.height) * 100;

      setTextOverlays(prev => prev.map(o => {
        if (o.id === id) {
          return {
            ...o,
            x: Math.max(0, Math.min(100, initialX + deltaXPct)),
            y: Math.max(0, Math.min(100, initialY + deltaYPct))
          };
        }
        return o;
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Kéo thả Crop Bounding Box
  const handleCropBoxMouseDown = (e) => {
    e.preventDefault();
    const container = videoContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const initialCropX = cropX;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaXPct = (deltaX / rect.width) * 100;

      // Tính toán Sliding Room để hạn chế box trong khung video
      const boxWidthPct = getBoxWidthPct();
      const slidingRoom = 100 - boxWidthPct;
      
      if (slidingRoom > 0) {
        // Dịch chuyển tỉ lệ phần trăm của Sliding Room
        const deltaCrop = (deltaXPct / slidingRoom) * 100;
        setCropX(Math.max(0, Math.min(100, initialCropX + deltaCrop)));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Tính toán chiều rộng của Crop Box theo tỉ lệ được chọn
  const getBoxWidthPct = () => {
    if (aspectRatio === ASPECT_RATIOS.ORIGINAL) return 100;

    let targetRatio = 1.0;
    if (aspectRatio === ASPECT_RATIOS.SQUARE) targetRatio = 1.0;
    else if (aspectRatio === ASPECT_RATIOS.PORTRAIT) targetRatio = 9 / 16;
    else if (aspectRatio === ASPECT_RATIOS.LANDSCAPE) targetRatio = 16 / 9;

    const widthPct = (targetRatio / videoRatio) * 100;
    return Math.min(100, widthPct);
  };

  // CSS Styles cho Bounding Box và Preview Zoom Effect
  const boxWidthPct = getBoxWidthPct();
  const slidingRoom = 100 - boxWidthPct;
  const boxLeftPct = slidingRoom * (cropX / 100);

  const getContainerStyle = () => {
    if (isPreviewMode && aspectRatio !== ASPECT_RATIOS.ORIGINAL) {
      let cropRatio = 1.0;
      if (aspectRatio === ASPECT_RATIOS.SQUARE) cropRatio = 1.0;
      else if (aspectRatio === ASPECT_RATIOS.PORTRAIT) cropRatio = 9 / 16;
      else if (aspectRatio === ASPECT_RATIOS.LANDSCAPE) cropRatio = 16 / 9;

      return {
        aspectRatio: cropRatio,
        maxHeight: '500px',
        maxWidth: '100%',
        width: 'auto',
        height: 'auto',
        overflow: 'hidden',
        position: 'relative'
      };
    }

    return {
      aspectRatio: videoRatio || 16 / 9,
      maxHeight: '500px',
      maxWidth: '100%',
      width: 'auto',
      height: 'auto',
      position: 'relative'
    };
  };

  const getVideoStyle = () => {
    if (isPreviewMode && aspectRatio !== ASPECT_RATIOS.ORIGINAL) {
      let cropRatio = 1.0;
      if (aspectRatio === ASPECT_RATIOS.SQUARE) cropRatio = 1.0;
      else if (aspectRatio === ASPECT_RATIOS.PORTRAIT) cropRatio = 9 / 16;
      else if (aspectRatio === ASPECT_RATIOS.LANDSCAPE) cropRatio = 16 / 9;

      const widthPct = (videoRatio / cropRatio) * 100;
      const maxTranslatePct = widthPct - 100;
      const translateX = - (cropX / 100) * maxTranslatePct;

      return {
        height: '100%',
        width: `${widthPct}%`,
        maxWidth: 'none',
        transform: `translateX(${translateX}%)`,
        objectFit: 'fill'
      };
    }

    return {
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    };
  };

  const activeSubtitle = subtitles.find(
    s => videoRef.current && videoRef.current.currentTime >= s.start && videoRef.current.currentTime <= s.end
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#07070B] relative min-h-[500px]">
      {/* Video Canvas Container */}
      <div 
        ref={videoContainerRef}
        style={getContainerStyle()}
        className="relative bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center"
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            style={getVideoStyle()}
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
          />
        ) : (
          <div className="text-gray-550 text-sm">Chưa có video được tải lên</div>
        )}

        {/* CROP BOX OVERLAY (Chỉ hiển thị ở chế độ Edit và không phải Original) */}
        {!isPreviewMode && aspectRatio !== ASPECT_RATIOS.ORIGINAL && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Vùng mờ bên trái */}
            <div 
              style={{ width: `${boxLeftPct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-black/60 pointer-events-none"
            />
            
            {/* Khung Bounding Box có thể di chuyển */}
            <div
              onMouseDown={handleCropBoxMouseDown}
              style={{ 
                left: `${boxLeftPct}%`, 
                width: `${boxWidthPct}%` 
              }}
              className="absolute top-0 bottom-0 border-2 border-dashed border-lime-400 cursor-move pointer-events-auto flex flex-col justify-between p-2 select-none shadow-[0_0_25px_rgba(0,0,0,0.6)]"
            >
              {/* Bốn góc trang trí */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-lime-400 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-4 border-r-4 border-lime-400 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-4 border-l-4 border-lime-400 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-4 border-r-4 border-lime-400 pointer-events-none" />
              
              {/* Nhãn tỉ lệ */}
              <div className="mx-auto mt-2 bg-lime-400 text-black text-[9px] font-extrabold px-2 py-0.5 rounded shadow-md uppercase tracking-wider select-none pointer-events-none">
                {aspectRatio} Crop Frame
              </div>
            </div>

            {/* Vùng mờ bên phải */}
            <div 
              style={{ left: `${boxLeftPct + boxWidthPct}%` }}
              className="absolute right-0 top-0 bottom-0 bg-black/60 pointer-events-none"
            />
          </div>
        )}

        {/* Drag and Drop Text Overlays */}
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            onMouseDown={(e) => handleTextMouseDown(overlay.id, e)}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              color: overlay.color || '#FFFFFF',
              fontSize: `${overlay.size || 18}px`,
              transform: 'translate(-50%, -50%)',
              cursor: 'move'
            }}
            className={`absolute select-none font-bold whitespace-nowrap px-2.5 py-1 rounded border z-30 ${
              activeOverlayId === overlay.id ? 'border-lime-400 bg-black/40' : 'border-transparent bg-transparent'
            }`}
          >
            {overlay.text}
          </div>
        ))}

        {/* AI Subtitle Overlay */}
        {activeSubtitle && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/75 text-white font-medium text-sm text-center rounded-lg shadow-lg max-w-[85%] pointer-events-none drop-shadow-md z-30">
            {activeSubtitle.text}
          </div>
        )}
      </div>

      {/* Hidden Audio Preview Element */}
      {bgMusic.trackUrl && (
        <audio
          ref={audioPreviewRef}
          src={bgMusic.trackUrl}
          loop
        />
      )}

      {/* Playback Controls & Progress Bar */}
      <div className="w-full max-w-2xl mt-6 bg-[#0E0E15] border border-gray-800/80 rounded-2xl p-4 flex flex-col gap-3">
        {/* Progress Bar Container */}
        <div className="relative w-full h-1 bg-gray-850 rounded-full overflow-hidden cursor-pointer">
          <div ref={progressBarRef} className="absolute left-0 top-0 bottom-0 bg-lime-400 w-0" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="p-3 bg-lime-400 text-black hover:bg-lime-300 rounded-full transition shadow-lg shadow-lime-400/10 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Toggle Preview Effect / Editing Frame */}
            {aspectRatio !== ASPECT_RATIOS.ORIGINAL && (
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isPreviewMode 
                    ? 'bg-lime-400 text-black shadow-[0_0_12px_rgba(163,230,53,0.4)]' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {isPreviewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isPreviewMode ? 'Editing Mode' : 'Preview Crop'}</span>
              </button>
            )}

            <button
              onClick={toggleMute}
              className="p-2.5 text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              defaultValue="1"
              onChange={handleVolumeChange}
              className="w-20 accent-lime-400 h-1 rounded-lg cursor-pointer bg-gray-850"
            />
          </div>
          <span ref={timeDisplayRef} className="text-xs font-mono text-gray-400">
            00:00 / 00:00
          </span>
        </div>
      </div>
    </div>
  );
}
