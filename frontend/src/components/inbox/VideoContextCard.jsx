import * as React from "react";
import { ThumbsUp, ThumbsDown, Share2, Download, Scissors, MoreHorizontal, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

export const VideoContextCard = ({ videoContext }) => {
  const { t } = useTranslation(["manage", "common"]);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // If no videoContext is available for this thread, do not render any placeholder box
  if (!videoContext || (!videoContext.id && !videoContext.title)) {
    return null;
  }

  // Map properties from backend videoContext structure
  const title = videoContext.title || "YouTube Video";
  const channelTitle = videoContext.channelTitle || "YouTube Channel";
  const subscriberCount = videoContext.subscriberCount 
    ? `${parseInt(videoContext.subscriberCount).toLocaleString()} ${t("inbox.videoContext.subscribers", "subscribers")}`
    : `0 ${t("inbox.videoContext.subscribers", "subscribers")}`;
  const viewsCount = videoContext.viewCount 
    ? `${parseInt(videoContext.viewCount).toLocaleString()} ${t("inbox.videoContext.views", "views")}`
    : `0 ${t("inbox.videoContext.views", "views")}`;
  const publishedDate = videoContext.publishedAt 
    ? new Date(videoContext.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : "";
  const likesCount = videoContext.likeCount ? parseInt(videoContext.likeCount).toLocaleString() : "0";
  const videoId = videoContext.id;
  const thumbnailUrl = videoContext.thumbnailUrl || videoContext.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  return (
    <div className="block shrink-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden max-w-[480px] w-full mx-auto font-sans my-4 text-left animate-in fade-in duration-300">
      {/* 1. Top Video Player Box */}
      <div className="relative w-full aspect-video bg-black text-white flex flex-col justify-end p-3 overflow-hidden select-none group">
        {isPlaying && videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt={title} 
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div 
                className="absolute inset-0 bg-[#0f0f0f] flex items-center justify-center cursor-pointer"
                onClick={() => setIsPlaying(true)}
              >
                <div className="w-12 h-12 rounded-full bg-black/50 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play size={24} className="fill-white text-white ml-0.5" />
                </div>
              </div>
            )}

            {/* Overlay play button on thumbnail */}
            {thumbnailUrl && !isPlaying && (
              <div 
                className="absolute inset-0 bg-black/20 flex items-center justify-center cursor-pointer group-hover:bg-black/40 transition-colors"
                onClick={() => setIsPlaying(true)}
              >
                <div className="w-12 h-12 rounded-full bg-black/60 border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play size={24} className="fill-white text-white ml-0.5" />
                </div>
              </div>
            )}

            {/* Time Stamp Badge */}
            <div className="z-10 self-start">
              <div className="px-2.5 py-1 bg-black/80 rounded text-[11px] font-mono text-white font-bold tracking-tight">
                0:00 / 0:00
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Content Body */}
      <div className="p-5 space-y-4 bg-card text-left">
        {/* Video Title */}
        <h4 className="text-[15px] font-bold text-foreground leading-snug">
          {title}
        </h4>

        {/* Channel Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EC4899] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs uppercase">
              {channelTitle?.charAt(0) || "C"}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-foreground leading-tight">
                {channelTitle}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {subscriberCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              className="px-4 py-1.5 bg-muted hover:bg-muted/80 active:scale-95 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              {t("inbox.videoContext.join", "Join")}
            </button>
            <a 
              href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs no-underline inline-block"
            >
              {t("inbox.videoContext.subscribe", "Subscribe")}
            </a>
          </div>
        </div>

        {/* Action Pills Row */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
          {/* Like / Dislike */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-muted rounded-full text-xs font-bold text-foreground shrink-0">
            <button type="button" className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer">
              <ThumbsUp size={14} />
              <span>{likesCount}</span>
            </button>
            <span className="text-muted-foreground font-normal">|</span>
            <button type="button" className="hover:text-red-500 cursor-pointer">
              <ThumbsDown size={14} />
            </button>
          </div>

          {/* Share */}
          <a 
            href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs font-bold text-foreground transition-colors cursor-pointer whitespace-nowrap shrink-0 no-underline"
          >
            <Share2 size={14} />
            <span>{t("inbox.videoContext.share", "Share")}</span>
          </a>

          {/* Download */}
          <button 
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs font-bold text-foreground transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download size={14} />
            <span>{t("inbox.videoContext.download", "Download")}</span>
          </button>

          {/* Clip */}
          <button 
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs font-bold text-foreground transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Scissors size={14} />
            <span>{t("inbox.videoContext.clip", "Clip")}</span>
          </button>

          {/* More */}
          <button 
            type="button"
            className="p-2 bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors cursor-pointer shrink-0"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* 3. Bottom Gray Box */}
        <div className="bg-muted rounded-2xl p-4 space-y-1.5 text-xs text-foreground font-medium">
          <p className="font-bold text-foreground">
            {viewsCount}{publishedDate ? `, ${publishedDate}` : ''}
          </p>
          <span className="text-muted-foreground font-bold block cursor-pointer hover:underline">
            ...more
          </span>
        </div>
      </div>
    </div>
  );
};
