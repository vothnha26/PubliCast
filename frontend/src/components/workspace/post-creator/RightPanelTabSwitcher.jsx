import React from "react";
import { useTranslation } from "react-i18next";
import { LayoutTemplate, Sparkles, Eye, FileText } from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";

/**
 * Segmented tab control switching the composer's right-hand panel between
 * Templates / AI Assistant / Notes / Preview (Figma "Create Post" header
 * tabs, node 4:528). Shared between ComposerHeader and
 * NetworkCustomizeScreen so both surfaces stay in sync via the same
 * rightPanelTab state. Clicking the already-active tab collapses the whole
 * right column (rightPanelTab -> null) instead of leaving it open on
 * itself — clicking any tab (including re-clicking null) reopens it.
 */
export function RightPanelTabSwitcher({ className = "" }) {
  const { t } = useTranslation(["planner", "common"]);
  const { rightPanelTab, setRightPanelTab } = usePostCreatorFormContext();

  const tabs = [
    { id: "templates", label: t("planner:postCreator.header.tabs.templates"), icon: LayoutTemplate },
    { id: "ai", label: t("planner:postCreator.header.tabs.aiAssistant"), icon: Sparkles },
    { id: "notes", label: t("planner:postCreator.header.tabs.notes", "Notes"), icon: FileText },
    { id: "preview", label: t("planner:postCreator.header.tabs.preview"), icon: Eye },
  ];

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl shrink-0 ${className}`}>
      {tabs.map((tab) => {
        const isActive = rightPanelTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setRightPanelTab(isActive ? null : tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold tracking-wide transition-all cursor-pointer font-sans ${
              isActive
                ? "bg-composer-accent text-composer-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            }`}
          >
            <Icon size={14} className={isActive ? "" : "opacity-70"} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
