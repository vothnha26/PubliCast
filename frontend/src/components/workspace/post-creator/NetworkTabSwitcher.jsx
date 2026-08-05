import React, { useEffect } from "react";
import { Settings, Globe } from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { NETWORK_TAB_TEMPLATE } from "../../../constants/postComposerNetwork";

/** Map platform id → tên hiển thị ngắn */
const PLATFORM_LABEL = {
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
  telegram: "Telegram",
  threads: "Threads",
  bluesky: "Bluesky",
  reddit: "Reddit",
};

/** Map platform id → màu brand chính */
const PLATFORM_COLOR = {
  youtube: "#FF0000",
  facebook: "#1877F2",
  tiktok: "#000000",
  instagram: "#DD2A7B",
  telegram: "#0088cc",
  threads: "#000000",
  bluesky: "#0085FF",
  reddit: "#FF4500",
};

/**
 * NetworkTabSwitcher
 * Hiển thị hàng tab "CÀI ĐẶT CHUNG" + 1 icon/tab per platform đã chọn.
 * Chỉ render khi isEditByNetwork === true (được điều khiển từ bên ngoài).
 */
export function NetworkTabSwitcher() {
  const {
    activeNetworkTab,
    setNetworkTab,
    activeNetworkAccountId,
    setActiveNetworkAccountId,
    selectedPlatforms,
    selectedAccountIds,
    activeBrand,
    networkCustom,
    toggleUseTemplate,
    addThreadPost,
    removeThreadPost,
    setThreadActiveIndex,
  } = usePostCreatorFormContext();

  // Derived: sub-tabs cho Threads chain
  const isThreadsTab = activeNetworkTab === 'threads';
  const threadsData = networkCustom['threads'];
  const showThreadSubTabs = isThreadsTab && threadsData?.useTemplate === false;

  const isCustomPlatformTab =
    activeNetworkTab !== NETWORK_TAB_TEMPLATE;

  // Accounts belonging to the active platform tab that are actually
  // targeted by this post — when there are ≥2, an account sub-tab row lets
  // the user pick which one's content they're editing (mirrors the Threads
  // post sub-tabs below). A single account needs no sub-tab: the platform
  // entry itself is that account's content.
  const accountsForActiveTab = isCustomPlatformTab
    ? (activeBrand?.socialAccounts || []).filter(
        sa => (sa.platform || '').toLowerCase() === activeNetworkTab && selectedAccountIds.includes(sa.id)
      )
    : [];
  const showAccountSubTabs = accountsForActiveTab.length > 1;

  // Auto-select the first account whenever the sub-tab row appears with
  // nothing chosen yet — without this, the "shared content" checkbox above
  // starts disabled (no account in view to toggle) until the user manually
  // clicks a sub-tab, which isn't obvious the first time.
  useEffect(() => {
    if (showAccountSubTabs && !accountsForActiveTab.some(acc => acc.id === activeNetworkAccountId)) {
      setActiveNetworkAccountId(accountsForActiveTab[0].id);
    }
  }, [showAccountSubTabs, activeNetworkTab, accountsForActiveTab.map(a => a.id).join(',')]);

  const currentPlatformEntry = isCustomPlatformTab
    ? networkCustom[activeNetworkTab]
    : null;
  // When viewing a specific account's sub-tab, its own perAccount slot
  // drives the "using shared content" checkbox below — otherwise (no
  // sub-tabs, or viewing the platform as a whole) the platform-level entry does.
  const currentPlatformData = (showAccountSubTabs && activeNetworkAccountId)
    ? (currentPlatformEntry?.perAccount?.[activeNetworkAccountId] || { useTemplate: true })
    : currentPlatformEntry;

  const isUsingTemplate = currentPlatformData?.useTemplate ?? true;

  return (
    <div className="px-5 pt-3 pb-0 flex flex-col gap-2 border-b border-border">
      {/* Row: tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Tab: Cài đặt chung */}
        <button
          type="button"
          onClick={() => setNetworkTab(NETWORK_TAB_TEMPLATE)}
          title="Cài đặt chung"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider font-sans transition-all cursor-pointer ${
            activeNetworkTab === NETWORK_TAB_TEMPLATE
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-gray-200"
          }`}
        >
          <Globe size={11} />
          Cài đặt chung
        </button>

        {/* Dải phân cách nhỏ */}
        <span className="w-px h-4 bg-gray-200 mx-0.5" />

        {/* Tabs per platform */}
        {selectedPlatforms.map((platform) => {
          const isActive = activeNetworkTab === platform;
          const platformCustom = networkCustom[platform];
          const isCustomized = platformCustom?.useTemplate === false;
          const color = PLATFORM_COLOR[platform] || "#666666";

          return (
            <button
              key={platform}
              type="button"
              onClick={() => setNetworkTab(platform)}
              title={PLATFORM_LABEL[platform] || platform}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider font-sans transition-all cursor-pointer ${
                isActive
                  ? "text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-gray-200"
              }`}
              style={
                isActive ? { backgroundColor: color } : {}
              }
            >
              {/* Platform icon */}
              <span className="shrink-0">
                <PlatformIcon
                  platform={platform}
                  size={13}
                  variant="flat"
                  className={isActive ? "text-white" : ""}
                />
              </span>
              <span className="hidden sm:inline">
                {PLATFORM_LABEL[platform] || platform}
              </span>

              {/* Dot indicator khi đã customized */}
              {isCustomized && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                  title="Đang dùng nội dung riêng"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs: account, khi platform đang xem có ≥2 kênh được chọn cho
          bài này — mỗi kênh có thể có nội dung riêng thay vì dùng chung
          entry của cả platform (composer-audit P0.4). */}
      {showAccountSubTabs && (
        <div className="flex items-center gap-1.5 pb-1 flex-wrap">
          {accountsForActiveTab.map((acc) => {
            const isActive = activeNetworkAccountId === acc.id;
            const accName = acc.displayName || acc.username || acc.accountName || acc.id;
            const isAccCustomized = currentPlatformEntry?.perAccount?.[acc.id]?.useTemplate === false;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setActiveNetworkAccountId(acc.id)}
                title={accName}
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-sans transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-gray-200'
                }`}
              >
                {acc.avatarUrl ? (
                  <img src={acc.avatarUrl} alt={accName} className="w-4 h-4 rounded-full object-cover shrink-0" />
                ) : null}
                <span className="truncate max-w-[100px]">{accName}</span>
                {isAccCustomized && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                    title="Đang dùng nội dung riêng"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Row: checkbox "Dùng nội dung chung" — chỉ hiện khi đang ở tab platform */}
      {isCustomPlatformTab && (
        <div className="flex items-center gap-2 pb-2">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={isUsingTemplate}
              onChange={(e) =>
                toggleUseTemplate(activeNetworkTab, e.target.checked, showAccountSubTabs ? activeNetworkAccountId : null)
              }
              disabled={showAccountSubTabs && !activeNetworkAccountId}
              className="w-3.5 h-3.5 accent-gray-800 cursor-pointer rounded disabled:cursor-not-allowed disabled:opacity-40"
            />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-sans group-hover:text-foreground transition-colors">
              {showAccountSubTabs ? 'Dùng nội dung chung cho kênh này' : 'Dùng nội dung chung'}
            </span>
          </label>
          {!isUsingTemplate && (
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider font-sans bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 animate-in fade-in">
              Đang custom
            </span>
          )}
        </div>
      )}

      {/* Sub-tabs Threads chain: Post 1 / Post 2 / Post 3... + nút thêm */}
      {showThreadSubTabs && (
        <div className="flex items-center gap-1.5 pb-3 flex-wrap">
          {threadsData.threadPosts.map((_, index) => {
            const isActive = threadsData.activeThreadIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setThreadActiveIndex(index)}
                className={`flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-full text-[10px] font-black font-sans transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-gray-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                    isActive ? 'bg-card/20 text-white' : 'bg-gray-300 text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </span>
                <span>Post {index + 1}</span>
                {/* Nút xoá — chỉ hiện khi có > 1 post */}
                {threadsData.threadPosts.length > 1 && (
                  <span
                    role="button"
                    title="Xoá post này"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeThreadPost(index);
                    }}
                    className={`ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[11px] leading-none transition-all cursor-pointer ${
                      isActive
                        ? 'hover:bg-card/20 text-white/80 hover:text-white'
                        : 'hover:bg-gray-300 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}

          {/* Nút thêm post mới vào chain */}
          <button
            type="button"
            onClick={addThreadPost}
            title="Thêm bài viết vào chuỗi Threads"
            className="w-6 h-6 rounded-full flex items-center justify-center text-[16px] leading-none text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer font-sans"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
