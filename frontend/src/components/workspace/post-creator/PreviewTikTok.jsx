import * as React from "react";
import { useState, useRef } from "react";
import { 
  Heart, MessageCircle, Bookmark, Share2, 
  Search, Music, ChevronLeft, Plus, Play, Pause, SkipBack, SkipForward
} from "lucide-react";
import { PreviewShell } from "./PreviewShell";

export function PreviewTikTok({ 
  caption, 
  videoFileUrl, 
  previewDevice = "mobile",
  pageName = "nh.vo2005",
  imageTransform = null
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef(null);

  const displayCaption = caption || "What's on your mind?";
  const username = pageName || "nh.vo2005";
  const displayName = username === "nh.vo2005" ? "Nhã Võ" : (username === "nhvthanh77" ? "Nhà Võ" : username);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => console.log("Video play interrupted", err));
      }
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  // 1. DESKTOP / REVIEW MODE (Như hình thiết kế yêu cầu)
  if (previewDevice === "desktop" || previewDevice === "review") {
    return (
      <div className="w-full max-w-[480px] bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-sans text-gray-900 mx-auto animate-in fade-in duration-300">
        {/* Header: User Info & Music */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-gray-100">
            {username.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 leading-none">{username}</span>
              <span className="text-xs text-gray-400 leading-none">{displayName}</span>
            </div>
            {/* Song info */}
            <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-2 font-medium">
              <Music size={12} className="text-gray-400 shrink-0" />
              <span className="truncate max-w-[200px]">Song Name - Author</span>
            </div>
          </div>
        </div>

        {/* Main Content Layout (Flex Row) */}
        <div className="flex items-stretch gap-5">
          {/* Left: Video Box (Tỷ lệ 9:16 dọc) */}
          <div className="relative flex-1 aspect-[9/16] bg-black rounded-[16px] overflow-hidden flex items-center justify-center group shadow-inner border border-gray-900/10">
            {videoFileUrl ? (
              <video
                ref={videoRef}
                src={videoFileUrl}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                onClick={togglePlay}
              />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center" />
            )}

            {/* Video Control Buttons Overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-6 bg-black/10 opacity-100 transition-opacity pointer-events-auto">
              <button type="button" className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all p-2 rounded-full bg-black/15 backdrop-blur-[2px]">
                <SkipBack size={18} fill="currentColor" />
              </button>
              <button type="button" onClick={togglePlay} className="text-white hover:scale-110 active:scale-95 transition-all p-3 rounded-full bg-white/20 backdrop-blur-[4px] border border-white/30">
                {isPlaying ? <Pause size={22} fill="currentColor" className="text-white" /> : <Play size={22} fill="currentColor" className="text-white ml-0.5" />}
              </button>
              <button type="button" className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all p-2 rounded-full bg-black/15 backdrop-blur-[2px]">
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>

            {/* TikTok Watermark Overlay */}
            <div className="absolute right-3 bottom-3 flex items-center gap-1.5 pointer-events-none select-none drop-shadow-md">
              <svg className="w-3.5 h-3.5 text-white fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
              </svg>
              <span className="text-[10px] font-bold text-white/90 font-mono tracking-tight">@{username}</span>
            </div>
          </div>

          {/* Right: Interaction Icons */}
          <div className="flex flex-col items-center justify-center gap-6 shrink-0 py-4">
            {/* Like */}
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={handleLike} className="w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer">
                <Heart size={18} className={`transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-850'}`} />
              </button>
              <span className="text-xs font-bold text-gray-500">0</span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center gap-1">
              <button type="button" className="w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer">
                <MessageCircle size={18} className="text-gray-850" />
              </button>
              <span className="text-xs font-bold text-gray-500">0</span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center gap-1">
              <button type="button" className="w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer">
                <Share2 size={18} className="text-gray-850" />
              </button>
              <span className="text-xs font-bold text-gray-500">0</span>
            </div>
          </div>
        </div>

        {/* Caption below */}
        {caption && (
          <div className="mt-4 pt-3 border-t border-gray-50 text-left">
            <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
              {caption}
            </p>
          </div>
        )}
      </div>
    );
  }

  // 2. MOBILE MODE (Full screen video giả lập app đứng)
  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="vertical"
      fallbackLabel="TikTok Video Preview"
    >
      {/* Top Header Navigation Overlay */}
      <div className="flex items-center justify-between px-4 pt-4 w-full pointer-events-auto">
        <button type="button" className="text-white/80 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-4 text-xs font-semibold text-white/60">
          <span className="cursor-pointer hover:text-white transition-colors">Following</span>
          <span className="text-white border-b-2 border-white pb-1 font-bold">For You</span>
        </div>
        <button type="button" className="text-white/80 hover:text-white transition-colors">
          <Search size={18} />
        </button>
      </div>

      {/* Right Drawer Action Icons */}
      <div className="absolute right-3 bottom-12 flex flex-col items-center gap-4 pointer-events-auto text-center">
        {/* User avatar with Red Plus button */}
        <div className="relative mb-2">
          <div className="w-10 h-10 rounded-full border-2 border-white bg-black/50 flex items-center justify-center font-bold text-xs shadow-lg text-white">
            {username.substring(0, 2).toUpperCase()}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FE2C55] rounded-full flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform">
            <Plus size={10} strokeWidth={3} />
          </div>
        </div>

        {/* Like Button */}
        <button type="button" onClick={handleLike} className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all">
            <Heart size={20} className={`transition-transform group-hover:scale-110 ${isLiked ? 'text-[#FE2C55] fill-[#FE2C55]' : 'text-white'}`} />
          </div>
          <span className="text-[9px] font-bold text-white/90">0</span>
        </button>

        {/* Comment Button */}
        <button type="button" className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all">
            <MessageCircle size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[9px] font-bold text-white/90">0</span>
        </button>

        {/* Favorites/Bookmark Button */}
        <button type="button" className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all">
            <Bookmark size={20} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[9px] font-bold text-white/90">0</span>
        </button>

        {/* Share Button */}
        <button type="button" className="flex flex-col items-center gap-1 cursor-pointer group">
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
      <div className="w-full mt-auto flex flex-col justify-end text-white">
        <div className="p-4 space-y-2 text-left max-w-[210px] pointer-events-auto">
          {/* Username */}
          <span className="text-[12px] font-bold hover:underline cursor-pointer block">
            @{username}
          </span>

          {/* Caption */}
          <p className="text-[10px] font-medium leading-normal text-white/90 whitespace-pre-wrap max-h-[70px] overflow-hidden text-ellipsis line-clamp-3">
            {displayCaption}
          </p>

          {/* Music Line */}
          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-white/80 bg-black/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm truncate max-w-[180px]">
            <Music size={10} className="shrink-0 animate-pulse" />
            <span className="truncate">Original Sound - @{username}</span>
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
