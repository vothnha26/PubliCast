import * as React from "react";
import { Play, Youtube, Facebook, Instagram, Maximize2, ExternalLink } from "lucide-react";
import { PublishedPostDetailModal } from "@/pages/workspace/planner/components/PublishedPostDetailModal";

const PLATFORM_BADGE = {
  FACEBOOK: { Icon: Facebook, bg: "bg-[#1877F2]", label: "Facebook" },
  INSTAGRAM: { Icon: Instagram, bg: "bg-[#E1306C]", label: "Instagram" },
  YOUTUBE: { Icon: Youtube, bg: "bg-red-600", label: "YouTube" },
};

export const VideoContextCard = ({ videoContext, activeConv }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const ctx = videoContext || activeConv?.videoContext || {};
  const platform = (activeConv?.platform || "YOUTUBE").toUpperCase();
  // Only YouTube has a working in-app embed here — Facebook/Instagram posts
  // open on their own platform in a new tab instead of a broken iframe built
  // from a video ID that only means something to YouTube.
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

  const handlePlayClick = () => {
    if (isYoutube) {
      setIsPlaying(true);
    } else if (postUrl) {
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
      <div className="relative w-[260px] h-[360px] rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/10 group select-none flex flex-col justify-between shrink-0">
        {isPlaying && isYoutube && videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={title}
            className="absolute inset-0 w-full h-full border-0 z-20"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {/* Background Thumbnail Image or Neutral Gradient Placeholder */}
            {thumbnailUrl && !imgError ? (
              <img
                src={thumbnailUrl}
                alt={title}
                onError={() => setImgError(true)}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-stone-900 to-black flex flex-col items-center justify-center p-4 text-center">
                <badge.Icon size={44} className="text-white/60 mb-3" />
                <span className="text-xs font-semibold text-zinc-300 max-w-[200px] line-clamp-3 leading-relaxed">
                  {title}
                </span>
              </div>
            )}

            {/* Top/Bottom Dark Overlay Gradients matching Screenshot 2 */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 z-10 pointer-events-none" />

            {/* Top Overlay: Platform Badge + Channel Name + Date (Matching Screenshot 2) */}
            <div className="relative z-20 p-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-medium border border-white/20 shadow-md min-w-0">
                <span className={`w-4 h-4 rounded-full ${badge.bg} flex items-center justify-center shrink-0`}>
                  <badge.Icon size={10} className="fill-white text-white" />
                </span>
                <span className="font-bold text-white tracking-tight truncate">{channelTitle}</span>
                <span className="text-white/70 text-[10px] shrink-0">{publishedDate}</span>
              </div>

              {/* Detail popup (stats + go-to-post) + direct external link,
                  matching the reference design's two corner icons. */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailOpen(true);
                  }}
                  title="Chi tiết bài đăng"
                  className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer shadow-md"
                >
                  <Maximize2 size={12} />
                </button>
                {postUrl && (
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Xem bài đăng gốc"
                    className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors shadow-md no-underline"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Center Overlay: Circle Play Button (opens the real post for non-YouTube platforms) */}
            <div
              onClick={handlePlayClick}
              className="relative z-20 flex items-center justify-center cursor-pointer my-auto"
            >
              <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-black/80 transition-all shadow-2xl">
                <Play size={24} className="fill-white text-white ml-1" />
              </div>
            </div>

            {/* Bottom Overlay: Title & Hashtags (Matching Screenshot 2) */}
            <div className="relative z-20 p-4 text-white space-y-1 text-left">
              <h3 className="text-xs font-bold leading-snug drop-shadow-md text-white line-clamp-2 uppercase tracking-wide">
                {title}
              </h3>
              <p className="text-[11px] text-white/80 line-clamp-2 font-normal leading-relaxed">
                {ctx.caption || "SINGING MY PRAISES 2300 ngày 7/7/2026... #WorldCup2026 #Argentina"}
              </p>
            </div>
          </>
        )}
      </div>

      {isDetailOpen && (
        <PublishedPostDetailModal post={detailModalPost} onClose={() => setIsDetailOpen(false)} />
      )}
    </div>
  );
};
