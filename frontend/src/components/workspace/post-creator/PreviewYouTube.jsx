import * as React from "react";
import { useState, useRef } from "react";
import { 
  Folder, ThumbsUp, MessageSquare, Share2, Download, MoreHorizontal,
  Play, Pause, SkipBack, SkipForward, Music
} from "lucide-react";
import { ShortsIcon } from "./ShortsIcon";
import { PreviewShell } from "./PreviewShell";

function ThumbsDown({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.99-2.28l.83-8.29A2 2 0 0 1 5.01 2h10.75a2 2 0 0 1 2 2v10.29a2 2 0 0 1-.58 1.41l-3.92 3.92a2.38 2.38 0 0 1-3.26 0z" />
    </svg>
  );
}

export function PreviewYouTube({ 
  caption, 
  videoFileUrl,
  videoFile = null,
  youtubeType = "video", 
  youtubeTitle = "", 
  youtubePlaylistId = "", 
  playlists = [], 
  youtubeTags = "", 
  youtubeFirstComment = "", 
  globalFirstComment = "", 
  previewDevice = "mobile",
  channelName = "CodeChick" 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef(null);

  const activePlaylist = playlists.find(p => p.id === youtubePlaylistId);
  const tagsList = youtubeTags ? youtubeTags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const displayTitle = youtubeTitle || "New Video Title";
  const firstCommentText = youtubeFirstComment || globalFirstComment;

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

  // 1. YOUTUBE SHORTS (Vertical)
  if (youtubeType === 'short') {
    if (previewDevice === 'mobile') {
      return (
        <PreviewShell
          videoFileUrl={videoFileUrl}
          videoFile={videoFile}
          previewDevice={previewDevice}
          layout="vertical"
          fallbackLabel="Short Preview"
          fallbackIcon={<ShortsIcon size={40} className="text-red-500 mb-2 animate-bounce" />}
        >
          {/* Right Overlay Actions */}
          <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 z-10 pointer-events-auto text-center">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"><ThumbsUp size={16}/></div>
              <span className="text-[9px] font-bold mt-1 text-white">Like</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                <ThumbsDown size={16} />
              </div>
              <span className="text-[9px] font-bold mt-1 text-white">Dislike</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"><MessageSquare size={16}/></div>
              <span className="text-[9px] font-bold mt-1 text-white">{firstCommentText ? "1" : "0"}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"><Share2 size={16}/></div>
              <span className="text-[9px] font-bold mt-1 text-white">Share</span>
            </div>
          </div>

          {/* Left Bottom Overlay Text */}
          <div className="absolute left-4 bottom-4 right-16 text-left z-10 space-y-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 rounded-2xl pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center text-[8px] font-black text-white">C</div>
              <span className="text-[11px] font-black tracking-wide text-white">@{channelName}</span>
              <span className="px-2 py-0.5 bg-red-600 rounded-full text-[8px] font-black uppercase text-white">Subscribe</span>
            </div>
            <p className="text-[11px] font-bold leading-snug line-clamp-2 text-gray-100">{displayTitle}</p>
            {caption && <p className="text-[9px] text-gray-300 line-clamp-1 font-medium">{caption}</p>}
            {tagsList.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tagsList.slice(0, 3).map((t, idx) => (
                  <span key={idx} className="text-[9px] font-bold text-blue-300">#{t}</span>
                ))}
              </div>
            )}
            {activePlaylist && (
              <span className="inline-flex items-center gap-1 text-[8px] font-black text-yellow-400 bg-yellow-400/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                <Folder size={8}/> {activePlaylist.title}
              </span>
            )}
          </div>
        </PreviewShell>
      );
    } else {
      // Desktop / Review (Shorts) - Dạng Card đồng bộ như TikTok
      return (
        <div className="w-full max-w-[480px] bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-sans text-gray-900 mx-auto animate-in fade-in duration-300">
          {/* Header: Channel Info & Audio */}
          <div className="flex items-start gap-3 mb-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-gray-100">
              {channelName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900 leading-none">@{channelName}</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-650 rounded-full text-[8px] font-black uppercase">Subscribe</span>
              </div>
              {/* Audio/Shorts Info */}
              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-2 font-medium">
                <Music size={12} className="text-gray-400 shrink-0" />
                <span className="truncate max-w-[200px]">Original Sound - YouTube Shorts</span>
              </div>
            </div>
          </div>

          {/* Main Content Layout (Flex Row) */}
          <div className="flex items-stretch gap-5">
            {/* Left: Video Box (Tỷ lệ 9:16) */}
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
                <div className="w-full h-full bg-black flex items-center justify-center text-white/50 text-[10px] uppercase font-bold tracking-widest">
                  Shorts Preview
                </div>
              )}

              {/* Video Controls Overlay */}
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

              {/* YouTube Shorts Watermark Overlay */}
              <div className="absolute right-3 bottom-3 flex items-center gap-1 bg-red-600/95 text-white text-[8px] font-bold px-2 py-1 rounded-md pointer-events-none select-none shadow-md">
                <ShortsIcon size={10} className="text-white" />
                <span>SHORTS</span>
              </div>
            </div>

            {/* Right: Interaction Icons */}
            <div className="flex flex-col items-center justify-center gap-5 shrink-0 py-2 text-gray-800">
              {/* Like */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={handleLike} className="w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer">
                  <ThumbsUp size={16} className={`transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-800'}`} />
                </button>
                <span className="text-xs font-bold text-gray-500">Like</span>
              </div>

              {/* Dislike */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" className="w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer">
                  <ThumbsDown size={16} />
                </button>
                <span className="text-xs font-bold text-gray-500">Dislike</span>
              </div>

              {/* Comment */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" className="w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer">
                  <MessageSquare size={16} />
                </button>
                <span className="text-xs font-bold text-gray-500">{firstCommentText ? "1" : "0"}</span>
              </div>

              {/* Share */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" className="w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer">
                  <Share2 size={16} />
                </button>
                <span className="text-xs font-bold text-gray-500">Share</span>
              </div>
            </div>
          </div>

          {/* Caption / Description below */}
          {(displayTitle || caption) && (
            <div className="mt-4 pt-3 border-t border-gray-50 text-left">
              {displayTitle && <h4 className="text-xs font-bold text-gray-900 leading-snug mb-1">{displayTitle}</h4>}
              {caption && <p className="text-xs font-medium text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3">{caption}</p>}
            </div>
          )}
        </div>
      );
    }
  }

  // 2. YOUTUBE LONG-FORM VIDEO (Standard)
  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      videoFile={videoFile}
      previewDevice={previewDevice}
      layout="card"
      aspectRatioClass="aspect-video"
      fallbackLabel="Video Preview"
    >
      {/* Body details and actions */}
      <div className="p-4 space-y-3.5 text-left">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">{displayTitle}</h3>
          <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">0 views · May 24, 2026</span>
          {caption && (
            <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap mt-2 bg-gray-50 p-2 rounded-xl border border-gray-100/50 line-clamp-3">
              {caption}
            </p>
          )}
        </div>

        {activePlaylist && (
          <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
            <Folder size={12} className="text-gray-400" />
            <span className="text-[9px] font-bold text-gray-600 truncate">Playlist: {activePlaylist.title}</span>
          </div>
        )}

        {tagsList.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tagsList.map((t, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-bold">#{t}</span>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between border-t border-b border-gray-50 py-2.5">
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center text-white text-[9px] font-bold">C</div>
              <span className="text-[10px] font-bold text-gray-800">{channelName}</span>
           </div>
           <button className="px-3.5 py-1 bg-black text-white rounded-full text-[9px] font-bold">Subscribe</button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
           {[
             { icon: <ThumbsUp size={12}/>, label: "0" },
             { icon: <ThumbsDown size={12} />, label: "" },
             { icon: <Share2 size={12}/>, label: "Share" },
             { icon: <Download size={12}/>, label: "Download" }
           ].map((btn, idx) => (
             <div key={idx} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 rounded-full text-gray-500 whitespace-nowrap text-[9px] font-bold">
                {btn.icon}
                {btn.label && <span>{btn.label}</span>}
             </div>
           ))}
           <div className="p-1.5 bg-gray-50 rounded-full text-gray-500"><MoreHorizontal size={12}/></div>
        </div>

        {/* Comment Preview */}
        {firstCommentText && (
          <div className="pt-2 border-t border-gray-50 space-y-1.5">
            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">First Comment Preview</span>
            <div className="p-3 bg-gray-50 rounded-2xl flex items-start gap-2.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">C</div>
              <div className="space-y-0.5">
                <span className="block text-[9px] font-black text-gray-700">@{channelName}</span>
                <p className="text-[10px] font-semibold text-gray-600 leading-normal">{firstCommentText}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PreviewShell>
  );
}
