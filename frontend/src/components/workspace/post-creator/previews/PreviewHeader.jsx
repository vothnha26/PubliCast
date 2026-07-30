import React from "react";
import { useTranslation } from "react-i18next";
import { Youtube, Instagram, Send, AlertCircle, Smartphone, Monitor, Eye } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

import { PlatformIcon } from "../../../shared/PlatformIcon";

export function PreviewHeader() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    selectedPlatforms,
    activePlatform,
    setActivePlatform,
    previewDevice,
    setPreviewDevice,
    showMediaViewer,
    setShowMediaViewer
  } = usePostCreatorFormContext();

  return (
    <div className="shrink-0 px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white z-10 font-sans">
      <div className="flex items-center gap-2">
        {selectedPlatforms.map((platform) => {
          const isActive = platform === activePlatform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => setActivePlatform(platform)}
              title={t("planner:postCreator.preview.header.switchPreview", { platform })}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isActive 
                  ? 'bg-gray-100 ring-2 ring-gray-900/10 scale-105 shadow-sm' 
                  : 'bg-transparent hover:bg-gray-50 text-gray-400 opacity-70 hover:opacity-100'
              }`}
            >
              {platform === 'youtube' ? (
                <Youtube size={20} className="text-[#FF0000] fill-[#FF0000]" />
              ) : platform === 'tiktok' ? (
                <svg className="w-4.5 h-4.5 text-black fill-current" viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                </svg>
              ) : platform === 'instagram' ? (
                <Instagram size={20} className="text-[#DD2A7B]" />
              ) : platform === 'telegram' ? (
                <Send size={18} className="rotate-45 text-[#0088cc] fill-[#0088cc]" />
              ) : platform === 'threads' ? (
                <PlatformIcon platform="Threads" size={18} variant="flat" className="text-black" />
              ) : (
                <svg className="w-5 h-5 text-[#1877F2] fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
            </button>
          );
        })}
        {selectedPlatforms.length === 0 && (
          <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
            <AlertCircle size={18} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
        <button 
          type="button" 
          onClick={() => setShowMediaViewer(!showMediaViewer)}
          title={showMediaViewer ? "Show post preview" : "Show media viewer"} 
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            showMediaViewer ? 'bg-black text-white shadow-sm' : 'text-gray-700 hover:bg-white/60 bg-white border border-gray-200/60 shadow-sm'
          }`}
        >
          <Eye size={15} />
        </button>
        <div className="w-px h-4 bg-gray-300 my-auto mx-0.5" />
        <button 
          type="button" 
          onClick={() => setPreviewDevice("mobile")} 
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            previewDevice === 'mobile' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-black hover:bg-white/60'
          }`}
        >
          <Smartphone size={15} />
        </button>
        <button 
          type="button" 
          onClick={() => setPreviewDevice("desktop")} 
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            previewDevice === 'desktop' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-black hover:bg-white/60'
          }`}
        >
          <Monitor size={15} />
        </button>
      </div>
    </div>
  );
}

