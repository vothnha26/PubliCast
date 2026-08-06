import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Loader2, ArrowRight, ChevronDown } from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PublishSplitButton } from "./PublishSplitButton";

export function ComposerFooter({ isNetworkCustomize = false, onCloseNetworkCustomize }) {
  const { t } = useTranslation(["planner", "common"]);
  const {
    isLibrary,
    selectedPublishId,
    setSelectedPublishId,
    scheduledDate,
    setScheduledDate,
    hasCreatePermission,
    handleCreatePost,
    isCreating,
    setIsNetworkCustomizeOpen,
    selectedAccountIds,
    createAnother,
    setCreateAnother
  } = usePostCreatorFormContext();

  return (
    <div className="w-full shrink-0 px-8 py-3.5 border-t border-border/60 bg-card flex items-center justify-between z-30 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.04)]">
      {/* Left side: Create Another checkbox + Save draft */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={createAnother}
            onChange={(e) => setCreateAnother(e.target.checked)}
            className="w-4 h-4 accent-composer-accent cursor-pointer rounded border-border"
          />
          <span className="text-sm font-medium text-foreground font-sans">
            {t("planner:postCreator.footer.createAnother", "Create Another")}
          </span>
        </label>

        {!isLibrary && (
          <>
            <span className="text-border/60">|</span>
            <button
              type="button"
              onClick={() => setSelectedPublishId('draft')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-sans"
            >
              {t("planner:postCreator.footer.saveDrafts", "Save as Draft")}
            </button>
          </>
        )}
      </div>

      {/* Right side: Customize per network button / Next Available date selector / Publish button */}
      <div className="flex items-center gap-3">
        {!isNetworkCustomize && !isLibrary && selectedAccountIds.length > 1 && (
          <button
            type="button"
            onClick={() => setIsNetworkCustomizeOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-composer-accent text-composer-accent-foreground text-xs font-bold rounded-xl transition-all cursor-pointer font-sans shadow-xs hover:opacity-90"
          >
            <span>{t("planner:postCreator.footer.customizePerNetwork", "Customize for each network")}</span>
            <ArrowRight size={14} />
          </button>
        )}

        {!isLibrary && ['schedule', 'review'].includes(selectedPublishId) && (
          <label className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3.5 py-2 hover:bg-muted transition-all relative cursor-pointer font-sans shadow-2xs">
            <Calendar size={15} className="text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-foreground font-sans whitespace-nowrap">
              {scheduledDate
                ? new Date(scheduledDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : t("planner:postCreator.footer.nextAvailable", "Next Available")}
            </span>
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            <input
              type="datetime-local"
              data-testid="post-scheduled-date-input"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        )}

        {isLibrary ? (
          <button
            data-testid="post-submit-btn"
            onClick={() => {
              if (!hasCreatePermission) return;
              handleCreatePost();
            }}
            disabled={isCreating || !hasCreatePermission}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer font-sans ${
              hasCreatePermission
                ? "bg-[#0A0A0A] text-white hover:bg-black"
                : "bg-gray-200 text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : t("planner:postCreator.footer.saveTemplate")}
          </button>
        ) : (
          <PublishSplitButton variant="accent" />
        )}
      </div>
    </div>
  );
}
