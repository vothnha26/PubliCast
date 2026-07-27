import React from "react";
import { useTranslation } from "react-i18next";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PreviewStrategies } from "./PreviewStrategies";

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
    useUrlShortener
  } = usePostCreatorFormContext();

  // Mô phỏng rút gọn link thời gian thực khi sử dụng UrlShortener
  const simulatedCaption = React.useMemo(() => {
    if (!caption || !useUrlShortener) return caption;
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    let idx = 1;
    return caption.replace(urlRegex, (url) => {
      if (url.includes('/sl/')) return url;
      return `https://publicast.link/link_${idx++}`;
    });
  }, [caption, useUrlShortener]);

  const PreviewComponent = PreviewStrategies[activePlatform];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-start space-y-8 bg-transparent scrollbar-thin">
      <div className="w-full max-w-sm">
        {PreviewComponent && (
          <PreviewComponent 
            caption={simulatedCaption} 
            videoFileUrl={videoFileUrl}
            videoFile={videoFile}
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
      <p className="text-[10px] text-gray-400 text-center max-w-[280px] leading-normal font-medium uppercase tracking-tight font-sans">
        {activePlatform === 'youtube' 
          ? t("planner:postCreator.preview.body.youtubeSimulated") 
          : activePlatform === 'tiktok'
          ? t("planner:postCreator.preview.body.tiktokSimulated")
          : activePlatform === 'instagram'
          ? t("planner:postCreator.preview.body.instagramSimulated")
          : activePlatform === 'bluesky'
          ? "Bluesky AT Protocol Simulated View"
          : activePlatform === 'reddit'
          ? "Reddit Post Simulated View"
          : activePlatform === 'twitch'
          ? "Twitch Broadcast & Chat Simulated View"
          : t("planner:postCreator.preview.body.facebookSimulated")}
      </p>
    </div>
  );
}
