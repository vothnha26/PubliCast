import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import { PLATFORM_STRATEGIES } from "../../strategies/postAnalytics";
import { POST_ANALYTICS_TAB, POST_ANALYTICS_TAB_LABEL } from "../../constants/postAnalyticsTabs";
import { DateRangeFilter } from "../../components/app/DateRangeFilter";
import { PostAnalyticsHeaderStatsSkeleton, PostAnalyticsTabContentSkeleton } from "../../components/workspace/PostAnalyticsSkeleton";
import { useBrand } from "../../context/BrandContext";

export function PostAnalyticsDetailPage() {
  const { platform, postId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeBrand } = useBrand();

  const strategy = PLATFORM_STRATEGIES[platform];

  const [activeTab, setActiveTab] = useState(strategy?.supportedTabs?.[0] || POST_ANALYTICS_TAB.OVERVIEW);
  const [data, setData] = useState({
    metadata: { status: "loading", data: null },
    insights: { status: "loading", data: null },
    analytics: { status: "loading", data: null }
  });
  const [notFound, setNotFound] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  const postPreview = location.state?.post || null;

  useEffect(() => {
    if (!strategy || !activeBrand?.id || !postId) return;

    let cancelled = false;
    setNotFound(false);

    strategy.fetchData(activeBrand.id, postId, dateRange).then((result) => {
      if (cancelled) return;
      setData(result);
      if (result.metadata?.status === "error" && result.metadata.error?.response?.status === 404) {
        setNotFound(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [strategy, activeBrand?.id, postId, dateRange.from, dateRange.to]);

  const backPath = platform ? `/dashboard/${platform}` : "/dashboard";

  if (!strategy) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white p-8">
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-sm font-bold text-gray-600">Nền tảng "{platform}" chưa được hỗ trợ phân tích chi tiết.</p>
        <button
          onClick={() => navigate(backPath)}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          Quay lại Dashboard
        </button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white p-8">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-sm font-bold text-gray-600 text-center max-w-md">
          Không tìm thấy bài viết hoặc bạn không có quyền xem phân tích cho bài viết này.
        </p>
        <button
          onClick={() => navigate(backPath)}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          Quay lại Dashboard
        </button>
      </div>
    );
  }

  const metadata = data.metadata?.data;
  const historicalDataAvailableFrom = data.analytics?.historicalDataAvailableFrom || null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7]">
      {/* Header Block */}
      <div className="bg-[#2D1D35] text-white p-6 relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D9F99D]/10 rounded-full -mr-20 -mt-20 blur-3xl" />

        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 hover:text-white transition-colors mb-4 cursor-pointer relative z-10"
        >
          <ArrowLeft size={14} /> Quay lại
        </button>

        <div className="flex items-start justify-between relative z-10">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative bg-black flex items-center justify-center">
              {(postPreview?.thumbnail || metadata?.thumbnail) ? (
                <img src={postPreview?.thumbnail || metadata?.thumbnail} className="w-full h-full object-cover" alt="Post thumbnail" />
              ) : (
                <span className="text-2xl">📝</span>
              )}
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F99D]/20 text-[#D9F99D] mb-1.5 uppercase tracking-wider">
                <PlatformIcon platform={platform} size={11} /> {platform}
              </span>
              <h3 className="text-base font-black line-clamp-1 leading-snug tracking-tight pr-4">
                {postPreview?.title || metadata?.title || "Bài viết không có tiêu đề"}
              </h3>
              <div className="text-[10px] text-gray-400 mt-1">
                Đăng lúc: {(postPreview?.publishedAt || metadata?.publishedAt)
                  ? format(new Date(postPreview?.publishedAt || metadata.publishedAt), "HH:mm, dd/MM/yyyy")
                  : "Vừa xong"}
              </div>
            </div>
          </div>
        </div>

        {/* Header Stats */}
        <div className="mt-6 relative z-10">
          {data.metadata?.status === "loading" ? (
            <PostAnalyticsHeaderStatsSkeleton />
          ) : (
            strategy.renderHeaderStats(data)
          )}
        </div>
      </div>

      {/* Tab Selection */}
      <div className="bg-white border-b border-gray-100 px-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex gap-6">
          {strategy.supportedTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? "border-black text-black"
                  : "border-transparent text-gray-400 hover:text-black"
              }`}
            >
              {POST_ANALYTICS_TAB_LABEL[tab] || tab}
            </button>
          ))}
        </div>

        {strategy.supportsDateRange && (
          <DateRangeFilter date={dateRange} setDate={setDateRange} />
        )}
      </div>

      {historicalDataAvailableFrom && dateRange.from < new Date(historicalDataAvailableFrom) && (
        <div className="mx-6 mt-4 flex items-start gap-2.5 p-3.5 bg-amber-50 rounded-2xl border border-amber-100">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-normal">
            Dữ liệu trước ngày {format(new Date(historicalDataAvailableFrom), "dd/MM/yyyy")} chưa khả dụng.
          </p>
        </div>
      )}

      {/* Body Content */}
      <div className="p-6 space-y-6">
        {data.metadata?.status === "loading" ? (
          <PostAnalyticsTabContentSkeleton />
        ) : (
          strategy.renderTabContent(activeTab, data, dateRange, setDateRange)
        )}
      </div>
    </div>
  );
}
