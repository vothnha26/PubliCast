import React, { useEffect, useState, useRef } from 'react';
import {
  X, RotateCcw, RotateCw, Crop, Sliders, Palette, Smile, Pencil, Maximize2, Loader2, Frame,
  RotateCcw as Rotate90Icon, FlipHorizontal, FlipVertical, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

import { VideoEditorProvider, useVideoEditor } from '../../../../context/VideoEditorContext';
import { useVideoProcessing }                   from '../../../../hooks/useVideoProcessing';
import { VIDEO_EDITOR_TABS, ASPECT_RATIOS }      from '../../../../constants/video-editor';

import VideoPreviewArea   from '../../../video-editor/VideoPreviewArea';
import TrimTimeline       from '../../../video-editor/TrimTimeline';
import SizePanel          from '../../../video-editor/SizePanel';
import StickerPanel       from '../../../video-editor/StickerPanel';
import TextOverlayEditor  from '../../../video-editor/TextOverlayEditor';
import SubtitlesGenerator from '../../../video-editor/SubtitlesGenerator';
import FilterPanel        from '../../../video-editor/FilterPanel';
import FinetunePanel      from '../../../video-editor/FinetunePanel';
import DrawPanel          from '../../../video-editor/DrawPanel';
import ResizePanel        from '../../../video-editor/ResizePanel';

const SIDEBAR_TABS = [
  { id: 'crop',    label: 'Crop',    icon: Crop     },
  { id: 'size',    label: 'Size',    icon: Frame    },
  { id: 'finetune',label: 'Finetune',icon: Sliders  },
  { id: 'filter',  label: 'Filter',  icon: Palette  },
  { id: 'sticker', label: 'Sticker', icon: Smile    },
  { id: 'draw',    label: 'Draw',    icon: Pencil   },
  { id: 'resize',  label: 'Resize',  icon: Maximize2},
];

const TAB_MAP = {
  crop:     VIDEO_EDITOR_TABS.TRIM,
  size:     VIDEO_EDITOR_TABS.TRIM,
  finetune: VIDEO_EDITOR_TABS.FINETUNE,
  filter:   VIDEO_EDITOR_TABS.FILTER,
  sticker:  VIDEO_EDITOR_TABS.TEXT,      // Sticker uses TextOverlay context state
  draw:     VIDEO_EDITOR_TABS.TRIM,      // Draw is local-only; no context tab needed
  resize:   VIDEO_EDITOR_TABS.RESIZE,
};

const ZOOM_OPTIONS = [
  { value: 25, label: '25%' },
  { value: 26, label: '26%', sub: 'Fit to view' },
  { value: 50, label: '50%' },
  { value: 100, label: '100%', sub: 'Actual size' },
  { value: 125, label: '125%' },
  { value: 150, label: '150%' },
  { value: 200, label: '200%' },
  { value: 300, label: '300%' },
  { value: 400, label: '400%' },
  { value: 600, label: '600%' },
  { value: 800, label: '800%' },
  { value: 1600, label: '1600%' },
];

function VideoEditorInner({ videoUrl, videoPath, initialSettings, brandId, onClose, onSave }) {
  const {
    setVideoUrl,
    trimRange, setTrimRange,
    aspectRatio, setAspectRatio,
    setTextOverlays, setSubtitles,
    setActiveTab,
    cropX, setCropX,
    setKeyframes,
    filterPreset, setFilterPreset,
    adjustments, setAdjustments,
    resize, setResize,
    isResizeDirty, setIsResizeDirty,
    setSplitPoints, splitPoints,
    keyframes, textOverlays, subtitles,
    zoomLevel, setZoomLevel,
    saveAudio, setSaveAudio,
    rotation, setRotation,
    scaleVal, setScaleVal,
    flipH, setFlipH,
    flipV, setFlipV,
    setDrawStrokes,
    undo, redo, canUndo, canRedo, pushHistory
  } = useVideoEditor();

  const { isProcessing, startVideoProcessing } = useVideoProcessing();
  const [activeTab, setLocalTab] = useState('crop');
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const zoomMenuRef = useRef(null);

  // Close zoom menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target)) {
        setIsZoomMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialise video URL
  useEffect(() => {
    if (videoUrl) setVideoUrl(videoUrl);
  }, [videoUrl, setVideoUrl]);

  // Load settings
  useEffect(() => {
    if (!videoUrl) return;
    const s = initialSettings || {};
    const initialSnapshot = {
      startTime: s.startTime ?? 0,
      endTime: s.endTime ?? 10,
      aspectRatio: s.aspectRatio ?? ASPECT_RATIOS.ORIGINAL,
      textOverlays: s.textOverlays ?? [],
      subtitles: s.subtitles ?? [],
      cropX: s.cropX ?? 50,
      keyframes: s.keyframes ?? [],
      filterPreset: s.filterPreset ?? 'none',
      adjustments: s.adjustments ?? { brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0, gamma: 0, clarity: 0, vignette: 0 },
      resize: s.resize ?? { width: null, height: null },
      splitPoints: s.splitPoints ?? [],
      rotation: 0,
      scaleVal: 100,
      flipH: false,
      flipV: false
    };

    setTrimRange({ start: initialSnapshot.startTime, end: initialSnapshot.endTime });
    setAspectRatio(initialSnapshot.aspectRatio);
    setTextOverlays(initialSnapshot.textOverlays);
    setSubtitles(initialSnapshot.subtitles);
    setCropX(initialSnapshot.cropX);
    setKeyframes(initialSnapshot.keyframes);
    setFilterPreset(initialSnapshot.filterPreset);
    setAdjustments(initialSnapshot.adjustments);
    setResize(initialSnapshot.resize);
    setIsResizeDirty(false);
    setSplitPoints(initialSnapshot.splitPoints);
    setRotation(0);
    setScaleVal(100);
    setFlipH(false);
    setFlipV(false);

    pushHistory(initialSnapshot);
  }, [videoUrl, initialSettings]);

  const switchTab = (id) => {
    setLocalTab(id);
    setActiveTab(TAB_MAP[id] || VIDEO_EDITOR_TABS.TRIM);
  };

  const handleResetSizeTransform = () => {
    setRotation(0);
    setScaleVal(100);
    setFlipH(false);
    setFlipV(false);
    toast.info('Đã đặt lại xoay & kích thước ban đầu');
  };

  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleToggleFlipH = () => {
    setFlipH((prev) => !prev);
  };

  const handleToggleFlipV = () => {
    setFlipV((prev) => !prev);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(1600, prev + 10));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(25, prev - 10));
  };

  const handleSelectZoom = (val) => {
    setZoomLevel(val);
    setIsZoomMenuOpen(false);
  };

  const handleUndo = () => {
    if (canUndo) {
      undo();
      toast.success('Đã hoàn tác (Undo)');
    } else {
      toast.info('Không có thao tác nào để hoàn tác');
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redo();
      toast.success('Đã làm lại (Redo)');
    } else {
      toast.info('Không có thao tác nào để làm lại');
    }
  };

  const handleSave = () => {
    startVideoProcessing({
      params: {
        videoUrl: videoPath || videoUrl,
        startTime: trimRange.start,
        endTime: trimRange.end,
        aspectRatio,
        saveAudio,
        keyframes: keyframes.length ? keyframes : [{ id: 'default', time: 0, cropX: cropX / 100 }],
        adjustments,
        filterPreset,
        resize: isResizeDirty && resize.width && resize.height ? resize : undefined,
        splitPoints: splitPoints.length ? splitPoints : undefined,
        brandId: brandId || 'unassigned',
        // Transform params (Size tab)
        rotation,
        scaleVal,
        flipH,
        flipV
      },
      settings: {
        originalVideoUrl: videoUrl,
        originalVideoPath: videoPath,
        startTime: trimRange.start,
        endTime: trimRange.end,
        aspectRatio,
        saveAudio,
        textOverlays,
        subtitles,
        cropX,
        keyframes,
        filterPreset,
        adjustments,
        resize,
        splitPoints,
        brandId: brandId || 'unassigned',
        // Transform params (stored in settings for restore on re-open)
        rotation,
        scaleVal,
        flipH,
        flipV
      },
      onSuccess: (result, finalSettings) => {
        const urls = Array.isArray(result) ? result : [result];
        if (urls.length > 1) toast.success(`Đã tách thành ${urls.length} đoạn`, { duration: 8000 });
        toast.success('Đã lưu thay đổi thành công!', { id: 'vid-save' });
        onSave?.(urls[0], finalSettings);
      }
    });
  };

  const handleClose = () => {
    if (window.confirm('Thoát bỏ các thay đổi chưa lưu?')) onClose();
  };

  return (
    <div className="relative bg-card w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border mx-4 font-sans">
      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-card/80 z-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-foreground" size={32} />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Đang lưu video…</p>
        </div>
      )}

      {/* HEADER */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border shrink-0 bg-card">
        <h2 className="text-lg font-bold text-foreground tracking-tight">Video Editor</h2>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-[#1C1822] text-white flex items-center justify-center hover:bg-black transition cursor-pointer group shadow-md"
        >
          <X size={16} className="text-yellow-300 group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-[108px] border-r border-border flex flex-col py-3 px-2 gap-1 shrink-0 bg-card select-none">
          {SIDEBAR_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-[10px] font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === id
                  ? 'bg-gray-200 text-foreground font-extrabold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        {/* CENTER MAIN AREA */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card select-none">
          {/* Top Utility Toolbar */}
          <div className="h-12 flex items-center justify-between px-6 border-b border-border shrink-0 bg-card relative">
            {/* Left side Reset Button (in Size, Finetune, Filter, Sticker, or Draw mode) */}
            {activeTab === 'size' || activeTab === 'finetune' || activeTab === 'filter' || activeTab === 'sticker' || activeTab === 'draw' ? (
              <button
                onClick={() => {
                  if (activeTab === 'size') handleResetSizeTransform();
                  else if (activeTab === 'finetune') {
                    setAdjustments({ brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0, gamma: 0, clarity: 0, vignette: 0 });
                    toast.info('Đã đặt lại tinh chỉnh (Finetune)');
                  } else if (activeTab === 'filter') {
                    setFilterPreset('none');
                    toast.info('Đã đặt lại bộ lọc về Gốc (Default)');
                  } else if (activeTab === 'sticker') {
                    setTextOverlays([]);
                    toast.info('Đã xóa tất cả nhãn dán');
                  } else if (activeTab === 'draw') {
                    setDrawStrokes([]);
                    toast.info('Đã xóa tất cả nét vẽ');
                  }
                }}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-black hover:bg-muted transition cursor-pointer"
                title="Reset"
              >
                <RefreshCw size={13} />
              </button>
            ) : <div className="w-8" />}

            {/* Center Utility Group */}
            <div className="flex items-center gap-4">
              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5 border border-border rounded-full px-1 py-0.5 shadow-sm bg-card">
                <button
                  onClick={handleUndo}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    canUndo ? 'text-foreground hover:text-black hover:bg-muted' : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title="Undo (Hoàn tác)"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={handleRedo}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    canRedo ? 'text-foreground hover:text-black hover:bg-muted' : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title="Redo (Làm lại)"
                >
                  <RotateCw size={13} />
                </button>
              </div>

              {/* Size Mode Transform Tools Pill */}
              {activeTab === 'size' && (
                <div className="flex items-center gap-1 border border-border rounded-full px-2 py-0.5 shadow-sm bg-card">
                  <button
                    onClick={handleRotate90}
                    className="p-1.5 text-muted-foreground hover:text-black hover:bg-muted rounded-full transition cursor-pointer"
                    title="Xoay 90°"
                  >
                    <Rotate90Icon size={13} />
                  </button>
                  <button
                    onClick={handleToggleFlipH}
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      flipH ? 'bg-gray-200 text-black font-bold' : 'text-muted-foreground hover:text-black hover:bg-muted'
                    }`}
                    title="Lật ngang (Flip Horizontal)"
                  >
                    <FlipHorizontal size={13} />
                  </button>
                  <button
                    onClick={handleToggleFlipV}
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      flipV ? 'bg-gray-200 text-black font-bold' : 'text-muted-foreground hover:text-black hover:bg-muted'
                    }`}
                    title="Lật dọc (Flip Vertical)"
                  >
                    <FlipVertical size={13} />
                  </button>
                </div>
              )}

              {/* Zoom Controls & Dropdown Menu */}
              {activeTab !== 'size' && (
                <div className="relative" ref={zoomMenuRef}>
                  <div className="flex items-center gap-1.5 border border-border rounded-full px-3 py-1 text-xs font-semibold text-foreground shadow-sm bg-card">
                    <button
                      onClick={handleZoomOut}
                      className="hover:text-black transition cursor-pointer px-1 text-muted-foreground hover:bg-muted rounded"
                      title="Thu nhỏ Zoom"
                    >
                      -
                    </button>

                    <button
                      onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                      className="w-12 text-center hover:text-black transition cursor-pointer hover:bg-muted rounded py-0.5 flex items-center justify-center gap-0.5"
                      title="Bấm để mở danh sách Zoom"
                    >
                      <span>{zoomLevel}%</span>
                    </button>

                    <button
                      onClick={handleZoomIn}
                      className="hover:text-black transition cursor-pointer px-1 text-muted-foreground hover:bg-muted rounded"
                      title="Phóng to Zoom"
                    >
                      +
                    </button>
                  </div>

                  {isZoomMenuOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 max-h-72 bg-card rounded-2xl border border-border shadow-2xl overflow-y-auto py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      {ZOOM_OPTIONS.map((opt) => {
                        const isSelected = zoomLevel === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleSelectZoom(opt.value)}
                            className={`w-full text-left px-5 py-2.5 transition flex flex-col justify-center cursor-pointer ${
                              isSelected
                                ? 'bg-gray-300/90 text-foreground font-bold'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <span className="text-sm font-semibold">{opt.label}</span>
                            {opt.sub && (
                              <span className={`text-[11px] ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {opt.sub}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Save Audio Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Save audio</span>
                <div className="flex bg-muted rounded-full p-0.5 text-xs shadow-inner border border-border/60">
                  <button
                    onClick={() => {
                      setSaveAudio(true);
                      toast.success('Đã BẬT lưu âm thanh video (Save audio ON)');
                    }}
                    className={`px-3 py-0.5 rounded-full transition cursor-pointer font-bold ${
                      saveAudio ? 'bg-card shadow-sm text-black' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    On
                  </button>
                  <button
                    onClick={() => {
                      setSaveAudio(false);
                      toast.info('Đã TẮT lưu âm thanh video (Save audio OFF)');
                    }}
                    className={`px-3 py-0.5 rounded-full transition cursor-pointer font-bold ${
                      !saveAudio ? 'bg-card shadow-sm text-black' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>

            <div className="w-8" />
          </div>

          {/* Video preview area */}
          <div className="flex-1 overflow-hidden flex items-center justify-center bg-card min-h-0 p-2">
            <VideoPreviewArea />
          </div>

          {/* Bottom Area: Size / Finetune / Filter / Sticker / Draw / Resize / Timeline */}
          {activeTab === 'size' ? (
            <div className="shrink-0 px-5 py-2 border-t border-border bg-card">
              <SizePanel />
            </div>
          ) : activeTab === 'finetune' ? (
            <div className="shrink-0 px-5 py-2 border-t border-border bg-card">
              <FinetunePanel />
            </div>
          ) : activeTab === 'filter' ? (
            <div className="shrink-0 px-5 py-2 border-t border-border bg-card">
              <FilterPanel />
            </div>
          ) : activeTab === 'sticker' ? (
            <div className="shrink-0 px-5 py-2 border-t border-border bg-card">
              <StickerPanel />
            </div>
          ) : activeTab === 'draw' ? (
            <div className="shrink-0 px-5 py-2 border-t border-border bg-card">
              <DrawPanel />
            </div>
          ) : activeTab === 'resize' ? (
            <div className="shrink-0 px-5 py-2 border-t border-border bg-card">
              <ResizePanel />
            </div>
          ) : (
            <div className="shrink-0 px-5 py-3 border-t border-border bg-card">
              <TrimTimeline />
            </div>
          )}
        </main>
      </div>

      {/* FOOTER */}
      <div className="h-14 flex items-center justify-end gap-4 px-6 border-t border-border shrink-0 bg-card">
        <button
          onClick={handleClose}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[#1C1822] text-yellow-300 text-sm font-bold rounded-xl hover:bg-black transition cursor-pointer shadow-md uppercase tracking-wider text-xs"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export function VideoEditorModal({ isOpen, videoUrl, videoPath, initialSettings, brandId, onClose, onSave }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <VideoEditorProvider>
        <VideoEditorInner
          videoUrl={videoUrl}
          videoPath={videoPath}
          initialSettings={initialSettings}
          brandId={brandId}
          onClose={onClose}
          onSave={onSave}
        />
      </VideoEditorProvider>
    </div>
  );
}

export default VideoEditorModal;
