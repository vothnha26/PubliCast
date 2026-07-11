import * as React from "react";
import { Layers, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AutoListEmptyState({ onCreateClick }) {
  const { t } = useTranslation("planner");
  return (
    <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shadow-inner mb-2 animate-bounce duration-1000">
        <Layers size={28} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-gray-900">{t("autolists.noAutolists")}</h3>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">{t("autolists.noAutolistsDesc")}</p>
      </div>
      <button 
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] hover:bg-black text-white rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
      >
        <Plus size={16} /> {t("autolists.createFirst")}
      </button>
    </div>
  );
}
