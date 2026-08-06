import * as React from "react";
import { 
  Heart, MessageCircle, Repeat2, Send, 
  MoreHorizontal, Plus, Play
} from "lucide-react";
import { isVideoPath } from "../../../../utils/url";

export function PreviewThreads({ 
  caption, 
  videoFileUrl, 
  videoFile = null,
  threadPosts = null,
  previewDevice = "mobile",
  pageName = "satnut.bongda",
  imageTransform = null
}) {
  const isVideo = isVideoPath(videoFileUrl, videoFile);
  const containerWidth = previewDevice === 'mobile' ? 'w-[320px]' : 'w-full max-w-[500px]';

  // Normalize posts list for thread chain
  const postsList = (Array.isArray(threadPosts) && threadPosts.length > 0)
    ? threadPosts.map((p) => {
        if (typeof p === 'string') return { text: p, mediaUrls: [] };
        return { text: p?.text || '', mediaUrls: p?.mediaUrls || [] };
      })
    : [{ text: caption || "What's on your mind?", mediaUrls: videoFileUrl ? [videoFileUrl] : [] }];

  const getImageStyle = (transform) => {
    if (!transform) return {};
    const { rotation = 0, flipH = false, flipV = false } = transform;
    return {
      transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
      transition: 'transform 0.3s ease'
    };
  };

  const getImageFilterClass = (filterId) => {
    switch (filterId) {
      case 'grayscale': return 'grayscale';
      case 'sepia': return 'sepia';
      case 'invert': return 'invert';
      case 'blur': return 'blur-[2px]';
      case 'warm': return 'sepia-[0.3] saturate-[1.3] hue-rotate-[-10deg]';
      case 'cool': return 'saturate-[0.9] hue-rotate-[10deg] brightness-[1.05]';
      case 'dramatic': return 'contrast-[1.2] brightness-[0.9]';
      default: return '';
    }
  };

  return (
    <div className={`${containerWidth} bg-card rounded-2xl overflow-hidden shadow-xl border border-border text-foreground font-sans mx-auto animate-in fade-in duration-300 text-left p-4 space-y-3`}>
      {/* Desktop Web Header Branding */}
      {previewDevice === "desktop" && (
        <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-[11px]">
              @
            </div>
            <span className="font-bold text-foreground">Threads</span>
          </div>
          <span className="text-[11px] text-muted-foreground">For you</span>
        </div>
      )}

      {/* Vertical Thread Chain */}
      <div className="space-y-1">
        {postsList.map((postItem, index) => {
          const isFirst = index === 0;
          const isLast = index === postsList.length - 1;
          const postText = postItem.text || (isFirst ? (caption || "What's on your mind?") : "");

          const itemMediaUrl = (postItem.mediaUrls && postItem.mediaUrls.length > 0)
            ? (typeof postItem.mediaUrls[0] === 'string' ? postItem.mediaUrls[0] : postItem.mediaUrls[0]?.previewUrl || postItem.mediaUrls[0]?.path)
            : (isFirst ? videoFileUrl : null);

          const isItemVideo = isVideoPath(itemMediaUrl, isFirst ? videoFile : null);

          return (
            <div key={index} className="flex gap-3 relative">
              {/* Left Column: Avatar + Connecting Thread Line */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative">
                  <div className={`${isFirst ? 'w-9 h-9 text-xs' : 'w-8 h-8 text-[11px]'} rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center shadow-sm`}>
                    {pageName.substring(0, 2).toUpperCase()}
                  </div>
                  {isFirst && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border-2 border-white text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                      <Plus size={10} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Connecting Vertical Thread Line */}
                <div className="w-[2px] bg-border/80 grow my-1.5 rounded-full min-h-[36px]" />

                {/* End node on last post */}
                {isLast && (
                  <div className="w-4 h-4 rounded-full bg-muted border border-border shrink-0 mb-1" />
                )}
              </div>

              {/* Right Column: Content Body & Actions */}
              <div className="grow min-w-0 space-y-2.5 pb-2">
                {/* User Meta Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold text-foreground hover:underline cursor-pointer truncate">
                      {pageName}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">· 1h</span>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                {/* Text Caption */}
                <p className="text-[12px] text-foreground leading-relaxed font-normal whitespace-pre-wrap">
                  {postText || <span className="text-muted-foreground/60 italic font-light">Empty post text...</span>}
                </p>

                {/* Media Attachment Container */}
                {itemMediaUrl ? (
                  <div className="rounded-xl overflow-hidden bg-black border border-border max-h-[320px] relative flex items-center justify-center">
                    {isItemVideo ? (
                      <video src={itemMediaUrl} controls className="w-full h-full max-h-[320px] object-cover" />
                    ) : (
                      <img 
                        src={itemMediaUrl} 
                        style={isFirst ? getImageStyle(imageTransform) : undefined}
                        className={`w-full h-full max-h-[320px] object-cover ${isFirst ? getImageFilterClass(imageTransform?.filter) : ''}`}
                        alt="Threads media" 
                      />
                    )}
                  </div>
                ) : (isFirst && !videoFileUrl) ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/40 h-28 flex flex-col items-center justify-center text-muted-foreground">
                    <Play size={18} className="text-muted-foreground/50 mb-1" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Threads Media</span>
                  </div>
                ) : null}

                {/* Action Bar (Heart, Comment, Repost, Share) */}
                <div className="flex items-center gap-4 text-foreground pt-1">
                  <button className="hover:text-red-500 transition-colors p-1 -ml-1 rounded-full hover:bg-muted">
                    <Heart size={18} />
                  </button>
                  <button className="hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                    <MessageCircle size={18} />
                  </button>
                  <button className="hover:text-green-600 transition-colors p-1 rounded-full hover:bg-muted">
                    <Repeat2 size={18} />
                  </button>
                  <button className="hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted -rotate-12">
                    <Send size={17} />
                  </button>
                </div>

                {/* Counts Info on last post */}
                {isLast && (
                  <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 pt-0.5">
                    <span>0 replies</span>
                    <span>·</span>
                    <span>0 likes</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
