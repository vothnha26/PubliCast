import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useBrand } from "../../context/BrandContext";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import { useTranslation } from "react-i18next";
import { ChannelPublishTab } from "./channel-tabs/ChannelPublishTab";
import { ChannelCommunityTab } from "./channel-tabs/ChannelCommunityTab";
import { ChannelInsightsTab } from "./channel-tabs/ChannelInsightsTab";
import { CHANNEL_TAB_KEYS } from "../../constants/channelTabs";

const VALID_TABS = [
  CHANNEL_TAB_KEYS.PUBLISH,
  CHANNEL_TAB_KEYS.COMMUNITY,
  CHANNEL_TAB_KEYS.INSIGHTS,
];

export function ChannelDetailPage() {
  const { t } = useTranslation("topbar");
  const { socialAccountId, tab } = useParams();
  const navigate = useNavigate();
  const { activeBrand } = useBrand();

  const account = (activeBrand?.socialAccounts || []).find((a) => a.id === socialAccountId);

  if (!VALID_TABS.includes(tab)) {
    return <Navigate to={`/channels/${socialAccountId}/${CHANNEL_TAB_KEYS.PUBLISH}`} replace />;
  }

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center max-w-sm">
          <p className="text-foreground font-semibold mb-2">
            {t("channels.notFound", "Không tìm thấy kênh này")}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            {t("channels.notFoundDesc", "Kênh có thể đã bị ngắt kết nối hoặc bạn đang xem sai thương hiệu.")}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer border-none"
          >
            {t("channels.backToDashboard", "Quay lại Tổng quan")}
          </button>
        </div>
      </div>
    );
  }

  const displayName = account.displayName || account.username || account.platform;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header Kênh */}
      <div className="px-8 py-4 border-b border-border flex items-center justify-between bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            {account.profilePictureUrl ? (
              <img src={account.profilePictureUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm border border-border">
                {displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 shadow-sm border border-border">
              <PlatformIcon platform={account.platform} size={13} variant="flat" />
            </div>
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-foreground leading-tight flex items-center gap-2">
              {displayName}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">{account.platform}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {tab === CHANNEL_TAB_KEYS.PUBLISH && (
          <ChannelPublishTab socialAccountId={socialAccountId} platform={account.platform} />
        )}
        {tab === CHANNEL_TAB_KEYS.COMMUNITY && (
          <ChannelCommunityTab socialAccountId={socialAccountId} platform={account.platform} />
        )}
        {tab === CHANNEL_TAB_KEYS.INSIGHTS && (
          <ChannelInsightsTab socialAccountId={socialAccountId} platform={account.platform} />
        )}
      </div>
    </div>
  );
}
