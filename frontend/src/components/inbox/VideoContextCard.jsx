import * as React from "react";
import { Youtube, Facebook, Instagram, Maximize2, ExternalLink } from "lucide-react";
import { PublishedPostDetailModal } from "@/pages/workspace/planner/components/PublishedPostDetailModal";

const PLATFORM_BADGE = {
  FACEBOOK: { Icon: Facebook, bg: "bg-[#1877F2]", label: "Facebook" },
  INSTAGRAM: { Icon: Instagram, bg: "bg-[#E1306C]", label: "Instagram" },
  YOUTUBE: { Icon: Youtube, bg: "bg-red-600", label: "YouTube" },
};

export const VideoContextCard = ({ videoContext, activeConv }) => {
  const [imgError, setImgError] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const ctx = videoContext || activeConv?.videoContext || {};
  const platform = (activeConv?.platform || "YOUTUBE").toUpperCase();
  const isYoutube = platform === "YOUTUBE";
  const badge = PLATFORM_BADGE[platform] || PLATFORM_BADGE.YOUTUBE;

  const title = ctx.title || activeConv?.title || "Video Post";
  const channelTitle = ctx.channelTitle || activeConv?.channelTitle || activeConv?.brandName || "CodeChick";
  const publishedDate = ctx.publishedAt
    ? new Date(ctx.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Jul 7, 4:32 PM";

  const videoId = ctx.id || activeConv?.videoContext?.id || (typeof activeConv?.id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(activeConv.id) ? activeConv.id : null);
  const postUrl = ctx.postUrl || activeConv?.videoContext?.postUrl || null;

  const rawThumb = ctx.thumbnailUrl || ctx.thumbnail || activeConv?.thumbnailUrl;

  let thumbnailUrl = null;
  if (rawThumb && !rawThumb.includes('dicebear') && !rawThumb.includes('unsplash')) {
    thumbnailUrl = rawThumb;
  } else if (isYoutube && videoId) {
    thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  const handleThumbnailClick = () => {
    if (postUrl) {
      window.open(postUrl, "_blank", "noopener,noreferrer");
    }
  };

  // PublishedPostDetailModal was built for Planner posts (platformPostId as
  // a JSON map, targetPlatforms as a comma string) — adapt the Inbox's
  // already-resolved videoContext/activeConv fields into that same shape
  // rather than reworking the modal's data contract.
  const detailModalPost = {
    id: videoId,
    platformPostId: videoId,
    targetPlatforms: platform,
    caption: ctx.caption || title,
    mediaUrls: thumbnailUrl ? [thumbnailUrl] : [],
    thumbnail: thumbnailUrl,
    publishedAt: ctx.publishedAt || activeConv?.publishedAt || activeConv?.createdAt || null,
    socialAccountId: activeConv?.socialAccountId || null,
    brandId: activeConv?.brandId || null,
    channelTitle: channelTitle,
    avatarUrl: activeConv?.profilePictureUrl || activeConv?.avatarUrl || null,
    status: "published",
    options: postUrl ? { permalinkUrl: postUrl } : undefined,
    stats: {
      views: ctx.views || ctx.viewCount || activeConv?.views || activeConv?.viewCount || 0,
      likes: ctx.likes || ctx.likeCount || activeConv?.likes || activeConv?.reactions || activeConv?.reactionsCount || 0,
      comments: ctx.comments || ctx.commentCount || activeConv?.comments || activeConv?.commentCount || 0,
      shares: ctx.shares || ctx.shareCount || activeConv?.shares || 0,
      clicks: ctx.clicks || ctx.clickCount || activeConv?.clicks || 0,
      engagement: ctx.engagement || activeConv?.engagement || "-"
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center my-2 font-sans animate-in fade-in duration-300">
      {/* 1. Video Reel Player Box (Matching Screenshot 2 - 9:16 vertical aspect ratio) */}
      <div className="w-[260px] rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/10 select-none shrink-0">
        {/* Content block: platform badge, channel, date, title, caption */}
        <div className="p-3.5 space-y-2 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-4 h-4 rounded-full ${badge.bg} flex items-center justify-center shrink-0`}>
                <badge.Icon size={10} className="fill-white text-white" />
              </span>
              <span className="font-bold text-white text-[11px] tracking-tight truncate">{channelTitle}</span>
              <span className="text-white/60 text-[10px] shrink-0">{publishedDate}</span>
            </div>

            {/* Detail popup (stats + go-to-post) + direct external link */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsDetailOpen(true)}
                title="Chi tiết bài đăng"
                className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer shadow-md"
              >
                <Maximize2 size={12} />
              </button>
              {postUrl && (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Xem bài đăng gốc"
                  className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-md no-underline"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          <h3 className="text-xs font-bold leading-snug text-white line-clamp-2 uppercase tracking-wide">
            {title}
          </h3>
          {ctx.caption && (
            <p className="text-[11px] text-white/70 line-clamp-3 font-normal leading-relaxed">
              {ctx.caption}
            </p>
          )}
        </div>

        {/* Thumbnail block: clicking it opens the original post/video on its platform */}
        <div
          onClick={handleThumbnailClick}
          role={postUrl ? "button" : undefined}
          title={postUrl ? "Xem bài đăng gốc" : undefined}
          className={`relative w-full aspect-video bg-zinc-900 ${postUrl ? "cursor-pointer group" : ""}`}
        >
          {thumbnailUrl && !imgError ? (
            <img
              src={thumbnailUrl}
              alt={title}
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-stone-900 to-black flex flex-col items-center justify-center p-4 text-center">
              <badge.Icon size={36} className="text-white/60" />
            </div>
          )}
          {postUrl && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
            </div>
          )}
        </div>
      </div>

      {isDetailOpen && (
        <PublishedPostDetailModal post={detailModalPost} onClose={() => setIsDetailOpen(false)} />
      )}
    </div>
  );
};
