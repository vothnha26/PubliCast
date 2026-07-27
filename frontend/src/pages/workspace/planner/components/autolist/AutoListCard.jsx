import {
  Play, Pause, RefreshCw, ChevronRight, Layers, Calendar, Clock,
  Youtube, PlayCircle, Instagram, Facebook, Trash2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "../../../../../components/shared/PlatformIcon";

const PLATFORM_BADGES = {
  YOUTUBE: { icon: <Youtube size={11} />, color: "bg-red-50 text-red-600 border-red-100/80", label: "YouTube" },
  TIKTOK: { icon: <PlayCircle size={11} />, color: "bg-gray-50 text-gray-900 border-gray-200", label: "TikTok" },
  INSTAGRAM: { icon: <Instagram size={11} />, color: "bg-pink-50 text-pink-600 border-pink-100/80", label: "Instagram" },
  FACEBOOK: { icon: <Facebook size={11} />, color: "bg-blue-50 text-blue-600 border-blue-100/80", label: "Facebook" },
  THREADS: { icon: <PlatformIcon platform="Threads" size={11} variant="flat" />, color: "bg-gray-50 text-gray-800 border-gray-200", label: "Threads" },
  BLUESKY: { icon: <PlatformIcon platform="Bluesky" size={11} variant="flat" />, color: "bg-sky-50 text-sky-600 border-sky-100/80", label: "Bluesky" },
};


const borderLeftColors = {
  YOUTUBE: "border-l-4 border-l-[#FF0000]",
  TIKTOK: "border-l-4 border-l-[#010101]",
  INSTAGRAM: "border-l-4 border-l-[#E1306C]",
  FACEBOOK: "border-l-4 border-l-[#1877F2]",
  DEFAULT: "border-l-4 border-l-gray-300"
};

export function AutoListCard({ list, onToggle, onRefresh, onDelete, onNavigate }) {
  const { t } = useTranslation("planner");
  const progress = list.totalPostsCount > 0 
    ? Math.round((list.publishedPostsCount / list.totalPostsCount) * 100) 
    : 0;

  // Calculating SVG dash array
  const radius = 28;
  const circumference = 2 * Math.PI * radius; // ~175.9
  const strokeDashoffset = circumference * (1 - progress / 100);

  const platforms = list.targetPlatforms ? list.targetPlatforms.split(',').filter(Boolean) : [];
  const firstPlatform = platforms[0] || "DEFAULT";
  const leftBorderClass = borderLeftColors[firstPlatform] || borderLeftColors.DEFAULT;

  const formatInterval = (minutes) => {
    if (!minutes) return t("autolists.card.notConfigured");
    if (minutes % 1440 === 0) {
      const days = minutes / 1440;
      return t("autolists.card.days", { n: days });
    }
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return t("autolists.card.hours", { n: hours });
    }
    return t("autolists.card.minutes", { n: minutes });
  };

  return (
    <div className={`bg-white/90 backdrop-blur-md border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center gap-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group text-left ${leftBorderClass}`}>
      {/* Circular Progress */}
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={radius} fill="transparent" stroke="#F3F4F6" strokeWidth="5" />
          <circle 
            cx="32" cy="32" r={radius} fill="transparent" 
            stroke={list.isActive ? "url(#activeGradient)" : "#E5E7EB"} 
            strokeWidth="5" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A3E635" />
              <stop offset="100%" stopColor="#4ADE80" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black text-gray-700">{progress}%</span>
        </div>
      </div>

      {/* Info Container */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-base font-bold text-[#0A0A0A] truncate leading-snug group-hover:text-black transition-colors">{list.name}</h3>
          
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 border ${
            list.isActive 
              ? "bg-[#D9F99D]/40 text-[#4D7C0F] border-[#D9F99D]/60" 
              : "bg-gray-100 text-gray-500 border-gray-250"
          }`}>
            {list.isActive ? t("autolists.card.active") : t("autolists.card.paused")}
          </span>

          {list.loopEnabled && (
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 shadow-sm shrink-0">
              <RefreshCw size={10} className="text-indigo-500 animate-spin-slow" />
              {t("autolists.card.loop")}
            </span>
          )}
        </div>
        
        {/* Platform Badges */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {platforms.map(p => {
              const badge = PLATFORM_BADGES[p];
              if (!badge) return null;
              return (
                <span key={p} className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-bold tracking-tight shadow-sm/5 ${badge.color}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-4 text-gray-400 text-xs pt-0.5">
          <div className="flex items-center gap-1.5 font-semibold">
            <Layers size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            <span>{list.publishedPostsCount} / {list.totalPostsCount} {t("autolists.card.active") === "Active" ? "posts" : "bài đăng"}</span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5 font-semibold">
            <Clock size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            <span>
              {list.scheduleType === 'INTERVAL' 
                ? t("autolists.card.everyInterval", { interval: formatInterval(list.intervalMinutes) })
                : t("autolists.card.specificTime")
              }
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button 
          onClick={() => onToggle(list.id)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border cursor-pointer ${
            list.isActive 
              ? "bg-white text-gray-700 hover:bg-gray-50 border-gray-150" 
              : "bg-gray-900 text-white hover:bg-black border-transparent"
          }`}
          title={list.isActive ? t("autolists.card.pauseBtn") : t("autolists.card.activateBtn")}
        >
          {list.isActive ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <button 
          onClick={() => onRefresh && onRefresh(list.id)}
          className="w-10 h-10 rounded-xl bg-white border border-gray-150 flex items-center justify-center text-gray-500 hover:text-black hover:border-gray-300 transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
          title={t("autolists.card.refreshTitle")}
        >
          <RefreshCw size={16} />
        </button>
        
        {onDelete && (
          <button 
            onClick={() => onDelete(list.id)}
            className="w-10 h-10 rounded-xl bg-white border border-red-100 hover:bg-red-50 flex items-center justify-center text-red-500 hover:text-red-600 transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
            title={t("autolists.card.deleteTitle")}
          >
            <Trash2 size={16} />
          </button>
        )}

        <button 
          onClick={() => onNavigate(list.id)}
          className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-900 border border-gray-150 hover:border-transparent flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 cursor-pointer shadow-sm"
          title={t("autolists.card.configTitle")}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
