import React from "react";
import { useTranslation } from "react-i18next";
import { X, Search, Check } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

export function ReviewersModal() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    showReviewersModal,
    setShowReviewersModal,
    reviewerSearchQuery,
    setReviewerSearchQuery,
    selectedReviewerIds,
    setSelectedReviewerIds,
    potentialReviewers,
    approvalPolicy,
    setApprovalPolicy
  } = usePostCreatorFormContext();

  if (!showReviewersModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-card rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-6 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground tracking-tight font-sans">
            {t("planner:postCreator.composer.sections.selectReviewers")}
          </h3>
          <button 
            type="button"
            onClick={() => setShowReviewersModal(false)}
            className="text-muted-foreground hover:text-black transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder={t("planner:postCreator.composer.sections.searchUser")}
            value={reviewerSearchQuery}
            onChange={(e) => setReviewerSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-3 bg-muted border border-transparent rounded-2xl text-[12px] font-bold text-foreground outline-none focus:bg-card focus:border-border transition-all placeholder-gray-400 font-sans"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={14} />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-muted-foreground">
          <span className="font-sans">{t("planner:postCreator.composer.sections.reviewers")}</span>
          <button 
            type="button" 
            onClick={() => {
              const allIds = potentialReviewers.map(r => r.id);
              if (selectedReviewerIds.length === potentialReviewers.length) {
                setSelectedReviewerIds([]);
              } else {
                setSelectedReviewerIds(allIds);
              }
            }}
            className="text-[#10B981] hover:text-[#059669] transition-colors cursor-pointer font-bold lowercase first-letter:uppercase font-sans"
          >
            {selectedReviewerIds.length === potentialReviewers.length 
              ? t("planner:postCreator.composer.sections.uncheckAll") 
              : t("planner:postCreator.composer.sections.checkAll")}
          </button>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-1.5 scrollbar-thin">
          {potentialReviewers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-[11px] font-bold uppercase tracking-wider font-sans">
              Không có người duyệt khả dụng
            </div>
          ) : (
            potentialReviewers
              .filter(r => r.name.toLowerCase().includes(reviewerSearchQuery.toLowerCase()))
              .map((rev) => {
                const isChecked = selectedReviewerIds.includes(rev.id);
                const initials = rev.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const hash = rev.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const bgColors = ["bg-[#E6F4EA] text-[#137333]", "bg-[#FEF7E0] text-[#B06000]", "bg-[#FCE8E6] text-[#C5221F]", "bg-[#F3F4F6] text-[#1F2937]", "bg-[#E4F7F6] text-[#00796B]"];
                const badgeStyle = bgColors[hash % bgColors.length];
                
                const handleToggle = () => {
                  if (isChecked) {
                    setSelectedReviewerIds(selectedReviewerIds.filter(id => id !== rev.id));
                  } else {
                    setSelectedReviewerIds([...selectedReviewerIds, rev.id]);
                  }
                };

                return (
                  <div 
                    key={rev.id}
                    onClick={handleToggle}
                    className="flex items-center justify-between p-3.5 bg-card border border-border hover:border-border rounded-2xl transition-all cursor-pointer group font-sans"
                  >
                    <div className="flex items-center gap-3.5">
                      {rev.avatarUrl ? (
                        <img src={rev.avatarUrl} alt={rev.name} className="w-8 h-8 rounded-xl object-cover border border-border" />
                      ) : (
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${badgeStyle}`}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="text-[11px] font-bold text-foreground group-hover:text-black transition-colors">{rev.name}</div>
                        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{rev.role}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'border-[#10B981] bg-[#10B981] text-white' 
                          : 'border-gray-300 bg-card'
                      }`}
                    >
                      {isChecked && <Check size={10} strokeWidth={4} />}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-sans">
            {t("planner:postCreator.composer.sections.policyLabel")}
          </div>
          <div className="space-y-2.5">
            {[
              { id: 'NO_APPROVAL', label: t("planner:postCreator.composer.sections.policyNone") },
              { id: 'AT_LEAST_ONE', label: t("planner:postCreator.composer.sections.policyAtLeastOne") },
              { id: 'ALL', label: t("planner:postCreator.composer.sections.policyAll") }
            ].map((opt) => {
              const isSelected = approvalPolicy === opt.id;
              return (
                <div 
                  key={opt.id}
                  onClick={() => setApprovalPolicy(opt.id)}
                  className="flex items-center gap-3 cursor-pointer group font-sans"
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'border-[#0A0A0A] bg-[#0A0A0A]' 
                      : 'border-gray-300 bg-card'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-card" />}
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-black transition-colors">{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowReviewersModal(false)}
          className="w-full py-3.5 bg-[#0A0A0A] hover:bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] font-sans"
        >
          {t("planner:postCreator.composer.sections.confirmSelection")}
        </button>
      </div>
    </div>
  );
}
