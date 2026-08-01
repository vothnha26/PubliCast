import * as React from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AutoListHelpCard() {
  const { t } = useTranslation("planner");
  return (
    <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 flex items-start gap-4 text-left shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      {/* Decorative gradient overlay */}
      <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-card/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
      
      <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
        <RefreshCw size={18} className="animate-spin duration-10000" />
      </div>
      <div className="space-y-1.5 z-10">
        <h4 className="text-sm font-bold text-foreground">{t("autolists.helpTitle")}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          {t("autolists.helpDesc")}
        </p>
        <div className="flex items-center gap-4 pt-1.5 text-[11px] text-[#4338CA]/80 font-semibold">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[#3B82F6]" /> {t("autolists.helpStep1")}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[#3B82F6]" /> {t("autolists.helpStep2")}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[#3B82F6]" /> {t("autolists.helpStep3")}
          </span>
        </div>
      </div>
    </div>
  );
}
