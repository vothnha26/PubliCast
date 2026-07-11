import React from "react";
import { Youtube, Instagram, Linkedin, Send, MessageSquare, AlertCircle, Smartphone, Monitor, Eye } from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";

export function PreviewHeader() {
  const {
    selectedPlatforms,
    activePlatform,
    setActivePlatform,
    previewDevice,
    setPreviewDevice
  } = usePostCreatorFormContext();

  return (
    <div className="shrink-0 px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
      <div className="flex items-center gap-2">
        {selectedPlatforms.map((platform) => {
          const isActive = platform === activePlatform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => setActivePlatform(platform)}
              title={`Switch to ${platform} preview`}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all cursor-pointer hover:scale-105 ${
                isActive ? 'bg-black text-white scale-110' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'
              }`}
            >
              {platform === 'youtube' ? (
                <Youtube size={18} className={isActive ? 'text-white fill-white' : 'text-[#FF0000] fill-[#FF0000]'} />
              ) : platform === 'tiktok' ? (
                <svg className={`w-4.5 h-4.5 ${isActive ? 'text-white fill-white' : 'text-black fill-current'}`} viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                </svg>
              ) : platform === 'instagram' ? (
                <Instagram size={18} className={isActive ? 'text-white' : 'text-[#DD2A7B]'} />
              ) : platform === 'linkedin' ? (
                <Linkedin size={18} className={isActive ? 'text-white' : 'text-[#0077B5] fill-[#0077B5]'} />
              ) : platform === 'telegram' ? (
                <Send size={16} className={`rotate-45 ${isActive ? 'text-white' : 'text-[#0088cc] fill-[#0088cc]'}`} />
              ) : platform === 'discord' ? (
                <MessageSquare size={18} className={isActive ? 'text-white' : 'text-[#5865F2]'} />
              ) : platform === 'threads' ? (
                <span className="text-[10px] font-black tracking-tight">Th</span>
              ) : (
                <svg className={`w-4.5 h-4.5 ${isActive ? 'text-white fill-white' : 'text-[#1877F2] fill-[#1877F2]'}`} viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
            </button>
          );
        })}
        {selectedPlatforms.length === 0 && (
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-300">
            <AlertCircle size={20} />
          </div>
        )}
      </div>
      <div className="flex gap-2 bg-white/50 p-1 rounded-2xl backdrop-blur-md">
        <button type="button" onClick={() => setPreviewDevice("review")} className={`p-2 rounded-xl transition-all cursor-pointer ${previewDevice === 'review' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`} title="Review mode"><Eye size={18} /></button>
        <button type="button" onClick={() => setPreviewDevice("mobile")} className={`p-2 rounded-xl transition-all cursor-pointer ${previewDevice === 'mobile' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`} title="Mobile view"><Smartphone size={18} /></button>
        <button type="button" onClick={() => setPreviewDevice("desktop")} className={`p-2 rounded-xl transition-all cursor-pointer ${previewDevice === 'desktop' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`} title="Desktop view"><Monitor size={18} /></button>
      </div>
    </div>
  );
}
