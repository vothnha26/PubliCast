import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  FileText, 
  Download, 
  Share2, 
  Trash2, 
  Plus, 
  ChevronRight, 
  Eye, 
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  Edit2,
  Copy,
  ChevronLeft,
  Upload,
  Palette,
  Mail,
  Send,
  Save,
  Check,
  Maximize2,
  BarChart2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import { useBrand } from "../../context/BrandContext";
import reportService from "../../services/report.service";
import teamService from "../../services/team.service";
import { createPortal } from "react-dom";
import { GenericDashboardTab } from "../workspace/dashboard/GenericDashboardTab";
import { GenericPostsListTab } from "../workspace/dashboard/GenericPostsListTab";
import { FacebookOverviewTab } from "../workspace/dashboard/FacebookOverviewTab";
import { FacebookInteractionsTab } from "../workspace/dashboard/FacebookInteractionsTab";
import { FacebookPostsTab } from "../workspace/dashboard/FacebookPostsTab";
import { TikTokCommunityTab } from "../workspace/dashboard/TikTokCommunityTab";
import { InstagramAccountTab } from "../workspace/dashboard/InstagramAccountTab";
import { renderWidgetThumbnail } from "./reportWidgetThumbnails.jsx";

// Import modular components and constants
import { 
  PRESET_COLORS as CONST_PRESET_COLORS, 
  INITIAL_TEMPLATES as CONST_INITIAL_TEMPLATES 
} from "../../components/manage/reports/constants";
import { PerformanceOverviewWidget } from "../../components/manage/reports/PerformanceOverviewWidget";
import { AudienceDemographicsWidget } from "../../components/manage/reports/AudienceDemographicsWidget";
import { 
  ExportOptionsModal, 
  AutomationSchedulingPanel, 
  PdfHistoryPanel 
} from "../../components/manage/reports/ExportOptionsModal";


// Fallback empty preview data structures for new channels to avoid ReferenceErrors
const FALLBACK_PREVIEW_DATA = {
  tiktok: {
    totalViews: 0,
    totalLikes: 0,
    weeklyGrowth: [
      { week: "W1", views: 0 },
      { week: "W2", views: 0 },
      { week: "W3", views: 0 },
      { week: "W4", views: 0 }
    ]
  },
  telegram: {
    members: 0,
    avgViews: 0,
    forwarded: 0,
    reactionRate: 0,
    weeklyGrowth: [
      { week: "W1", views: 0 },
      { week: "W2", views: 0 },
      { week: "W3", views: 0 },
      { week: "W4", views: 0 }
    ]
  }
};

// Preset Hex Colors matching Screenshot 5
const PRESET_COLORS = CONST_PRESET_COLORS;
const INITIAL_TEMPLATES = CONST_INITIAL_TEMPLATES;

const getWeeklyData = (growthArray, key) => {
  if (!growthArray || !Array.isArray(growthArray) || growthArray.length === 0) {
    return [0, 0, 0, 0];
  }
  const result = [0, 0, 0, 0];
  const itemsPerWeek = Math.max(1, Math.ceil(growthArray.length / 4));
  for (let i = 0; i < 4; i++) {
    const start = i * itemsPerWeek;
    const end = Math.min(growthArray.length, start + itemsPerWeek);
    let sum = 0;
    for (let j = start; j < end; j++) {
      if (growthArray[j] && typeof growthArray[j][key] === 'number') {
        sum += growthArray[j][key];
      }
    }
    if (key === 'followers' || key === 'members') {
      const lastIndex = end - 1;
      sum = (growthArray[lastIndex] && typeof growthArray[lastIndex][key] === 'number') ? growthArray[lastIndex][key] : 0;
    }
    result[i] = sum;
  }
  return result;
};

const getCombinedGrowth = (channels) => {
  const days = Array.from({ length: 30 }, () => 0);
  if (!channels || !Array.isArray(channels)) return days;
  
  channels.forEach(ch => {
    const growth = ch.analyticsData?.growth;
    if (growth && Array.isArray(growth)) {
      growth.forEach((dayData, idx) => {
        if (idx < 30) {
          const eng = (dayData.reactions || dayData.likes || 0) + (dayData.comments || 0) + (dayData.shares || 0);
          days[idx] += eng;
        }
      });
    }
  });
  return days;
};

export function ReportsPage() {
  const { t } = useTranslation("reports");
  const { activeBrand } = useBrand();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  
  // View states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorStep, setEditorStep] = useState(1); // 1: Pages & Sections, 2: Background & Logo, 3: Colors & Preview
  const [editorTab, setEditorTab] = useState("summary"); // "summary", "facebook", "instagram"
  
  // Email automation monthly states (Screenshot 3)
  const [receiveEmail, setReceiveEmail] = useState(false);
  const [emailText, setEmailText] = useState("Monthly report for you.");
  const [emailsList, setEmailsList] = useState([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [scheduleFormat, setScheduleFormat] = useState("PDF");
  const [schedulePlatforms, setSchedulePlatforms] = useState(["Facebook", "YouTube"]);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [brandMembers, setBrandMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [isMembersDropdownOpen, setIsMembersDropdownOpen] = useState(false);

  // Stepper 1 States (Pages & Sections - Comprehensive list from Screenshots)
  const [templateName, setTemplateName] = useState("New Template");
  const [selectedWidgets, setSelectedWidgets] = useState({
    // Summary
    followers: true,
    postImpressions: true,
    postInteractions: true,
    posts: true,
    rankingOfPosts: true,
    campaignImpressions: false,
    campaignClicks: false,
    campaignCpm: false,
    campaignCpc: false,
    campaignSpent: false,
    rankingOfCampaigns: false,

    // Facebook (map theo các tab thật: Overview, Posts, Stories, Competitors)
    fbGrowth: true,
    fbBalance: true,
    fbViews: true,
    fbInteractions: true,
    fbTypesBreakdown: true,
    fbViewsBreakdown: true,
    fbRankingOfPosts: true,

    // Instagram (map theo các tab thật: Community, Account, Competitors)
    igGrowth: true,
    igRankingOfPosts: true,

    // YouTube (map theo các tab thật: Community, Demographics, Published, Viewed, Competitors)
    ytGrowth: true,
    ytRankingOfVideos: true,

    // TikTok (map theo các tab thật: Community, Posts)
    ttGrowth: true,
    ttBalance: true,
    ttViews: true,
    ttInteractions: true,
    ttPosts: true,
  });

  // Sorting configurations
  const [postsSortBy, setPostsSortBy] = useState("Impressions");
  const [postsMaxRows, setPostsMaxRows] = useState(15);
  const [fbPostsSortBy, setFbPostsSortBy] = useState("Engagement");
  const [fbPostsMaxRows, setFbPostsMaxRows] = useState(15);
  const [fbReelsSortBy, setFbReelsSortBy] = useState("Likes");
  const [fbReelsMaxRows, setFbReelsMaxRows] = useState(15);
  const [igPostsSortBy, setIgPostsSortBy] = useState("Likes");
  const [igPostsMaxRows, setIgPostsMaxRows] = useState(15);
  const [igReelsSortBy, setIgReelsSortBy] = useState("Likes");
  const [igReelsMaxRows, setIgReelsMaxRows] = useState(15);
  const [igStoriesSortBy, setIgStoriesSortBy] = useState("Date");
  const [igStoriesMaxRows, setIgStoriesMaxRows] = useState(15);
  const [igCompetitorsSortBy, setIgCompetitorsSortBy] = useState("Followers");
  const [igCompetitorsMaxRows, setIgCompetitorsMaxRows] = useState(15);
  const [ytVideosSortBy, setYtVideosSortBy] = useState("Views");
  const [ytVideosMaxRows, setYtVideosMaxRows] = useState(15);
  const [ttVideosSortBy, setTtVideosSortBy] = useState("Views");
  const [ttVideosMaxRows, setTtVideosMaxRows] = useState(15);

  // Stepper 2 States (Background & Logo - Screenshot 4)
  const [logoUrl, setLogoUrl] = useState("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80");
  const [coverBackgroundUrl, setCoverBackgroundUrl] = useState("");
  const [bodyBackgroundUrl, setBodyBackgroundUrl] = useState("");
  const [reportTitle, setReportTitle] = useState("Social Media Insights");

  // Stepper 3 States (Colors & Preview - Screenshot 5)
  const [selectedColor, setSelectedColor] = useState("#5C90A8");
  const [expandedPlatforms, setExpandedPlatforms] = useState({});
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Main page filters (Screenshot 1)
  const [period, setPeriod] = useState("30 ngày qua");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [language, setLanguage] = useState("English");
  
  // Section toggle settings (Main View)
  const [sectionSummary, setSectionSummary] = useState(true);
  const [sectionWebBlog, setSectionWebBlog] = useState(false);
  const [sectionFacebook, setSectionFacebook] = useState(true);
  const [summarySortBy, setSummarySortBy] = useState("Impressions");
  const [summaryMaxRows, setSummaryMaxRows] = useState(20);
  const [webSortBy, setWebSortBy] = useState("Page views");
  const [webMaxRows, setWebMaxRows] = useState(20);

  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [editorPreviewPage, setEditorPreviewPage] = useState(1);
  const [dataLoaded, setDataLoaded] = useState(false); // true sau khi user bấm Load Data

  // Fetch reports when active brand changes
  const fetchReports = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const res = await reportService.getReports(activeBrand.id);
      setReports(res?.reports || []);
    } catch (err) {
      toast.error(t("toasts.listError"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderNoDataSkeleton = (title) => (
    <div className="w-full aspect-[1.414/1] relative flex flex-col items-center justify-center gap-4 bg-white border border-dashed border-gray-200 rounded-xl p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <Calendar size={18} className="text-gray-300" />
        </div>
        <span className="text-xs font-bold text-gray-400">{title}</span>
        <span className="text-[10px] text-gray-300 max-w-[200px] leading-relaxed">
          {t("editor.noDataDesc")}
        </span>
      </div>
      {/* Skeleton bars */}
      <div className="w-full grid grid-cols-4 gap-2 px-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="w-full grid grid-cols-2 gap-2 px-4">
        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    </div>
  );

  const renderSectionList = (sections, columns = "sm:grid-cols-2") => (
    <div className={`grid grid-cols-1 ${columns} gap-4`}>
      {sections.map((section) => {
        const checked = Boolean(selectedWidgets[section.key]);
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => setSelectedWidgets((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
            className={`text-left rounded-xl border p-4 transition-all ${
              checked ? "border-black ring-1 ring-black bg-white shadow-sm" : "border-gray-200 bg-white hover:shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-gray-900 tracking-tight">{section.title}</div>
                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">{section.description}</div>
              </div>
              <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${checked ? "border-black bg-black" : "border-gray-300 bg-white"}`}>
                {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const fetchPreviewData = async () => {
    if (!activeBrand) return;
    setPreviewLoading(true);
    try {
      const platforms = ["Facebook", "YouTube", "Instagram", "TikTok", "Telegram"];
      const res = await reportService.getPreviewData(activeBrand.id, period, platforms.join(","));
      if (res?.data) {
        setPreviewData(res.data);
        setDataLoaded(true);
        toast.success(t("toasts.loadSuccess"));
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu preview:", err);
      toast.error(t("toasts.loadError"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePeriodChange = (val) => {
    if (val === "custom") {
      setIsCustomPeriod(true);
    } else {
      setIsCustomPeriod(false);
      setPeriod(val);
    }
  };

  // Combine custom date selections to form YYYY-MM-DD - YYYY-MM-DD
  useEffect(() => {
    if (isCustomPeriod && customStartDate && customEndDate) {
      setPeriod(`${customStartDate} - ${customEndDate}`);
    }
  }, [customStartDate, customEndDate, isCustomPeriod]);

  useEffect(() => {
    fetchReports();
    setPreviewPage(1);
    setEditorPreviewPage(1);
    // Reset data khi đổi brand
    setPreviewData(null);
    setDataLoaded(false);
  }, [activeBrand]);

  useEffect(() => {
    const fetchScheduleConfig = async () => {
      if (!activeBrand?.id) return;
      try {
        const response = await reportService.getScheduleConfig(activeBrand.id);
        const config = response?.config;
        if (config) {
          setReceiveEmail(config.receiveEmail || false);
          setEmailsList(config.emailsList || []);
          setEmailText(config.emailText || "Monthly report for you.");
          setDayOfMonth(config.dayOfMonth || 1);
          setScheduleFormat(config.format || "PDF");
          setSchedulePlatforms(config.platforms || ["Facebook", "YouTube"]);
        }
      } catch (error) {
        console.error("Failed to fetch schedule config:", error);
      }
    };
    fetchScheduleConfig();
  }, [activeBrand]);

  useEffect(() => {
    const fetchBrandMembers = async () => {
      if (!activeBrand?.id) return;
      setMembersLoading(true);
      try {
        const response = await teamService.getBrandTeam(activeBrand.id);
        setBrandMembers(response?.data || []);
      } catch (error) {
        console.error("Failed to fetch brand members:", error);
      } finally {
        setMembersLoading(false);
      }
    };
    fetchBrandMembers();
  }, [activeBrand]);

  const getEnabledPages = () => {
    const pages = ["cover"];
    if (selectedWidgets.followers || selectedWidgets.postImpressions || selectedWidgets.postInteractions || selectedWidgets.posts) {
      pages.push("summary");
    }
    
    const connectedPlatforms = previewData && previewData.channels 
      ? previewData.channels.map(c => c.platform.toUpperCase()) 
      : [];

    const isPlatformConnected = (platform) => {
      if (!previewData) return true; // Hiển thị tất cả khi chưa có dữ liệu nạp (lúc editor skeleton)
      return connectedPlatforms.includes(platform.toUpperCase());
    };

    if (isPlatformConnected("facebook") && (selectedWidgets.fbGrowth || selectedWidgets.fbBalance || selectedWidgets.fbViews || selectedWidgets.fbInteractions || selectedWidgets.fbTypesBreakdown || selectedWidgets.fbViewsBreakdown || selectedWidgets.fbRankingOfPosts)) {
      pages.push("facebook");
    }
    if (isPlatformConnected("instagram") && (selectedWidgets.igGrowth || selectedWidgets.igRankingOfPosts)) {
      pages.push("instagram");
    }
    if (isPlatformConnected("youtube") && (selectedWidgets.ytGrowth || selectedWidgets.ytRankingOfVideos)) {
      pages.push("youtube");
    }
    if (isPlatformConnected("tiktok") && (selectedWidgets.ttGrowth || selectedWidgets.ttBalance || selectedWidgets.ttViews || selectedWidgets.ttInteractions || selectedWidgets.ttPosts)) {
      pages.push("tiktok");
    }
    return pages;
  };

  const renderA4Page = (pageType, pageIndex, totalPages) => {
    // Nếu chưa có data thực, hiện skeleton (trừ trang cover không cần data)
    if (!previewData && pageType !== "cover") {
      return renderNoDataSkeleton(`${pageType.toUpperCase()} — ${t("editor.noDataTitle")}`);
    }
    const data = previewData || {};
    const brandName = activeBrand ? activeBrand.name : "My Brand";
    const color = selectedColor || "#5C90A8";
    const actualPreview = renderActualDashboardPreview(pageType);
    if (actualPreview) {
      return (
        <div className="w-full aspect-[1.414/1] relative flex flex-col overflow-hidden bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-5 max-w-[100px] object-contain rounded" />
              ) : (
                <div className="h-5 px-1.5 bg-gray-100 rounded flex items-center justify-center font-bold text-[7px] text-gray-500 uppercase">
                  {brandName.substring(0, 3)}
                </div>
              )}
              <span className="text-[8px] font-black text-gray-700 uppercase tracking-wider">{brandName}</span>
            </div>
            <span className="text-[7.5px] font-mono text-gray-400 font-bold uppercase tracking-widest">
              {pageType} • {period}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            {actualPreview}
          </div>
        </div>
      );
    }

    const renderHeader = (subtitle) => (
      <div className="flex justify-between items-center border-b pb-2 mb-3" style={{ borderColor: `${color}20` }}>
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-5 max-w-[100px] object-contain rounded" />
          ) : (
            <div className="h-5 px-1.5 bg-gray-150 rounded flex items-center justify-center font-bold text-[7px] text-gray-500 uppercase">
              {brandName.substring(0, 3)}
            </div>
          )}
          <span className="text-[8px] font-black text-gray-700 uppercase tracking-wider">{brandName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[7.5px] font-mono text-gray-400 font-bold uppercase tracking-widest">{subtitle}</span>
          <span className="text-[7.5px] font-mono text-gray-400 font-bold">{period}</span>
        </div>
      </div>
    );

    const renderFooter = () => (
      <div className="flex justify-between items-center border-t pt-1.5 mt-auto text-[6.5px] text-gray-450 font-mono" style={{ borderColor: `${color}10` }}>
        <span>{t("editor.reportFooter")}</span>
        <span className="font-bold">{t("editor.pageIndex", { pageIndex, totalPages })}</span>
      </div>
    );

    if (pageType === "cover") {
      return (
        <div 
          className={`w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-6 transition-all rounded-xl ${
            coverBackgroundUrl ? "bg-white" : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-955 text-white"
          }`}
          style={coverBackgroundUrl ? {
            backgroundImage: `url(${coverBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {}}
        >
          {!coverBackgroundUrl && (
            <>
              <div className="absolute top-[-30px] right-[-30px] w-36 h-36 rounded-full blur-3xl opacity-20" style={{ backgroundColor: color }} />
              <div className="absolute bottom-[-45px] left-[-45px] w-44 h-44 rounded-full blur-3xl opacity-15" style={{ backgroundColor: color }} />
            </>
          )}

          <div className={`flex justify-between items-start border-b pb-3 z-10 ${
            coverBackgroundUrl ? "border-gray-150" : "border-white/10"
          }`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-6.5 max-w-[120px] object-contain rounded" />
            ) : (
              <div className="h-6.5 px-2 bg-white/10 rounded flex items-center justify-center font-bold text-[8px] text-white/80">
                {brandName.substring(0, 10)}
              </div>
            )}
            <span className="text-[7.5px] font-mono opacity-65 tracking-wider font-bold">{t("editor.analysisPeriod", { period })}</span>
          </div>

          <div className="my-auto z-10 space-y-3">
            <h1 
              className={`text-xl font-black tracking-tight leading-tight uppercase ${
                coverBackgroundUrl ? "text-gray-800" : "text-white"
              }`}
            >
              {reportTitle || t("editor.coverTitle")}
            </h1>
            <div className="flex flex-col text-[8.5px] opacity-70 space-y-0.5 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                Platform: PubliCast Analytics Suite
              </span>
              <span>{t("editor.brandLabel", { brandName })}</span>
              <span>{t("editor.formatLabel")}</span>
            </div>
          </div>

          <div className={`text-center text-[7.5px] font-mono border-t pt-2.5 z-10 ${
            coverBackgroundUrl ? "border-gray-150 text-gray-450" : "border-white/10 text-white/40"
          }`}>
            {t("editor.createdEngine")}
          </div>
        </div>
      );
    }

    if (pageType === "summary") {
      const { overview, channels } = data;
      return (
        <div 
          className="w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-5 bg-white text-gray-800 border border-gray-150 rounded-xl"
          style={bodyBackgroundUrl ? {
            backgroundImage: `url(${bodyBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {}}
        >
          {renderHeader(t("sections.overview").toUpperCase())}

          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5 hover:shadow-sm transition-all" style={{ borderLeft: `3px solid ${color}` }}>
              <div className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider">{t("sections.reach")}</div>
              <div className="text-sm font-black text-gray-850 font-mono">
                {overview.reach >= 1000 ? `${(overview.reach / 1000).toFixed(1)}K` : overview.reach}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5 hover:shadow-sm transition-all" style={{ borderLeft: `3px solid #52C79F` }}>
              <div className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider">{t("sections.impressions")}</div>
              <div className="text-sm font-black text-gray-850 font-mono">
                {overview.impressions >= 1000 ? `${(overview.impressions / 1000).toFixed(1)}K` : overview.impressions}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5 hover:shadow-sm transition-all" style={{ borderLeft: `3px solid #E6A735` }}>
              <div className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider">{t("sections.engagements")}</div>
              <div className="text-sm font-black text-gray-850 font-mono">
                {overview.engagements >= 1000 ? `${(overview.engagements / 1000).toFixed(1)}K` : overview.engagements}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5 hover:shadow-sm transition-all" style={{ borderLeft: `3px solid #C65880` }}>
              <div className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider">{t("sections.engagementRate")}</div>
              <div className="text-sm font-black text-gray-850 font-mono">{overview.engagementRate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 items-stretch mb-1">
            <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">{t("sections.activeChannels")}</span>
              <div className="space-y-1.5">
                {channels.map((ch, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[7.5px]">
                    <div className="flex items-center gap-1 truncate">
                      <PlatformIcon platform={ch.platform} size={9} />
                      <span className="font-bold text-gray-700 truncate w-16">{ch.displayName}</span>
                    </div>
                    <span className="font-mono font-bold text-gray-500">
                      {ch.followers >= 1000 ? `${(ch.followers / 1000).toFixed(1)}K` : ch.followers}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider">{t("sections.engagementTrend")}</span>
              {(() => {
                const combined = getCombinedGrowth(channels);
                const maxEng = Math.max(...combined, 1);
                
                const coords = combined.map((val, i) => {
                  const x = i * (300 / 29);
                  const y = 70 - (val / maxEng) * 60;
                  return { x, y };
                });
                
                const pathD = `M ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
                const fillD = `M 0,70 L ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")} L 300,70 L 300,75 L 0,75 Z`;
                
                return (
                  <svg viewBox="0 0 300 80" className="w-full h-12 overflow-visible">
                    <defs>
                      <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="15" x2="300" y2="15" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="3 3" />
                    <line x1="0" y1="45" x2="300" y2="45" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="3 3" />
                    <line x1="0" y1="75" x2="300" y2="75" stroke="#E2E8F0" strokeWidth="0.5" />

                    <path d={fillD} fill={`url(#gradient-${color.replace("#", "")})`} />
                    <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />

                    {coords[10] && <circle cx={coords[10].x} cy={coords[10].y} r="2" fill={color} stroke="white" strokeWidth="0.5" />}
                    {coords[20] && <circle cx={coords[20].x} cy={coords[20].y} r="2" fill={color} stroke="white" strokeWidth="0.5" />}
                  </svg>
                );
              })()}
            </div>
          </div>

          {renderFooter()}
        </div>
      );
    }

    if (pageType === "facebook") {
      const fbChannel = data.channels.find(c => c.platform === "FACEBOOK") || { displayName: t("editor.widgetSections.facebook"), followers: 0, postsCount: 0, engagementRate: 0, reach: 0, impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
      const fbPosts = data.topPosts.filter(p => p.platform === "FACEBOOK").slice(0, 3);
      
      return (
        <div 
          className="w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-5 bg-white text-gray-800 border border-gray-150 rounded-xl"
          style={bodyBackgroundUrl ? {
            backgroundImage: `url(${bodyBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {}}
        >
          {renderHeader("FACEBOOK PERFORMANCE")}

          <div className="grid grid-cols-4 gap-3 mb-2.5">
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.followers")}</span>
              <div className="text-xs font-black text-blue-600 font-mono">
                {fbChannel.followers >= 1000 ? `${(fbChannel.followers / 1000).toFixed(1)}K` : fbChannel.followers}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.pageReach")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">
                {fbChannel.reach >= 1000 ? `${(fbChannel.reach / 1000).toFixed(1)}K` : fbChannel.reach}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.postsCount")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">{fbChannel.postsCount}</div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.avgEngagement")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">{fbChannel.engagementRate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 items-stretch mb-1">
            <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-lg p-2 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider">{t("sections.weeklyReach")}</span>
              <svg viewBox="0 0 150 75" className="w-full h-12 overflow-visible">
                <line x1="10" y1="10" x2="140" y2="10" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="35" x2="140" y2="35" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="60" x2="140" y2="60" stroke="#E2E8F0" strokeWidth="0.5" />
                {(() => {
                  const weeklyReach = getWeeklyData(fbChannel.analyticsData?.growth, "pageVisits");
                  const maxReach = Math.max(...weeklyReach, 1);
                  return weeklyReach.map((wVal, i) => {
                    const barH = Math.max(2, (wVal / maxReach) * 48);
                    const x = 25 + i * 30;
                    return (
                      <g key={i}>
                        <rect x={x} y={60 - barH} width="12" height={barH} rx="1.5" fill={color} fillOpacity="0.85" />
                        <text x={x + 6} y="68" textAnchor="middle" className="text-[5px] fill-gray-400 font-mono font-bold">W{i+1}</text>
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>

            <div className="col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">{t("sections.topPosts")}</span>
              <div className="space-y-1.5">
                {fbPosts.length > 0 ? fbPosts.map((post, idx) => (
                  <div key={post.id || idx} className="border-b border-gray-150 pb-1 last:border-b-0 last:pb-0">
                    <p className="text-[7px] text-gray-700 font-bold truncate line-clamp-1 w-full">{post.title}</p>
                    <div className="flex justify-between items-center text-[6px] text-gray-400 font-mono mt-0.5">
                      <span>Likes: {post.likes} • Shares: {post.shares}</span>
                      <span className="text-[#3B82F6] font-bold">{post.engagementRate}% {t("sections.engagementRate")}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-[7.5px] text-gray-400 text-center py-2">{t("sections.noPosts")}</div>
                )}
              </div>
            </div>
          </div>

          {renderFooter()}
        </div>
      );
    }

    if (pageType === "instagram") {
      const igChannel = data.channels.find(c => c.platform === "INSTAGRAM") || { displayName: t("editor.widgetSections.instagram"), followers: 0, postsCount: 0, engagementRate: 0, reach: 0, impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
      const igPosts = data.topPosts.filter(p => p.platform === "INSTAGRAM").slice(0, 3);
      
      return (
        <div 
          className="w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-5 bg-white text-gray-800 border border-gray-150 rounded-xl"
          style={bodyBackgroundUrl ? {
            backgroundImage: `url(${bodyBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {}}
        >
          {renderHeader("INSTAGRAM PROFILE ANALYSIS")}

          <div className="grid grid-cols-4 gap-3 mb-2.5">
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.followers")}</span>
              <div className="text-xs font-black text-pink-650 font-mono">
                {igChannel.followers >= 1000 ? `${(igChannel.followers / 1000).toFixed(1)}K` : igChannel.followers}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.reach")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">
                {igChannel.reach >= 1000 ? `${(igChannel.reach / 1000).toFixed(1)}K` : igChannel.reach}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.impressions")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">
                {igChannel.impressions >= 1000 ? `${(igChannel.impressions / 1000).toFixed(1)}K` : igChannel.impressions}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.postsCount")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">{igChannel.postsCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 items-stretch mb-1">
            <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-lg p-2 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 self-start">{t("sections.engagementStructure")}</span>
              {(() => {
                const likesVal = igChannel.likes || 0;
                const commentsVal = igChannel.comments || 0;
                const sharesVal = igChannel.shares || 0;
                const clicksVal = igChannel.clicks || 0;
                const totalIgEng = likesVal + commentsVal + sharesVal + clicksVal || 1;
                
                const likesPct = (likesVal / totalIgEng) * 100;
                const commentsPct = (commentsVal / totalIgEng) * 100;
                const sharesPct = (sharesVal / totalIgEng) * 100;
                const clicksPct = (clicksVal / totalIgEng) * 100;

                const circum = 238.76;
                const likesOffset = circum - (likesPct / 100) * circum;
                const commentsOffset = circum - (commentsPct / 100) * circum;
                const sharesOffset = circum - (sharesPct / 100) * circum;
                const clicksOffset = circum - (clicksPct / 100) * circum;

                const likesRot = -90;
                const commentsRot = likesRot + (likesPct / 100) * 360;
                const sharesRot = commentsRot + (commentsPct / 100) * 360;
                const clicksRot = sharesRot + (sharesPct / 100) * 360;

                return (
                  <div className="flex items-center gap-1.5 justify-around h-full">
                    <div className="relative flex items-center justify-center w-14 h-14">
                      <svg viewBox="0 0 100 100" className="w-14 h-14">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke={color} strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={likesOffset} transform={`rotate(${likesRot} 50 50)`} />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#52C79F" strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={commentsOffset} transform={`rotate(${commentsRot} 50 50)`} />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#E6A735" strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={sharesOffset} transform={`rotate(${sharesRot} 50 50)`} />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#C65880" strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={clicksOffset} transform={`rotate(${clicksRot} 50 50)`} />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-[5px] text-gray-450 font-bold uppercase">Likes</span>
                        <span className="text-[7.5px] font-black text-gray-700">{likesPct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-[5.5px] font-bold text-gray-600 font-mono">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <span>{t("sections.likesLabel", { percent: likesPct.toFixed(0) })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#52C79F]" />
                        <span>{t("sections.commentsLabel", { percent: commentsPct.toFixed(0) })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E6A735]" />
                        <span>{t("sections.sharesLabel", { percent: sharesPct.toFixed(0) })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C65880]" />
                        <span>{t("sections.clicksLabel", { percent: clicksPct.toFixed(0) })}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">{t("sections.topIgPosts")}</span>
              <div className="space-y-1.5">
                {igPosts.length > 0 ? igPosts.map((post, idx) => (
                  <div key={post.id || idx} className="border-b border-gray-150 pb-1 last:border-b-0 last:pb-0">
                    <p className="text-[7px] text-gray-700 font-bold truncate line-clamp-1 w-full">{post.title}</p>
                    <div className="flex justify-between items-center text-[6px] text-gray-400 font-mono mt-0.5">
                      <span>Likes: {post.likes} • Comments: {post.comments}</span>
                      <span className="text-pink-500 font-bold">{post.engagementRate}% {t("sections.engagementRate")}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-[7.5px] text-gray-450 text-center py-2">{t("sections.noPosts")}</div>
                )}
              </div>
            </div>
          </div>

          {renderFooter()}
        </div>
      );
    }

    if (pageType === "youtube") {
      const ytChannel = data.channels.find(c => c.platform === "YOUTUBE") || { displayName: t("editor.widgetSections.youtube"), followers: 0, postsCount: 0, engagementRate: 0, reach: 0, impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
      const ytPosts = data.topPosts.filter(p => p.platform === "YOUTUBE").slice(0, 3);
      
      return (
        <div 
          className="w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-5 bg-white text-gray-800 border border-gray-150 rounded-xl"
          style={bodyBackgroundUrl ? {
            backgroundImage: `url(${bodyBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {}}
        >
          {renderHeader("YOUTUBE VIDEO ANALYSIS")}

          <div className="grid grid-cols-4 gap-3 mb-2.5">
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.followers")}</span>
              <div className="text-xs font-black text-red-600 font-mono">
                {ytChannel.followers >= 1000 ? `${(ytChannel.followers / 1000).toFixed(1)}K` : ytChannel.followers}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.totalViews")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">
                {ytChannel.impressions >= 1000 ? `${(ytChannel.impressions / 1000).toFixed(1)}K` : ytChannel.impressions}
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.postsCount")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">{ytChannel.postsCount}</div>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5">
              <span className="text-[6.5px] text-gray-450 font-bold uppercase">{t("sections.avgEngagement")}</span>
              <div className="text-xs font-black text-gray-850 font-mono">{ytChannel.engagementRate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 items-stretch mb-1">
            <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-lg p-2 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider">{t("sections.subscribersGrowth")}</span>
              <svg viewBox="0 0 150 75" className="w-full h-12 overflow-visible">
                <line x1="10" y1="10" x2="140" y2="10" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="35" x2="140" y2="35" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="60" x2="140" y2="60" stroke="#E2E8F0" strokeWidth="0.5" />
                {(() => {
                  const weeklySubs = getWeeklyData(ytChannel.analyticsData?.growth, "subscribersGained");
                  const maxSubs = Math.max(...weeklySubs, 1);
                  const coords = weeklySubs.map((wVal, i) => {
                    const x = 20 + i * 35;
                    const y = 60 - (wVal / maxSubs) * 45;
                    return { x, y };
                  });
                  const pathD = `M ${coords.map(c => `${c.x},${c.y}`).join(" L ")}`;
                  return (
                    <>
                      <path d={pathD} fill="none" stroke="#EF4444" strokeWidth="1.5" />
                      {coords.map((c, i) => (
                        <circle key={i} cx={c.x} cy={c.y} r="1.5" fill="#EF4444" stroke="white" strokeWidth="0.5" />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">{t("sections.topVideos")}</span>
              <div className="space-y-1.5">
                {ytPosts.length > 0 ? ytPosts.map((post, idx) => (
                  <div key={post.id || idx} className="border-b border-gray-150 pb-1 last:border-b-0 last:pb-0">
                    <p className="text-[7px] text-gray-700 font-bold truncate line-clamp-1 w-full">{post.title}</p>
                    <div className="flex justify-between items-center text-[6px] text-gray-400 font-mono mt-0.5">
                      <span>{t("sections.totalViews")}: {post.likes * 12} • {t("sections.totalLikes")}: {post.likes}</span>
                      <span className="text-red-500 font-bold">{post.engagementRate}%</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-[7.5px] text-gray-450 text-center py-2">{t("sections.noVideos")}</div>
                )}
              </div>
            </div>
          </div>

          {renderFooter()}
        </div>
      );
    }

    if (pageType === "tiktok") {
      const ttChannel = data.channels?.find(c => c.platform === "TIKTOK") || { displayName: t("editor.widgetSections.tiktok"), followers: 0, postsCount: 0, engagementRate: 0, reach: 0, impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
      const ttData = data.tiktok || FALLBACK_PREVIEW_DATA.tiktok;
      const ttPosts = (data.topPosts || []).filter(p => p.platform === "TIKTOK").slice(0, 4);

      return (
        <div
          className="w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-5 bg-white text-gray-800 border border-gray-150 rounded-xl"
          style={bodyBackgroundUrl ? { backgroundImage: `url(${bodyBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        >
          {renderHeader("TIKTOK PERFORMANCE")}

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-2.5 mb-2.5">
            {[
              { label: t("sections.followers"), value: ttChannel.followers >= 1000 ? `${(ttChannel.followers / 1000).toFixed(1)}K` : ttChannel.followers, accent: "#000000" },
              { label: t("sections.totalViews"), value: ttChannel.impressions >= 1000 ? `${(ttChannel.impressions / 1000).toFixed(1)}K` : ttChannel.impressions, accent: "#FE2C55" },
              { label: t("sections.totalLikes"), value: ttChannel.likes >= 1000 ? `${(ttChannel.likes / 1000).toFixed(1)}K` : ttChannel.likes, accent: "#25F4EE" },
              { label: t("sections.avgEngagement"), value: `${ttChannel.engagementRate}%`, accent: color }
            ].map((kpi, i) => (
              <div key={i} className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5" style={{ borderTop: `2px solid ${kpi.accent}` }}>
                <span className="text-[6.5px] text-gray-450 font-bold uppercase tracking-wider block">{kpi.label}</span>
                <div className="text-xs font-black font-mono" style={{ color: kpi.accent === "#000000" ? "#111" : kpi.accent }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2.5 items-stretch mb-1">
            {/* Weekly Views Bar Chart */}
            <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-lg p-2 flex flex-col">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">{t("sections.weeklyViews")}</span>
              <svg viewBox="0 0 150 70" className="w-full flex-1">
                <line x1="10" y1="10" x2="140" y2="10" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="35" x2="140" y2="35" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="60" x2="140" y2="60" stroke="#E2E8F0" strokeWidth="0.5" />
                {(() => {
                  const weeklyViews = getWeeklyData(ttChannel.analyticsData?.growth, "views");
                  const maxViews = Math.max(...weeklyViews, 1);
                  return weeklyViews.map((wVal, i) => {
                    const barH = Math.max(2, (wVal / maxViews) * 48);
                    const x = 25 + i * 30;
                    return (
                      <g key={i}>
                        <rect x={x} y={60 - barH} width={12} height={barH} rx="1.5" fill="#FE2C55" fillOpacity="0.85" />
                        <text x={x + 6} y="68" textAnchor="middle" className="text-[5px] fill-gray-400 font-mono font-bold">W{i+1}</text>
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>

            {/* Top Videos Ranking */}
            <div className="col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider">Top TikTok Videos</span>
                <span className="text-[6px] px-1.5 py-0.5 rounded font-bold text-white" style={{ backgroundColor: "#FE2C55" }}>TIKTOK</span>
              </div>
              <div className="space-y-1.5">
                {ttPosts.length > 0 ? ttPosts.map((post, idx) => (
                  <div key={post.id || idx} className="border-b border-gray-100 pb-1 last:border-b-0 last:pb-0">
                    <p className="text-[7px] text-gray-700 font-bold truncate">{post.title}</p>
                    <div className="flex justify-between items-center text-[6px] text-gray-400 font-mono mt-0.5">
                      <span>❤️ {(post.likes || 0).toLocaleString()} · 💬 {(post.comments || 0).toLocaleString()} · 🔁 {(post.shares || 0).toLocaleString()}</span>
                      <span className="font-bold" style={{ color: "#FE2C55" }}>{post.engagementRate}%</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-[7.5px] text-gray-450 text-center py-4">
                    <div className="text-2xl mb-1">🎵</div>
                    {t("sections.noVideos")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {renderFooter()}
        </div>
      );
    }

    if (pageType === "telegram") {
      const tgChannel = data.channels?.find(c => c.platform === "TELEGRAM") || { displayName: t("editor.widgetSections.telegram"), followers: 0, postsCount: 0, engagementRate: 0, reach: 0, impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
      const tgData = data.telegram || FALLBACK_PREVIEW_DATA.telegram;
      const tgPosts = (data.topPosts || []).filter(p => p.platform === "TELEGRAM").slice(0, 4);

      return (
        <div
          className="w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-5 bg-white text-gray-800 border border-gray-150 rounded-xl"
          style={bodyBackgroundUrl ? { backgroundImage: `url(${bodyBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        >
          {renderHeader("TELEGRAM CHANNEL ANALYTICS")}

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-2.5 mb-2.5">
            {[
              { label: t("sections.followers"), value: tgChannel.followers >= 1000 ? `${(tgChannel.followers / 1000).toFixed(1)}K` : tgChannel.followers, accent: "#24A1DE" },
              { label: t("sections.avgViews"), value: tgChannel.reach >= 1000 ? `${(tgChannel.reach / 1000).toFixed(1)}K` : tgChannel.reach, accent: "#2AABEE" },
              { label: t("sections.forwarded"), value: tgChannel.shares >= 1000 ? `${(tgChannel.shares / 1000).toFixed(1)}K` : tgChannel.shares, accent: color },
              { label: t("sections.reactionRate"), value: `${tgChannel.engagementRate}%`, accent: "#52C79F" }
            ].map((kpi, i) => (
              <div key={i} className="p-2 bg-gray-50 border border-gray-100 rounded-lg space-y-0.5" style={{ borderTop: `2px solid ${kpi.accent}` }}>
                <span className="text-[6.5px] text-gray-450 font-bold uppercase tracking-wider block">{kpi.label}</span>
                <div className="text-xs font-black font-mono" style={{ color: kpi.accent }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2.5 items-stretch mb-1">
            {/* Views Trend Line */}
            <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-lg p-2 flex flex-col">
              <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">{t("sections.totalViews")}</span>
              <svg viewBox="0 0 150 70" className="w-full flex-1">
                <line x1="10" y1="10" x2="140" y2="10" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="35" x2="140" y2="35" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="10" y1="60" x2="140" y2="60" stroke="#E2E8F0" strokeWidth="0.5" />
                {(() => {
                  const weeklyViews = getWeeklyData(tgChannel.analyticsData?.growth, "views");
                  const maxV = Math.max(...weeklyViews, 1);
                  const minV = Math.min(...weeklyViews, 0);
                  const range = maxV - minV || 1;
                  const coords = weeklyViews.map((wVal, i) => {
                    const x = 20 + i * 35;
                    const y = 60 - ((wVal - minV) / range) * 45;
                    return { x, y };
                  });
                  const pathD = `M ${coords.map(c => `${c.x},${c.y}`).join(" L ")}`;
                  const fillD = `M ${coords[0].x},${coords[0].y} L ${coords.map(c => `${c.x},${c.y}`).join(" L ")} L ${coords[coords.length - 1].x},60 L ${coords[0].x},60 Z`;
                  return (
                    <>
                      <defs>
                        <linearGradient id="tgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#24A1DE" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#24A1DE" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={fillD} fill="url(#tgGrad)" />
                      <path d={pathD} fill="none" stroke="#24A1DE" strokeWidth="1.5" />
                      {coords.map((c, i) => (
                        <circle key={i} cx={c.x} cy={c.y} r="1.5" fill="#24A1DE" stroke="white" strokeWidth="0.5" />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Subscriber Growth + Top Posts */}
            <div className="col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider">{t("sections.topPosts")}</span>
                <span className="text-[6px] px-1.5 py-0.5 rounded font-bold text-white" style={{ backgroundColor: "#24A1DE" }}>TELEGRAM</span>
              </div>
              <div className="space-y-1.5">
                {tgPosts.length > 0 ? tgPosts.map((post, idx) => (
                  <div key={post.id || idx} className="border-b border-gray-100 pb-1 last:border-b-0 last:pb-0">
                    <p className="text-[7px] text-gray-700 font-bold truncate">{post.title}</p>
                    <div className="flex justify-between items-center text-[6px] text-gray-400 font-mono mt-0.5">
                      <span>👁 {(post.views || 0).toLocaleString()} {t("sections.totalViews").toLowerCase()}</span>
                      <span className="font-bold" style={{ color: "#24A1DE" }}>{post.engagementRate}% reach</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-[7.5px] text-gray-450 text-center py-4">{t("sections.noPosts")}</div>
                )}
              </div>
              
              {/* Subscriber growth progress */}
              <div className="mt-auto pt-1.5 border-t border-gray-100">
                {(() => {
                  const weeklyMembers = getWeeklyData(tgChannel.analyticsData?.growth, "followers");
                  const initialTgMembers = weeklyMembers[0] || 0;
                  const finalTgMembers = weeklyMembers[3] || 0;
                  const tgGrowthPct = initialTgMembers > 0 ? (((finalTgMembers - initialTgMembers) / initialTgMembers) * 100).toFixed(1) : "0.0";
                  return (
                    <>
                      <div className="flex justify-between text-[6.5px] text-gray-500 mb-1">
                        <span>{t("sections.subscribersGrowthMonthly")}</span>
                        <span className="font-bold text-green-500">+{tgGrowthPct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${initialTgMembers > 0 ? Math.min(100, Math.max(0, ((finalTgMembers - initialTgMembers) / initialTgMembers) * 100 * 10)).toFixed(1) : 0}%`, backgroundColor: "#24A1DE" }} />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {renderFooter()}
        </div>
      );
    }

    return null;
  };

  // ─── renderPlatformDashboardCharts: hiển thị biểu đồ Recharts thực tế ─────────
  const renderPlatformDashboardCharts = (platform, channelData) => {
    if (!channelData) return null;
    const ad = channelData.analyticsData;
    if (!ad) return null;

    const growthRows = Array.isArray(ad.growth) ? ad.growth : [];

    if (platform === "FACEBOOK" || platform === "facebook") {
      const fbRealData = {
        growth: growthRows.map((r, i) => ({
          date: r.date || `2026-06-${String(i+1).padStart(2, '0')}`,
          followers: r.followers || r.new || 0,
          views: r.views || r.value || 0,
          pageVisits: r.pageVisits || 0,
          totalContent: r.totalContent || r.videos || 0,
          acquired: r.acquired || r.new || 0,
          lost: r.lost || 0,
          reactions: r.reactions || 0,
          comments: r.comments || 0,
          shares: r.shares || 0
        })),
        balance: (ad.balance || []).map((r, i) => ({
          date: r.date || `2026-06-${String(i+1).padStart(2, '0')}`,
          acquired: r.acquired || 0,
          lost: r.lost || 0,
          totalContent: r.totalContent || 0
        })),
        postsPeriod: (ad.postsPeriod || []).map((r, i) => ({
          date: r.date || `2026-06-${String(i+1).padStart(2, '0')}`,
          views: r.views || 0,
          reactions: r.reactions || 0
        })),
        interactions: ad.interactions || {},
        summary: ad.summary || {}
      };

      // Lọc posts của Facebook từ publishedVideos
      const fbPublishedPosts = (ad.publishedVideos || []).filter(v =>
        v.platform === 'FACEBOOK' || v.platform === 'facebook'
      ).map(v => ({ ...v, platform: 'FACEBOOK' }));

      return (
        <div className="space-y-8 p-4 bg-white rounded-3xl border border-gray-100">
          <div className="border-b pb-4 mb-4 flex items-center justify-between">
             <h4 className="text-base font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
               <PlatformIcon platform="Facebook" size={18} />
               {t("dashboard.fbOverview")}
             </h4>
          </div>
          {(selectedWidgets.fbGrowth || selectedWidgets.fbBalance) && (
            <FacebookOverviewTab realData={fbRealData} />
          )}
          {(selectedWidgets.fbViews || selectedWidgets.fbInteractions) && (
            <FacebookInteractionsTab realData={fbRealData} />
          )}
          <div>
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Danh sách bài đăng Facebook</h5>
            <GenericPostsListTab
              posts={fbPublishedPosts}
              isLoading={false}
              pageSize={5}
              searchPlaceholder="Search Facebook posts..."
              searchKeys={["message", "caption", "text"]}
              emptyStateTitle="No Facebook posts found."
              footerMessage="Showing latest Facebook posts"
            />
          </div>
        </div>
      );
    }

    if (platform === "INSTAGRAM" || platform === "instagram") {
      const igRealData = {
        growth: growthRows.map((r, i) => ({
          date: r.date || `2026-06-${String(i+1).padStart(2, '0')}`,
          followers: r.followers || 0,
          following: r.following || 0,
          totalContent: r.totalContent || 0
        }))
      };

      return (
        <div className="space-y-8 p-4 bg-white rounded-3xl border border-gray-100">
          <div className="border-b pb-4 mb-4">
             <h4 className="text-base font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
               <PlatformIcon platform="Instagram" size={18} />
               {t("dashboard.igAnalysis")}
             </h4>
          </div>
          {selectedWidgets.igGrowth && (
            <GenericDashboardTab
              title={t("dashboard.igGrowth")}
              description={t("dashboard.igGrowthDesc")}
              data={igRealData.growth}
              metricConfig={[
                { key: "followers", label: t("sections.followers"), color: "bg-[#8E9BEE] text-white", chartColor: "#8E9BEE", type: "area", value: channelData.followers || 0 },
                { key: "following", label: t("sections.following", "Following"), color: "bg-[#A7F3D0] text-gray-900", chartColor: "#A7F3D0", type: "line", value: 0 },
                { key: "totalContent", label: t("sections.postsCount"), color: "bg-[#FEF08A] text-gray-900", chartColor: "#EAB308", type: "bar", yAxisId: "right", value: channelData.postsCount || 0 }
              ]}
              summaryGrid={[
                { label: t("sections.followers"), value: channelData.followers || 0 },
                { label: t("sections.postsCount"), value: channelData.postsCount || 0 },
                { label: t("sections.engagementRate"), value: `${channelData.engagementRate || 0}%` },
                { label: t("sections.reach"), value: channelData.reach || 0 }
              ]}
            />
          )}
          {selectedWidgets.igRankingOfPosts && (
            <InstagramAccountTab
              metrics={{ instagramAccount: channelData }}
              realData={igRealData}
              publishedVideos={ad.publishedVideos || []}
              isPublishedLoading={false}
            />
          )}
        </div>
      );
    }

    if (platform === "YOUTUBE" || platform === "youtube") {
      const ytGrowthData = growthRows.map((r, i) => ({
        name: r.date ? r.date.slice(5) : `D${i+1}`,
        subscribers: r.subscribersGained || r.new || 0,
        views: r.views || r.value || 0,
        videos: r.totalContent || r.videos || 0
      }));
      const ytMetricConfig = [
        { key: "subscribers", label: t("sections.followers"), color: "bg-[#EF4444] text-white", chartColor: "#EF4444", type: "area", value: ytGrowthData.reduce((a,b)=>a+(b.subscribers||0),0) },
        { key: "views", label: t("sections.totalViews"), color: "bg-[#818CF8] text-white", chartColor: "#818CF8", type: "line", value: channelData.impressions || 0 },
        { key: "videos", label: t("sections.postsCount"), color: "bg-[#FEF08A] text-gray-900", chartColor: "#EAB308", type: "bar", yAxisId: "right", value: channelData.postsCount || 0 }
      ];
      const ytSummaryGrid = [
        { label: t("sections.followers"), value: channelData.followers >= 1000 ? `${(channelData.followers/1000).toFixed(1)}K` : channelData.followers || 0 },
        { label: t("sections.totalViews"), value: channelData.impressions >= 1000 ? `${(channelData.impressions/1000).toFixed(1)}K` : channelData.impressions || 0 },
        { label: t("sections.postsCount"), value: channelData.postsCount || 0 },
        { label: t("sections.engagementRate"), value: `${channelData.engagementRate || 0}%` }
      ];
      return (
        <div className="space-y-6">
          <GenericDashboardTab
            title={t("dashboard.ytGrowth")}
            description={t("dashboard.ytGrowthDesc")}
            data={ytGrowthData}
            metricConfig={ytMetricConfig}
            summaryGrid={ytSummaryGrid}
          />
          <GenericPostsListTab
            posts={(ad.publishedVideos || []).filter(v => v.platform === 'YOUTUBE' || v.platform === 'youtube' || (v.id && String(v.id).length === 11)).map(v => ({ ...v, platform: 'YOUTUBE' }))}
            isLoading={false}
            pageSize={5}
            searchPlaceholder="Search YouTube videos..."
            searchKeys={["title", "description", "text"]}
            emptyStateTitle="No YouTube videos found."
            footerMessage="Showing latest YouTube videos"
          />
        </div>
      );
    }

    if (platform === "TIKTOK" || platform === "tiktok") {
      const ttRealData = {
        growth: growthRows.map((r, i) => ({
          date: r.date || `2026-06-${String(i+1).padStart(2, '0')}`,
          views: r.views || 0,
          likes: r.likes || 0,
          comments: r.comments || 0,
          shares: r.shares || 0,
          followers: r.followers || 0
        })),
        balance: (ad.balance || []).map((r, i) => ({
          date: r.date || `2026-06-${String(i+1).padStart(2, '0')}`,
          acquired: r.acquired || 0,
          lost: r.lost || 0
        }))
      };

      // Lọc và tag platform cho TikTok posts
      const ttPublishedPosts = (ad.publishedVideos || []).map(v => ({ ...v, platform: 'TIKTOK' }));

      return (
        <div className="space-y-8 p-4 bg-white rounded-3xl border border-gray-100">
          <div className="border-b pb-4 mb-4">
             <h4 className="text-base font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
               <PlatformIcon platform="TikTok" size={18} />
               {t("dashboard.ttPerformance")}
             </h4>
          </div>
          {selectedWidgets.ttGrowth && (
            <div>
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t("dashboard.ttCommunityGrowth")}</h5>
              <TikTokCommunityTab realData={ttRealData} dateRange={period} />
            </div>
          )}
          {selectedWidgets.ttViews && (
            <div>
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t("dashboard.ttPostsPerformance")}</h5>
              <GenericPostsListTab
                posts={ttPublishedPosts}
                isLoading={false}
                pageSize={5}
                searchPlaceholder="Search TikTok videos..."
                searchKeys={["title", "caption", "text"]}
                emptyStateTitle="No TikTok videos found."
                footerMessage="Showing latest TikTok videos"
              />
            </div>
          )}
        </div>
      );
    }

    if (platform === "TELEGRAM" || platform === "telegram") {
      const tgGrowthData = growthRows.map((r, i) => ({
        name: r.date ? r.date.slice(5) : `D${i+1}`,
        views: r.views || r.avgViews || 0,
        members: r.members || r.followers || r.new || 0
      }));
      const tgMetricConfig = [
        { key: "members", label: t("sections.followers"), color: "bg-[#24A1DE] text-white", chartColor: "#24A1DE", type: "area", value: channelData.followers || 0 },
        { key: "views", label: t("sections.avgViews"), color: "bg-[#A7F3D0] text-gray-900", chartColor: "#34D399", type: "line", value: channelData.impressions || 0 }
      ];
      const tgSummaryGrid = [
        { label: t("sections.followers"), value: channelData.followers >= 1000 ? `${(channelData.followers/1000).toFixed(1)}K` : channelData.followers || 0 },
        { label: t("sections.avgViews"), value: channelData.impressions || 0 },
        { label: t("sections.forwarded"), value: channelData.shares || 0 },
        { label: t("sections.reactionRate"), value: `${channelData.engagementRate || 0}%` }
      ];
      return (
        <GenericDashboardTab
          title={t("dashboard.tgAnalytics")}
          description={t("dashboard.tgAnalyticsDesc")}
          data={tgGrowthData}
          metricConfig={tgMetricConfig}
          summaryGrid={tgSummaryGrid}
        />
      );
    }

    return null;
  };

  const renderActualDashboardPreview = (pageType) => {
    if (!previewData || pageType === "cover" || pageType === "summary") return null;
    const channel = previewData.channels?.find(
      (ch) => ch.platform?.toLowerCase() === pageType.toLowerCase()
    );
    if (!channel) return null;

    return (
      <div className="w-full h-full overflow-auto bg-white">
        <div className="min-w-[980px] p-4">
          {renderPlatformDashboardCharts(pageType, channel)}
        </div>
      </div>
    );
  };

  // Handle template selection change
  // Helper: snapshot config hiện tại để lưu vào template
  const snapshotConfig = () => ({
    selectedWidgets: { ...selectedWidgets },
    selectedColor,
    logoUrl,
    coverBackgroundUrl,
    bodyBackgroundUrl,
    reportTitle,
    postsSortBy, postsMaxRows,
    fbPostsSortBy, fbPostsMaxRows,
    fbReelsSortBy, fbReelsMaxRows,
    igPostsSortBy, igPostsMaxRows,
    igReelsSortBy, igReelsMaxRows,
    igStoriesSortBy, igStoriesMaxRows,
    igCompetitorsSortBy, igCompetitorsMaxRows,
    ytVideosSortBy, ytVideosMaxRows,
    ttVideosSortBy, ttVideosMaxRows
  });

  // Helper: restore config từ template vào state
  const restoreConfig = (cfg) => {
    if (!cfg) return;
    setSelectedWidgets(cfg.selectedWidgets);
    setSelectedColor(cfg.selectedColor);
    setLogoUrl(cfg.logoUrl || "");
    setCoverBackgroundUrl(cfg.coverBackgroundUrl || "");
    setBodyBackgroundUrl(cfg.bodyBackgroundUrl || "");
    setReportTitle(cfg.reportTitle || "Social Media Insights");
    if (cfg.postsSortBy) setPostsSortBy(cfg.postsSortBy);
    if (cfg.postsMaxRows) setPostsMaxRows(cfg.postsMaxRows);
    if (cfg.fbPostsSortBy) setFbPostsSortBy(cfg.fbPostsSortBy);
    if (cfg.fbPostsMaxRows) setFbPostsMaxRows(cfg.fbPostsMaxRows);
    if (cfg.fbReelsSortBy) setFbReelsSortBy(cfg.fbReelsSortBy);
    if (cfg.fbReelsMaxRows) setFbReelsMaxRows(cfg.fbReelsMaxRows);
    if (cfg.igPostsSortBy) setIgPostsSortBy(cfg.igPostsSortBy);
    if (cfg.igPostsMaxRows) setIgPostsMaxRows(cfg.igPostsMaxRows);
    if (cfg.igReelsSortBy) setIgReelsSortBy(cfg.igReelsSortBy);
    if (cfg.igReelsMaxRows) setIgReelsMaxRows(cfg.igReelsMaxRows);
    if (cfg.igStoriesSortBy) setIgStoriesSortBy(cfg.igStoriesSortBy);
    if (cfg.igStoriesMaxRows) setIgStoriesMaxRows(cfg.igStoriesMaxRows);
    if (cfg.igCompetitorsSortBy) setIgCompetitorsSortBy(cfg.igCompetitorsSortBy);
    if (cfg.igCompetitorsMaxRows) setIgCompetitorsMaxRows(cfg.igCompetitorsMaxRows);
    if (cfg.ytVideosSortBy) setYtVideosSortBy(cfg.ytVideosSortBy);
    if (cfg.ytVideosMaxRows) setYtVideosMaxRows(cfg.ytVideosMaxRows);
    if (cfg.ttVideosSortBy) setTtVideosSortBy(cfg.ttVideosSortBy);
    if (cfg.ttVideosMaxRows) setTtVideosMaxRows(cfg.ttVideosMaxRows);
  };

  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setSelectedTemplateId(val);
    if (val) {
      const selected = templates.find(t => t.id === val);
      if (selected?.config) {
        restoreConfig(selected.config);
        toast.success(`Đã áp dụng template: ${selected.name}`);
      } else {
        toast.success(`Đã chọn template: ${selected.name}`);
      }
    }
  };

  // Open Template Editor in Create Mode
  const handleCreateTemplateClick = () => {
    setTemplateName("New Template");
    setSelectedTemplateId("");
    setEditorStep(1);
    setEditorTab("summary");
    setIsEditorOpen(true);
  };

  // Open Template Editor in Edit Mode — restore config
  const handleEditTemplateClick = () => {
    if (!selectedTemplateId) {
      toast.error("Vui lòng chọn một template để chỉnh sửa.");
      return;
    }
    const t = templates.find(temp => temp.id === selectedTemplateId);
    setTemplateName(t.name);
    if (t.config) restoreConfig(t.config);
    setEditorStep(1);
    setEditorTab("summary");
    setIsEditorOpen(true);
  };

  // Duplicate template — copy config
  const handleDuplicateTemplate = () => {
    if (!selectedTemplateId) {
      toast.error("Vui lòng chọn một template để nhân bản.");
      return;
    }
    const t = templates.find(temp => temp.id === selectedTemplateId);
    const newT = {
      id: `tmpl-${Date.now()}`,
      name: `${t.name} (Copy)`,
      config: t.config ? { ...t.config } : null
    };
    setTemplates(prev => [...prev, newT]);
    setSelectedTemplateId(newT.id);
    toast.success(`Đã nhân bản template thành "${newT.name}"`);
  };

  // Remove template
  const handleRemoveTemplate = () => {
    if (!selectedTemplateId) {
      toast.error("Vui lòng chọn một template để xóa.");
      return;
    }
    const t = templates.find(temp => temp.id === selectedTemplateId);
    setTemplates(prev => prev.filter(temp => temp.id !== selectedTemplateId));
    setSelectedTemplateId("");
    toast.success(`Đã xóa template: ${t.name}`);
  };

  // Save template from Editor — persist full config snapshot
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Vui lòng nhập tên template.");
      return;
    }
    const config = snapshotConfig();
    if (selectedTemplateId) {
      setTemplates(prev => prev.map(t =>
        t.id === selectedTemplateId ? { ...t, name: templateName, config } : t
      ));
      toast.success(`Đã cập nhật template “${templateName}”`);
    } else {
      const newT = { id: `tmpl-${Date.now()}`, name: templateName, config };
      setTemplates(prev => [...prev, newT]);
      setSelectedTemplateId(newT.id);
      toast.success(`Đã lưu template mới “${templateName}”`);
    }
    setIsEditorOpen(false);
  };

  // Email tags handling
  const handleAddEmail = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = newEmailInput.trim();
      if (!val) return;
      if (!/\S+@\S+\.\S+/.test(val)) {
        toast.error("Email không hợp lệ.");
        return;
      }
      if (emailsList.includes(val)) {
        toast.error("Email đã tồn tại.");
        return;
      }
      setEmailsList(prev => [...prev, val]);
      setNewEmailInput("");
    }
  };

  const handleRemoveEmail = (email) => {
    setEmailsList(prev => prev.filter(e => e !== email));
  };

  const handleSaveSchedule = async () => {
    if (receiveEmail && emailsList.length === 0) {
      toast.error("Vui lòng nhập ít nhất một địa chỉ Email nhận.");
      return;
    }
    const toastId = toast.loading("Đang lưu cấu hình gửi báo cáo...");
    try {
      await reportService.saveScheduleConfig(activeBrand.id, {
        receiveEmail,
        emailsList,
        emailText,
        dayOfMonth,
        format: scheduleFormat,
        platforms: schedulePlatforms
      });
      toast.success("Đã lưu cấu hình gửi báo cáo định kỳ hàng tháng.", { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu cấu hình gửi báo cáo định kỳ.", { id: toastId });
    }
  };

  const handleSendTestReport = async () => {
    if (emailsList.length === 0) {
      toast.error("Vui lòng chọn hoặc nhập địa chỉ Email nhận thử nghiệm.");
      return;
    }
    toast.loading("Đang tạo và gửi báo cáo qua Email...", { id: "test-report" });
    try {
      const platforms = ["Facebook", "YouTube", "Instagram", "TikTok", "Telegram"];
      await reportService.sendTestReport(activeBrand.id, {
        title: templateName || "Social Media Insights",
        format: "Excel",
        dateRange: period,
        platforms,
        isWhiteLabel: false,
        brandLogoUrl: logoUrl,
        brandColorHex: selectedColor,
        selectedWidgets,
        emails: emailsList,
        message: emailText
      });
      toast.success("Báo cáo thử nghiệm đã được gửi thành công đến các email được chọn!", { id: "test-report" });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Không thể gửi báo cáo thử nghiệm qua email.", { id: "test-report" });
    }
  };

  // Print high-quality PDF report directly from frontend
  const handlePrintPDF = async () => {
    if (!activeBrand) return;
    
    if (!previewData) {
      const toastId = toast.loading("Đang tự động tải dữ liệu thực tế trước khi xuất PDF...");
      try {
        const platforms = ["Facebook", "YouTube", "Instagram", "TikTok", "Telegram"];
        const res = await reportService.getPreviewData(activeBrand.id, period, platforms.join(","));
        if (res?.data) {
          setPreviewData(res.data);
          setDataLoaded(true);
          toast.success("Tải dữ liệu thực tế thành công! Đang mở hộp thoại in...", { id: toastId });
        } else {
          throw new Error("Không có dữ liệu trả về từ server");
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu in PDF:", err);
        toast.error("Tải dữ liệu thất bại. Vui lòng bấm nút 'Load Data' thủ công.", { id: toastId });
        return;
      }
    }
    
    // Trigger print layout after DOM update
    setTimeout(() => {
      window.print();
    }, 600);
  };

  // Generate real reports
  const handleGenerateReport = async (format) => {
    if (!activeBrand) return;
    
    let templateObj = templates.find(t => t.id === selectedTemplateId);
    const title = templateObj ? `${templateObj.name} Report` : `Custom ${format} Report`;

    const enabledPages = getEnabledPages();
    const platforms = [];
    if (enabledPages.includes("facebook")) platforms.push("Facebook");
    if (enabledPages.includes("instagram")) platforms.push("Instagram");
    if (enabledPages.includes("youtube")) platforms.push("YouTube");
    if (enabledPages.includes("tiktok")) platforms.push("TikTok");
    if (enabledPages.includes("telegram")) platforms.push("Telegram");
    if (platforms.length === 0) platforms.push("Facebook");

    // Map UI selectedWidgets configuration to Backend includedSections
    const includedSections = [];
    
    // Overview Section: if any summary metrics are selected
    if (selectedWidgets.followers || selectedWidgets.postImpressions || selectedWidgets.postInteractions) {
      includedSections.push('Overview');
    }
    // Channels Section: if growth of any active platforms is selected
    if (selectedWidgets.fbGrowth || selectedWidgets.igGrowth || selectedWidgets.ytGrowth || selectedWidgets.ttGrowth || selectedWidgets.dcGrowth) {
      includedSections.push('Channels');
    }
    // TopPosts Section: if posts details/ranking are selected
    if (selectedWidgets.posts || selectedWidgets.rankingOfPosts || selectedWidgets.fbRankingOfPosts || selectedWidgets.igRankingOfPosts || selectedWidgets.ytRankingOfVideos || selectedWidgets.ttPosts) {
      includedSections.push('TopPosts');
    }

    // Default fallback
    if (includedSections.length === 0) {
      includedSections.push('Overview', 'Channels', 'TopPosts');
    }

    const toastId = toast.loading(`Đang khởi tạo báo cáo ${format}...`);
    try {
      const res = await reportService.createReport(activeBrand.id, {
        title,
        format,
        dateRange: period,
        platforms,
        isWhiteLabel: true,
        brandLogoUrl: logoUrl,
        brandColorHex: selectedColor,
        includedSections,
        selectedWidgets
      });
      
      setReports(prev => [res?.report, ...prev].filter(Boolean));
      toast.success(`Đã sinh báo cáo thành công!`, { id: toastId });
    } catch (err) {
      toast.error("Lỗi xuất báo cáo: " + (err.message || "Lỗi hệ thống"), { id: toastId });
      console.error(err);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!activeBrand) return;
    try {
      await reportService.deleteReport(id, activeBrand.id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success("Đã xóa báo cáo khỏi hệ thống.");
    } catch (err) {
      toast.error("Xóa báo cáo thất bại.");
      console.error(err);
    }
  };

  const handleDownload = async (reportId, title) => {
    if (!reportId || !activeBrand) return;
    const toastId = toast.loading(`Đang tải xuống file: ${title}...`);
    try {
      // Goes through the backend (auth + brand-ownership check), not the raw
      // fileUrl — report files aren't publicly readable from /uploads anymore.
      const response = await reportService.downloadReport(reportId, activeBrand.id);

      const downloadUrl = window.URL.createObjectURL(response);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", title);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`Tải xuống thành công: ${title}`, { id: toastId });
    } catch (err) {
      console.error("Lỗi khi tải xuống file:", err);
      toast.error("Không thể tải xuống file. Vui lòng thử lại sau.", { id: toastId });
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      toast.success("Đã tải lên Logo thương hiệu.");
    }
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverBackgroundUrl(url);
      toast.success("Đã tải lên hình nền trang bìa.");
    }
  };

  const handleBodyUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBodyBackgroundUrl(url);
      toast.success("Đã tải lên hình nền nội dung.");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#F3F4F6] p-6 space-y-6">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Ẩn hoàn toàn giao diện Web chính của PubliCast */
          #root,
          .fixed,
          header,
          footer,
          aside,
          nav,
          button,
          select,
          .toast {
            display: none !important;
          }
          
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-container {
            display: block !important;
            width: 297mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .print-page {
            width: 297mm !important;
            height: 209.8mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        @page {
          size: A4 landscape;
          margin: 0;
        }
      `}} />

      {createPortal(
        <div className="print-container hidden print:block">
          {getEnabledPages().map((pageType, idx) => (
            <div key={idx} className="print-page bg-white">
              {renderA4Page(pageType, idx + 1, getEnabledPages().length)}
            </div>
          ))}
        </div>,
        document.body
      )}
      
      {/* Editor Modal overlay */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-[#000]/60 z-50 flex flex-col animate-in fade-in duration-300">
          
          {/* Editor Header Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded-xl px-3 py-1 bg-gray-50">
                <input 
                  type="text" 
                  value={templateName} 
                  onChange={(e) => setTemplateName(e.target.value)} 
                  className="font-bold text-gray-800 outline-none w-48 text-sm bg-transparent"
                />
                <Edit2 size={14} className="text-gray-400 ml-1" />
              </div>
            </div>

            {/* Stepper Steps Indicators */}
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => setEditorStep(1)}
                className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-all ${
                  editorStep === 1 ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">1</span>
                Pages & Sections
              </button>
              <button 
                onClick={() => setEditorStep(2)}
                className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-all ${
                  editorStep === 2 ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">2</span>
                Background & Logo
              </button>
              <button 
                onClick={() => setEditorStep(3)}
                className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-all ${
                  editorStep === 3 ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">3</span>
                Colors & Preview
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setEditorStep(prev => Math.max(1, prev - 1))}
                disabled={editorStep === 1}
                className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                PREV
              </button>
              <button 
                onClick={() => {
                  if (editorStep === 3) {
                    handleSaveTemplate();
                  } else {
                    setEditorStep(prev => Math.min(3, prev + 1));
                  }
                }}
                className="flex items-center gap-1.5 bg-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                {editorStep === 3 ? "SAVE TEMPLATE" : "NEXT"}
                {editorStep < 3 && <ChevronRight size={14} />}
              </button>
              <button 
                onClick={() => setIsEditorOpen(false)}
                className="text-gray-400 hover:text-black p-1.5 rounded-lg ml-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            
            {/* STEP 1: Pages & Sections */}
            {editorStep === 1 && (
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
                <div className="space-y-6">
                
                {/* Horizontal network tabs */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                  <button 
                    onClick={() => setEditorTab("summary")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      editorTab === "summary" ? "bg-black text-white" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <Layers size={14} />
                    Summary
                  </button>
                  <button 
                    onClick={() => setEditorTab("facebook")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      editorTab === "facebook" ? "bg-blue-600 text-white" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <PlatformIcon platform="Facebook" size={14} />
                    Facebook
                  </button>
                  <button 
                    onClick={() => setEditorTab("instagram")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      editorTab === "instagram" ? "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <PlatformIcon platform="Instagram" size={14} />
                    Instagram
                  </button>
                  <button 
                    onClick={() => setEditorTab("youtube")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      editorTab === "youtube" ? "bg-red-600 text-white" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <PlatformIcon platform="YouTube" size={14} />
                    YouTube
                  </button>
                  <button 
                    onClick={() => setEditorTab("tiktok")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      editorTab === "tiktok" ? "bg-slate-900 text-white" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <PlatformIcon platform="TikTok" size={14} />
                    TikTok
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  
                  {/* TAB: Summary */}
                  {editorTab === "summary" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">Summary Widgets (Các mẫu tổng quan)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {/* Followers */}
                        <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, followers: !prev.followers }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.followers ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.followers && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Followers</div>
                            <div className="flex gap-1">
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold" style={{ backgroundColor: "#3B82F6" }}>113K</span>
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold" style={{ backgroundColor: "#EC4899" }}>5.2K</span>
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold" style={{ backgroundColor: "#10B981" }}>28K</span>
                            </div>
                            <svg viewBox="0 0 100 35" className="w-full h-12">
                              <path d="M 0,30 Q 25,10 50,22 T 100,5" fill="none" stroke={selectedColor} strokeWidth="1.5" />
                              <path d="M 0,30 Q 25,10 50,22 T 100,5 L 100,35 L 0,35 Z" fill={selectedColor} fillOpacity="0.08" />
                            </svg>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                        {/* Post impressions */}
                        <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, postImpressions: !prev.postImpressions }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.postImpressions ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.postImpressions && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Post impressions</div>
                            <div className="flex gap-1.5">
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold" style={{ backgroundColor: "#F59E0B" }}>6.4M</span>
                            </div>
                            <svg viewBox="0 0 100 35" className="w-full h-12">
                              <rect x="5" y="15" width="5" height="20" rx="1" fill={selectedColor} />
                              <rect x="15" y="25" width="5" height="10" rx="1" fill="#D1D5DB" />
                              <rect x="25" y="10" width="5" height="25" rx="1" fill={selectedColor} />
                              <rect x="35" y="5" width="5" height="30" rx="1" fill={selectedColor} />
                            </svg>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                        {/* Ranking of posts */}
                        <div 
                          onClick={(e) => {
                            if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
                            setSelectedWidgets(prev => ({ ...prev, rankingOfPosts: !prev.rankingOfPosts }));
                          }}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.rankingOfPosts ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.rankingOfPosts && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Ranking of posts</div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[6px] border-b border-gray-100 pb-0.5">
                                <span className="font-bold text-gray-700 truncate w-32">Bài viết viral trên FB...</span>
                                <span className="font-mono text-gray-500 font-bold text-right">12.4K view</span>
                              </div>
                            </div>
                            <div className="space-y-1 pt-1.5 border-t border-gray-50">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] text-gray-400 font-bold">Sort by</span>
                                <select 
                                  value={postsSortBy} 
                                  onChange={(e) => setPostsSortBy(e.target.value)}
                                  className="text-[8px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-700 font-bold"
                                >
                                  <option>Impressions</option>
                                  <option>Engagement</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: Facebook */}
                  {editorTab === "facebook" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">Facebook Dashboard Widgets (Overview + Posts + Stories + Competitors)</span>
                      </div>
                      {renderSectionList([
                        { key: "fbGrowth", title: "Overview", description: "Followers, views, page visits, content" },
                        { key: "fbBalance", title: "Overview", description: "Follower balance and content stats" },
                        { key: "fbViews", title: "Posts", description: "Post views and interactions" },
                        { key: "fbInteractions", title: "Posts", description: "Reactions, comments, shares, clicks" },
                        { key: "fbTypesBreakdown", title: "Stories", description: "Post format mix" },
                        { key: "fbViewsBreakdown", title: "Stories", description: "Organic vs promoted views" },
                        { key: "fbRankingOfPosts", title: "Competitors", description: "Top performing posts" }
                      ])}
                    </div>
                  )}

                  {/* legacy facebook block disabled */}
                  {false && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">Facebook Dashboard Widgets (Overview + Posts + Stories + Competitors)</span>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Overview</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* fbGrowth */}
                            <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, fbGrowth: !prev.fbGrowth }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.fbGrowth ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.fbGrowth && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Overview</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Followers, views, page visits, content</div>
                            {renderWidgetThumbnail("fbGrowth", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                            </div>

                            {/* fbBalance */}
                            <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, fbBalance: !prev.fbBalance }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.fbBalance ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.fbBalance && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Posts</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Overview, interactions, types, top posts</div>
                            {renderWidgetThumbnail("fbBalance", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Posts</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* fbViews */}
                            <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, fbViews: !prev.fbViews }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.fbViews ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.fbViews && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Stories</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Story performance in the real dashboard</div>
                            {renderWidgetThumbnail("fbViews", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                            </div>

                            {/* fbInteractions */}
                            <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, fbInteractions: !prev.fbInteractions }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.fbInteractions ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.fbInteractions && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Competitors</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Competitor comparison and ranking</div>
                            {renderWidgetThumbnail("fbRankingOfPosts", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Stories</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* fbTypesBreakdown */}
                            <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, fbTypesBreakdown: !prev.fbTypesBreakdown }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.fbTypesBreakdown ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.fbTypesBreakdown && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Views Breakdown</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Organic vs promoted</div>
                            {renderWidgetThumbnail("fbViewsBreakdown", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                            </div>

                            {/* fbViewsBreakdown */}
                            <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, fbViewsBreakdown: !prev.fbViewsBreakdown }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.fbViewsBreakdown ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.fbViewsBreakdown && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Types Breakdown</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Post format mix</div>
                            {renderWidgetThumbnail("fbTypesBreakdown", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Competitors</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* fbRankingOfPosts */}
                            <div 
                          onClick={(e) => {
                            if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
                            setSelectedWidgets(prev => ({ ...prev, fbRankingOfPosts: !prev.fbRankingOfPosts }));
                          }}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.fbRankingOfPosts ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.fbRankingOfPosts && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Ranking of posts</div>
                            {renderWidgetThumbnail("fbRankingOfPosts", selectedColor, previewData)}
                            <div className="space-y-1 pt-1.5 border-t border-gray-50">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] text-gray-400 font-bold">Sort by</span>
                                <select 
                                  value={fbPostsSortBy} 
                                  onChange={(e) => setFbPostsSortBy(e.target.value)}
                                  className="text-[8px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-700 font-bold"
                                >
                                  <option>Engagement</option>
                                  <option>Impressions</option>
                                  <option>Likes</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: Instagram */}
                  {editorTab === "instagram" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">Instagram Dashboard Widgets (Community + Account + Competitors)</span>
                      </div>
                      {renderSectionList([
                        { key: "igGrowth", title: "Community", description: "Followers, following, total content" },
                        { key: "igRankingOfPosts", title: "Account", description: "Profile header and account-level posts" }
                      ])}
                    </div>
                  )}
                  {false && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">Instagram Dashboard Widgets (Community + Account + Competitors)</span>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Community</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* igGrowth */}
                        <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, igGrowth: !prev.igGrowth }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.igGrowth ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.igGrowth && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Community</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Followers, following, total content</div>
                            {renderWidgetThumbnail("igGrowth", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                        {/* igRankingOfPosts */}
                        <div 
                          onClick={(e) => {
                            if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
                            setSelectedWidgets(prev => ({ ...prev, igRankingOfPosts: !prev.igRankingOfPosts }));
                          }}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.igRankingOfPosts ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.igRankingOfPosts && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Account</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Profile header and account-level posts</div>
                            {renderWidgetThumbnail("igRankingOfPosts", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: YouTube */}
                  {editorTab === "youtube" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">YouTube Dashboard Widgets (Community + Demographics + Published + Viewed + Competitors)</span>
                      </div>
                      {renderSectionList([
                        { key: "ytGrowth", title: "Community", description: "Subscribers, views, videos" },
                        { key: "ytRankingOfVideos", title: "Published videos", description: "Published video list from the dashboard" }
                      ])}
                    </div>
                  )}
                  {false && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">YouTube Dashboard Widgets (Community + Demographics + Published videos + Viewed videos + Competitors)</span>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Community</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* ytGrowth */}
                        <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, ytGrowth: !prev.ytGrowth }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.ytGrowth ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.ytGrowth && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Community</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Subscribers, views, videos</div>
                            {renderWidgetThumbnail("ytGrowth", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                        {/* ytRankingOfVideos */}
                        <div 
                          onClick={(e) => {
                            if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
                            setSelectedWidgets(prev => ({ ...prev, ytRankingOfVideos: !prev.ytRankingOfVideos }));
                          }}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.ytRankingOfVideos ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.ytRankingOfVideos && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Published videos</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Published video list from the dashboard</div>
                            {renderWidgetThumbnail("ytRankingOfVideos", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: TikTok */}
                  {editorTab === "tiktok" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">TikTok Dashboard Widgets (Community + Posts)</span>
                      </div>
                      {renderSectionList([
                        { key: "ttGrowth", title: "Community", description: "Followers over time" },
                        { key: "ttBalance", title: "Community", description: "New vs lost followers" },
                        { key: "ttViews", title: "Posts", description: "Video views by period" },
                        { key: "ttInteractions", title: "Posts", description: "Likes, comments, shares" },
                        { key: "ttPosts", title: "Posts", description: "Top performing posts" }
                      ])}
                    </div>
                  )}
                  {false && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">TikTok Dashboard Widgets (Community + Posts)</span>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Community</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* ttGrowth */}
                        <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, ttGrowth: !prev.ttGrowth }))}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.ttGrowth ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.ttGrowth && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Growth</div>
                            <div className="text-[7px] text-gray-400 font-semibold">Followers over time</div>
                            {renderWidgetThumbnail("ttGrowth", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                        {/* ttBalance */}
                        <div 
                          onClick={(e) => {
                            if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
                            setSelectedWidgets(prev => ({ ...prev, ttBalance: !prev.ttBalance }));
                          }}
                          className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.ttBalance ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                            {selectedWidgets.ttBalance && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Balance of Followers</div>
                            <div className="text-[7px] text-gray-400 font-semibold">New vs lost followers</div>
                            {renderWidgetThumbnail("ttBalance", selectedColor, previewData)}
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Posts</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* ttViews */}
                            <div 
                              onClick={() => setSelectedWidgets(prev => ({ ...prev, ttViews: !prev.ttViews }))}
                              className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                                selectedWidgets.ttViews ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                              }`}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                              <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                                {selectedWidgets.ttViews && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                              </div>
                              <div className="pl-2 space-y-2">
                                <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Views</div>
                                <div className="text-[7px] text-gray-400 font-semibold">Video views by period</div>
                                {renderWidgetThumbnail("ttViews", selectedColor, previewData)}
                              </div>
                              <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                                <span>publicast</span>
                                <Maximize2 size={8} />
                              </div>
                            </div>

                            {/* ttInteractions */}
                            <div 
                              onClick={() => setSelectedWidgets(prev => ({ ...prev, ttInteractions: !prev.ttInteractions }))}
                              className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                                selectedWidgets.ttInteractions ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                              }`}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                              <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                                {selectedWidgets.ttInteractions && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                              </div>
                              <div className="pl-2 space-y-2">
                                <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">Interactions</div>
                                <div className="text-[7px] text-gray-400 font-semibold">Likes, comments, shares</div>
                                {renderWidgetThumbnail("ttInteractions", selectedColor, previewData)}
                              </div>
                              <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                                <span>publicast</span>
                                <Maximize2 size={8} />
                              </div>
                            </div>

                            {/* ttPosts */}
                            <div 
                              onClick={(e) => {
                                if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
                                setSelectedWidgets(prev => ({ ...prev, ttPosts: !prev.ttPosts }));
                              }}
                              className={`relative bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                                selectedWidgets.ttPosts ? "border-black ring-1 ring-black shadow-sm" : "border-gray-200"
                              }`}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                              <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
                                {selectedWidgets.ttPosts && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                              </div>
                              <div className="pl-2 space-y-2">
                                <div className="text-[10px] font-extrabold text-gray-800 tracking-tight">List of posts</div>
                                <div className="text-[7px] text-gray-400 font-semibold">Top performing posts</div>
                                {renderWidgetThumbnail("ttPosts", selectedColor, previewData)}
                              </div>
                              <div className="flex justify-between items-center pl-2 pt-1 border-t border-gray-100 text-[6px] text-gray-400 font-mono">
                                <span>publicast</span>
                                <Maximize2 size={8} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                </div>

              </div>

              {/* RIGHT: Live A4 Preview của tab đang chọn */}
              <div className="sticky top-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Preview</span>
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg capitalize">{editorTab}</span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  {renderA4Page(editorTab, 1, 1)}
                </div>
                <p className="text-[10px] text-gray-400 text-center">Xem trước trang báo cáo theo widget đã chọn</p>
              </div>

            </div>
              </div>
            )}

            {/* STEP 2: Background & Logo */}
            {editorStep === 2 && (
              <div className="max-w-7xl mx-auto space-y-6">
                {/* 4 upload cards on top row */}
                <div className="grid grid-cols-4 gap-4">

                  {/* Logo Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                      <span className="text-sm font-bold text-gray-800">Logo</span>
                      <span className="text-[10px] text-gray-400 font-mono">600x86px</span>
                    </div>
                    <div className="px-4 pb-4">
                      <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <label
                        htmlFor="logo-upload"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all group"
                        style={{ minHeight: "120px" }}
                      >
                        {logoUrl ? (
                          <div className="relative w-full flex items-center justify-center p-3" style={{ minHeight: "120px" }}>
                            <img src={logoUrl} alt="Logo" className="max-h-16 max-w-full object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/5 rounded-xl transition-all">
                              <span className="text-[10px] font-bold text-gray-700 bg-white px-2 py-1 rounded-lg shadow-sm">Thay đổi</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center px-3 py-4">
                            <span className="text-[10px] text-gray-400 leading-relaxed">Click to select or drag your file here.</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Cover Background Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                      <span className="text-sm font-bold text-gray-800">Cover background</span>
                      <span className="text-[10px] text-gray-400 font-mono">842x595px</span>
                    </div>
                    <div className="px-4 pb-4">
                      <input type="file" id="cover-upload" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      <label
                        htmlFor="cover-upload"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all group overflow-hidden"
                        style={{ minHeight: "120px" }}
                      >
                        {coverBackgroundUrl ? (
                          <div className="relative w-full" style={{ minHeight: "120px" }}>
                            <img src={coverBackgroundUrl} alt="Cover" className="w-full object-cover" style={{ maxHeight: "120px" }} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all">
                              <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded-lg">Thay đổi</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center px-3 py-4">
                            <div className="flex gap-0.5 h-14">
                              {["#7C3AED","#2563EB","#059669","#D97706","#DC2626"].map((c,i) => (
                                <div key={i} className="w-3 h-full rounded-sm" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-400">Click to select or drag your file here.</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Body Background Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                      <span className="text-sm font-bold text-gray-800">Body background</span>
                      <span className="text-[10px] text-gray-400 font-mono">842x595px</span>
                    </div>
                    <div className="px-4 pb-4">
                      <input type="file" id="body-upload" accept="image/*" className="hidden" onChange={handleBodyUpload} />
                      <label
                        htmlFor="body-upload"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all group overflow-hidden"
                        style={{ minHeight: "120px" }}
                      >
                        {bodyBackgroundUrl ? (
                          <div className="relative w-full" style={{ minHeight: "120px" }}>
                            <img src={bodyBackgroundUrl} alt="Body" className="w-full object-cover" style={{ maxHeight: "120px" }} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all">
                              <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded-lg">Thay đổi</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center px-3 py-4">
                            <div className="w-px h-14 bg-gray-300" />
                            <span className="text-[10px] text-gray-400">Click to select or drag your file here.</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Title Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                      <span className="text-sm font-bold text-gray-800">Title</span>
                      <span className="text-[10px] text-gray-400 font-mono">Max 50 characters</span>
                    </div>
                    <div className="px-4 pb-4 flex flex-col gap-2" style={{ minHeight: "120px" }}>
                      <input
                        type="text"
                        maxLength={50}
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:border-gray-500 outline-none transition-colors mt-1"
                        placeholder="Social Media Insights"
                      />
                      <span className="text-[10px] text-gray-400 font-mono">{reportTitle.length}/50 characters</span>
                    </div>
                  </div>

                </div>

                {/* Preview label */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">Preview</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Full-width 2-page preview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                    {renderA4Page("cover", 1, 2)}
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                    {(() => {
                      const pages = getEnabledPages();
                      const contentPage = pages.find(p => p !== "cover");
                      return contentPage
                        ? renderA4Page(contentPage, 2, pages.length)
                        : (
                          <div className="w-full aspect-[1.414/1] bg-gray-50 flex flex-col items-center justify-center gap-2">
                            <Layers size={24} className="text-gray-300" />
                            <span className="text-xs text-gray-400">Bật widget ở Step 1 để xem trước</span>
                          </div>
                        );
                    })()}
                  </div>
                </div>

              </div>
            )}

            {/* STEP 3: Colors & Preview */}
            {editorStep === 3 && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Color Selector */}
                <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base mb-1">Pick your colors</h3>
                    <p className="text-xs text-gray-400">Chọn màu sắc chủ đạo đại diện cho báo cáo</p>
                  </div>

                  {/* Colors Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-full aspect-square rounded-xl flex flex-col justify-end p-2 transition-all border relative ${
                          selectedColor === color ? "ring-2 ring-black ring-offset-2 scale-95" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {selectedColor === color && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                            <Check size={10} className="text-black" />
                          </div>
                        )}
                        <span className="text-[8px] font-bold text-white bg-black/30 backdrop-blur-[2px] rounded px-1 text-center font-mono block">
                          {color}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Interactive Live Preview */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Xem trước nội dung kết xuất (A4 Live Preview)</span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-gray-200 shadow-sm">
                      <button 
                        type="button"
                        disabled={editorPreviewPage === 1}
                        onClick={() => setEditorPreviewPage(prev => Math.max(1, prev - 1))}
                        className="text-gray-400 hover:text-black disabled:opacity-30 transition-opacity"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-mono font-bold text-gray-700">
                        {editorPreviewPage} / {getEnabledPages().length}
                      </span>
                      <button 
                        type="button"
                        disabled={editorPreviewPage === getEnabledPages().length}
                        onClick={() => setEditorPreviewPage(prev => Math.min(getEnabledPages().length, prev + 1))}
                        className="text-gray-400 hover:text-black disabled:opacity-30 transition-opacity"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden relative">
                    {renderA4Page(getEnabledPages()[editorPreviewPage - 1], editorPreviewPage, getEnabledPages().length)}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Main Reports Page Layout */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <FileText className="text-[#3B82F6] w-6 h-6" />
            Automated Analytics Reports
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Lập lịch gửi email tự động hàng tháng và thiết kế báo cáo white-label đa kênh chuyên nghiệp.
          </p>
        </div>

        {/* Generate triggers & Quick Preview Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-blue-200 cursor-pointer shadow-sm"
          >
            <Eye size={14} />
            XEM BÁO CÁO (PREVIEW)
          </button>
          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Download size={14} />
            GENERATE PDF
          </button>
          <button 
            onClick={() => handleGenerateReport("Excel")}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all border border-gray-200 cursor-pointer"
          >
            <Download size={14} />
            GENERATE EXCEL
          </button>
        </div>
      </div>

      {/* Grid: Left Main config - Right History & Scheduled */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Templates Config & Sections */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Period & Language Config Panel */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Period</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <Calendar size={16} className="text-gray-400" />
                  <select 
                    value={isCustomPeriod ? "custom" : (["30 ngày qua", "7 ngày qua", "Tháng này", "Tháng trước"].includes(period) ? period : "custom")}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className="bg-transparent border-none text-sm font-semibold text-gray-700 outline-none w-full cursor-pointer"
                  >
                    <option value="30 ngày qua">30 ngày qua</option>
                    <option value="7 ngày qua">7 ngày qua</option>
                    <option value="Tháng này">Tháng này</option>
                    <option value="Tháng trước">Tháng trước</option>
                    <option value="custom">Tùy chọn khoảng ngày...</option>
                  </select>
                </div>
                <button
                  onClick={fetchPreviewData}
                  disabled={previewLoading || !activeBrand || (isCustomPeriod && (!customStartDate || !customEndDate))}
                  className="flex items-center gap-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {previewLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Load Data
                </button>
              </div>

              {isCustomPeriod && (
                <div className="grid grid-cols-2 gap-3 mt-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Từ ngày</span>
                    <input 
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-gray-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Đến ngày</span>
                    <input 
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-gray-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
              <span className="text-[10px] text-gray-400 mt-1 block font-mono">So sánh với chu kỳ trước đó</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Language</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none cursor-pointer"
              >
                <option>English</option>
                <option>Tiếng Việt</option>
                <option>Español</option>
              </select>
            </div>
          </div>

          {/* Templates Section */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-800 text-sm">Templates</h4>
              <button 
                onClick={handleCreateTemplateClick}
                className="flex items-center gap-1.5 text-[#3B82F6] hover:text-blue-700 text-xs font-bold"
              >
                <Plus size={14} />
                NEW TEMPLATE
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="flex-1">
                <select
                  value={selectedTemplateId}
                  onChange={handleTemplateChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 font-semibold outline-none cursor-pointer"
                >
                  <option value="">Pick a template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleEditTemplateClick}
                  disabled={!selectedTemplateId}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 disabled:opacity-40 text-xs font-bold px-3 py-2.5 rounded-xl transition-all"
                >
                  <Edit2 size={13} />
                  EDIT
                </button>
                <button
                  onClick={handleRemoveTemplate}
                  disabled={!selectedTemplateId}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1 bg-white hover:bg-red-50 hover:text-red-500 border border-gray-200 text-gray-600 disabled:opacity-40 text-xs font-bold px-3 py-2.5 rounded-xl transition-all"
                >
                  <Trash2 size={13} />
                  REMOVE
                </button>
                <button
                  onClick={handleDuplicateTemplate}
                  disabled={!selectedTemplateId}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 disabled:opacity-40 text-xs font-bold px-3 py-2.5 rounded-xl transition-all"
                >
                  <Copy size={13} />
                  DUPLICATE
                </button>
              </div>
            </div>
          </div>

          {/* Section details configure (Premium Redesign) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md bg-opacity-80 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm tracking-tight">Sections & Quick Settings</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Bật/tắt các nền tảng hoặc chọn từng widget hiển thị trong báo cáo</p>
              </div>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                Interactive Config
              </span>
            </div>
            
            <div className="space-y-3.5">
              {/* Platforms Toggles with Premium Layout */}
              {[
                { 
                  id: "summary", 
                  label: "Summary Overview", 
                  color: "from-blue-500 to-indigo-500",
                  widgets: [
                    { key: "followers", label: "Followers Overview" },
                    { key: "postImpressions", label: "Post Impressions" },
                    { key: "postInteractions", label: "Post Interactions" },
                    { key: "posts", label: "Posts List" },
                    { key: "rankingOfPosts", label: "Ranking of Posts" }
                  ]
                },
                { 
                  id: "facebook", 
                  label: "Facebook Analysis", 
                  color: "from-blue-600 to-blue-700",
                  widgets: [
                    { key: "fbGrowth", label: "Followers Growth" },
                    { key: "fbBalance", label: "Follower Balance" },
                    { key: "fbViews", label: "Page Views" },
                    { key: "fbInteractions", label: "Interactions" },
                    { key: "fbTypesBreakdown", label: "Types Breakdown" },
                    { key: "fbViewsBreakdown", label: "Views Breakdown" },
                    { key: "fbRankingOfPosts", label: "Ranking of Posts" }
                  ]
                },
                { 
                  id: "instagram", 
                  label: "Instagram Analytics", 
                  color: "from-pink-500 to-rose-500",
                  widgets: [
                    { key: "igGrowth", label: "Followers & Account Growth" },
                    { key: "igRankingOfPosts", label: "Ranking of Posts" }
                  ]
                },
                { 
                  id: "youtube", 
                  label: "YouTube Dashboard", 
                  color: "from-red-500 to-red-600",
                  widgets: [
                    { key: "ytGrowth", label: "Subscribers & Views Growth" },
                    { key: "ytRankingOfVideos", label: "Ranking of Videos" }
                  ]
                },
                {
                  id: "tiktok",
                  label: "TikTok Performance",
                  color: "from-gray-900 to-black",
                  widgets: [
                    { key: "ttGrowth", label: "Followers Growth" },
                    { key: "ttBalance", label: "Followers Balance" },
                    { key: "ttViews", label: "Views Stats" },
                    { key: "ttInteractions", label: "Interactions Detail" },
                    { key: "ttPosts", label: "Videos List" }
                  ]
                }
              ].map((plat) => {
                const keys = plat.widgets.map(w => w.key);
                const activeCount = keys.filter(k => selectedWidgets[k]).length;
                const isAllActive = activeCount === keys.length;
                const isExpanded = !!expandedPlatforms[plat.id];

                return (
                  <div 
                    key={plat.id} 
                    className={`border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 ${
                      isExpanded ? "shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-slate-50/50" : "bg-white"
                    }`}
                  >
                    {/* Platform Header */}
                    <div 
                      className="flex justify-between items-center px-4 py-3.5 hover:bg-gray-50/80 cursor-pointer select-none transition-colors"
                      onClick={() => setExpandedPlatforms(prev => ({ ...prev, [plat.id]: !prev[plat.id] }))}
                    >
                      <div className="flex items-center gap-3">
                        {/* Master Toggle Switch */}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWidgets(prev => {
                              const next = { ...prev };
                              keys.forEach(k => {
                                next[k] = !isAllActive;
                              });
                              return next;
                            });
                          }}
                          className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 relative cursor-pointer focus:outline-none ${
                            activeCount > 0 ? "bg-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.3)]" : "bg-gray-200"
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                            activeCount > 0 ? "translate-x-4" : "translate-x-0"
                          }`} />
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${plat.color}`} />
                          <span className="text-xs font-bold text-gray-800 tracking-tight">{plat.label}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono transition-all duration-300 ${
                          activeCount > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                        }`}>
                          {activeCount}/{plat.widgets.length}
                        </span>
                        <div className="p-1 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          {isExpanded ? <ChevronUp size={13} className="text-gray-500" /> : <ChevronDown size={13} className="text-gray-500" />}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Widgets Container */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-white/70 space-y-2.5 border-t border-gray-50/50 animate-in fade-in duration-200">
                        {plat.widgets.map((widget) => {
                          const isWidgetChecked = !!selectedWidgets[widget.key];
                          return (
                            <label 
                              key={widget.key} 
                              className={`flex items-center justify-between text-xs cursor-pointer py-2 px-3 rounded-xl select-none transition-all duration-200 border ${
                                isWidgetChecked 
                                  ? "bg-slate-50 border-gray-200/60 text-gray-900 font-medium" 
                                  : "bg-transparent border-transparent text-gray-500 hover:text-gray-800"
                              }`}
                            >
                              <span>{widget.label}</span>
                              <input
                                type="checkbox"
                                checked={isWidgetChecked}
                                onChange={(e) => {
                                  setSelectedWidgets(prev => ({
                                    ...prev,
                                    [widget.key]: e.target.checked
                                  }));
                                }}
                                className="w-4.5 h-4.5 text-emerald-600 border-gray-300 rounded-lg focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-all accent-emerald-500"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: History, Automation Settings & Scheduled Reports */}
        <div className="space-y-6">
           <AutomationSchedulingPanel
            receiveEmail={receiveEmail}
            setReceiveEmail={setReceiveEmail}
            emailsList={emailsList}
            setEmailsList={setEmailsList}
            emailText={emailText}
            setEmailText={setEmailText}
            brandMembers={brandMembers}
            membersLoading={membersLoading}
            dayOfMonth={dayOfMonth}
            setDayOfMonth={setDayOfMonth}
            format={scheduleFormat}
            setFormat={setScheduleFormat}
            platforms={schedulePlatforms}
            setPlatforms={setSchedulePlatforms}
            onSendTestReport={handleSendTestReport}
            onSaveSchedule={handleSaveSchedule}
          />

          <PdfHistoryPanel
            reports={reports}
            onDownload={handleDownload}
          />
        </div>

      </div>

      {/* Interactive Fullscreen Live Preview Modal */}
      <ExportOptionsModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        previewPage={previewPage}
        setPreviewPage={setPreviewPage}
        enabledPages={getEnabledPages()}
        renderA4Page={renderA4Page}
        onPrintPDF={handlePrintPDF}
      />

      {/* Real-time Dashboard Charts section showing actual channel performance matching preview settings */}
      {(dataLoaded && previewData || previewLoading) && (
        <div className="mt-8 pt-8 border-t border-gray-200 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="text-[#3B82F6] w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-800">Kênh Dữ Liệu Thực Tế (Dashboard Analytics)</h2>
          </div>

          {/* Quick Overview Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PerformanceOverviewWidget
                isLoading={previewLoading}
                overview={previewData?.overview}
                channels={previewData?.channels}
                selectedColor={selectedColor}
                period={period}
              />
            </div>
            <div className="lg:col-span-1">
              <AudienceDemographicsWidget
                isLoading={previewLoading}
                channelData={previewData?.channels?.find(c => c.platform === "INSTAGRAM")}
                selectedColor={selectedColor}
                period={period}
              />
            </div>
          </div>
          
          {dataLoaded && previewData && (
            <div className="grid grid-cols-1 gap-8">
              {previewData.channels && previewData.channels.map((ch) => {
                const platform = ch.platform.toUpperCase();
                return (
                  <div key={ch.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <PlatformIcon platform={ch.platform} size={20} />
                      <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">
                        {ch.displayName} ({platform})
                      </span>
                    </div>
                    <div>
                      {renderPlatformDashboardCharts(platform, ch)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
