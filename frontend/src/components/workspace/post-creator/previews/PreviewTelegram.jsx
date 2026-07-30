import * as React from "react";
import { Eye, Send, Share2 } from "lucide-react";
import { PreviewShell } from "./PreviewShell";

export function PreviewTelegram({ 
  caption, 
  videoFileUrl, 
  previewDevice = "mobile",
  pageName = "Telegram Channel",
  imageTransform = null
}) {
  const displayCaption = caption || "Broadcast message...";

  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="chat"
      aspectRatioClass="aspect-video"
      fallbackLabel="Telegram Channel Post"
    >
      <div className="flex flex-col h-full bg-[#f4f7f9] p-4 text-left font-sans">
        {/* Channel Info Header */}
        <div className="flex items-center gap-3 border-b border-gray-200/80 pb-3 mb-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
            {pageName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-800 leading-tight">{pageName}</h4>
            <p className="text-[10px] text-gray-500 leading-tight">subscribers</p>
          </div>
        </div>

        {/* Telegram Chat Bubble Container */}
        <div className="flex-1 flex flex-col justify-end">
          <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-none shadow-sm border border-gray-100 overflow-hidden self-start">
            {/* Media Area (e.g. handled internally by layout, but for chat layout we can render preview bubble content) */}
            <div className="relative">
              {/* PreviewShell handles rendering of media, but we must construct the bubble body nicely. */}
            </div>

            {/* Bubble Text & Metadata */}
            <div className="p-3 space-y-2">
              <p className="text-[12px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                {displayCaption}
              </p>

              {/* Telegram-style metadata inside the bubble */}
              <div className="flex items-center justify-between text-[9px] text-gray-400 font-medium pt-1">
                <div className="flex items-center gap-1">
                  <Eye size={10} className="text-gray-400" />
                  <span>0</span>
                </div>
                <span>Just now</span>
              </div>
            </div>
          </div>

          {/* Quick actions row at the bottom of channel view */}
          <div className="flex items-center justify-between mt-4 px-2 text-[10px] font-semibold text-[#0088cc] shrink-0 border-t border-gray-100 pt-2">
            <button className="flex items-center gap-1.5 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-all cursor-pointer">
              <Send size={12} />
              <span>Discuss</span>
            </button>
            <button className="flex items-center gap-1.5 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-all cursor-pointer">
              <Share2 size={12} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
