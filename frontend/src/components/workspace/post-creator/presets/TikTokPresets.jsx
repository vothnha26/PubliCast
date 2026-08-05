import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { PLATFORMS } from "../../../../constants/platforms";

export function TikTokPresets() {
  const { t } = useTranslation(["planner"]);
  const {
    tiktokOpen,
    setTiktokOpen,
    tiktokPrivacy,
    setTiktokPrivacy,
    tiktokAllowComments,
    setTiktokAllowComments,
    tiktokAllowDuet,
    setTiktokAllowDuet,
    tiktokAllowStitch,
    setTiktokAllowStitch,
    tiktokAiGenerated,
    setTiktokAiGenerated,
    tiktokCommercialContent,
    setTiktokCommercialContent,
    selectedAccountIds,
    activeBrand,
    networkCustom,
    activeNetworkAccountId,
    updateNetworkSetting
  } = usePostCreatorFormContext();

  // Same per-account settings pattern as YouTubePresets — see its comment
  // for the full rationale (composer-audit P0.4 / SRS FR-3.4).
  const tiktokAccounts = (activeBrand?.socialAccounts || []).filter(
    sa => (sa.platform || '').toUpperCase() === PLATFORMS.TIKTOK.toUpperCase() && selectedAccountIds.includes(sa.id)
  );
  const hasAccountSettings = tiktokAccounts.length > 1 && !!activeNetworkAccountId;
  const accountSettings = hasAccountSettings
    ? (networkCustom?.[PLATFORMS.TIKTOK]?.perAccount?.[activeNetworkAccountId]?.settings || {})
    : null;

  const effectivePrivacy = hasAccountSettings && accountSettings.privacy !== undefined ? accountSettings.privacy : tiktokPrivacy;
  const effectiveAllowComments = hasAccountSettings && accountSettings.allowComments !== undefined ? accountSettings.allowComments : tiktokAllowComments;
  const effectiveAllowDuet = hasAccountSettings && accountSettings.allowDuet !== undefined ? accountSettings.allowDuet : tiktokAllowDuet;
  const effectiveAllowStitch = hasAccountSettings && accountSettings.allowStitch !== undefined ? accountSettings.allowStitch : tiktokAllowStitch;
  const effectiveAiGenerated = hasAccountSettings && accountSettings.aiGenerated !== undefined ? accountSettings.aiGenerated : tiktokAiGenerated;
  const effectiveCommercialContent = hasAccountSettings && accountSettings.commercialContent !== undefined ? accountSettings.commercialContent : tiktokCommercialContent;

  const handleSettingChange = (key, flatSetter, value) => {
    if (hasAccountSettings) {
      updateNetworkSetting(PLATFORMS.TIKTOK, key, value, activeNetworkAccountId);
    } else {
      flatSetter(value);
    }
  };

  return (
    <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
      <div 
        onClick={() => setTiktokOpen(!tiktokOpen)}
        className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <svg className="w-[18px] h-[18px] text-black fill-current" viewBox="0 0 24 24">
            <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
          </svg>
          <span className="text-[12px] font-bold text-foreground font-sans">{t("planner:postCreator.presets.tiktok.title")}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${tiktokOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${tiktokOpen ? 'max-h-[500px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-5 text-left">
          
          {/* Privacy dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.tiktok.whoCanView")}</label>
            <div className="relative">
              <select
                value={effectivePrivacy}
                onChange={(e) => handleSettingChange('privacy', setTiktokPrivacy, e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
              >
                <option value="public">{t("planner:postCreator.presets.tiktok.public")}</option>
                <option value="friends">{t("planner:postCreator.presets.tiktok.friends")}</option>
                <option value="self">{t("planner:postCreator.presets.tiktok.self")}</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* 3 Switches */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-50">
            <div className="flex flex-col items-start gap-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase font-sans">{t("planner:postCreator.presets.tiktok.allowComments")}</span>
              <button
                type="button"
                onClick={() => handleSettingChange('allowComments', setTiktokAllowComments, !effectiveAllowComments)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                  effectiveAllowComments ? 'bg-black' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                    effectiveAllowComments ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase font-sans">{t("planner:postCreator.presets.tiktok.allowDuet")}</span>
              <button
                type="button"
                onClick={() => handleSettingChange('allowDuet', setTiktokAllowDuet, !effectiveAllowDuet)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                  effectiveAllowDuet ? 'bg-black' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                    effectiveAllowDuet ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase font-sans">{t("planner:postCreator.presets.tiktok.allowStitch")}</span>
              <button
                type="button"
                onClick={() => handleSettingChange('allowStitch', setTiktokAllowStitch, !effectiveAllowStitch)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                  effectiveAllowStitch ? 'bg-black' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                    effectiveAllowStitch ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* AI and Commercial Switches */}
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-left">
                <span className="block text-[11px] font-bold text-muted-foreground uppercase font-sans">{t("planner:postCreator.presets.tiktok.aiGenerated")}</span>
                <span className="text-[9px] text-muted-foreground font-medium font-sans">{t("planner:postCreator.presets.tiktok.aiGeneratedDesc")}</span>
              </div>
              <button
                type="button"
                onClick={() => handleSettingChange('aiGenerated', setTiktokAiGenerated, !effectiveAiGenerated)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 ${
                  effectiveAiGenerated ? 'bg-black' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                    effectiveAiGenerated ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5 text-left">
                <span className="block text-[11px] font-bold text-muted-foreground uppercase font-sans">{t("planner:postCreator.presets.tiktok.commercialContent")}</span>
                <span className="block text-[9px] text-muted-foreground font-medium leading-normal font-sans">
                  {t("planner:postCreator.presets.tiktok.commercialContentDesc")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSettingChange('commercialContent', setTiktokCommercialContent, !effectiveCommercialContent)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 mt-0.5 ${
                  effectiveCommercialContent ? 'bg-black' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                    effectiveCommercialContent ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
