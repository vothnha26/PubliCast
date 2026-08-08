import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, X } from "lucide-react";
import { FEATURE_GATE_REGISTRY } from "../../../../constants/products";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

export function FeatureGateModal() {
  const { t } = useTranslation(["planner", "common"]);
  const navigate = useNavigate();
  const {
    blockedProductId,
    setBlockedProductId,
    closePostCreator
  } = usePostCreatorFormContext();

  if (!blockedProductId) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
        <button 
          type="button"
          onClick={() => setBlockedProductId(null)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-black transition-colors cursor-pointer font-sans"
        >
          <X size={20} />
        </button>
        
        <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-purple-200 mx-auto">
          <Lock size={26} className="animate-pulse" />
        </div>
        
        <h3 className="text-xl font-bold text-foreground mb-2 font-sans">
          {FEATURE_GATE_REGISTRY[blockedProductId]?.title || "Feature Locked"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed font-sans">
          {FEATURE_GATE_REGISTRY[blockedProductId]?.description || "This channel/feature is not available on your current plan. Please upgrade."}
        </p>
        
        <button 
          type="button"
          onClick={() => {
            setBlockedProductId(null);
            closePostCreator();
            navigate('/pricing');
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 shadow-md hover:shadow-lg active:scale-95 cursor-pointer font-sans"
        >
          {t("planner:upgrade.button")}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
