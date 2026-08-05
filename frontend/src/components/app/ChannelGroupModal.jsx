import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Users, Loader2, Check, Lock, Globe2 } from "lucide-react";
import { PlatformIcon } from "../shared/PlatformIcon";
import { CHANNEL_GROUP_VISIBILITY } from "../../constants/channelGroupVisibility";

const GROUP_COLORS = ["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

// Handles both create (group=null) and edit (group set) — same form either
// way, only the submit handler and initial state differ.
export function ChannelGroupModal({ isOpen, onClose, onSubmit, group, socialAccounts }) {
  const { t } = useTranslation("topbar");
  const VISIBILITY_OPTIONS = [
    { value: CHANNEL_GROUP_VISIBILITY.TEAM, label: t("channelGroups.modal.visibilityTeamLabel", "Team"), description: t("channelGroups.modal.visibilityTeamDesc", "Visible to every brand member"), icon: Globe2 },
    { value: CHANNEL_GROUP_VISIBILITY.PRIVATE, label: t("channelGroups.modal.visibilityPrivateLabel", "Private"), description: t("channelGroups.modal.visibilityPrivateDesc", "Only you can see this group"), icon: Lock },
  ];
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [visibility, setVisibility] = useState(CHANNEL_GROUP_VISIBILITY.TEAM);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(group?.name || "");
    setColor(group?.color || GROUP_COLORS[0]);
    setVisibility(group?.visibility || CHANNEL_GROUP_VISIBILITY.TEAM);
    setSelectedIds(group?.members?.map((m) => m.socialAccountId) || []);
  }, [isOpen, group]);

  if (!isOpen) return null;

  const toggleAccount = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), color, visibility, socialAccountIds: selectedIds });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-6">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 max-h-[85vh]">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute -top-3 -right-3 w-10 h-10 bg-[#2D1D35] text-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg z-[2100] border-2 border-white cursor-pointer disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users size={18} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {group ? t("channelGroups.modal.titleEdit", "Edit channel group") : t("channelGroups.modal.titleCreate", "Create channel group")}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("channelGroups.modal.nameLabel", "Group name")}</label>
              <input
                type="text"
                required
                disabled={loading}
                placeholder={t("channelGroups.modal.namePlaceholder", "e.g. Client A, Video channels...")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold transition-all shadow-sm focus:ring-1 focus:ring-black/10"
                data-testid="channel-group-name-input"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("channelGroups.modal.colorLabel", "Color")}</label>
              <div className="flex items-center gap-2">
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-2 transition-all"
                    style={{ background: c, borderColor: color === c ? "var(--foreground)" : "transparent" }}
                  >
                    {color === c && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("channelGroups.modal.visibilityLabel", "Visibility")}</label>
              <div className="grid grid-cols-2 gap-2">
                {VISIBILITY_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                  const isSelected = visibility === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVisibility(value)}
                      className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border-2 text-left transition-all cursor-pointer"
                      style={{
                        borderColor: isSelected ? "var(--foreground)" : "var(--border)",
                        background: isSelected ? "var(--muted)" : "transparent"
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} />
                        <span className="text-xs font-bold text-foreground">{label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-snug">{description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {t("channelGroups.modal.channelsLabel", "Channels in group ({{count}})", { count: selectedIds.length })}
              </label>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {(socialAccounts || []).map((account) => {
                  const isSelected = selectedIds.includes(account.id);
                  const displayName = account.displayName || account.username || account.platform;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => toggleAccount(account.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-left bg-card hover:bg-muted transition-colors"
                    >
                      <PlatformIcon platform={account.platform} size={16} />
                      <span className="flex-1 min-w-0 truncate text-xs font-semibold text-foreground">{displayName}</span>
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={{
                          background: isSelected ? color : "transparent",
                          border: isSelected ? "none" : "1.5px solid var(--border)"
                        }}
                      >
                        {isSelected && <Check size={11} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
                {(!socialAccounts || socialAccounts.length === 0) && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    {t("channelGroups.modal.noChannels", "No channels connected yet")}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer text-center disabled:opacity-50"
              >
                {t("channelGroups.modal.cancel", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 py-3 bg-[#2D1D35] hover:bg-[#3D2D45] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                data-testid="submit-channel-group-btn"
              >
                {loading && <Loader2 className="animate-spin" size={14} />}
                {group ? t("channelGroups.modal.save", "Save") : t("channelGroups.modal.create", "Create group")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
