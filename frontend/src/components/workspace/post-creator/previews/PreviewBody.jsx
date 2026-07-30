import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Type, Image as ImageIcon, Check, Play } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { PreviewStrategies } from "./PreviewStrategies";
import { isVideoPath } from "../../../../utils/url";

export function PreviewBody() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    activePlatform,
    caption,
    videoFileUrl,
    videoFile,
    youtubeType,
    youtubeTitle,
    youtubePlaylistId,
    playlists,
    youtubeTags,
    youtubeFirstComment,
    globalFirstComment,
    previewDevice,
    facebookType,
    facebookTitle,
    instagramType,
    imageTransform,
    albumMedia,
    useUrlShortener,
    networkCustom,
    postMedia,
    showMediaViewer,
    altText,
    setAltText,
    mediaThumbnailUrl,
    setIsUploadingThumbnail,
    setShowUploadModal,
    setUploadModalTab,
    setMediaTypeFilter
  } = usePostCreatorFormContext();

  const [showAltInput, setShowAltInput] = useState(false);

  const handleThumbnailUpload = () => {
    setIsUploadingThumbnail(true);
    setMediaTypeFilter?.("image");
    setUploadModalTab("computer");
    setShowUploadModal(true);
  };

  const platformCustom = networkCustom?.[activePlatform];
  const isPlatformCustomized = platformCustom?.useTemplate === false;
  const isThreadsPlatform = activePlatform === 'threads';

  const firstThreadPost = isThreadsPlatform && platformCustom?.threadPosts?.[0];

  const effectiveCaption = isPlatformCustomized
    ? (isThreadsPlatform
        ? (typeof firstThreadPost === 'string' ? firstThreadPost : firstThreadPost?.text || '')
        : (platformCustom?.caption || ''))
    : caption;

  const effectiveMediaItems = isPlatformCustomized
    ? (isThreadsPlatform
        ? ((typeof firstThreadPost === 'object' ? firstThreadPost?.mediaUrls : []) || [])
        : (platformCustom?.mediaUrls || []))
    : postMedia;

  let effectiveVideoFileUrl = videoFileUrl;
  let effectiveVideoFile = videoFile;

  if (isPlatformCustomized) {
    if (effectiveMediaItems.length > 0) {
      const firstMedia = effectiveMediaItems[0];
      effectiveVideoFileUrl = typeof firstMedia === 'string'
        ? firstMedia
        : (firstMedia?.previewUrl || firstMedia?.path || '');
      effectiveVideoFile = typeof firstMedia === 'string' ? null : (firstMedia?.file || null);
    } else {
      effectiveVideoFileUrl = '';
      effectiveVideoFile = null;
    }
  }

  const isVideo = isVideoPath(effectiveVideoFileUrl, effectiveVideoFile);


  // Mô phỏng rút gọn link thời gian thực khi sử dụng UrlShortener
  const simulatedCaption = React.useMemo(() => {
    if (!effectiveCaption || !useUrlShortener) return effectiveCaption;
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    let idx = 1;
    return effectiveCaption.replace(urlRegex, (url) => {
      if (url.includes('/sl/')) return url;
      return `https://publicast.link/link_${idx++}`;
    });
  }, [effectiveCaption, useUrlShortener]);

  const PreviewComponent = PreviewStrategies[activePlatform];

  // ----------------------------------------------------
  // 1. MEDIA VIEWER MODE (Khi bấm nút Con Mắt Eye)
  // ----------------------------------------------------
  if (showMediaViewer) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center space-y-6 bg-transparent scrollbar-thin animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-5 space-y-5 text-left font-sans">
          {/* Main Media Preview Frame */}
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-200 shadow-inner">
            {effectiveVideoFileUrl ? (
              isVideo ? (
                <video 
                  src={effectiveVideoFileUrl} 
                  poster={mediaThumbnailUrl || undefined}
                  controls 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <img 
                  src={effectiveVideoFileUrl} 
                  className="w-full h-full object-contain" 
                  alt={altText || "Uploaded Media"} 
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 space-y-2 p-6 text-center">
                <Play size={28} className="text-gray-300" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">No Media Uploaded</span>
                <p className="text-[10px] text-gray-400/80">Upload a video or photo to use the media viewer tools.</p>
              </div>
            )}
          </div>


          {/* Media Viewer Action Menu Buttons */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            {/* Button 1: Add Alt Text */}
            <button
              type="button"
              onClick={() => setShowAltInput(!showAltInput)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-gray-800 font-bold text-xs transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            >
              <Type size={16} className="text-gray-600 shrink-0" />
              <span>Add alt text</span>
              {altText && (
                <span className="ml-auto text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check size={12} /> Saved
                </span>
              )}
            </button>

            {/* Expandable Alt Text Input Drawer */}
            {showAltInput && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Media Alt Text (SEO & Accessibility)
                </label>
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe this media for visually impaired users..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/10 resize-none font-sans"
                />
              </div>
            )}

            {/* Button 2: Upload Video Thumbnail */}
            <button
              type="button"
              onClick={handleThumbnailUpload}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-gray-800 font-bold text-xs transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            >
              <ImageIcon size={16} className="text-gray-600 shrink-0" />
              <span>Upload video thumbnail</span>
              {mediaThumbnailUrl && (
                <span className="ml-auto text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check size={12} /> Uploaded
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. SOCIAL POST PREVIEW MODE (Mặc định)
  // ----------------------------------------------------
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-start space-y-8 bg-transparent scrollbar-thin">
      <div className={`w-full transition-all duration-300 ${previewDevice === 'desktop' && activePlatform === 'youtube' ? 'max-w-2xl' : 'max-w-sm'}`}>
        {PreviewComponent && (
          <PreviewComponent 
            caption={simulatedCaption} 
            videoFileUrl={effectiveVideoFileUrl}
            videoFile={effectiveVideoFile}
            youtubeType={youtubeType}
            youtubeTitle={youtubeTitle}
            youtubePlaylistId={youtubePlaylistId}
            playlists={playlists}
            youtubeTags={youtubeTags}
            youtubeFirstComment={youtubeFirstComment}
            globalFirstComment={globalFirstComment}
            previewDevice={previewDevice}
            facebookType={facebookType}
            facebookTitle={facebookTitle}
            instagramType={instagramType}
            imageTransform={imageTransform}
            albumMedia={albumMedia}
          />
        )}
      </div>
    </div>
  );
}
