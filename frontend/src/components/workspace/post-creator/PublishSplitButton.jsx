import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";

const PUBLISH_OPTIONS = [
  { id: "draft", label: "SAVE AS DRAFT", sub: "Save and publish at a later time" },
  { id: "review", label: "SEND TO REVIEW", sub: "Select reviewers" },
  { id: "schedule", label: "SAVE AND SCHEDULE", sub: "Save changes to this post" },
  { id: "now", label: "PUBLISH NOW", sub: "Publish with current date and time" },
];

/**
 * Split button: main action submits with whatever selectedPublishId is
 * currently set, the chevron opens a menu of the other 3 options (Save as
 * Draft / Send to Review / Save and Schedule / Publish Now). Shared between
 * ComposerFooter (main composer) and NetworkCustomizeScreen so both submit
 * surfaces offer the same publish choices instead of one being locked to
 * whatever selectedPublishId happened to be set elsewhere.
 *
 * `variant` only changes the button's own look — "dark" (ComposerFooter's
 * original black pill) or "accent" (NetworkCustomizeScreen's composer-accent
 * pill) — every behavior (label text, option gating by editingPost status,
 * menu contents) is identical between the two.
 */
export function PublishSplitButton({ variant = "dark" }) {
  const { t } = useTranslation(["planner", "common"]);
  const {
    selectedPublishId,
    setSelectedPublishId,
    hasCreatePermission,
    hasApprovePermission,
    handleCreatePost,
    isCreating,
    submitProgressText,
    editingPost,
    showPublishMenu,
    setShowPublishMenu,
  } = usePostCreatorFormContext();

  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowPublishMenu(false);
      }
    };
    if (showPublishMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPublishMenu, setShowPublishMenu]);

  const getPublishButtonLabelText = () => {
    if (submitProgressText) return submitProgressText;
    if (editingPost) return t('planner:postCreator.footer.update');
    if (selectedPublishId === 'draft') return t('planner:postCreator.footer.save');
    if (selectedPublishId === 'review') return t('planner:postCreator.footer.send');
    if (!hasApprovePermission) return t('planner:postCreator.footer.submit');
    return selectedPublishId === 'now' ? t('planner:postCreator.footer.publish') : t('planner:postCreator.footer.schedule');
  };

  const getEditPublishOptions = () => {
    if (!editingPost) return PUBLISH_OPTIONS;
    const postStatus = editingPost.status?.toLowerCase();
    if (postStatus === 'published') return [];
    if (postStatus === 'scheduled' && editingPost.scheduledAt) {
      const scheduledTime = new Date(editingPost.scheduledAt);
      const isPastDeadline = scheduledTime <= new Date();
      if (isPastDeadline) {
        return PUBLISH_OPTIONS.filter(o => o.id === 'draft');
      }
    }
    return PUBLISH_OPTIONS.filter(o => o.id !== 'now' || hasApprovePermission);
  };

  const editablePublishOptions = getEditPublishOptions();

  const containerClass = variant === "accent"
    ? `relative flex items-center rounded-full transition-all ${
        hasCreatePermission ? "bg-composer-accent text-composer-accent-foreground" : "bg-gray-200 text-muted-foreground"
      }`
    : `relative flex items-center rounded-full transition-all ${
        hasCreatePermission ? "bg-[#0A0A0A] text-white" : "bg-gray-200 text-muted-foreground"
      }`;

  const mainBtnClass = variant === "accent"
    ? `flex items-center gap-2 pl-6 pr-4 py-2.5 text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed font-sans rounded-l-full ${
        hasCreatePermission ? "hover:opacity-90" : "cursor-not-allowed"
      }`
    : `pl-8 pr-5 py-3 text-[11px] font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed font-sans rounded-l-full ${
        hasCreatePermission ? "hover:opacity-90" : "cursor-not-allowed"
      }`;

  const chevronBtnClass = variant === "accent"
    ? `pr-5 pl-1 py-2.5 h-full transition-all rounded-r-full ${hasCreatePermission ? "hover:opacity-90 cursor-pointer" : "cursor-not-allowed"}`
    : `pr-6 pl-1 py-3 h-full transition-all rounded-r-full ${hasCreatePermission ? "hover:opacity-90 cursor-pointer" : "cursor-not-allowed"}`;

  return (
    <div className={containerClass}>
      <button
        type="button"
        data-testid="post-submit-btn"
        onClick={() => {
          if (!hasCreatePermission) return;
          handleCreatePost();
        }}
        disabled={isCreating || !hasCreatePermission}
        className={mainBtnClass}
      >
        {isCreating ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>{getPublishButtonLabelText()}</span>
          </div>
        ) : (
          getPublishButtonLabelText()
        )}
      </button>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          data-testid="post-publish-menu-btn"
          onClick={() => {
            if (!hasCreatePermission) return;
            setShowPublishMenu(!showPublishMenu);
          }}
          disabled={!hasCreatePermission || isCreating}
          className={chevronBtnClass}
        >
          <ChevronDown size={variant === "accent" ? 16 : 18} />
        </button>
        {showPublishMenu && hasCreatePermission && (
          <div className="absolute bottom-full right-0 mb-3 w-64 bg-card rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-border py-2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150">
            {editablePublishOptions.length === 0 ? (
              <div className="px-5 py-3 text-[10px] text-muted-foreground font-bold text-center font-sans">
                {t("planner:postCreator.footer.publishedState")}
              </div>
            ) : editablePublishOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-testid={`publish-option-${opt.id}`}
                onClick={() => { 
                  setSelectedPublishId(opt.id); 
                  setShowPublishMenu(false); 
                }}
                className={`w-full flex items-center justify-between px-5 py-2.5 hover:bg-muted transition-all text-left cursor-pointer ${selectedPublishId === opt.id ? 'bg-muted/80 font-semibold' : ''}`}
              >
                <div>
                  <div className="text-[11px] font-bold text-foreground font-sans">{t(`planner:postCreator.footer.publishOptions.${opt.id}.label`)}</div>
                  <div className="text-[10px] text-muted-foreground font-normal font-sans">{t(`planner:postCreator.footer.publishOptions.${opt.id}.sub`)}</div>
                </div>
                {selectedPublishId === opt.id && <Check size={14} className="text-foreground shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
