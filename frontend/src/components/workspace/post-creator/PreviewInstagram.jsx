import * as React from "react";
import { 
  Heart, MessageCircle, Send, Bookmark, 
  MoreHorizontal, Volume2, User
} from "lucide-react";
import { PreviewShell } from "./PreviewShell";

export function PreviewInstagram({ 
  caption, 
  videoFileUrl, 
  previewDevice = "mobile",
  pageName = "instagram_creator",
  instagramType = "post", // 'post' | 'reel' | 'story'
  imageTransform = null
}) {
  const displayCaption = caption || "What's on your mind?";

  // 1. REEL PREVIEW DESIGN
  if (instagramType === "reel") {
    return (
      <PreviewShell
        videoFileUrl={videoFileUrl}
        previewDevice={previewDevice}
        imageTransform={imageTransform}
        layout="vertical"
        fallbackLabel="Instagram Reels"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 pt-4 w-full pointer-events-auto">
          <span className="text-sm font-bold tracking-tight">Reels</span>
          <button className="text-white hover:text-gray-200 transition-colors">
            <Volume2 size={18} />
          </button>
        </div>

        {/* Right Action Icons Overlay */}
        <div className="absolute right-3 bottom-14 flex flex-col items-center gap-5 pointer-events-auto text-center">
          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <Heart size={22} className="text-white group-hover:scale-110 transition-transform hover:text-red-500" />
            <span className="text-[9px] font-semibold">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <MessageCircle size={22} className="text-white group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-semibold">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <Send size={20} className="text-white -rotate-12 group-hover:scale-110 transition-transform" />
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <Bookmark size={20} className="text-white group-hover:scale-110 transition-transform" />
          </button>

          <button className="text-white">
            <MoreHorizontal size={18} />
          </button>

          {/* User profile bubble */}
          <div className="w-6 h-6 rounded-lg border border-white overflow-hidden bg-gray-800 flex items-center justify-center font-bold text-[8px]">
            {pageName.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Bottom Details */}
        <div className="p-4 space-y-2 text-left max-w-[210px] mt-auto pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-0.5">
              <div className="w-full h-full rounded-full bg-black border border-black flex items-center justify-center font-bold text-[8px] text-white">
                {pageName.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <span className="text-xs font-bold hover:underline cursor-pointer">
              {pageName}
            </span>
          </div>

          <p className="text-[10px] font-medium leading-normal text-white/95 whitespace-pre-wrap max-h-[60px] overflow-hidden text-ellipsis line-clamp-2">
            {displayCaption}
          </p>
        </div>
      </PreviewShell>
    );
  }

  // 2. STORY PREVIEW DESIGN
  if (instagramType === "story") {
    return (
      <PreviewShell
        videoFileUrl={videoFileUrl}
        previewDevice={previewDevice}
        imageTransform={imageTransform}
        layout="vertical"
        fallbackLabel="Instagram Story"
      >
        {/* Top Indicators & Profile */}
        <div className="px-3 pt-3 space-y-2 w-full pointer-events-auto">
          {/* Progress bar line */}
          <div className="w-full h-[2px] bg-white/30 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-white rounded-full animate-pulse" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-full bg-white/20 p-0.5">
                <div className="w-full h-full rounded-full bg-black border border-white/20 flex items-center justify-center font-bold text-[8px] text-white">
                  {pageName.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <span className="text-[10px] font-extrabold hover:underline cursor-pointer">{pageName}</span>
              <span className="text-[9px] text-white/60 font-semibold">1h</span>
            </div>
            <button className="text-white">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="p-3 flex items-center gap-3 bg-gradient-to-t from-black/50 to-transparent w-full mt-auto pointer-events-auto">
          <div className="flex-1 px-4 py-2 border border-white/40 rounded-full bg-black/20 text-[10px] text-white/80 placeholder-white/60 text-left font-medium">
            Send message...
          </div>
          <button className="text-white hover:text-gray-200 transition-colors">
            <Heart size={20} />
          </button>
          <button className="text-white hover:text-gray-200 transition-colors -rotate-12">
            <Send size={18} />
          </button>
        </div>
      </PreviewShell>
    );
  }

  // 3. POST PREVIEW DESIGN (Instagram Feed Card)
  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="card"
      aspectRatioClass="aspect-square"
      fallbackLabel="Feed Post Preview"
      fallbackIcon={<User size={22} className="text-gray-400" />}
    >
      {/* Header Slot */}
      <div slot="header" className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[1.5px]">
            <div className="w-full h-full rounded-full bg-white border border-white flex items-center justify-center font-bold text-[9px] text-gray-800">
              {pageName.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs font-bold hover:underline cursor-pointer leading-tight text-gray-950">{pageName}</div>
            <div className="text-[8px] text-gray-400 font-semibold leading-tight">Sponsored</div>
          </div>
        </div>
        <button className="text-gray-700 hover:text-black">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Footer Content */}
      <div className="px-3 pt-3 pb-4 space-y-2 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button className="text-gray-800 hover:text-red-500 hover:scale-110 transition-transform">
              <Heart size={20} />
            </button>
            <button className="text-gray-800 hover:scale-110 transition-transform">
              <MessageCircle size={20} />
            </button>
            <button className="text-gray-800 hover:scale-110 transition-transform -rotate-12">
              <Send size={18} />
            </button>
          </div>
          <button className="text-gray-800 hover:scale-110 transition-transform">
            <Bookmark size={20} />
          </button>
        </div>

        <div className="text-[10.5px] font-bold text-gray-900 leading-tight">
          Liked by <b>you</b> and <b>others</b>
        </div>

        <div className="text-[10.5px] leading-relaxed text-gray-800 font-medium">
          <span className="font-bold hover:underline cursor-pointer mr-1.5">{pageName}</span>
          <span className="whitespace-pre-wrap">{displayCaption}</span>
        </div>

        <div className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider mt-1">
          1 minute ago
        </div>
      </div>
    </PreviewShell>
  );
}
