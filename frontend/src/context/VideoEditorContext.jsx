import React, { createContext, useContext, useRef, useState, useMemo, useCallback } from 'react';
import { ASPECT_RATIOS, VIDEO_EDITOR_TABS } from '../constants/video-editor';

const VideoEditorContext = createContext(null);

export function VideoEditorProvider({ children }) {
  // DOM Ref duy nhất cho HTML5 Video Element
  const videoRef = useRef(null);

  // States cấu hình chính
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS.ORIGINAL);
  const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });
  const [textOverlays, setTextOverlays] = useState([]);
  const [activeOverlayId, setActiveOverlayId] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [activeTab, setActiveTab] = useState(VIDEO_EDITOR_TABS.TRIM);
  const [activeSubTab, setActiveSubTab] = useState('logos');

  // Crop & Keyframes & Transform (Size)
  const [videoRatio, setVideoRatio] = useState(16 / 9);
  const [cropX, setCropX] = useState(50);
  const [keyframes, setKeyframes] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Size tab transform states (Rotation, Scale, Flip)
  const [rotation, setRotation] = useState(0);
  const [scaleVal, setScaleVal] = useState(100);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [activeSizeSubTab, setActiveSizeSubTab] = useState('rotation');
  const [videoDimensions, setVideoDimensions] = useState({ width: 576, height: 1024 });

  // Filter / Finetune / Resize / Split
  const [filterPreset, setFilterPreset] = useState('none');
  const [adjustments, setAdjustments] = useState({
    brightness: 0, contrast: 0, saturation: 0,
    exposure: 0, temperature: 0, gamma: 0, clarity: 0, vignette: 0
  });
  const [resize, setResize] = useState({ width: null, height: null });
  const [isResizeDirty, setIsResizeDirty] = useState(false);
  const [splitPoints, setSplitPoints] = useState([]);

  // Top Toolbar States (Zoom, Save Audio, Undo/Redo History)
  const [zoomLevel, setZoomLevel] = useState(100);
  const [saveAudio, setSaveAudio] = useState(true);

  // Draw Tab States
  const [drawColor, setDrawColor] = useState('#FF3B30');
  const [drawWidth, setDrawWidth] = useState(4);
  const [drawTool, setDrawTool] = useState('sharpie');
  const [drawStrokes, setDrawStrokes] = useState([]);

  // History stack for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback((snapshot) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, snapshot];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevSnapshot = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      if (prevSnapshot) {
        if (prevSnapshot.trimRange) setTrimRange(prevSnapshot.trimRange);
        if (prevSnapshot.aspectRatio) setAspectRatio(prevSnapshot.aspectRatio);
        if (prevSnapshot.filterPreset) setFilterPreset(prevSnapshot.filterPreset);
        if (prevSnapshot.adjustments) setAdjustments(prevSnapshot.adjustments);
        if (prevSnapshot.textOverlays) setTextOverlays(prevSnapshot.textOverlays);
        if (prevSnapshot.subtitles) setSubtitles(prevSnapshot.subtitles);
        if (prevSnapshot.cropX !== undefined) setCropX(prevSnapshot.cropX);
        if (prevSnapshot.rotation !== undefined) setRotation(prevSnapshot.rotation);
        if (prevSnapshot.scaleVal !== undefined) setScaleVal(prevSnapshot.scaleVal);
        if (prevSnapshot.flipH !== undefined) setFlipH(prevSnapshot.flipH);
        if (prevSnapshot.flipV !== undefined) setFlipV(prevSnapshot.flipV);
      }
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextSnapshot = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      if (nextSnapshot) {
        if (nextSnapshot.trimRange) setTrimRange(nextSnapshot.trimRange);
        if (nextSnapshot.aspectRatio) setAspectRatio(nextSnapshot.aspectRatio);
        if (nextSnapshot.filterPreset) setFilterPreset(nextSnapshot.filterPreset);
        if (nextSnapshot.adjustments) setAdjustments(nextSnapshot.adjustments);
        if (nextSnapshot.textOverlays) setTextOverlays(nextSnapshot.textOverlays);
        if (nextSnapshot.subtitles) setSubtitles(nextSnapshot.subtitles);
        if (nextSnapshot.cropX !== undefined) setCropX(nextSnapshot.cropX);
        if (nextSnapshot.rotation !== undefined) setRotation(nextSnapshot.rotation);
        if (nextSnapshot.scaleVal !== undefined) setScaleVal(nextSnapshot.scaleVal);
        if (nextSnapshot.flipH !== undefined) setFlipH(nextSnapshot.flipH);
        if (nextSnapshot.flipV !== undefined) setFlipV(nextSnapshot.flipV);
      }
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const value = useMemo(() => ({
    videoRef,
    videoUrl, setVideoUrl,
    duration, setDuration,
    aspectRatio, setAspectRatio,
    trimRange, setTrimRange,
    textOverlays, setTextOverlays,
    activeOverlayId, setActiveOverlayId,
    subtitles, setSubtitles,
    activeTab, setActiveTab,
    activeSubTab, setActiveSubTab,
    videoRatio, setVideoRatio,
    cropX, setCropX,
    keyframes, setKeyframes,
    isPreviewMode, setIsPreviewMode,
    rotation, setRotation,
    scaleVal, setScaleVal,
    flipH, setFlipH,
    flipV, setFlipV,
    activeSizeSubTab, setActiveSizeSubTab,
    videoDimensions, setVideoDimensions,
    filterPreset, setFilterPreset,
    adjustments, setAdjustments,
    resize, setResize,
    isResizeDirty, setIsResizeDirty,
    splitPoints, setSplitPoints,
    zoomLevel, setZoomLevel,
    saveAudio, setSaveAudio,
    drawColor, setDrawColor,
    drawWidth, setDrawWidth,
    drawTool, setDrawTool,
    drawStrokes, setDrawStrokes,
    pushHistory, undo, redo, canUndo, canRedo
  }), [
    videoUrl, duration, aspectRatio, trimRange, textOverlays,
    activeOverlayId, subtitles, activeTab, activeSubTab, videoRatio, cropX, keyframes,
    isPreviewMode, rotation, scaleVal, flipH, flipV, activeSizeSubTab, videoDimensions,
    filterPreset, adjustments, resize, isResizeDirty, splitPoints,
    zoomLevel, saveAudio, drawColor, drawWidth, drawTool, drawStrokes,
    pushHistory, undo, redo, canUndo, canRedo
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
