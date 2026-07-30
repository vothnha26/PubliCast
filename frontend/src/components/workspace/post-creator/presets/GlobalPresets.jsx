import React from "react";
import { useTranslation } from "react-i18next";
import { Settings, ChevronDown, Link2 } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

export function GlobalPresets() {
  const { t } = useTranslation(["planner"]);
  const {
    globalOpen,
    setGlobalOpen,
    globalFirstComment,
    setGlobalFirstComment,
    useUrlShortener,
    setUseUrlShortener
  } = usePostCreatorFormContext();

  return (
    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
      <div 
        onClick={() => setGlobalOpen(!globalOpen)}
        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-gray-400 group-hover:text-black transition-colors" />
          <span className="text-[12px] font-bold text-gray-700 font-sans">{t("planner:postCreator.presets.global.title")}</span>
          <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] rounded-lg text-[9px] font-bold font-sans">{t("planner:postCreator.presets.global.newBadge")}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${globalOpen ? 'rotate-180 text-black' : ''}`} />
      </div>
      
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${globalOpen ? 'max-h-[500px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-sans">{t("planner:postCreator.presets.global.firstComment")}</label>
            <textarea 
              value={globalFirstComment}
              onChange={(e) => setGlobalFirstComment(e.target.value)}
              placeholder={t("planner:postCreator.presets.global.firstCommentPlaceholder")}
              className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-medium focus:border-black outline-none resize-none h-20 font-sans"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm text-gray-500">
                <Link2 size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-gray-800 font-sans">{t("planner:postCreator.presets.global.smartLinks")}</div>
                <div className="text-[10px] text-gray-400 font-medium font-sans">{t("planner:postCreator.presets.global.smartLinksDesc")}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseUrlShortener(!useUrlShortener)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useUrlShortener ? 'bg-black' : 'bg-gray-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useUrlShortener ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
