import * as React from "react";
import { Youtube, ThumbsUp, Share2, Download, Scissors, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

export const VideoContextCard = ({ videoContext }) => {
  const { t } = useTranslation(["manage", "common"]);
  if (!videoContext) return null;

  return (
    <a 
      href={`https://www.youtube.com/watch?v=${videoContext.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden max-w-[500px] mx-auto animate-in slide-in-from-top-4 duration-300 hover:border-gray-200 transition-all group/card no-underline"
    >
      <div className="p-5 space-y-4">
        <h5 className="text-[14px] font-bold text-[#0A0A0A] leading-tight line-clamp-2 group-hover/card:text-blue-600 transition-colors">
          {videoContext.title}
        </h5>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF7ACC] flex items-center justify-center text-white text-[10px] font-bold">
              {videoContext.channelTitle?.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-gray-800">{videoContext.channelTitle}</span>
              <span className="text-[10px] text-gray-400 font-medium">{parseInt(videoContext.subscriberCount || 0).toLocaleString()} {t("inbox.videoContext.subscribers")}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-700">{t("inbox.videoContext.join")}</div>
            <div className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-bold">{t("inbox.videoContext.subscribe")}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-gray-50 pt-4 overflow-x-auto no-scrollbar">
          {[
            { icon: <ThumbsUp size={14}/>, label: parseInt(videoContext.likeCount || 0).toLocaleString() },
            { icon: <Share2 size={14}/>, label: t("inbox.videoContext.share") },
            { icon: <Download size={14}/>, label: t("inbox.videoContext.download") },
            { icon: <Scissors size={14}/>, label: t("inbox.videoContext.clip") }
          ].map((btn, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-gray-550 whitespace-nowrap">
              {btn.icon}
              <span className="text-[10px] font-bold">{btn.label}</span>
            </div>
          ))}
          <div className="p-1.5 bg-gray-50 rounded-full text-gray-550"><MoreHorizontal size={14}/></div>
        </div>
      </div>
      <div className="px-5 py-3 bg-[#F3F4F6]/50 border-t border-gray-50">
        <p className="text-[11px] text-gray-600 font-medium">
          {parseInt(videoContext.viewCount || 0).toLocaleString()} {t("inbox.videoContext.views")}, {new Date(videoContext.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t("inbox.videoContext.more")}</span>
      </div>
    </a>
  );
};
