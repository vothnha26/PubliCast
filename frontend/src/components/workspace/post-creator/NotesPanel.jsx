import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, X, MessageSquare, Trash2, Send } from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";

// ─── Avatar color palette (giống bên modal cũ) ──────────────────────────────
const AVATAR_COLORS = [
  "bg-[#E6F4EA] text-[#137333]",
  "bg-[#FEF7E0] text-[#B06000]",
  "bg-[#FCE8E6] text-[#C5221F]",
  "bg-[#F3F4F6] text-[#1F2937]",
  "bg-[#E4F7F6] text-[#00796B]",
];

/** Tính hash nhất quán từ chuỗi tên tác giả để chọn màu avatar */
const getAvatarStyle = (author, fallbackIndex) => {
  if (!author) return AVATAR_COLORS[fallbackIndex % AVATAR_COLORS.length];
  const hash = author
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/** Lấy 2 chữ cái đầu từ tên tác giả */
const getInitials = (author) => {
  if (!author) return "M";
  return author
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

/**
 * NotesPanel
 *
 * Hiển thị toàn bộ tính năng Notes (thêm, xoá, danh sách, empty-state) dưới
 * dạng side-panel thay thế khu vực Preview khi `rightPanelTab === 'notes'`.
 * Lấy toàn bộ state qua `usePostCreatorFormContext()` — không nhận props.
 */
export function NotesPanel() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    notes,
    newNoteText,
    setNewNoteText,
    handleAddNoteClick,
    handleDeleteNoteClick,
    setRightPanelTab,
  } = usePostCreatorFormContext();

  return (
    <div className="flex-1 h-full bg-card rounded-[20px] border border-border/80 shadow-sm flex flex-col overflow-hidden min-h-0 p-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-border shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-foreground" />
            <h3 className="text-base font-bold text-foreground tracking-tight font-sans">
              {t("planner:postCreator.composer.sections.notesTitle")}
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed uppercase tracking-widest font-sans">
            {t("planner:postCreator.composer.sections.notesDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRightPanelTab('preview')}
          className="text-muted-foreground hover:text-black transition-colors cursor-pointer p-1 rounded-full hover:bg-muted"
          title={t("planner:postCreator.header.close")}
        >
          <X size={18} />
        </button>
      </div>

      {/* Notes list — flex-1 để tự giãn, không giới hạn vh cứng */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3.5 scrollbar-thin">
        {!notes || notes.length === 0 ? (
          /* Empty state */
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground font-sans">
            <div className="p-4 bg-muted rounded-2xl">
              <MessageSquare size={24} className="text-gray-300" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                {t("planner:postCreator.composer.sections.noNotes")}
              </p>
              <p className="text-[12px] text-muted-foreground font-medium px-6">
                {t("planner:postCreator.composer.placeholders.noteDesc")}
              </p>
            </div>
          </div>
        ) : (
          notes.map((note, index) => {
            const initials = getInitials(note.author);
            const avatarStyle = getAvatarStyle(note.author, index);

            return (
              <div
                key={index}
                className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans"
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest shrink-0 ${avatarStyle}`}
                >
                  {initials}
                </div>

                {/* Note bubble */}
                <div className="flex-1 min-w-0 bg-muted rounded-2xl p-3.5 relative">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold text-foreground truncate">
                      {note.author}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-medium tracking-tight whitespace-nowrap">
                      {new Date(note.timestamp).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium leading-relaxed break-words whitespace-pre-wrap">
                    {note.text}
                  </p>

                  {/* Nút xoá — chỉ hiện khi hover vào note bubble */}
                  <button
                    type="button"
                    onClick={() => handleDeleteNoteClick(index)}
                    className="absolute -top-1 -right-1 p-1 bg-card border border-border shadow-sm rounded-full text-muted-foreground hover:text-red-500 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title={t("planner:postCreator.composer.sections.deleteNote")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: textarea + nút gửi */}
      <div className="pt-4 border-t border-border space-y-3 shrink-0">
        <textarea
          placeholder={t("planner:postCreator.composer.placeholders.note")}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-transparent rounded-2xl text-[12px] font-medium text-foreground outline-none focus:bg-card focus:border-border transition-all placeholder-gray-400 min-h-[80px] resize-none font-sans"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddNoteClick();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest font-sans">
            {t("planner:postCreator.composer.sections.enterToSend")}
          </span>
          <button
            type="button"
            onClick={handleAddNoteClick}
            disabled={!newNoteText.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0A0A0A] hover:bg-black disabled:bg-muted disabled:text-muted-foreground text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-lg disabled:shadow-none font-sans"
          >
            <span>{t("planner:postCreator.composer.sections.addNote")}</span>
            <Send size={12} className="rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
}
