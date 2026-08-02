import React, { useState, useMemo } from "react";
import { LayoutGrid, ChevronDown, Search, Check } from "lucide-react";
import { PlatformIcon } from "../shared/PlatformIcon";

/**
 * ChannelFilterDropdown — Dropdown chọn kênh (Channel Filter Dropdown)
 * Giúp người dùng xem tất cả các kênh (All Channels) hoặc chọn lọc các kênh cụ thể.
 */
export function ChannelFilterDropdown({
  socialAccounts = [],
  selectedAccountIds = [],
  onSelectAccounts,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const connectedAccounts = useMemo(() => {
    return (socialAccounts || []).filter((sa) => sa.isConnected !== false);
  }, [socialAccounts]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return connectedAccounts;
    const q = searchQuery.toLowerCase();
    return connectedAccounts.filter((sa) => {
      const name = sa.displayName || sa.username || sa.accountName || sa.platform || "";
      return name.toLowerCase().includes(q) || (sa.platform || "").toLowerCase().includes(q);
    });
  }, [connectedAccounts, searchQuery]);

  const isAllSelected =
    selectedAccountIds.length === 0 ||
    (connectedAccounts.length > 0 && selectedAccountIds.length === connectedAccounts.length);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Bỏ chọn tất cả => rỗng
      onSelectAccounts([]);
    } else {
      // Chọn toàn bộ ID
      onSelectAccounts([]);
    }
  };

  const handleToggleAccount = (accountId) => {
    let currentSelected = selectedAccountIds;

    // Nếu đang ở trạng thái chọn tất cả (isAllSelected), nhấp vào 1 kênh tức là người dùng muốn BỎ CHỌN kênh đó
    if (isAllSelected || currentSelected.length === 0) {
      currentSelected = connectedAccounts.map((sa) => sa.id);
    }

    let nextSelected;
    if (currentSelected.includes(accountId)) {
      nextSelected = currentSelected.filter((id) => id !== accountId);
    } else {
      nextSelected = [...currentSelected, accountId];
    }

    if (nextSelected.length === 0 || nextSelected.length === connectedAccounts.length) {
      onSelectAccounts([]);
    } else {
      onSelectAccounts(nextSelected);
    }
  };

  const getButtonText = () => {
    if (isAllSelected) return "All Channels";
    if (selectedAccountIds.length === 1) {
      const target = connectedAccounts.find((sa) => sa.id === selectedAccountIds[0]);
      return target?.displayName || target?.username || target?.accountName || "1 Channel";
    }
    return `Channels (${selectedAccountIds.length})`;
  };

  return (
    <div className="relative inline-block text-left">
      {/* Nút Trigger Dropdown "Channels ∨" */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-sm transition-all cursor-pointer"
      >
        <LayoutGrid size={15} className="text-muted-foreground shrink-0" />
        <span className="truncate max-w-[140px]">{getButtonText()}</span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Menu Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-card border border-border shadow-2xl rounded-2xl p-3 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Thanh Tìm kiếm Kênh */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search channels"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/60 border border-border focus:border-emerald-500 text-foreground placeholder:text-muted-foreground rounded-xl py-2 pl-9 pr-3 text-xs outline-none transition-all"
              />
            </div>

            {/* Header: Title Channels + Select All */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Channels</span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                {isAllSelected ? "Select all" : "Select all"}
              </button>
            </div>

            {/* Danh sách các kênh */}
            <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-1">
              {filteredAccounts.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy kênh phù hợp</div>
              ) : (
                filteredAccounts.map((sa) => {
                  const isChecked = isAllSelected || selectedAccountIds.includes(sa.id);
                  const displayName = sa.displayName || sa.username || sa.accountName || sa.platform;
                  const avatarUrl = sa.profilePictureUrl || sa.avatarUrl;
                  const platformKey = (sa.platform || "").toLowerCase();

                  return (
                    <div
                      key={sa.id}
                      onClick={() => handleToggleAccount(sa.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        isChecked ? "bg-muted/70" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar kèm Platform Icon Badge góc dưới */}
                        <div className="relative shrink-0 flex items-center justify-center">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white text-[10px] font-extrabold shrink-0">
                              {displayName?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm flex items-center justify-center">
                            <PlatformIcon platform={platformKey} size={9} />
                          </div>
                        </div>

                        {/* Tên kênh */}
                        <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                          {displayName}
                        </span>
                      </div>

                      {/* Checkbox vuông */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                          isChecked
                            ? "bg-slate-900 border-slate-900 text-white dark:bg-emerald-600 dark:border-emerald-600"
                            : "border-gray-400 bg-transparent"
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
