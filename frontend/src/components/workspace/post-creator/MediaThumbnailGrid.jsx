import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Edit, Type, Trash2, EyeOff, ImageIcon, Check } from "lucide-react";
import { isVideoPath } from "../../../utils/url";

/**
 * Thumbnail grid + per-item 3-dot menu (Edit image/video, Alt text, Remove,
 * and optionally Spoiler/Upload-thumbnail) shared between ComposerBody
 * (full composer, all features) and NetworkCustomizeScreen (per-network
 * editing, no spoiler/thumbnail-upload for now — pass those handlers to
 * enable them there too). Purely presentational + local open/close menu
 * state; all data mutation happens via the callback props.
 */
export function MediaThumbnailGrid({
  items,
  thumbnailSize = "w-16 h-16",
  spoilersMap = {},
  onToggleSpoiler,
  onEditImage,
  onEditVideo,
  onAltText,
  onUploadThumbnail,
  onRemove,
  mediaPosterUrl,
}) {
  const { t } = useTranslation(["planner", "common"]);
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="px-6 pb-4 bg-card flex flex-wrap gap-4 animate-in fade-in duration-300">
      {items.map((item, index) => {
        const mediaUrl = typeof item === "string" ? item : (item?.previewUrl || item?.path || "");
        const isVid = isVideoPath(mediaUrl, typeof item === "object" ? item?.file : null);
        const isSpoilerActive = !!spoilersMap[index];
        const hasAltText = typeof item === "object" && !!item?.caption?.trim();

        return (
          <div key={index} className="relative group">
            <div className={`${thumbnailSize} rounded-2xl overflow-hidden border border-border shadow-md bg-muted flex items-center justify-center relative`}>
              {isVid ? (
                <>
                  <video src={mediaUrl} poster={mediaPosterUrl || undefined} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-card/80 flex items-center justify-center">
                      <div className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-black ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className={`w-full h-full object-cover transition-all ${isSpoilerActive ? "blur-sm scale-105" : ""}`}
                  />
                  {isSpoilerActive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <EyeOff size={16} className="text-white" />
                    </div>
                  )}
                </>
              )}
              {hasAltText && (
                <div
                  className="absolute bottom-1 left-1 w-4.5 h-4.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center shadow-sm z-10"
                  title={t("planner:postCreator.composer.imageMenu.altText")}
                >
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveMenuIndex(activeMenuIndex === index ? null : index)}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all shadow-md z-20"
            >
              <MoreHorizontal size={12} />
            </button>

            {activeMenuIndex === index && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setActiveMenuIndex(null)} />
                <div className="absolute bottom-full left-0 mb-2 min-w-[220px] w-max bg-card rounded-2xl shadow-2xl border border-border py-2 z-40 text-left text-xs font-sans text-foreground animate-in fade-in slide-in-from-bottom-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuIndex(null);
                      if (isVid) onEditVideo?.(index); else onEditImage?.(index);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                  >
                    <Edit size={14} className="text-muted-foreground" />
                    {isVid ? t("planner:postCreator.composer.editVideo") : t("planner:postCreator.composer.imageMenu.edit")}
                  </button>

                  {!isVid && onToggleSpoiler && (
                    <div
                      onClick={() => onToggleSpoiler(index)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                    >
                      <div className="flex items-center gap-2.5">
                        <EyeOff size={14} className="text-muted-foreground" />
                        <span>Spoiler</span>
                      </div>
                      <div className={`w-8 h-4.5 rounded-full transition-colors relative ml-4 ${isSpoilerActive ? "bg-gray-900" : "bg-gray-200"}`}>
                        <div className={`w-3.5 h-3.5 rounded-full bg-card absolute top-0.5 transition-transform ${isSpoilerActive ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuIndex(null);
                      onAltText?.(index);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                  >
                    <Type size={14} className="text-muted-foreground" />
                    {t("planner:postCreator.composer.imageMenu.altText")}
                  </button>

                  {isVid && onUploadThumbnail && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuIndex(null);
                        onUploadThumbnail();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                    >
                      <ImageIcon size={14} className="text-muted-foreground" />
                      Upload video thumbnail
                    </button>
                  )}

                  <div className="h-px bg-muted my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuIndex(null);
                      onRemove?.(index);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-all cursor-pointer font-bold whitespace-nowrap font-sans"
                  >
                    <Trash2 size={14} />
                    {t("planner:postCreator.composer.imageMenu.remove")}
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
