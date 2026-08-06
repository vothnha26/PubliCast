import * as React from "react";
import { 
  MoreHorizontal, Globe, ThumbsUp, MessageSquare, Share2, 
  Send, Music, Volume2, Plus
} from "lucide-react";
import { PreviewShell } from "./PreviewShell";

import { PreviewFacebookAlbum } from "./PreviewFacebookAlbum";

export function PreviewFacebook({
  caption,
  videoFileUrl,
  videoFile = null,
  previewDevice = "mobile",
  pageName = "PubliCast Fanpage",
  facebookType = "post",
  facebookTitle = "",
  imageTransform = null,
  mediaItems = []
}) {
  const displayCaption = caption || "What's on your mind?";

  // 0. ALBUM PREVIEW DESIGN — ≥2 photos auto-routes to Facebook's album
  // strategy server-side (facebook-post.service.js), so the preview mirrors
  // that: it's no longer gated behind a separate "Album" post type, just
  // however many photos are actually selected.
  if (facebookType !== "reel" && facebookType !== "story" && mediaItems.length >= 2) {
    return (
      <PreviewFacebookAlbum
        caption={caption}
        albumMedia={mediaItems}
        previewDevice={previewDevice}
        pageName={pageName}
      />
    );
  }

  // 1. REEL PREVIEW DESIGN
  if (facebookType === "reel") {
    return (
      <PreviewShell
        videoFileUrl={videoFileUrl}
        videoFile={videoFile}
        previewDevice={previewDevice}
        imageTransform={imageTransform}
        layout="vertical"
        fallbackLabel="Facebook Reels"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 pt-4 w-full pointer-events-auto">
          <span className="text-sm font-bold tracking-tight">Reels</span>
          <button className="text-white hover:text-gray-200 transition-colors">
            <Volume2 size={18} />
          </button>
        </div>

        {/* Right Drawer Action Icons */}
        <div className="absolute right-3 bottom-14 flex flex-col items-center gap-5 pointer-events-auto text-center">
          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <ThumbsUp size={22} className="text-white group-hover:scale-110 transition-transform hover:text-[#1877F2]" />
            <span className="text-[9px] font-semibold">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <MessageSquare size={22} className="text-white group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-semibold">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <Share2 size={20} className="text-white group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-semibold">Share</span>
          </button>

          <button className="text-white">
            <MoreHorizontal size={18} />
          </button>

          {/* User profile bubble */}
          <div className="w-7 h-7 rounded-full border border-white overflow-hidden bg-gray-800 flex items-center justify-center font-bold text-[8px]">
            {pageName.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Bottom Details */}
        <div className="p-4 space-y-2.5 text-left max-w-[210px] mt-auto pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center font-bold text-[9px] text-white shadow-inner">
              {pageName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-bold hover:underline cursor-pointer block leading-tight">
                {pageName}
              </span>
              <span className="text-[8px] text-white/70 font-semibold block">Follow</span>
            </div>
          </div>

          {facebookTitle && (
            <h4 className="text-[11px] font-bold text-white leading-tight">
              {facebookTitle}
            </h4>
          )}

          <p className="text-[10px] font-medium leading-normal text-white/95 whitespace-pre-wrap max-h-[60px] overflow-hidden text-ellipsis line-clamp-2">
            {displayCaption}
          </p>

          <div className="flex items-center gap-1 text-[9px] text-white/80 bg-black/30 w-fit px-2 py-0.5 rounded-md truncate max-w-[170px]">
            <Music size={10} className="shrink-0 animate-pulse" />
            <span className="truncate">Original Audio</span>
          </div>
        </div>
      </PreviewShell>
    );
  }

  // 2. STORY PREVIEW DESIGN
  if (facebookType === "story") {
    return (
      <PreviewShell
        videoFileUrl={videoFileUrl}
        videoFile={videoFile}
        previewDevice={previewDevice}
        imageTransform={imageTransform}
        layout="vertical"
        fallbackLabel="Facebook Story"
      >
        {/* Top Indicators & Profile */}
        <div className="px-3 pt-3 space-y-2 w-full pointer-events-auto">
          {/* Progress bar line */}
          <div className="w-full h-[2px] bg-card/30 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-card rounded-full animate-pulse" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center font-bold text-[9px] text-white">
                {pageName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-extrabold hover:underline cursor-pointer">{pageName}</span>
              <span className="text-[9px] text-white/60 font-semibold">1h</span>
            </div>
            <button className="text-white">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Bottom Story interactions */}
        <div className="p-3 flex items-center gap-3 bg-gradient-to-t from-black/50 to-transparent w-full mt-auto pointer-events-auto">
          <div className="flex-1 px-4 py-2 border border-white/40 rounded-full bg-black/20 text-[10px] text-white/80 placeholder-white/60 text-left font-medium">
            Send message...
          </div>
          <button className="text-white hover:text-gray-200 transition-colors">
            <ThumbsUp size={20} />
          </button>
        </div>
      </PreviewShell>
    );
  }

  // 3. POST PREVIEW DESIGN (Facebook Feed Card)
  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      videoFile={videoFile}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="card"
      aspectRatioClass="aspect-video"
      fallbackLabel="Facebook Feed Post"
    >
      {/* Header Slot */}
      <div slot="header" className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner">
            {pageName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold text-foreground leading-tight hover:underline cursor-pointer">
              {pageName}
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-tight mt-0.5">
              <span>Just now</span>
              <span>·</span>
              <Globe size={10} className="text-muted-foreground" />
            </div>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-muted-foreground p-1.5 hover:bg-muted rounded-full transition-all">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Body Details Slot */}
      <div className="px-4 pb-4 space-y-3.5 text-left">
        <p className="text-[11px] font-medium leading-relaxed text-foreground whitespace-pre-wrap px-0.5">
          {displayCaption}
        </p>

        {/* Media area is handled by PreviewShell */}

        {/* Analytics Action Counts Bar */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold border-b border-border pb-2.5 px-0.5">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white ring-1 ring-white">
                <ThumbsUp size={8} className="fill-current text-white" />
              </div>
            </div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-2">
            <span>0 comments</span>
            <span>·</span>
            <span>0 shares</span>
          </div>
        </div>

        {/* Interactivity Buttons */}
        <div className="flex items-center justify-between pt-0.5 px-1 text-muted-foreground">
          <button className="flex items-center gap-1.5 hover:bg-muted px-3 py-2 rounded-xl transition-all cursor-pointer group text-[10px] font-black uppercase tracking-wider">
            <ThumbsUp size={14} className="group-hover:scale-110 transition-transform group-hover:text-[#1877F2]" />
            <span>Like</span>
          </button>
          <button className="flex items-center gap-1.5 hover:bg-muted px-3 py-2 rounded-xl transition-all cursor-pointer group text-[10px] font-black uppercase tracking-wider">
            <MessageSquare size={14} className="group-hover:scale-110 transition-transform" />
            <span>Comment</span>
          </button>
          <button className="flex items-center gap-1.5 hover:bg-muted px-3 py-2 rounded-xl transition-all cursor-pointer group text-[10px] font-black uppercase tracking-wider">
            <Share2 size={14} className="group-hover:scale-110 transition-transform" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </PreviewShell>
  );
}
