import React, { useState } from "react";
import {
  LayoutGrid, Bookmark, Heart, BookOpen, List,
  MessageSquare, CheckCircle2, ChevronDown, Check
} from "lucide-react";
import { ChannelFilterDropdown } from "./ChannelFilterDropdown";
import { INBOX_VIEW_MODE, INBOX_ITEM_TYPE, INBOX_ITEM_TYPE_OPTIONS, POST_COMMENT_FILTER, POST_COMMENT_FILTER_OPTIONS } from "../../constants/inbox";

/**
 * InboxHeader — Thanh Header điều hướng trên cùng của trang Inbox
 * Khớp 100% với bố cục ảnh mẫu (All Channels | By post / List | Channels dropdown | All dropdown | Filter & Mark read).
 */
export function InboxHeader({
  activeBrand,
  selectedAccountIds,
  onSelectAccounts,
  viewMode = INBOX_VIEW_MODE.BY_POST,
  onViewModeChange,
  filterType = INBOX_ITEM_TYPE.ALL,
  onFilterTypeChange,
  totalUnread = 0,
  // Set when this header is scoped to a single channel (ChannelCommunityTab)
  // — the "Channels ∨" picker only makes sense when switching between
  // several accounts on the /manage/inbox all-channels view, so it's hidden
  // (and the title reflects the one channel) rather than showing a picker
  // with nothing meaningful for the user to switch between.
  channelTitle = null,
  // Filters the Posts grid by whether the post has any synced comments at
  // all (separate from the tab bar, which filters conversation items, not
  // posts). See POST_COMMENT_FILTER in constants/inbox.js.
  postCommentFilter = POST_COMMENT_FILTER.ALL,
  onPostCommentFilterChange,
}) {
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const currentTypeLabel =
    INBOX_ITEM_TYPE_OPTIONS.find((opt) => opt.id === filterType)?.label || "All";

  return (
    <div className="w-full bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-4 select-none shrink-0">
      {/* Góc trái Header: Menu Grid icon + All Channels Title + Bookmark + Counter Badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground transition-colors cursor-pointer"
          title="Channel switcher"
        >
          <LayoutGrid size={18} />
        </button>

        <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
          {channelTitle || "All Channels"}
        </h2>

        <button
          type="button"
          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Bookmark"
        >
          <Bookmark size={15} />
        </button>

        {/* Counter Badge (0) */}
        <div className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-extrabold text-muted-foreground border border-border/60 flex items-center justify-center leading-none">
          {totalUnread}
        </div>
      </div>

      {/* Góc phải Header: Heart icon + Toggle By Post/List + Channels ∨ + All ∨ + Filter + Mark Read */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Heart / Notification Icon */}
        <button
          type="button"
          className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
          title="Favorites"
        >
          <Heart size={16} />
        </button>

        {/* View Mode Toggle Segmented Group [ By post | List ] */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => onViewModeChange(INBOX_VIEW_MODE.BY_POST)}
            className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === INBOX_VIEW_MODE.BY_POST
                ? "bg-card text-emerald-400 border border-emerald-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen size={13} />
            <span>By post</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange(INBOX_VIEW_MODE.LIST)}
            className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === INBOX_VIEW_MODE.LIST
                ? "bg-card text-emerald-400 border border-emerald-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List size={13} />
            <span>List</span>
          </button>
        </div>

        {/* Dropdown "Channels ∨" — omitted when scoped to a single channel */}
        {!channelTitle && (
          <ChannelFilterDropdown
            socialAccounts={activeBrand?.socialAccounts || []}
            selectedAccountIds={selectedAccountIds}
            onSelectAccounts={onSelectAccounts}
          />
        )}

        {/* Type / Message Category Dropdown "All ∨" */}
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              postCommentFilter !== POST_COMMENT_FILTER.ALL
                ? "border-emerald-500/60 text-emerald-500 bg-emerald-500/10"
                : "border-border bg-card hover:bg-muted text-foreground"
            }`}
          >
            <MessageSquare size={14} className="shrink-0" />
            <span>{currentTypeLabel}</span>
            <ChevronDown size={14} className={`transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isTypeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsTypeDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border shadow-xl rounded-2xl py-1.5 z-50 animate-in fade-in duration-150">
                {INBOX_ITEM_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onFilterTypeChange(opt.id);
                      setIsTypeDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted flex items-center justify-between cursor-pointer border-none bg-transparent"
                  >
                    <span>{opt.label}</span>
                    {filterType === opt.id && (
                      <Check size={12} className="text-emerald-400" />
                    )}
                  </button>
                ))}

                {/* Posts-grid comment filter, folded into the same dropdown
                    instead of a separate Filter button — both are "narrow
                    the current view down" controls that lived side by side
                    for no reason. */}
                <div className="my-1 border-t border-border" />
                {POST_COMMENT_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onPostCommentFilterChange?.(opt.id);
                      setIsTypeDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted flex items-center justify-between cursor-pointer border-none bg-transparent"
                  >
                    <span>{opt.label}</span>
                    {postCommentFilter === opt.id && (
                      <Check size={12} className="text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Mark Read Checkmark Button */}
        <button
          type="button"
          className="p-2 border border-border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Mark all as read"
        >
          <CheckCircle2 size={15} />
        </button>
      </div>
    </div>
  );
}
