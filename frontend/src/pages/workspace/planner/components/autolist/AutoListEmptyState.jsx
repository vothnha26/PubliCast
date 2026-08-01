import * as React from "react";
import { Layers, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AutoListEmptyState({ onCreateClick }) {
  const { t } = useTranslation("planner");
  return (
    <div className="bg-card backdrop-blur-md border border-border rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground border border-border shadow-inner mb-2 animate-bounce duration-1000">
        <Layers size={28} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">{t("autolists.noAutolists")}</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">{t("autolists.noAutolistsDesc")}</p>
      </div>
      <button 
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] dark:bg-lime-400 text-white dark:text-black rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
      >
        <Plus size={16} /> {t("autolists.createFirst")}
      </button>
    </div>
  );
}
