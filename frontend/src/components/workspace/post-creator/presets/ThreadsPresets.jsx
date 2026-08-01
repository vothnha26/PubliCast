import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { PlatformIcon } from "../../../shared/PlatformIcon";

export function ThreadsPresets() {
  const { t } = useTranslation(["planner"]);
  const {
    threadsOpen,
    setThreadsOpen,
    threadsWhoCanReply,
    setThreadsWhoCanReply
  } = usePostCreatorFormContext();

  return (
    <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
      <div 
        onClick={() => setThreadsOpen(!threadsOpen)}
        className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <PlatformIcon platform="Threads" size={18} variant="flat" className="text-black" />
          <span className="text-[12px] font-bold text-foreground font-sans">{t("planner:postCreator.presets.threads.title")}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${threadsOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${threadsOpen ? 'max-h-[300px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.threads.whoCanReply")}</label>
            <div className="relative">
              <select
                value={threadsWhoCanReply}
                onChange={(e) => setThreadsWhoCanReply(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
              >
                <option value="everyone">{t("planner:postCreator.presets.threads.everyone")}</option>
                <option value="accounts_you_follow">{t("planner:postCreator.presets.threads.accountsYouFollow")}</option>
                <option value="mentioned_only">{t("planner:postCreator.presets.threads.mentionedOnly")}</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium leading-normal font-sans">
              {t("planner:postCreator.presets.threads.replyLimitDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
