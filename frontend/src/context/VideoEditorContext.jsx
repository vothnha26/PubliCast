import React, { createContext, useContext, useRef, useState, useMemo } from 'react';
import { ASPECT_RATIOS, VIDEO_EDITOR_TABS } from '../constants/video-editor';

const VideoEditorContext = createContext(null);

export function VideoEditorProvider({ children }) {
  // DOM Ref duy nhất cho HTML5 Video Element - Triệt tiêu re-render do currentTime thay đổi
  const videoRef = useRef(null);

  // States cấu hình tĩnh/ít thay đổi
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS.ORIGINAL);
  const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });
  const [bgMusic, setBgMusic] = useState({ trackId: null, volume: 50, mood: 'upbeat' });
  const [textOverlays, setTextOverlays] = useState([]);
  const [activeOverlayId, setActiveOverlayId] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [activeTab, setActiveTab] = useState(VIDEO_EDITOR_TABS.TRIM);

  // States hỗ trợ Crop Bounding Box & Keyframes
  const [videoRatio, setVideoRatio] = useState(16 / 9);
  const [cropX, setCropX] = useState(50); // từ 0 đến 100
  const [keyframes, setKeyframes] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Filter / Finetune / Resize / Split states
  const [filterPreset, setFilterPreset] = useState('none');
  const [adjustments, setAdjustments] = useState({ brightness: 0, contrast: 0, saturation: 0 });
  const [resize, setResize] = useState({ width: null, height: null });
  const [isResizeDirty, setIsResizeDirty] = useState(false);
  const [splitPoints, setSplitPoints] = useState([]);

  // Without memoizing, every provider render (e.g. from currentTime-driven
  // parent updates) created a new value object, forcing every consumer to
  // re-render regardless of which slice of state it actually reads (#90 M11).
  const value = useMemo(() => ({
    videoRef,
    videoUrl, setVideoUrl,
    duration, setDuration,
    aspectRatio, setAspectRatio,
    trimRange, setTrimRange,
    bgMusic, setBgMusic,
    textOverlays, setTextOverlays,
    activeOverlayId, setActiveOverlayId,
    subtitles, setSubtitles,
    activeTab, setActiveTab,
    videoRatio, setVideoRatio,
    cropX, setCropX,
    keyframes, setKeyframes,
    isPreviewMode, setIsPreviewMode,
    filterPreset, setFilterPreset,
    adjustments, setAdjustments,
    resize, setResize,
    isResizeDirty, setIsResizeDirty,
    splitPoints, setSplitPoints
  }), [
    videoUrl, duration, aspectRatio, trimRange, bgMusic, textOverlays,
    activeOverlayId, subtitles, activeTab, videoRatio, cropX, keyframes,
    isPreviewMode, filterPreset, adjustments, resize, isResizeDirty, splitPoints
  ]);

  return (
    <VideoEditorContext.Provider value={value}>
      {children}
    </VideoEditorContext.Provider>
  );
}

export const useVideoEditor = () => {
  const context = useContext(VideoEditorContext);
  if (!context) {
    throw new Error('useVideoEditor must be used within a VideoEditorProvider');
  }
  return context;
};
