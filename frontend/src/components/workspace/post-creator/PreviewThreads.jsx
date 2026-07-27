import * as React from "react";
import { 
  Heart, MessageCircle, Repeat2, Send, 
  MoreHorizontal, User
} from "lucide-react";
import { PreviewShell } from "./PreviewShell";

export function PreviewThreads({ 
  caption, 
  videoFileUrl, 
  previewDevice = "mobile",
  pageName = "threads_creator",
  imageTransform = null
}) {
  const displayCaption = caption || "Bạn đang nghĩ gì?";

  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="card"
      aspectRatioClass="aspect-video"
      fallbackLabel="Threads Post Preview"
      fallbackIcon={<User size={22} className="text-gray-400" />}
    >
      {/* Header Slot */}
      <div slot="header" className="flex items-center justify-between p-3.5 border-b border-gray-50 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center font-bold text-[9px] text-white overflow-hidden">
            {pageName.substring(0, 2).toUpperCase()}
          </div>
          <div className="text-left">
            <div className="text-xs font-black text-gray-950 hover:underline cursor-pointer leading-tight flex items-center gap-1">
              {pageName}
              <span className="text-[10px] text-gray-400 font-bold">1h</span>
            </div>
            <div className="text-[9px] text-gray-400 font-bold leading-tight">threads.net</div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-black">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Footer Content */}
      <div className="px-4 pt-3.5 pb-4 space-y-3.5 text-left bg-white">
        <div className="text-[11px] leading-relaxed text-gray-800 font-medium whitespace-pre-wrap">
          {displayCaption}
        </div>

        {/* Media or Placeholder is rendered inside PreviewShell body between header & footer slots */}

        <div className="flex items-center gap-4 text-gray-500 pt-1">
          <button className="hover:text-red-500 transition-colors">
            <Heart size={16} />
          </button>
          <button className="hover:text-black transition-colors">
            <MessageCircle size={16} />
          </button>
          <button className="hover:text-green-500 transition-colors">
            <Repeat2 size={16} />
          </button>
          <button className="hover:text-black transition-colors -rotate-12">
            <Send size={15} />
          </button>
        </div>

        <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
          <span>0 lượt trả lời</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>0 lượt thích</span>
        </div>
      </div>
    </PreviewShell>
  );
}
