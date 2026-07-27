import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  TrendingUp, 
  Plus, 
  Search, 
  BarChart3, 
  Flame, 
  Share2, 
  MessageCircle, 
  ThumbsUp, 
  Globe,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import { useBrand } from "../../context/BrandContext";
import socialService from "../../services/social.service";
import { useLatestRequestId } from "../../hooks/useLatestRequestId";
import { useConfirm } from "../../hooks/useConfirm";



export function CompetitorsPage() {
  const { t } = useTranslation(["competitors", "common"]);
  const { activeBrand } = useBrand();
  
  // Search parameters for active tab
  const [searchParams, setSearchParams] = useSearchParams();
  const activeViewTab = searchParams.get("tab") || "all";
  
  const setActiveViewTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };
  
  // States
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const competitorsRequest = useLatestRequestId();
  const confirm = useConfirm();
  
  const isPlatformConnected = (platformName) => {
    if (!activeBrand || !activeBrand.socialAccounts) return false;
    const mapping = {
      facebook: "FACEBOOK",
      youtube: "YOUTUBE",
      instagram: "INSTAGRAM",
      tiktok: "TIKTOK"
    };
    const targetPlatform = mapping[platformName.toLowerCase()];
    return activeBrand.socialAccounts.some(
      sa => sa.platform === targetPlatform && sa.isConnected
    );
  };

  const availableModalPlatforms = useMemo(() => {
    return [
      { key: "Facebook", label: "Facebook" },
      { key: "YouTube", label: "YouTube" },
      { key: "Instagram", label: "Instagram" },
      { key: "TikTok", label: "TikTok" }
    ].filter(p => isPlatformConnected(p.key));
  }, [activeBrand]);

  // Modal Search States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchPlatform, setSearchPlatform] = useState("Facebook"); // 'Facebook', 'YouTube'
  
  useEffect(() => {
    if (availableModalPlatforms.length > 0 && isModalOpen) {
      setSearchPlatform(availableModalPlatforms[0].key);
    }
  }, [availableModalPlatforms, isModalOpen]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [connectingId, setConnectingId] = useState(null);

  // Fetch all competitors
  const fetchAllCompetitors = async () => {
    if (!activeBrand?.id) return;
    const requestId = competitorsRequest.start();
    setLoading(true);
    try {
      // Fetch Facebook and YouTube competitors concurrently
      const [fbRes, ytRes] = await Promise.all([
        socialService.getFacebookCompetitors(activeBrand.id).catch(err => {
          console.warn("Failed to load Facebook competitors:", err);
          return { data: [] };
        }),
        socialService.getCompetitors(activeBrand.id).catch(err => {
          console.warn("Failed to load YouTube competitors:", err);
          return { data: [] };
        })
      ]);

      const fbData = fbRes.data || [];
      const ytData = ytRes.data || [];

      // Normalize DB items
      const dbCompetitors = [...fbData, ...ytData].map(c => {
        let postsArray = null;
        if (c.latestPosts) {
          postsArray = c.latestPosts;
        } else if (c.latestVideos) {
          postsArray = c.latestVideos.map(v => ({
            id: v.id,
            content: v.title || "YouTube Video",
            mediaUrl: v.thumbnailUrl || null,
            publishedAt: v.publishedAt,
            likesCount: v.likes || 0,
            commentsCount: v.comments || 0,
            sharesCount: 0,
            // No real per-video engagement rate is returned by the API —
            // leave unset rather than fabricate a plausible-looking number (#79).
            engagementRate: null
          }));
        }

        return {
          id: c.id,
          name: c.competitorDisplayName || c.competitorHandle,
          handle: c.competitorHandle,
          followers: c.followersCount || 0,
          // Only use the API's own postsPerWeek — no fabricated fallback
          // derived from post count or a hardcoded constant (#79).
          postsPerWeek: c.postsPerWeek ?? null,
          engagementRate: c.avgEngagementRate ?? null,
          growth: c.followersGrowth ?? null,
          platform: c.platform.toLowerCase(), // 'facebook' or 'youtube'
          avatarUrl: c.competitorAvatarUrl,
          profileUrl: c.competitorProfileUrl,
          recentPostsJson: c.recentPostsJson || (postsArray ? JSON.stringify(postsArray) : null),
          topContentJson: c.topContentJson,
          isSelf: false
        };
      });

      // Setup self brand record
      let myFbFollowers = 0;
      let myYtSubscribers = 0;
      
      if (activeBrand.socialAccounts) {
        const fbAcc = activeBrand.socialAccounts.find(sa => sa.platform === 'FACEBOOK' && sa.isConnected);
        const ytAcc = activeBrand.socialAccounts.find(sa => sa.platform === 'YOUTUBE' && sa.isConnected);
        myFbFollowers = fbAcc?.followersCount || fbAcc?.metadata?.followersCount || 0;
        myYtSubscribers = ytAcc?.followersCount || ytAcc?.metadata?.subscriberCount || 0;
      }

      const myBrandRecord = {
        id: "self-brand",
        name: activeBrand.name || t("matrix.youBadge"),
        handle: "@your_brand",
        followers: 0, // Sẽ được tính động trong displayCompetitors
        // No real postsPerWeek/engagementRate/growth source for the self
        // brand is fetched here — left null rather than fabricated (#79).
        postsPerWeek: null,
        engagementRate: null,
        growth: null,
        platform: "brand",
        isSelf: true
      };

      if (!competitorsRequest.isLatest(requestId)) return;
      setCompetitors([myBrandRecord, ...dbCompetitors]);
    } catch (err) {
      if (!competitorsRequest.isLatest(requestId)) return;
      toast.error(t("toasts.loadError"));
      console.error(err);
    } finally {
      if (competitorsRequest.isLatest(requestId)) setLoading(false);
    }
  };

  // Load data on brand change
  useEffect(() => {
    fetchAllCompetitors();
  }, [activeBrand?.id]);

  // Compute actual competitors to display based on activeViewTab
  const displayCompetitors = useMemo(() => {
    let myFbFollowers = 0;
    let myYtSubscribers = 0;
    
    if (activeBrand?.socialAccounts) {
      const fbAcc = activeBrand.socialAccounts.find(sa => sa.platform === 'FACEBOOK' && sa.isConnected);
      const ytAcc = activeBrand.socialAccounts.find(sa => sa.platform === 'YOUTUBE' && sa.isConnected);
      myFbFollowers = fbAcc?.followersCount || fbAcc?.metadata?.followersCount || 0;
      myYtSubscribers = ytAcc?.followersCount || ytAcc?.metadata?.subscriberCount || 0;
    }

    return competitors.map(c => {
      if (c.isSelf) {
        // No fabricated fallback (previously 12500/6800/5700) when the
        // brand has no connected/followed account for this tab — 0 means
        // genuinely no data, not a placeholder number (#79).
        let followers = 0;
        if (activeViewTab === "all") followers = myFbFollowers + myYtSubscribers;
        else if (activeViewTab === "facebook") followers = myFbFollowers;
        else if (activeViewTab === "youtube") followers = myYtSubscribers;
        return { ...c, followers };
      }
      return c;
    }).filter(c => {
      if (c.isSelf) return true;
      if (activeViewTab === "all") return true;
      return c.platform === activeViewTab;
    });
  }, [competitors, activeViewTab, activeBrand]);

  // No real historical follower time-series is fetched anywhere for
  // competitors — the chart previously extrapolated a fake growth curve
  // backward from a single current-follower snapshot using an arbitrary
  // formula. Removed entirely rather than render fabricated history as
  // real data (#79); see growthChartData's render site below, which now
  // always shows the "no data" empty state.

  // Dynamic Top Posts
  const displayTopPosts = useMemo(() => {
    const posts = [];
    competitors.forEach(c => {
      if (c.isSelf) return;
      if (activeViewTab !== "all" && c.platform !== activeViewTab) return;

      let parsed = [];
      try {
        if (c.topContentJson) {
          parsed = JSON.parse(c.topContentJson);
        } else if (c.recentPostsJson) {
          parsed = JSON.parse(c.recentPostsJson);
        }
      } catch (e) {
        console.warn("Failed to parse competitor posts", e);
      }

      if (Array.isArray(parsed)) {
        parsed.forEach((p, idx) => {
          posts.push({
            id: `${c.id}-post-${idx}`,
            author: c.name,
            platform: c.platform,
            content: p.content || p.text || p.description || p.title || "Nội dung bài viết đối thủ...",
            likes: p.likesCount || p.likes || 0,
            comments: p.commentsCount || p.comments || 0,
            shares: p.sharesCount || p.shares || p.retweets || 0,
            // No fabricated fallback (previously 2.5%) when neither the
            // post nor the competitor has a real engagement rate (#79).
            reachRate: p.engagementRate ?? c.engagementRate ?? null,
            date: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("vi-VN") : "Gần đây",
            media: p.mediaUrl || p.thumbnailUrl || null,
            postUrl: p.postUrl || (c.platform === "youtube" ? `https://www.youtube.com/watch?v=${p.id}` : `https://www.facebook.com/${p.id}`)
          });
        });
      }
    });

    return posts.sort((a, b) => b.likes - a.likes).slice(0, 9);
  }, [competitors, activeViewTab]);

  // Handle Search in Modal
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      toast.error(t("toasts.searchEmpty"));
      return;
    }
    if (!activeBrand?.id) return;

    if (searchPlatform !== "Facebook" && searchPlatform !== "YouTube") {
      toast.info(t("toasts.searchComingSoon", { platform: searchPlatform }));
      return;
    }

    setSearching(true);
    setSearchResults([]);
    try {
      let rawData = [];
      if (searchPlatform === "Facebook") {
        try {
          const res = await socialService.searchFacebookPages(activeBrand.id, searchQuery);
          rawData = res.data || [];
        } catch (searchErr) {
          console.warn("Facebook Page Search API is restricted. Falling back to direct connection.", searchErr);
        }
      } else {
        const res = await socialService.searchChannels(activeBrand.id, searchQuery);
        rawData = res.data || [];
      }

      const normalized = rawData.map(item => {
        if (searchPlatform === "Facebook") {
          return {
            platformId: item.pageId,
            name: item.displayName || item.title || "Facebook Page",
            avatar: item.avatarUrl || item.thumbnail || "",
            followers: item.followersCount || 0,
            url: item.profileUrl || `https://facebook.com/${item.pageId}`,
            isDirect: false
          };
        } else {
          return {
            platformId: item.channelId,
            name: item.displayName || item.title || "YouTube Channel",
            avatar: item.avatarUrl || item.thumbnail || "",
            followers: item.subscriberCount || 0,
            url: item.profileUrl || `https://youtube.com/channel/${item.channelId}`,
            isDirect: false
          };
        }
      });

      // Đối với Facebook, tự động tạo thêm kết quả kết nối trực tiếp từ ID / Username / URL Page
      if (searchPlatform === "Facebook") {
        let extractedId = searchQuery.trim();
        // Regex trích xuất ID hoặc Username từ link Page Facebook công khai
        const fbUrlRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?([a-zA-Z0-9.]+)/i;
        const match = extractedId.match(fbUrlRegex);
        if (match && match[1]) {
          extractedId = match[1];
        }

        // Tách bỏ query params (như ?mibextid=...)
        if (extractedId.includes("?")) {
          extractedId = extractedId.split("?")[0];
        }
        if (extractedId.includes("/")) {
          extractedId = extractedId.split("/")[0];
        }

        if (extractedId && extractedId.toLowerCase() !== "profile.php") {
          const directItem = {
            platformId: extractedId,
            name: `${t("modal.directConnect")}: "${extractedId}"`,
            avatar: "",
            followers: 0,
            url: `https://facebook.com/${extractedId}`,
            isDirect: true
          };
          
          const alreadyExists = normalized.some(item => item.platformId === extractedId);
          if (!alreadyExists) {
            normalized.unshift(directItem);
          }
        }
      }

      setSearchResults(normalized);
      if (normalized.length === 0) {
        toast.info(t("toasts.noResults"));
      }
    } catch (err) {
      toast.error(t("toasts.searchError"));
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Add Competitor
  const handleConnectCompetitor = async (item) => {
    if (!activeBrand?.id) return;

    if (searchPlatform !== "Facebook" && searchPlatform !== "YouTube") {
      toast.info(t("toasts.connectComingSoon", { platform: searchPlatform }));
      return;
    }

    setConnectingId(item.platformId);
    try {
      if (searchPlatform === "Facebook") {
        await socialService.addFacebookCompetitor(activeBrand.id, item.platformId);
      } else {
        await socialService.addCompetitor(activeBrand.id, item.platformId);
      }
      toast.success(t("toasts.connectSuccess", { name: item.name }));
      await fetchAllCompetitors();
      setIsModalOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      toast.error(t("toasts.connectError"));
      console.error(err);
    } finally {
      setConnectingId(null);
    }
  };

  // Delete Competitor
  const handleDeleteCompetitor = async (c) => {
    if (!activeBrand) return;
    const isConfirmed = await confirm({
      title: t("toasts.deleteConfirm", { name: c.name }),
      confirmText: t("common:delete"),
      cancelText: t("common:cancel"),
      variant: "destructive"
    });
    if (isConfirmed) {
      try {
        if (c.platform === "facebook") {
          await socialService.deleteFacebookCompetitor(c.id, activeBrand.id);
        } else {
          await socialService.deleteCompetitor(c.id, activeBrand.id);
        }
        toast.success(t("toasts.deleteSuccess", { name: c.name }));
        await fetchAllCompetitors();
      } catch (err) {
        toast.error(t("toasts.deleteError"));
        console.error(err);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#F8F9FA] p-6 space-y-6">
      
      {/* Heading Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1F36] flex items-center gap-2">
            <BarChart3 className="text-[#3B82F6] w-6 h-6" />
            {t("header.title")}
          </h1>
          <p className="text-sm text-[#8792A2] mt-0.5">
            {t("header.subtitle")}
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#0A0A0A] hover:bg-[#222] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 transform active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          {t("header.addBtn")}
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "all", label: t("tabs.all") },
          { id: "facebook", label: t("tabs.facebook") },
          { id: "youtube", label: t("tabs.youtube") }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveViewTab(tab.id)}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeViewTab === tab.id 
                ? "border-black text-black font-extrabold" 
                : "border-transparent text-gray-400 hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="animate-spin text-gray-800" size={32} />
          <span className="text-xs font-bold uppercase tracking-widest">{t("loading")}</span>
        </div>
      ) : (
        <>
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Benchmarking Matrix Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-[#E5E7EB] flex justify-between items-center">
                <div>
                  <h4 className="text-base font-bold text-[#1A1F36]">{t("matrix.title")}</h4>
                  <p className="text-xs text-[#8792A2] mt-0.5">{t("matrix.subtitle")}</p>
                </div>
                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg">
                  {t("matrix.tracking", { count: displayCompetitors.length - 1 })}
                </span>
              </div>

              {displayCompetitors.length <= 1 ? (
                <div className="py-16 text-center text-gray-400 space-y-2">
                  <AlertCircle className="mx-auto text-gray-300" size={32} />
                  <p className="text-xs font-bold uppercase tracking-wider">{t("matrix.empty.title")}</p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">{t("matrix.empty.desc")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB]">
                        <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">{t("matrix.cols.brand")}</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">{t("matrix.cols.followers")}</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">{t("matrix.cols.frequency")}</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">{t("matrix.cols.engagement")}</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">{t("matrix.cols.growth")}</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {displayCompetitors.map((c) => (
                        <tr 
                          key={c.id} 
                          className={`hover:bg-slate-50/50 transition-colors ${
                            c.isSelf ? "bg-emerald-50/20 font-semibold" : ""
                          }`}
                        >
                          
                          {/* Brand Meta */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {c.avatarUrl ? (
                                <img src={c.avatarUrl} referrerPolicy="no-referrer" alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                  c.isSelf ? "bg-emerald-500 text-white" : "bg-slate-100 text-[#4F5B66]"
                                }`}>
                                  {c.name.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-sm text-[#1A1F36] flex items-center gap-1.5">
                                  {c.isSelf ? (
                                    <span>{c.name}</span>
                                  ) : (
                                    <a 
                                      href={c.profileUrl || (c.platform === "facebook" ? `https://www.facebook.com/${c.handle}` : `https://www.youtube.com/channel/${c.handle}`)}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="hover:underline hover:text-blue-600 flex items-center gap-1 group"
                                      title={c.name}
                                    >
                                      {c.name}
                                      <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-600 transition-colors inline" />
                                    </a>
                                  )}
                                  {c.isSelf && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold uppercase">
                                      {t("matrix.youBadge")}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#8792A2] flex items-center gap-1.5">
                                  {c.handle}
                                  {!c.isSelf && c.platform && (
                                    <span className="text-[9px] bg-gray-100 text-gray-500 font-bold px-1 py-0.2 rounded uppercase scale-90">
                                      {c.platform}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Followers */}
                          <td className="py-4 px-6 text-sm font-bold text-[#1A1F36]">
                            {c.followers.toLocaleString()}
                          </td>

                          {/* Posts Per Week */}
                          <td className="py-4 px-6">
                            <div className="text-sm font-semibold text-[#1A1F36]">{c.postsPerWeek ?? "N/A"}</div>
                            <div className="text-xs text-[#8792A2]">{t("matrix.postsPerWeek")}</div>
                          </td>

                          {/* Engagement Rate */}
                          <td className="py-4 px-6">
                            {c.engagementRate == null ? (
                              <span className="text-sm text-[#8792A2]">N/A</span>
                            ) : (
                              <span className={`text-sm font-bold ${
                                c.engagementRate >= 4.0 ? "text-emerald-600" : "text-[#1A1F36]"
                              }`}>
                                {c.engagementRate}%
                              </span>
                            )}
                          </td>

                          {/* Growth Rate */}
                          <td className="py-4 px-6">
                            {c.growth == null ? (
                              <span className="text-sm text-[#8792A2]">N/A</span>
                            ) : (
                              <span className="text-sm font-semibold text-[#16A34A] flex items-center gap-0.5">
                                <TrendingUp size={12} /> +{c.growth}%
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            {!c.isSelf && (
                              <button 
                                onClick={() => handleDeleteCompetitor(c)}
                                className="text-[#8792A2] hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column: Followers Growth Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-[#1A1F36] flex items-center gap-2">
                  <Users size={18} className="text-[#10B981]" />
                  {t("chart.title")}
                </h4>
                <p className="text-xs text-[#8792A2] mt-0.5">{t("chart.subtitle")}</p>
              </div>

              {/* No real historical follower data source exists for this
                  chart — it previously extrapolated a fabricated growth
                  curve backward from a single current-follower snapshot
                  using an arbitrary formula. Always show the empty state
                  instead of fake history presented as real data (#79). */}
              <div className="h-60 flex flex-col items-center justify-center text-gray-400 text-xs">
                {t("chart.noData")}
              </div>
            </div>

          </div>

          {/* Bottom Section: Top Performing Competitor Posts */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-base font-bold text-[#1A1F36] flex items-center gap-2">
                  <Flame size={18} className="text-[#EF4444] animate-bounce" />
                  {t("topPosts.title")}
                </h4>
                <p className="text-xs text-[#8792A2] mt-0.5">{t("topPosts.subtitle")}</p>
              </div>
            </div>

            {displayTopPosts.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-2 border border-dashed border-gray-200 rounded-3xl bg-gray-50/30">
                <AlertCircle className="mx-auto text-gray-300" size={32} />
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">{t("topPosts.empty.title")}</p>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto px-4">
                  {t("topPosts.empty.desc")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayTopPosts.map((post) => (
                  <div key={post.id} className="border border-[#E5E7EB] rounded-2xl overflow-hidden flex flex-col bg-white hover:shadow-md transition-shadow">
                    
                    {/* Post Header */}
                    <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#FAFAFA]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs uppercase">
                          {post.author.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#1A1F36]">{post.author}</div>
                          <div className="text-[10px] text-[#8792A2]">{post.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.postUrl && (
                          <a 
                            href={post.postUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#8792A2] hover:text-black transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <PlatformIcon platform={post.platform} size={18} />
                      </div>
                    </div>

                    {/* Post Image (If any) */}
                    {post.media && (
                      <div className="h-44 overflow-hidden border-b border-[#E5E7EB]">
                        {post.postUrl ? (
                          <a href={post.postUrl} target="_blank" rel="noopener noreferrer">
                            <img src={post.media} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                          </a>
                        ) : (
                          <img src={post.media} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                        )}
                      </div>
                    )}

                    {/* Post Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-[#4F5B66] leading-relaxed line-clamp-4">
                        {post.content}
                      </p>

                      {/* Post Footer / Engagement Metrics */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[#8792A2]">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[11px]">
                            <ThumbsUp size={12} className="text-[#3B82F6]" />
                            {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <MessageCircle size={12} className="text-purple-500" />
                            {post.comments}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Share2 size={12} className="text-emerald-500" />
                            {post.shares}
                          </span>
                        </div>

                        <span className="text-[10px] font-bold bg-[#FAFAFA] border border-[#E5E7EB] text-[#1A1F36] px-2 py-0.5 rounded-md">
                          {post.reachRate == null ? "N/A" : `${post.reachRate}%`} {t("topPosts.engagementLabel")}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Add Competitor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-[#E5E7EB] flex flex-col max-h-[90vh]">
            
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute top-4 right-4 text-[#8792A2] hover:text-[#0a0a0a] cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-[#1A1F36] flex items-center gap-2 mb-4">
              <Globe className="text-blue-500 w-5 h-5" />
              {t("modal.title")}
            </h3>

            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              {availableModalPlatforms.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-3 flex-1 flex flex-col justify-center items-center">
                  <AlertCircle className="text-amber-500 w-10 h-10" />
                  <p className="text-sm font-bold uppercase tracking-wider text-[#1A1F36]">{t("modal.noSocialTitle")}</p>
                  <p className="text-xs text-[#8792A2] max-w-xs px-4">
                    {t("modal.noSocialDesc")}
                  </p>
                  <a
                    href="/settings"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    {t("modal.goToSettings")}
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#4F5B66] uppercase mb-1.5">{t("modal.selectPlatform")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableModalPlatforms.map((platform) => (
                        <button
                          key={platform.key}
                          type="button"
                          onClick={() => {
                            setSearchPlatform(platform.key);
                            setSearchResults([]);
                          }}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            searchPlatform === platform.key 
                              ? "border-[#0A0A0A] bg-slate-50 text-[#0A0A0A]" 
                              : "border-[#E5E7EB] hover:bg-slate-50/50 text-[#8792A2]"
                          }`}
                        >
                          <PlatformIcon platform={platform.key.toLowerCase()} size={16} />
                          {platform.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="space-y-2 shrink-0">
                    <label className="block text-xs font-bold text-[#4F5B66] uppercase">{t("modal.searchBtn")}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={t("modal.searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-4 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1F36] focus:border-[#0A0A0A] outline-none transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searching || !searchQuery.trim()}
                        className="bg-black hover:bg-gray-800 text-white text-xs font-bold px-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        {t("modal.searchBtn")}
                      </button>
                    </div>
                  </form>

                  {/* Search Results List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-2 scrollbar-thin">
                    {searching ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Loader2 size={24} className="animate-spin text-gray-800" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t("modal.searching")}</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <div 
                          key={item.platformId}
                          className="flex items-center justify-between p-3.5 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.avatar ? (
                               <img src={item.avatar} referrerPolicy="no-referrer" alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-gray-100">
                                {item.name.slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                                {item.name}
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black scale-90">
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                              <div className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-tight">
                                {item.isDirect 
                                  ? t("modal.directConnect") 
                                  : item.followers 
                                    ? `${item.followers.toLocaleString()} ${t("modal.followersLabel")}` 
                                    : 'Public Channel'}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleConnectCompetitor(item)}
                            disabled={connectingId !== null}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            {connectingId === item.platformId ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            {t("modal.connectBtn")}
                          </button>
                        </div>
                      ))
                    ) : searchQuery && !searching ? (
                      <div className="py-12 text-center text-gray-400 space-y-2 border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <AlertCircle className="mx-auto text-gray-300" size={24} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">{t("modal.noResultsTitle")}</p>
                        <p className="text-[11px] text-gray-400 max-w-xs mx-auto px-6">{t("modal.noResultsDesc")}</p>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-400 space-y-2 border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <Globe className="mx-auto text-gray-300" size={24} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">{t("modal.startSearchTitle")}</p>
                        <p className="text-[11px] text-gray-400 max-w-xs mx-auto px-6">{t("modal.startSearchDesc", { platform: searchPlatform })}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#E5E7EB] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t("modal.closeBtn")}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
