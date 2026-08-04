import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Calendar, MessageSquare, BarChart3, Plus, MoreVertical, Star, Unlink, ChevronDown, ChevronRight, FolderPlus, Lock, PenSquare, Filter, X as XIcon } from "lucide-react";
import { useBrand } from "../context/BrandContext";
import { useConnections } from "../context/ConnectionsContext";
import { PlatformIcon } from "../components/shared/PlatformIcon";
import { useTranslation } from "react-i18next";
import socialService from "../services/social.service";
import channelGroupService from "../services/channel-group.service";
import { ChannelGroupModal } from "../components/app/ChannelGroupModal";
import { CHANNEL_GROUP_VISIBILITY } from "../constants/channelGroupVisibility";
import { usePostCreatorStore } from "../store/usePostCreatorStore";
import { toast } from "sonner";

// Platforms not yet connected in this brand show up under "Connect more
// channels" at the bottom of the list — one icon per missing platform.
const CONNECTABLE_PLATFORMS = ["YouTube", "Facebook", "Instagram", "TikTok", "Threads", "Bluesky"];

const SUB_TABS = [
  { key: "publish", labelKey: "channels.publish", icon: Calendar },
  { key: "community", labelKey: "channels.community", icon: MessageSquare },
  { key: "insights", labelKey: "channels.insights", icon: BarChart3 },
];

// Only platforms with a disconnect endpoint on the backend (see
// social.service.js) — X/Twitter has no OAuth flow yet, so it never shows
// up as a connected account and needs no entry here.
const DISCONNECT_FN_BY_PLATFORM = {
  YOUTUBE: "disconnectGoogleAccount",
  FACEBOOK: "disconnectFacebookAccount",
  INSTAGRAM: "disconnectInstagramAccount",
  TIKTOK: "disconnectTikTokAccount",
  THREADS: "disconnectThreadsAccount",
  TELEGRAM: "disconnectTelegramAccount",
  TWITCH: "disconnectTwitchAccount",
  BLUESKY: "disconnectBlueskyAccount",
  REDDIT: "disconnectRedditAccount",
  GOOGLE_DRIVE: "disconnectGoogleDriveAccount",
};

export function ChannelsList() {
  const { t } = useTranslation("topbar");
  const location = useLocation();
  const navigate = useNavigate();
  const { activeBrand, refreshBrands } = useBrand();
  const { openConnections } = useConnections();
  const openPostCreator = usePostCreatorStore((s) => s.openPostCreator);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);

  const [groups, setGroups] = useState([]);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [openGroupMenuId, setOpenGroupMenuId] = useState(null);
  const [activeFilterGroupId, setActiveFilterGroupId] = useState(null);

  const socialAccounts = activeBrand?.socialAccounts || [];

  const fetchGroups = useCallback(async () => {
    if (!activeBrand?.id) return;
    try {
      const res = await channelGroupService.list(activeBrand.id);
      setGroups(res?.data || res || []);
    } catch (e) {
      console.error("Failed to fetch channel groups:", e);
    }
  }, [activeBrand?.id]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const groupedAccountIds = new Set(groups.flatMap((g) => g.members.map((m) => m.socialAccountId)));
  const ungroupedAccounts = socialAccounts.filter((a) => !groupedAccountIds.has(a.id));

  // A group filter narrows the whole sidebar to just that group's channels
  // — other groups and ungrouped channels are hidden until cleared.
  const activeFilterGroup = activeFilterGroupId ? groups.find((g) => g.id === activeFilterGroupId) : null;
  const visibleGroups = activeFilterGroup ? [activeFilterGroup] : groups;
  const visibleUngroupedAccounts = activeFilterGroup ? [] : ungroupedAccounts;

  const toggleGroupCollapsed = (groupId) => {
    setCollapsedGroupIds((prev) => prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]);
  };

  const toggleGroupFilter = (groupId) => {
    setOpenGroupMenuId(null);
    setActiveFilterGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleCreatePostFromGroup = (group) => {
    setOpenGroupMenuId(null);
    const connectedIds = new Set(socialAccounts.filter((a) => a.isConnected).map((a) => a.id));
    const memberIds = group.members.map((m) => m.socialAccountId).filter((id) => connectedIds.has(id));
    openPostCreator({ defaultSocialAccountIds: memberIds });
  };

  const handleCreateGroup = async ({ name, color, visibility, socialAccountIds }) => {
    const created = await channelGroupService.create(activeBrand.id, { name, color, visibility });
    const createdGroup = created?.data || created;
    if (socialAccountIds.length > 0) {
      await channelGroupService.update(createdGroup.id, activeBrand.id, { socialAccountIds });
    }
    toast.success(t("channelGroups.created", "Channel group created"));
    await fetchGroups();
  };

  const handleUpdateGroup = async ({ name, color, visibility, socialAccountIds }) => {
    await channelGroupService.update(editingGroup.id, activeBrand.id, { name, color, visibility, socialAccountIds });
    toast.success(t("channelGroups.updated", "Channel group saved"));
    await fetchGroups();
  };

  const handleDeleteGroup = async (group) => {
    setOpenGroupMenuId(null);
    if (!window.confirm(t("channelGroups.confirmDelete", "Delete group \"{{name}}\"? Channels in the group won't be affected.", { name: group.name }))) return;
    try {
      await channelGroupService.remove(group.id, activeBrand.id);
      if (activeFilterGroupId === group.id) setActiveFilterGroupId(null);
      toast.success(t("channelGroups.deleted", "Channel group deleted"));
      await fetchGroups();
    } catch (e) {
      toast.error(e.message || t("channelGroups.deleteFailed", "Failed to delete channel group"));
    }
  };

  // Which channel is expanded (accordion) — defaults to whichever channel
  // owns the current route, so refreshing /channels/:id/community keeps it
  // open; otherwise nothing is expanded until the user clicks a channel.
  const routeMatch = location.pathname.match(/^\/channels\/([^/]+)/);
  const [manuallyExpandedId, setManuallyExpandedId] = useState(null);
  const expandedId = manuallyExpandedId !== null ? manuallyExpandedId : (routeMatch ? routeMatch[1] : null);

  const connectedPlatforms = new Set(socialAccounts.map((a) => a.platform?.toUpperCase()));
  const missingPlatforms = CONNECTABLE_PLATFORMS.filter(
    (p) => !connectedPlatforms.has(p.toUpperCase())
  );

  const toggleChannel = (accountId) => {
    setManuallyExpandedId((current) => {
      const next = current !== null ? current : expandedId;
      return next === accountId ? "" : accountId;
    });
  };

  const handleSetDefault = async (account) => {
    setOpenMenuId(null);
    try {
      await socialService.setDefaultAccount(activeBrand.id, account.id);
      toast.success(t("channels.defaultSet", "Đã đặt làm kênh mặc định"));
      await refreshBrands(activeBrand.id);
    } catch (e) {
      toast.error(e.message || t("channels.defaultFailed", "Không thể đặt kênh mặc định"));
    }
  };

  const handleDisconnect = async (account) => {
    setOpenMenuId(null);
    const displayName = account.displayName || account.username || account.platform;
    if (!window.confirm(t("channels.confirmDisconnect", "Ngắt kết nối \"{{name}}\"?", { name: displayName }))) return;

    const fnName = DISCONNECT_FN_BY_PLATFORM[account.platform?.toUpperCase()];
    if (!fnName || typeof socialService[fnName] !== "function") {
      toast.error(t("channels.disconnectUnsupported", "Nền tảng này chưa hỗ trợ ngắt kết nối tại đây"));
      return;
    }

    setDisconnectingId(account.id);
    try {
      await socialService[fnName](activeBrand.id, account.id);
      toast.success(t("channels.disconnectSuccess", "Đã ngắt kết nối {{name}}", { name: displayName }));
      if (expandedId === account.id) {
        setManuallyExpandedId("");
        if (location.pathname.startsWith(`/channels/${account.id}`)) {
          navigate("/dashboard");
        }
      }
      await refreshBrands(activeBrand.id);
    } catch (e) {
      toast.error(e.message || t("channels.disconnectFailed", "Không thể ngắt kết nối"));
    } finally {
      setDisconnectingId(null);
    }
  };

  const renderChannelItem = (account) => {
    const isExpanded = expandedId === account.id;
    const displayName = account.displayName || account.username || account.platform;
    const initial = displayName?.charAt(0)?.toUpperCase() || "?";
    const isDisconnecting = disconnectingId === account.id;

    return (
      <div key={account.id} className="relative group/channel">
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleChannel(account.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleChannel(account.id); }}
          className="w-full flex items-center gap-2.5 pl-3 pr-8 py-2 rounded-lg transition-all cursor-pointer text-left"
          style={{
            background: isExpanded ? "var(--sidebar-accent)" : "transparent",
            opacity: isDisconnecting ? 0.5 : 1,
          }}
        >
          {account.isDefault && (
            <Star size={11} className="shrink-0 fill-current" style={{ color: "#f59e0b" }} />
          )}
          {!account.isConnected && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title={t("channels.reconnectNeeded", "Cần kết nối lại")} />
          )}
          <div className="relative shrink-0">
            {account.profilePictureUrl ? (
              <img
                src={account.profilePictureUrl}
                alt={displayName}
                className="w-7 h-7 rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-extrabold"
                style={{ background: "var(--sidebar-primary)" }}
              >
                {initial}
              </div>
            )}
            <div
              className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
              style={{ border: "2px solid var(--sidebar)" }}
            >
              <PlatformIcon platform={account.platform} size={14} />
            </div>
          </div>
          <span
            className="flex-1 min-w-0 truncate text-[13.5px] font-semibold"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            {displayName}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setOpenMenuId((cur) => (cur === account.id ? null : account.id)); }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer border-none bg-transparent opacity-0 group-hover/channel:opacity-100 transition-opacity"
          style={{ color: "var(--muted-foreground)", opacity: openMenuId === account.id ? 1 : undefined }}
          title={t("channels.channelOptions", "Tùy chọn kênh")}
        >
          <MoreVertical size={14} />
        </button>

        {openMenuId === account.id && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
            <div
              className="absolute right-1 top-full mt-1 z-50 w-44 rounded-xl border shadow-lg py-1"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              {!account.isDefault && (
                <button
                  onClick={() => handleSetDefault(account)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] font-medium cursor-pointer border-none bg-transparent text-left"
                  style={{ color: "var(--foreground)" }}
                >
                  <Star size={13} />
                  {t("channels.setDefault", "Đặt làm mặc định")}
                </button>
              )}
              <button
                onClick={() => handleDisconnect(account)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] font-medium cursor-pointer border-none bg-transparent text-left"
                style={{ color: "#ef4444" }}
              >
                <Unlink size={13} />
                {t("channels.disconnect", "Ngắt kết nối")}
              </button>
            </div>
          </>
        )}

        {isExpanded && (
          <div
            className="flex flex-col ml-6 my-0.5 pl-3.5"
            style={{ borderLeft: "1px solid var(--sidebar-border)" }}
          >
            {SUB_TABS.map(({ key, labelKey, icon: Icon }) => {
              const path = `/channels/${account.id}/${key}`;
              const isActive = location.pathname === path;
              return (
                <Link
                  key={key}
                  to={path}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md no-underline transition-all"
                  style={{
                    background: isActive ? "var(--sidebar-accent)" : "transparent",
                    color: isActive ? "var(--sidebar-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="text-[13px] font-medium">{t(labelKey)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="px-3 mb-3 flex items-center justify-between">
        <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "1px" }}>
          {t("channels.title", "Channels")}
        </span>
        <div className="flex items-center gap-1">
          {activeFilterGroup && (
            <button
              onClick={() => setActiveFilterGroupId(null)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md cursor-pointer border-none transition-colors"
              style={{ color: "var(--sidebar-foreground)", background: "var(--sidebar-accent)" }}
              title={t("channelGroups.showAll", "Show all channels")}
            >
              <Filter size={11} />
              <span className="text-[10px] font-bold max-w-[72px] truncate">{activeFilterGroup.name}</span>
              <XIcon size={11} />
            </button>
          )}
          <button
            onClick={() => { setEditingGroup(null); setGroupModalOpen(true); }}
            className="p-1 rounded-md cursor-pointer border-none bg-transparent transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            title={t("channelGroups.createGroup", "Create channel group")}
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {visibleGroups.map((group) => {
        const isCollapsed = collapsedGroupIds.includes(group.id);
        const memberAccounts = group.members
          .map((m) => socialAccounts.find((a) => a.id === m.socialAccountId))
          .filter(Boolean);

        return (
          <div key={group.id} className="mb-2">
            <div className="relative group/groupheader flex items-center gap-1.5 px-3 py-1">
              <button
                onClick={() => toggleGroupCollapsed(group.id)}
                className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer border-none bg-transparent p-0 text-left"
              >
                {isCollapsed ? <ChevronRight size={12} className="shrink-0" style={{ color: "var(--muted-foreground)" }} /> : <ChevronDown size={12} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />}
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color || "var(--muted-foreground)" }} />
                <span className="truncate text-[11px] font-bold" style={{ color: "var(--sidebar-foreground)" }}>
                  {group.name}
                </span>
                {group.visibility === CHANNEL_GROUP_VISIBILITY.PRIVATE && (
                  <Lock size={10} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
                )}
                <span className="text-[10px] font-medium shrink-0" style={{ color: "var(--muted-foreground)" }}>
                  {memberAccounts.length}
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenGroupMenuId((cur) => (cur === group.id ? null : group.id)); }}
                className="w-5 h-5 rounded-md flex items-center justify-center cursor-pointer border-none bg-transparent opacity-0 group-hover/groupheader:opacity-100 transition-opacity shrink-0"
                style={{ color: "var(--muted-foreground)", opacity: openGroupMenuId === group.id ? 1 : undefined }}
              >
                <MoreVertical size={12} />
              </button>
              {openGroupMenuId === group.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenGroupMenuId(null)} />
                  <div
                    className="absolute right-1 top-full mt-1 z-50 w-44 rounded-xl border shadow-lg py-1"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <button
                      onClick={() => handleCreatePostFromGroup(group)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer border-none bg-transparent text-left"
                      style={{ color: "var(--foreground)" }}
                    >
                      <PenSquare size={13} />
                      {t("channelGroups.createPost", "Create post")}
                    </button>
                    <button
                      onClick={() => toggleGroupFilter(group.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer border-none bg-transparent text-left"
                      style={{ color: "var(--foreground)" }}
                    >
                      <Filter size={13} />
                      {activeFilterGroupId === group.id
                        ? t("channelGroups.showAll", "Show all channels")
                        : t("channelGroups.showOnly", "Show only this group")}
                    </button>
                    <button
                      onClick={() => { setOpenGroupMenuId(null); setEditingGroup(group); setGroupModalOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer border-none bg-transparent text-left"
                      style={{ color: "var(--foreground)" }}
                    >
                      {t("channelGroups.editGroup", "Edit group")}
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer border-none bg-transparent text-left"
                      style={{ color: "#ef4444" }}
                    >
                      {t("channelGroups.deleteGroup", "Delete group")}
                    </button>
                  </div>
                </>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col gap-0.5">
                {memberAccounts.map(renderChannelItem)}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-0.5">
        {visibleUngroupedAccounts.map(renderChannelItem)}
      </div>

      <ChannelGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
        group={editingGroup}
        socialAccounts={socialAccounts}
      />

      {!activeFilterGroup && missingPlatforms.length > 0 && (
        <div className="mt-4 px-3">
          <button
            onClick={openConnections}
            className="text-[12.5px] font-bold mb-2.5 cursor-pointer bg-transparent border-none p-0"
            style={{ color: "#ec4899" }}
          >
            {t("channels.connectMore", "Connect more channels")}
          </button>
          <div className="flex items-center flex-wrap gap-2">
            {missingPlatforms.map((platform) => (
              <button
                key={platform}
                onClick={openConnections}
                title={platform}
                className="cursor-pointer border-none p-0 rounded-full shrink-0"
              >
                <PlatformIcon platform={platform} size={26} />
              </button>
            ))}
            <button
              onClick={openConnections}
              title={t("channels.connectMore", "Connect more channels")}
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center cursor-pointer shrink-0"
              style={{ border: "1.5px dashed var(--sidebar-border)", color: "var(--muted-foreground)", background: "transparent" }}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
