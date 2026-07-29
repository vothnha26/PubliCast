import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Loader2, ChevronDown, Check } from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";

const PUBLISH_OPTIONS = [
  { id: "draft", label: "SAVE AS DRAFT", sub: "Save and publish at a later time" },
  { id: "review", label: "SEND TO REVIEW", sub: "Select reviewers" },
  { id: "schedule", label: "SAVE AND SCHEDULE", sub: "Save changes to this post" },
  { id: "now", label: "PUBLISH NOW", sub: "Publish with current date and time" },
];

export function ComposerFooter() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    closePostCreator,
    isLibrary,
    selectedPublishId,
    setSelectedPublishId,
    scheduledDate,
    setScheduledDate,
    hasCreatePermission,
    hasApprovePermission,
    handleCreatePost,
    isCreating,
    submitProgressText,
    editingPost,
    showPublishMenu,
    setShowPublishMenu
  } = usePostCreatorFormContext();

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

  return (
    <div className="shrink-0 px-8 py-5 border-t border-gray-100 bg-white flex items-center justify-between z-10">
      <button onClick={closePostCreator} data-testid="post-creator-cancel-btn" className="px-6 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-black transition-all cursor-pointer font-sans">{t("planner:postCreator.footer.cancel")}</button>
      
      <div className="flex items-center gap-4">
        {!isLibrary && ['schedule', 'review'].includes(selectedPublishId) && (
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 hover:bg-gray-50 transition-all relative">
            <Calendar size={18} className="text-gray-400" />
            <input 
              type="datetime-local" data-testid="post-scheduled-date-input" 
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="text-[11px] font-bold text-gray-600 uppercase tracking-widest outline-none bg-transparent cursor-pointer border-none p-0 font-sans"
            />
          </div>
        )}
        
        {isLibrary ? (
          <button data-testid="post-submit-btn" 
            onClick={() => {
              if (!hasCreatePermission) return;
              handleCreatePost();
            }}
            disabled={isCreating || !hasCreatePermission}
            className={`px-8 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer font-sans ${
              hasCreatePermission
                ? "bg-[#0A0A0A] text-white hover:bg-black"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : t("planner:postCreator.footer.saveTemplate")}
          </button>
        ) : (
          <div className="flex items-center font-sans">
            <button data-testid="post-submit-btn" 
              onClick={() => {
                if (!hasCreatePermission) return;
                handleCreatePost();
              }}
              disabled={isCreating || !hasCreatePermission}
              className={`px-8 py-3 rounded-l-2xl text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer font-sans ${
                hasCreatePermission
                  ? "bg-[#0A0A0A] text-white hover:bg-zinc-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
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
            <div className="relative">
              <button data-testid="post-publish-menu-btn" 
                onClick={() => {
                  if (!hasCreatePermission) return;
                  setShowPublishMenu(!showPublishMenu);
                }} 
                disabled={!hasCreatePermission}
                className={`px-3 py-3 rounded-r-2xl border-l border-zinc-800 transition-all ${
                  hasCreatePermission
                    ? "bg-[#0A0A0A] text-white hover:bg-zinc-800 cursor-pointer"
                    : "bg-gray-300 text-gray-400 cursor-not-allowed"
                }`}
              >
                <ChevronDown size={18} />
              </button>
              {showPublishMenu && hasCreatePermission && (
                <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-50 animate-in slide-in-from-bottom-2">
                  {editablePublishOptions.length === 0 ? (
                    <div className="px-6 py-3 text-[10px] text-gray-400 font-bold text-center font-sans">
                      {t("planner:postCreator.footer.publishedState")}
                    </div>
                  ) : editablePublishOptions.map((opt) => (
                    <button key={opt.id} onClick={() => { setSelectedPublishId(opt.id); setShowPublishMenu(false); }} data-testid={`publish-option-${opt.id}`} className={`w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-all text-left cursor-pointer ${selectedPublishId === opt.id ? 'bg-gray-50' : ''}`}>
                      <div>
                        <div className="text-[10px] font-black text-gray-800 uppercase tracking-widest font-sans">{t(`planner:postCreator.footer.publishOptions.${opt.id}.label`)}</div>
                        <div className="text-[9px] text-gray-400 font-bold font-sans">{t(`planner:postCreator.footer.publishOptions.${opt.id}.sub`)}</div>
                      </div>
                      {selectedPublishId === opt.id && <Check size={14} className="text-gray-800 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
