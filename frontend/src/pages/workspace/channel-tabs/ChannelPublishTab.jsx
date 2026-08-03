import React, { useState } from "react";
import { Calendar as CalendarIcon, List as ListIcon, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PUBLISH_VIEW_MODES } from "../../../constants/channelTabs";
import { WeeklyCalendarView } from "../planner/WeeklyCalendarView";
import { ListView } from "../planner/ListView";
import { usePostCreator } from "../../../context/PostCreatorContext";
import { useBrandPermission } from "../../../hooks/useBrandPermission";

export function ChannelPublishTab({ socialAccountId, platform }) {
  const { t } = useTranslation("planner");
  const [viewMode, setViewMode] = useState(PUBLISH_VIEW_MODES.CALENDAR);
  const { openPostCreator } = usePostCreator();
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission("CREATE_POSTS");

  const handleCreatePost = () => {
    openPostCreator({
      defaultPlatform: platform?.toUpperCase(),
      defaultSocialAccountId: socialAccountId,
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Top Controls Toolbar */}
      <div className="px-6 py-3 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("channelPublish.title", "Quản lý bài đăng kênh")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle: List vs Calendar */}
          <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode(PUBLISH_VIEW_MODES.LIST)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                viewMode === PUBLISH_VIEW_MODES.LIST
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-transparent"
              }`}
            >
              <ListIcon size={14} />
              <span>{t("channelPublish.list", "Danh sách")}</span>
            </button>
            <button
              onClick={() => setViewMode(PUBLISH_VIEW_MODES.CALENDAR)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                viewMode === PUBLISH_VIEW_MODES.CALENDAR
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-transparent"
              }`}
            >
              <CalendarIcon size={14} />
              <span>{t("channelPublish.calendar", "Lịch")}</span>
            </button>
          </div>

          {/* New Post Button */}
          {hasCreatePermission && (
            <button
              onClick={handleCreatePost}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0A0A0A] dark:bg-lime-400 text-white dark:text-black hover:scale-105 active:scale-95 cursor-pointer transition-all shadow-md border-none"
            >
              <Plus size={15} />
              <span>{t("channelPublish.newPost", "Bài viết mới")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Mode Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {viewMode === PUBLISH_VIEW_MODES.CALENDAR ? (
          <WeeklyCalendarView socialAccountId={socialAccountId} platform={platform} />
        ) : (
          <ListView socialAccountId={socialAccountId} platform={platform} />
        )}
      </div>
    </div>
  );
}
