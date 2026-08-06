import React from "react";
import { useTranslation } from "react-i18next";
import { Info, Smartphone, Monitor, Eye } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

/**
 * Heading for the stacked "Post Previews" panel (Buffer reference) — every
 * selected platform renders its own preview simultaneously in PreviewBody,
 * so this header no longer needs a platform tab-switcher, just the
 * device/media-viewer toggles.
 */
export function PreviewHeader() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    previewDevice,
    setPreviewDevice,
    showMediaViewer,
    setShowMediaViewer
  } = usePostCreatorFormContext();

  return (
    <div className="shrink-0 px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white z-10 font-sans">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-bold text-foreground">
          {t("planner:postCreator.header.postPreviews")}
        </h2>
        <Info size={13} className="text-muted-foreground" title={t("planner:postCreator.header.postPreviewsInfo")} />
      </div>

      <div className="flex items-center gap-1.5 bg-muted/80 p-1 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => setShowMediaViewer(!showMediaViewer)}
          title={showMediaViewer ? "Show post preview" : "Show media viewer"}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            showMediaViewer ? 'bg-black text-white shadow-sm' : 'text-foreground hover:bg-card/60 bg-card border border-border/60 shadow-sm'
          }`}
        >
          <Eye size={15} />
        </button>
        <div className="w-px h-4 bg-gray-300 my-auto mx-0.5" />
        <button
          type="button"
          onClick={() => setPreviewDevice("mobile")}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            previewDevice === 'mobile' ? 'bg-black text-white shadow-sm' : 'text-muted-foreground hover:text-black hover:bg-card/60'
          }`}
        >
          <Smartphone size={15} />
        </button>
        <button
          type="button"
          onClick={() => setPreviewDevice("desktop")}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            previewDevice === 'desktop' ? 'bg-black text-white shadow-sm' : 'text-muted-foreground hover:text-black hover:bg-card/60'
          }`}
        >
          <Monitor size={15} />
        </button>
      </div>
    </div>
  );
}
