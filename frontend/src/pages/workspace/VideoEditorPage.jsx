import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Scissors, Crop, Type, Languages, Palette, Sliders, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

import { usePostCreatorStore } from '../../store/usePostCreatorStore';
import { useBrand } from '../../context/BrandContext';
import { VideoEditorProvider, useVideoEditor } from '../../context/VideoEditorContext';
import { useVideoProcessing } from '../../hooks/useVideoProcessing';
import { VIDEO_EDITOR_TABS, ASPECT_RATIOS } from '../../constants/video-editor';

import VideoPreviewArea from '../../components/video-editor/VideoPreviewArea';
import TrimTimeline from '../../components/video-editor/TrimTimeline';
import TextOverlayEditor from '../../components/video-editor/TextOverlayEditor';
import SubtitlesGenerator from '../../components/video-editor/SubtitlesGenerator';
import FilterPanel from '../../components/video-editor/FilterPanel';
import FinetunePanel from '../../components/video-editor/FinetunePanel';
import ResizePanel from '../../components/video-editor/ResizePanel';

function VideoEditorContent() {
  const navigate = useNavigate();
  const { activeBrand } = useBrand();
  const brandId = activeBrand?.id || 'unassigned';

  const {
    videoFileUrl: storeVideoUrl,
    uploadedVideoPath: storeVideoPath,
    videoSettings,
    setVideoSettings,
    setVideoFileUrl,
    setUploadedVideoPath
  } = usePostCreatorStore();

  const activeVideoUrl = videoSettings?.originalVideoUrl || storeVideoUrl;
  const activeVideoPath = videoSettings?.originalVideoPath || storeVideoPath;

  const {
    videoUrl, setVideoUrl,
    duration, setDuration,
    aspectRatio, setAspectRatio,
    trimRange, setTrimRange,
    textOverlays, setTextOverlays,
    subtitles, setSubtitles,
    activeTab, setActiveTab,
    cropX, setCropX,
    keyframes, setKeyframes,
    filterPreset, setFilterPreset,
    adjustments, setAdjustments,
    resize, setResize,
    isResizeDirty, setIsResizeDirty,
    splitPoints, setSplitPoints
  } = useVideoEditor();

  const { isProcessing, startVideoProcessing } = useVideoProcessing();

  // Redirect to planner if no video is present
  useEffect(() => {
    if (!activeVideoUrl) {
      toast.error('Không tìm thấy video để chỉnh sửa!');
      navigate('/planner');
      return;
    }
    setVideoUrl(activeVideoUrl);
  }, [activeVideoUrl, navigate, setVideoUrl]);

  // Load initial settings
  useEffect(() => {
    if (activeVideoUrl) {
      if (videoSettings) {
        setTrimRange({
          start: videoSettings.startTime ?? 0,
          end: videoSettings.endTime ?? 10
        });
        setAspectRatio(videoSettings.aspectRatio ?? ASPECT_RATIOS.ORIGINAL);
        setTextOverlays(videoSettings.textOverlays ?? []);
        setSubtitles(videoSettings.subtitles ?? []);
        setCropX(videoSettings.cropX ?? 50);
        setKeyframes(videoSettings.keyframes ?? []);
        setFilterPreset(videoSettings.filterPreset ?? 'none');
        setAdjustments(videoSettings.adjustments ?? { brightness: 0, contrast: 0, saturation: 0 });
        setResize(videoSettings.resize ?? { width: null, height: null });
        setIsResizeDirty(false);
        setSplitPoints(videoSettings.splitPoints ?? []);
      } else {
        setTrimRange({ start: 0, end: 10 });
        setAspectRatio(ASPECT_RATIOS.ORIGINAL);
        setTextOverlays([]);
        setSubtitles([]);
        setCropX(50);
        setKeyframes([]);
        setFilterPreset('none');
        setAdjustments({ brightness: 0, contrast: 0, saturation: 0 });
        setResize({ width: null, height: null });
        setIsResizeDirty(false);
        setSplitPoints([]);
      }
    }
  }, [activeVideoUrl, videoSettings, setTrimRange, setAspectRatio, setTextOverlays, setSubtitles, setCropX, setKeyframes, setFilterPreset, setAdjustments, setResize, setIsResizeDirty, setSplitPoints]);

  // Sync video element metadata
  const handleSaveVideo = () => {
    const params = {
      videoUrl: activeVideoPath || activeVideoUrl,
      startTime: trimRange.start,
      endTime: trimRange.end,
      aspectRatio,
      keyframes: keyframes.length > 0 ? keyframes : [{ id: 'default', time: 0, cropX: cropX / 100 }],
      adjustments,
      filterPreset,
      resize: isResizeDirty && resize.width && resize.height ? resize : undefined,
      splitPoints: splitPoints.length > 0 ? splitPoints : undefined,
      brandId
    };

    const settings = {
      originalVideoUrl: activeVideoUrl,
      originalVideoPath: activeVideoPath,
      startTime: trimRange.start,
      endTime: trimRange.end,
      aspectRatio,
      textOverlays,
      subtitles,
      cropX,
      keyframes,
      filterPreset,
      adjustments,
      resize,
      splitPoints,
      brandId
    };

    startVideoProcessing({
      params,
      settings,
      onSuccess: (result, finalSettings) => {
        // Split-into-clips mode resolves to an ordered array of clip URLs
        // instead of a single string. The composer only has one video slot
        // today, so we adopt the first clip as the active video and let the
        // user know the rest are ready (full multi-clip post support is a
        // separate, larger feature — out of scope here).
        const isSplitResult = Array.isArray(result);
        const newVideoUrl = isSplitResult ? result[0] : result;
        if (isSplitResult && result.length > 1) {
          toast.success(`Đã tách thành ${result.length} đoạn. Đang dùng đoạn 1 làm video chính — các đoạn còn lại: ${result.slice(1).join(', ')}`, { duration: 8000 });
        }

        setVideoFileUrl(newVideoUrl);
        setUploadedVideoPath(newVideoUrl);
        setVideoSettings(finalSettings);

        // Update form backup in Session Storage
        const currentBackupStr = sessionStorage.getItem('postCreatorFormBackup');
        if (currentBackupStr) {
          const currentBackup = JSON.parse(currentBackupStr);
          const oldVideoUrl = currentBackup.videoFileUrl;
          const oldVideoPath = currentBackup.uploadedVideoPath;

          currentBackup.videoFileUrl = newVideoUrl;
          currentBackup.uploadedVideoPath = newVideoUrl;
          currentBackup.videoSettings = finalSettings;

          if (currentBackup.postMedia) {
            currentBackup.postMedia = currentBackup.postMedia.map(item => {
              if (item.path === oldVideoPath || item.previewUrl === oldVideoUrl) {
                return {
                  ...item,
                  previewUrl: newVideoUrl,
                  path: newVideoUrl
                };
              }
              return item;
            });
          }
          sessionStorage.setItem('postCreatorFormBackup', JSON.stringify(currentBackup));
          usePostCreatorStore.setState({ postCreatorFormBackup: currentBackup });
        }

        toast.success('Đã áp dụng các thay đổi thành công!', { id: 'video-edit-toast' });
        navigate(-1);
      }
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#08080C] text-gray-155 overflow-hidden relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <Loader2 className="animate-spin text-lime-400 w-16 h-16 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Đang xử lý video...</h2>
          <p className="text-sm text-gray-400 max-w-sm text-center">
            FFmpeg đang tiến hành cắt, crop tỉ lệ khung hình và chèn nhạc nền. Vui lòng không tắt trình duyệt hoặc tải lại trang!
          </p>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-800 bg-[#0C0C12] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn thoát? Các thay đổi chưa lưu sẽ bị mất.')) {
                navigate(-1);
              }
            }}
            className="p-2 hover:bg-gray-800 rounded-full transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Trình chỉnh sửa Video chuyên nghiệp</h1>
            <p className="text-xs text-gray-400">Tùy chỉnh timeline, crop tỉ lệ thông minh và chèn nhạc nền</p>
          </div>
        </div>

        <button
          onClick={handleSaveVideo}
          className="flex items-center gap-2 px-5 py-2.5 bg-lime-400 hover:bg-lime-500 text-black font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Apply & Save</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side: Video Preview Area */}
        <div className="flex-1 flex flex-col p-6 bg-[#030305] relative min-w-0">
          <VideoPreviewArea />
        </div>

        {/* Right Side: Options Panels & Controls */}
        <div className="w-[420px] border-l border-gray-800 bg-[#0C0C12] flex flex-col shrink-0">
          {/* Tab Selection */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.TRIM)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${
                activeTab === VIDEO_EDITOR_TABS.TRIM
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Trim</span>
            </button>
            <button
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.TEXT)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${
                activeTab === VIDEO_EDITOR_TABS.TEXT
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
            </button>
            <button
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.SUBTITLES)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${
                activeTab === VIDEO_EDITOR_TABS.SUBTITLES
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Languages className="w-4 h-4" />
              <span>AI Subtitles</span>
            </button>
            <button
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.FILTER)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${
                activeTab === VIDEO_EDITOR_TABS.FILTER
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.FINETUNE)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${
                activeTab === VIDEO_EDITOR_TABS.FINETUNE
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Finetune</span>
            </button>
            <button
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.RESIZE)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${
                activeTab === VIDEO_EDITOR_TABS.RESIZE
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>Resize</span>
            </button>
          </div>

          {/* Panel Views */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === VIDEO_EDITOR_TABS.TRIM && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-white">Tỉ lệ khung hình (Aspect Ratio)</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.entries(ASPECT_RATIOS).map(([key, ratio]) => (
                      <button
                        key={key}
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-3 px-4 rounded-xl border text-xs font-medium transition ${
                          aspectRatio === ratio
                            ? 'border-lime-400 bg-lime-400/5 text-lime-400'
                            : 'border-gray-800 hover:border-gray-700 bg-gray-900/50 text-gray-400'
                        }`}
                      >
                        {ratio === ASPECT_RATIOS.ORIGINAL ? 'Mặc định (Original)' : ratio}
                      </button>
                    ))}
                  </div>
                </div>
                <TrimTimeline />
              </div>
            )}

            {activeTab === VIDEO_EDITOR_TABS.TEXT && <TextOverlayEditor />}
            {activeTab === VIDEO_EDITOR_TABS.SUBTITLES && <SubtitlesGenerator />}
            {activeTab === VIDEO_EDITOR_TABS.FILTER && <FilterPanel />}
            {activeTab === VIDEO_EDITOR_TABS.FINETUNE && <FinetunePanel />}
            {activeTab === VIDEO_EDITOR_TABS.RESIZE && <ResizePanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoEditorPage() {
  return (
    <VideoEditorProvider>
      <VideoEditorContent />
    </VideoEditorProvider>
  );
}
export default VideoEditorPage;
