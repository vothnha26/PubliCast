import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

/**
 * Pure presentational Facebook preset form — shared by Post Composer
 * (useFacebookPresetComposer) and AutoList (useFacebookPresetAutoList).
 * contentType is passed separately (like InstagramPresetFields' instagramType)
 * since it lives outside the settings slot in the composer's model — it only
 * gates whether the reel-thumbnail field renders.
 */
export function FacebookPresetFields({ preset, contentType }) {
  const { t } = useTranslation(["planner"]);
  const { isOpen, onToggleOpen, title, reelThumbnail } = preset;

  return (
    <div className="border border-border rounded-3xl bg-card shadow-sm transition-all duration-300">
      <div
        onClick={onToggleOpen}
        className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group rounded-3xl"
      >
        <div className="flex items-center gap-3">
          <svg className="w-[18px] h-[18px] text-[#1877F2] fill-[#1877F2]" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="text-[12px] font-bold text-foreground font-sans">{t("planner:postCreator.presets.facebook.title")}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      {isOpen && (
        <div className="border-t border-gray-50 p-6 rounded-b-3xl">
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.facebook.titleLabel")}</label>
              <input
                type="text"
                value={title.value}
                onChange={(e) => title.onChange(e.target.value)}
                placeholder={t("planner:postCreator.presets.facebook.titlePlaceholder")}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
            </div>

            {contentType === 'reel' && reelThumbnail && (
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Custom Thumbnail URL</label>
                <input
                  type="text"
                  value={reelThumbnail.value}
                  onChange={(e) => reelThumbnail.onChange(e.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                  className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
