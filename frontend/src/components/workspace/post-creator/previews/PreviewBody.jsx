import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Type, Image as ImageIcon, Check, Play } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { PreviewStrategies } from "./PreviewStrategies";
import { PlatformIcon } from "../../../shared/PlatformIcon";
import { isVideoPath } from "../../../../utils/url";

const PLATFORM_LABEL = {
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
  telegram: "Telegram",
  threads: "Threads",
  bluesky: "Bluesky",
  reddit: "Reddit",
  twitch: "Twitch",
};

/**
 * @param {string[]} [platformFilter] - When provided, only these platforms'
 *   previews render (used by NetworkCustomizeScreen to show just the
 *   channel currently being edited). Omit to show every selected platform
 *   stacked, the main composer's default behavior.
 */
export function PreviewBody({ platformFilter } = {}) {
  const { t } = useTranslation(["planner", "common"]);
  const {
    selectedPlatforms,
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
    setMediaTypeFilter,
    isEditByNetwork,
    isNetworkCustomizeOpen,
    activeNetworkTab,
    activeNetworkAccountId,
    selectedAccountIds,
    activeBrand
  } = usePostCreatorFormContext();

  const platformsToRender = platformFilter || selectedPlatforms;

  const [showAltInput, setShowAltInput] = useState(false);

  const handleThumbnailUpload = () => {
    setIsUploadingThumbnail(true);
    setMediaTypeFilter?.("image");
    setUploadModalTab("computer");
    setShowUploadModal(true);
  };

  // Mirrors ComposerBody's own account-slot resolution — when "Theo mạng"
  // is on and the account sub-tabs are showing for a given platform,
  // preview the account actually being edited instead of always the
  // platform-level entry, so what's shown here matches what the
  // caption/media inputs are writing to. Runs once per selected platform
  // (Buffer reference stacks every platform's preview simultaneously)
  // instead of just the single previously-active one.
  const getEffectiveDataForPlatform = (platform) => {
    const platformEntry = networkCustom?.[platform];
    const accountsForTab = ((isEditByNetwork || isNetworkCustomizeOpen) && activeNetworkTab === platform)
      ? (activeBrand?.socialAccounts || []).filter(
          sa => (sa.platform || '').toLowerCase() === platform && selectedAccountIds.includes(sa.id)
        )
      : [];
    const platformCustom = accountsForTab.length > 1 && activeNetworkAccountId
      ? (platformEntry?.perAccount?.[activeNetworkAccountId] || platformEntry)
      : platformEntry;
    const isPlatformCustomized = platformCustom?.useTemplate === false;
    const isThreadsPlatform = platform === 'threads';
    const firstThreadPost = isThreadsPlatform && platformCustom?.threadPosts?.[0];

    const effectiveCaption = isPlatformCustomized
      ? (isThreadsPlatform
          ? (typeof firstThreadPost === 'string' ? firstThreadPost : firstThreadPost?.text || '')
          : (platformCustom?.caption || ''))
      : caption;

    // Mirrors NetworkCustomizeScreen's own mediaItems fallback: caption and
    // media are customized independently (updateNetworkCaption only ever
    // writes { useTemplate: false, caption }, never touching mediaUrls), so
    // typing text alone flips isPlatformCustomized to true while
    // mediaUrls/threadPosts[0].mediaUrls is still empty. Without this guard
    // the preview would drop media it never actually had a per-network
    // override for, the instant the user edited only the caption.
    const rawCustomMediaItems = isThreadsPlatform
      ? ((typeof firstThreadPost === 'object' ? firstThreadPost?.mediaUrls : []) || [])
      : (platformCustom?.mediaUrls || []);
    const effectiveMediaItems = (isPlatformCustomized && rawCustomMediaItems.length > 0)
      ? rawCustomMediaItems
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

    // Mô phỏng rút gọn link thời gian thực khi sử dụng UrlShortener
    const simulatedCaption = (!effectiveCaption || !useUrlShortener)
      ? effectiveCaption
      : (() => {
          const urlRegex = /(https?:\/\/[^\s<]+)/g;
          let idx = 1;
          return effectiveCaption.replace(urlRegex, (url) => {
            if (url.includes('/sl/')) return url;
            return `https://publicast.link/link_${idx++}`;
          });
        })();

    const threadPosts = isThreadsPlatform
      ? (networkCustom?.threads?.threadPosts || null)
      : null;

    return { simulatedCaption, effectiveVideoFileUrl, effectiveVideoFile, threadPosts, effectiveMediaItems };
  };

  // ----------------------------------------------------
  // 1. MEDIA VIEWER MODE (Khi bấm nút Con Mắt Eye) — still scoped to the
  //    shared/global media, not per-platform.
  // ----------------------------------------------------
  if (showMediaViewer) {
    // When "Theo mạng" is on and a network's media was customized, the
    // upload goes through updateNetworkMedia — which never touches the
    // top-level videoFileUrl/videoFile — so reading those directly here
    // showed "No Media Uploaded" even though the customized platform (e.g.
    // Facebook Reel) clearly had a video. Fall back to the currently
    // customized platform's effective media, same as the per-platform
    // preview cards below already do via getEffectiveDataForPlatform.
    const activeCustomizedPlatform = (isEditByNetwork || isNetworkCustomizeOpen) ? activeNetworkTab : null;
    const { effectiveVideoFileUrl, effectiveVideoFile } = activeCustomizedPlatform
      ? getEffectiveDataForPlatform(activeCustomizedPlatform)
      : { effectiveVideoFileUrl: videoFileUrl, effectiveVideoFile: videoFile };
    const mediaViewerUrl = effectiveVideoFileUrl || videoFileUrl;
    const mediaViewerFile = effectiveVideoFile || videoFile;
    const isVideo = isVideoPath(mediaViewerUrl, mediaViewerFile);
    return (
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center space-y-6 bg-transparent scrollbar-thin animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-5 space-y-5 text-left font-sans">
          {/* Main Media Preview Frame */}
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-border shadow-inner">
            {mediaViewerUrl ? (
              isVideo ? (
                <video
                  src={mediaViewerUrl}
                  poster={mediaThumbnailUrl || undefined}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={mediaViewerUrl}
                  className="w-full h-full object-contain"
                  alt={altText || "Uploaded Media"}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2 p-6 text-center">
                <Play size={28} className="text-gray-300" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">No Media Uploaded</span>
                <p className="text-[10px] text-muted-foreground/80">Upload a video or photo to use the media viewer tools.</p>
              </div>
            )}
          </div>


          {/* Media Viewer Action Menu Buttons */}
          <div className="space-y-2 border-t border-border pt-3">
            {/* Button 1: Add Alt Text */}
            <button
              type="button"
              onClick={() => setShowAltInput(!showAltInput)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-muted text-foreground font-bold text-xs transition-colors cursor-pointer border border-transparent hover:border-border"
            >
              <Type size={16} className="text-muted-foreground shrink-0" />
              <span>Add alt text</span>
              {altText && (
                <span className="ml-auto text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check size={12} /> Saved
                </span>
              )}
            </button>

            {/* Expandable Alt Text Input Drawer */}
            {showAltInput && (
              <div className="p-3 bg-muted rounded-xl border border-border space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Media Alt Text (SEO & Accessibility)
                </label>
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe this media for visually impaired users..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-card rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-black/10 resize-none font-sans"
                />
              </div>
            )}

            {/* Button 2: Upload Video Thumbnail */}
            <button
              type="button"
              onClick={handleThumbnailUpload}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-muted text-foreground font-bold text-xs transition-colors cursor-pointer border border-transparent hover:border-border"
            >
              <ImageIcon size={16} className="text-muted-foreground shrink-0" />
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
  // 2. SOCIAL POST PREVIEW MODE — every selected platform's preview
  //    stacked in one scrollable column (Buffer reference), instead of a
  //    single active-platform preview switched via tabs.
  // ----------------------------------------------------
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-start space-y-10 bg-transparent scrollbar-thin">
      {platformsToRender.length === 0 && (
        <p className="text-xs text-muted-foreground font-sans">{t("planner:postCreator.preview.noPlatforms")}</p>
      )}
      {platformsToRender.map((platform) => {
        const PreviewComponent = PreviewStrategies[platform];
        if (!PreviewComponent) return null;
        const { simulatedCaption, effectiveVideoFileUrl, effectiveVideoFile, threadPosts, effectiveMediaItems } = getEffectiveDataForPlatform(platform);

        return (
          <div key={platform} className={`w-full transition-all duration-300 ${previewDevice === 'desktop' && platform === 'youtube' ? 'max-w-2xl' : 'max-w-sm'}`}>
            <div className="flex items-center gap-2 mb-3">
              <PlatformIcon platform={platform} size={16} variant="flat" />
              <span className="text-xs font-bold text-foreground font-sans">{PLATFORM_LABEL[platform] || platform}</span>
            </div>
            <PreviewComponent
              caption={simulatedCaption}
              videoFileUrl={effectiveVideoFileUrl}
              videoFile={effectiveVideoFile}
              threadPosts={threadPosts}
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
              mediaItems={effectiveMediaItems}
            />
          </div>
        );
      })}
    </div>
  );
}
