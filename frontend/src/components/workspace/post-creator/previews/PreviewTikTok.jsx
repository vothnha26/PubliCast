import * as React from "react";
import { 
  Heart, MessageCircle, Bookmark, Share2, 
  Search, Music, ChevronLeft, Plus, Play
} from "lucide-react";
import { PreviewShell } from "./PreviewShell";

export function PreviewTikTok({ 
  caption, 
  videoFileUrl, 
  videoFile = null,
  previewDevice = "mobile",
  pageName = "nh.vo2005",
  imageTransform = null
}) {
  const displayCaption = caption || "What's on your mind?";

  // ----------------------------------------------------
  // DESKTOP TIKTOK WEB PREVIEW LAYOUT
  // ----------------------------------------------------
  if (previewDevice === "desktop") {
    return (
      <div className="w-full max-w-[520px] bg-[#121212] rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 text-white font-sans mx-auto animate-in fade-in duration-300">
        {/* Main Feed Container */}
        <div className="p-4 flex gap-4">
          {/* Left / Center Video Container (9:16 vertical player frame inside desktop web) */}
          <div className="relative w-[280px] h-[460px] bg-black rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-neutral-800 shadow-inner group">
            {videoFileUrl ? (
              <video src={videoFileUrl} muted autoPlay loop className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-500">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-2">
                  <Play size={20} className="fill-current ml-0.5 text-neutral-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">TikTok Video</span>
              </div>
            )}

            {/* Dark bottom gradient overlay for Desktop Video Player */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Bottom info on video */}
            <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1">
              <span className="text-xs font-bold text-white hover:underline cursor-pointer block drop-shadow-md">
                @{pageName}
              </span>
              <p className="text-[11px] text-white/90 line-clamp-2 leading-tight drop-shadow-md">
                {displayCaption}
              </p>
              <div className="flex items-center gap-1 text-[9px] text-white/80 font-medium pt-1">
                <Music size={10} className="animate-pulse shrink-0" />
                <span className="truncate">Original Sound - @{pageName}</span>
              </div>
            </div>

            {/* TikTok Watermark at bottom right */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-extrabold tracking-tight text-white/90">
              <span className="text-[#25F4EE]">Tik</span>
              <span className="text-[#FE2C55]">Tok</span>
            </div>
          </div>

          {/* Right Action & Details Sidebar */}
          <div className="flex flex-col justify-between py-2 grow">
            {/* Top User Info */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#25F4EE] to-[#FE2C55] p-[2px]">
                  <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs">
                    {pageName.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold hover:underline cursor-pointer">{pageName}</span>
                    <span className="text-[10px] text-neutral-400">· 1h ago</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block">@{pageName}</span>
                </div>
              </div>
              <button className="px-3 py-1 bg-[#FE2C55] hover:bg-[#e02649] text-white font-bold text-[11px] rounded-md transition-colors shadow-md">
                Follow
              </button>
            </div>

            {/* Desktop Interaction Buttons (Vertical Stack) */}
            <div className="flex flex-col gap-4 py-4">
              {/* Like */}
              <button className="flex items-center gap-3 cursor-pointer group text-neutral-300 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center transition-all">
                  <Heart size={20} className="group-hover:text-[#FE2C55] group-hover:fill-[#FE2C55] transition-colors" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">0</span>
                  <span className="text-[10px] text-neutral-400">Likes</span>
                </div>
              </button>

              {/* Comment */}
              <button className="flex items-center gap-3 cursor-pointer group text-neutral-300 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center transition-all">
                  <MessageCircle size={20} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">0</span>
                  <span className="text-[10px] text-neutral-400">Comments</span>
                </div>
              </button>

              {/* Favorites */}
              <button className="flex items-center gap-3 cursor-pointer group text-neutral-300 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center transition-all">
                  <Bookmark size={20} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">0</span>
                  <span className="text-[10px] text-neutral-400">Favorites</span>
                </div>
              </button>

              {/* Share */}
              <button className="flex items-center gap-3 cursor-pointer group text-neutral-300 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center transition-all">
                  <Share2 size={20} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">0</span>
                  <span className="text-[10px] text-neutral-400">Shares</span>
                </div>
              </button>
            </div>

            {/* Bottom Audio Info */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5 truncate">
                <Music size={12} className="animate-spin duration-3000 shrink-0 text-[#25F4EE]" />
                <span className="truncate">Original sound - {pageName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MOBILE TIKTOK APP PREVIEW LAYOUT (Vertical Phone)
  // ----------------------------------------------------
  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      videoFile={videoFile}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="vertical"
      fallbackLabel="TikTok Video Preview"
    >
      {/* Top Header Navigation Overlay */}
      <div className="flex items-center justify-between px-4 pt-4 w-full pointer-events-auto">
        <button className="text-white/80 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-4 text-xs font-semibold text-white/60">
          <span className="cursor-pointer hover:text-white transition-colors">Following</span>
          <span className="text-white border-b-2 border-white pb-1 font-bold">For You</span>
        </div>
        <button className="text-white/80 hover:text-white transition-colors">
          <Search size={18} />
        </button>
      </div>

      {/* Right Drawer Action Icons */}
      <div className="absolute right-3 bottom-14 flex flex-col items-center gap-3.5 pointer-events-auto text-center z-20">
        {/* User avatar with Red Plus button */}
        <div className="relative mb-1">
          <div className="w-10 h-10 rounded-full border-2 border-white bg-neutral-900 flex items-center justify-center font-bold text-xs shadow-lg text-white">
            {pageName.substring(0, 2).toUpperCase()}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FE2C55] rounded-full flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform">
            <Plus size={10} strokeWidth={3} />
          </div>
        </div>

        {/* Like Button */}
        <button className="flex flex-col items-center gap-0.5 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all">
            <Heart size={20} className="text-white group-hover:scale-110 transition-transform group-hover:text-[#FE2C55] group-hover:fill-[#FE2C55]" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow">0</span>
        </button>

        {/* Comment Button */}
        <button className="flex flex-col items-center gap-0.5 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all">
            <MessageCircle size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow">0</span>
        </button>

        {/* Favorites/Bookmark Button */}
        <button className="flex flex-col items-center gap-0.5 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all">
            <Bookmark size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow">0</span>
        </button>

        {/* Share Button */}
        <button className="flex flex-col items-center gap-0.5 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all">
            <Share2 size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow">0</span>
        </button>

        {/* Spinning CD Disk Icon */}
        <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center animate-spin duration-3000 mt-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-700 to-black flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Bottom Info details Panel */}
      <div className="w-full mt-auto flex flex-col justify-end">
        <div className="p-3 pb-2 space-y-1.5 text-left max-w-[210px] pointer-events-auto">
          {/* Username */}
          <span className="text-[12px] font-bold hover:underline cursor-pointer block drop-shadow text-white">
            @{pageName}
          </span>

          {/* Caption */}
          <p className="text-[10px] font-medium leading-normal text-white/90 whitespace-pre-wrap max-h-[60px] overflow-hidden text-ellipsis line-clamp-3 drop-shadow">
            {displayCaption}
          </p>

          {/* Music Line */}
          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-white/90 bg-black/30 w-fit px-2 py-0.5 rounded-lg backdrop-blur-sm truncate max-w-[180px]">
            <Music size={10} className="shrink-0 animate-pulse" />
            <span className="truncate">Original Sound - @{pageName}</span>
          </div>
        </div>

        {/* TikTok Bottom Navigation Bar Simulation */}
        <div className="h-10 border-t border-white/10 bg-black/90 flex items-center justify-around text-[9px] font-bold text-white/60 w-full pointer-events-auto">
          <span className="text-white">Home</span>
          <span>Friends</span>
          {/* Post Plus button */}
          <div className="relative w-9 h-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#FE2C55] rounded-lg -translate-x-0.5" />
            <div className="absolute inset-0 bg-[#25F4EE] rounded-lg translate-x-0.5" />
            <div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center text-black">
              <Plus size={14} strokeWidth={3} />
            </div>
          </div>
          <span>Inbox</span>
          <span>Profile</span>
        </div>
      </div>
    </PreviewShell>
  );
}
