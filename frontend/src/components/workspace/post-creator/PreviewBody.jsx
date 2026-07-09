import React from "react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PreviewStrategies } from "./PreviewStrategies";

export function PreviewBody() {
  const {
    activePlatform,
    caption,
    videoFileUrl,
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
    albumMedia
  } = usePostCreatorFormContext();

  const PreviewComponent = PreviewStrategies[activePlatform];

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10 flex flex-col items-center justify-start space-y-8 bg-gray-50/30 scrollbar-thin">
      <div className="w-full max-w-sm">
        {PreviewComponent && (
          <PreviewComponent 
            caption={caption} 
            videoFileUrl={videoFileUrl} 
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
          ? 'YouTube descriptions and setup parameters are fully simulated and will be included in your post' 
          : activePlatform === 'tiktok'
          ? 'TikTok video presets and details are fully simulated and will be included in your post'
          : activePlatform === 'instagram'
          ? 'Instagram photos, Reels, and Stories are fully simulated and will be published on your account'
          : 'Facebook status updates, photos, and videos are fully supported and will be published on your feed'}
      </p>
    </div>
  );
}
