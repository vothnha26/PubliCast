import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Check, Plus } from "lucide-react";
import { useConnections } from "../../../context/ConnectionsContext";
import { ChannelAvatar } from "./ChannelAvatar";

/**
 * Search + checkbox channel picker opened from the "+" button, both in the
 * main composer header (Figma-referenced screenshot: avatars row + "+") and
 * in NetworkCustomizeScreen's per-channel tab row. Reuses the existing
 * selectedAccountIds/toggleAccount contract from usePostCreatorForm — this
 * component only renders the picker UI, it owns no selection state itself.
 */
export function ChannelPickerDropdown({
  accounts,
  selectedAccountIds,
  onToggleAccount,
  onClose,
  align = "left",
}) {
  const { t } = useTranslation(["planner", "common"]);
  const { openConnections } = useConnections();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((sa) => {
      const name = (sa.displayName || sa.username || sa.accountName || "").toLowerCase();
      return name.includes(q) || (sa.platform || "").toLowerCase().includes(q);
    });
  }, [accounts, search]);

  const allSelected = accounts.length > 0 && accounts.every((sa) => selectedAccountIds.includes(sa.id));

  const handleToggleAll = () => {
    accounts.forEach((sa) => {
      const isSelected = selectedAccountIds.includes(sa.id);
      if (allSelected && isSelected) onToggleAccount(sa.id);
      if (!allSelected && !isSelected) onToggleAccount(sa.id);
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute top-full mt-2 w-72 bg-card rounded-2xl shadow-2xl border border-border z-50 animate-in fade-in slide-in-from-top-1 overflow-hidden ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("planner:postCreator.channelPicker.search")}
              className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-xl text-xs font-medium text-foreground placeholder-muted-foreground outline-none focus:border-composer-accent transition-all font-sans"
            />
          </div>
        </div>

        <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-sans">
            {t("planner:postCreator.channelPicker.channels")}
          </span>
          {accounts.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-[10px] font-bold text-composer-accent hover:opacity-80 transition-all cursor-pointer font-sans"
            >
              {allSelected ? t("planner:postCreator.channelPicker.deselectAll") : t("planner:postCreator.channelPicker.selectAll")}
            </button>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-muted-foreground font-sans">
              {t("planner:postCreator.channelPicker.noResults")}
            </div>
          ) : (
            filtered.map((sa) => {
              const isSelected = selectedAccountIds.includes(sa.id);
              const name = sa.displayName || sa.username || sa.accountName || sa.platform;
              return (
                <button
                  key={sa.id}
                  type="button"
                  data-testid={`channel-picker-item-${(sa.platform || "").toLowerCase()}`}
                  onClick={() => onToggleAccount(sa.id)}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-muted transition-all cursor-pointer text-left font-sans"
                >
                  <ChannelAvatar
                    account={sa}
                    platform={sa.platform}
                    size={32}
                    badgeSize={14}
                    shape="circle"
                  />
                  <span className="flex-1 min-w-0 text-xs font-bold text-foreground truncate">{name}</span>
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                      isSelected
                        ? "bg-composer-accent border-composer-accent text-composer-accent-foreground"
                        : "border-border bg-transparent"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            openConnections();
          }}
          className="w-full flex items-center gap-2.5 px-4 py-3 border-t border-border hover:bg-muted transition-all cursor-pointer font-sans"
        >
          <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Plus size={13} />
          </span>
          <span className="text-xs font-bold text-foreground">{t("planner:postCreator.channelPicker.connectChannel")}</span>
        </button>
      </div>
    </>
  );
}
