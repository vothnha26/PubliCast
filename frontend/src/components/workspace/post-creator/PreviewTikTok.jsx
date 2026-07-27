import * as React from "react";
import { 
  Heart, MessageCircle, Bookmark, Share2, 
  Search, Music, ChevronLeft, Plus
} from "lucide-react";
import { PreviewShell } from "./PreviewShell";

export function PreviewTikTok({ 
  caption, 
  videoFileUrl, 
  videoFile = null,
  previewDevice = "mobile",
  pageName = "nhvthanh77",
  imageTransform = null
}) {
  const displayCaption = caption || "What's on your mind?";

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
      <div className="absolute right-3 bottom-12 flex flex-col items-center gap-4 pointer-events-auto text-center">
        {/* User avatar with Red Plus button */}
        <div className="relative mb-2">
          <div className="w-10 h-10 rounded-full border-2 border-white bg-black/50 flex items-center justify-center font-bold text-xs shadow-lg">
            {pageName.substring(0, 2).toUpperCase()}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FE2C55] rounded-full flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform">
            <Plus size={10} strokeWidth={3} />
          </div>
        </div>

        {/* Like Button */}
        <button className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all">
            <Heart size={20} className="text-white group-hover:scale-110 transition-transform group-hover:text-[#FE2C55] group-hover:fill-[#FE2C55]" />
          </div>
          <span className="text-[9px] font-bold text-white/90">0</span>
        </button>

        {/* Comment Button */}
        <button className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all">
            <MessageCircle size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[9px] font-bold text-white/90">0</span>
        </button>

        {/* Favorites/Bookmark Button */}
        <button className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all">
            <Bookmark size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[9px] font-bold text-white/90">0</span>
        </button>

        {/* Share Button */}
        <button className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all">
            <Share2 size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[9px] font-bold text-white/90">0</span>
        </button>

        {/* Spinning CD Disk Icon */}
        <div className="w-9 h-9 rounded-full bg-black/50 border border-white/20 flex items-center justify-center animate-spin duration-3000 mt-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-700 to-black flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Bottom Info details Panel */}
      <div className="w-full mt-auto flex flex-col justify-end">
        <div className="p-4 space-y-2 text-left max-w-[210px] pointer-events-auto">
          {/* Username */}
          <span className="text-[12px] font-bold hover:underline cursor-pointer block">
            @{pageName}
          </span>

          {/* Caption */}
          <p className="text-[10px] font-medium leading-normal text-white/90 whitespace-pre-wrap max-h-[70px] overflow-hidden text-ellipsis line-clamp-3">
            {displayCaption}
          </p>

          {/* Music Line */}
          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-white/80 bg-black/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm truncate max-w-[180px]">
            <Music size={10} className="shrink-0 animate-pulse" />
            <span className="truncate">Original Sound - @nhvthanh77</span>
          </div>
        </div>

        {/* TikTok Bottom Navigation Bar Simulation */}
        <div className="h-10 border-t border-white/5 bg-black/80 flex items-center justify-around text-[9px] font-bold text-white/60 w-full pointer-events-auto">
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
