import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { X, Plus, Hash, Layers, BarChart2, Compass, Trash2, Globe, Sparkles, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import hashtagService from "../../services/hashtag.service";
import { useBrand } from "../../context/BrandContext";
import { useConfirm } from "@/hooks/useConfirm";

const categories = ["Instagram", "TikTok", "General"];
const platformColors = { YT: "#FF0000", IG: "#E1306C", TK: "#000000", LI: "#0A66C2", X: "#0A0A0A" };

export function HashtagManager() {
  const { t } = useTranslation("hashtag");
  const { activeBrand } = useBrand();
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState("Instagram");
  const [activeTab, setActiveTab] = useState("sets");
  const [loading, setLoading] = useState(false);

  // Trending states
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState(null);
  
  // Real DB states
  const [hashtagSets, setHashtagSets] = useState([]);
  const [trackedHashtags, setTrackedHashtags] = useState([]);
  
  // Editor / Create Modal States
  const [selectedSet, setSelectedSet] = useState(null); // HashtagSet Object
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [setName, setSetName] = useState("");
  const [setTags, setSetTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState(["IG", "TK"]);

  // Fetch from Server
  const loadData = async (silent = false) => {
    if (!activeBrand?.id) return;
    if (!silent) setLoading(true);
    try {
      const res = await hashtagService.getHashtags(activeBrand.id);
      setHashtagSets(res.sets || []);
      setTrackedHashtags(res.trackers || []);
    } catch (err) {
      toast.error(t("toasts.loadError"));
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBrand?.id]);

  const loadTrendingHashtags = async (cat) => {
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      let platformParam = "MOCK";
      if (cat === "Instagram") platformParam = "INSTAGRAM";
      if (cat === "TikTok") platformParam = "TIKTOK";

      const res = await hashtagService.getTrendingHashtags(platformParam);
      setTrendingHashtags(res.trending || []);
    } catch (err) {
      setTrendingError(t("toasts.trendingError"));
      console.error(err);
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "discover") {
      loadTrendingHashtags(activeCategory);
    }
  }, [activeTab, activeCategory]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam === "discover") setActiveTab("discover");
    else if (tabParam === "stats") setActiveTab("stats");
    else setActiveTab("sets");
  }, [location.search]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`${location.pathname}?tab=${tabKey}`);
  };

  // Create Set Action
  const handleCreateSet = async (e) => {
    e.preventDefault();
    if (!setName || setTags.length === 0) {
      toast.warning(t("toasts.validationEmpty"));
      return;
    }
    try {
      const payload = {
        brandId: activeBrand.id,
        name: setName,
        hashtags: setTags,
        targetPlatforms
      };
      await hashtagService.createSet(payload);
      toast.success(t("toasts.createSuccess"));
      setIsCreateOpen(false);
      setSetName("");
      setSetTags([]);
      loadData(true);
    } catch (error) {
      toast.error(error.message || t("toasts.createError"));
    }
  };

  // Update Set Action
  const handleUpdateSet = async () => {
    if (!selectedSet) return;
    try {
      const payload = {
        name: selectedSet.name,
        hashtags: selectedSet.tags,
        targetPlatforms: selectedSet.targetPlatforms
      };
      await hashtagService.updateSet(selectedSet.id, payload);
      toast.success(t("toasts.updateSuccess"));
      setSelectedSet(null);
      loadData(true);
    } catch (error) {
      toast.error(error.message || t("toasts.updateError"));
    }
  };

  // Delete Set Action
  const handleDeleteSet = async (setId) => {
    const isConfirmed = await confirm({
      title: t("toasts.deleteConfirmTitle"),
      description: t("toasts.deleteConfirmDesc"),
      confirmText: t("toasts.deleteConfirmBtn"),
      cancelText: t("toasts.cancelBtn")
    });
    if (!isConfirmed) return;
    try {
      await hashtagService.deleteSet(setId);
      toast.success(t("toasts.deleteSuccess"));
      loadData(true);
    } catch (error) {
      toast.error(error.message || t("toasts.deleteError"));
    }
  };

  // Add tag to list inside form
  const addTagToForm = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e.preventDefault();
      if (!newTagInput.trim()) return;
      const formatted = newTagInput.startsWith("#") ? newTagInput.trim() : `#${newTagInput.trim()}`;
      if (selectedSet) {
        if (!selectedSet.tags.includes(formatted)) {
          setSelectedSet({ ...selectedSet, tags: [...selectedSet.tags, formatted] });
        }
      } else {
        if (!setTags.includes(formatted)) {
          setSetTags([...setTags, formatted]);
        }
      }
      setNewTagInput("");
    }
  };

  // Stop tracking a tag
  const handleUntrackTag = async (trackerId) => {
    try {
      await hashtagService.deleteTracker(trackerId);
      toast.success(t("toasts.untrackSuccess"));
      loadData(true);
    } catch (error) {
      toast.error(t("toasts.untrackError"));
    }
  };

  // Manually refresh a tracked tag's stats (no auto-refresh — provider quota is tight)
  const [refreshingTagId, setRefreshingTagId] = useState(null);
  const handleRefreshTag = async (trackerId) => {
    setRefreshingTagId(trackerId);
    try {
      const res = await hashtagService.refreshTracker(trackerId);
      toast.success(res.message);
      loadData(true);
    } catch (error) {
      toast.error(t("toasts.refreshError"));
    } finally {
      setRefreshingTagId(null);
    }
  };

  // Track new tag from search/discover panel
  const handleTrackNewTag = async (tagText) => {
    if (!activeBrand?.id) return;
    try {
      await hashtagService.trackHashtag({
        brandId: activeBrand.id,
        hashtag: tagText,
        platform: "INSTAGRAM"
      });
      toast.success(t("toasts.trackSuccess", { tag: tagText }));
      loadData(true);
    } catch (error) {
      toast.error(error.message || t("toasts.trackError"));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      {/* Header */}
      <div className="px-10 py-8 bg-card border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Hash className="text-blue-500" size={24} />
            {t("header.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{t("header.subtitle")}</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} />
          {t("header.createBtn")}
        </button>
      </div>

      {/* Internal Tabs */}
      <div className="px-10 bg-card border-b border-border flex gap-8">
        {[
          { id: "sets", label: t("tabs.sets"), icon: <Layers size={14} /> },
          { id: "discover", label: t("tabs.discover"), icon: <Compass size={14} /> },
          { id: "stats", label: t("tabs.stats"), icon: <BarChart2 size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className="py-4 text-xs font-bold tracking-tight transition-all relative flex items-center gap-2"
            style={{ color: activeTab === tab.id ? "#0A0A0A" : "#9CA3AF" }}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0A0A0A]" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-10 max-w-[1200px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-xs text-muted-foreground font-bold gap-2">
            <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            {activeTab === "sets" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {hashtagSets.map((set) => {
                  const tagList = set.hashtags ? set.hashtags.split(",") : [];
                  const platformList = set.targetPlatforms ? set.targetPlatforms.split(",") : ["IG"];
                  return (
                    <div key={set.id} className="bg-card rounded-2xl p-6 border border-gray-150 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <span className="text-sm font-bold text-foreground">{set.name}</span>
                          <button 
                            onClick={() => handleDeleteSet(set.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {tagList.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-semibold border border-border">{tag}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex gap-1">
                          {platformList.map((p) => (
                            <div key={p} className="w-5 h-5 rounded-md flex items-center justify-center shadow-xs" style={{ backgroundColor: platformColors[p] || "#0A0A0A" }}>
                              <span className="text-[8px] text-white font-black">{p}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setSelectedSet({
                            id: set.id,
                            name: set.name,
                            tags: tagList,
                            targetPlatforms: platformList
                          })}
                          className="py-1.5 px-3 rounded-lg bg-muted text-muted-foreground text-[10px] font-bold hover:bg-black hover:text-white transition-all cursor-pointer border border-gray-150"
                        >
                          {t("sets.editBtn")}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Create new dashed card */}
                <div 
                  onClick={() => setIsCreateOpen(true)}
                  className="border-2 border-dashed border-border rounded-2xl p-6 bg-card flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted hover:border-border transition-all group min-h-[220px]"
                >
                   <div className="w-11 h-11 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                      <Plus size={20} />
                   </div>
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("sets.createCard")}</span>
                </div>
              </div>
            )}

            {activeTab === "discover" && (
              <div className="animate-in fade-in duration-300 space-y-6">
                <div className="flex gap-2 flex-wrap">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCategory(c)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeCategory === c ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-border cursor-pointer"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="bg-card rounded-xl p-4 border border-gray-150 shadow-xs flex flex-col justify-between min-h-[110px] animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-2/3" />
                          <div className="h-3 bg-muted rounded w-1/3" />
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="h-3 bg-muted rounded w-1/2" />
                          <div className="h-3 bg-muted rounded w-1/4" />
                        </div>
                      </div>
                    ))
                  ) : trendingError ? (
                    <div className="col-span-full bg-card rounded-2xl p-10 border border-gray-150 shadow-xs flex flex-col items-center justify-center text-center gap-3">
                      <AlertCircle size={24} className="text-red-500" />
                      <span className="text-xs text-muted-foreground font-bold">{trendingError}</span>
                      <button 
                        onClick={() => loadTrendingHashtags(activeCategory)} 
                        className="px-4 py-2 bg-black text-white text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        {t("discover.retryBtn")}
                      </button>
                    </div>
                  ) : trendingHashtags.length === 0 ? (
                    <div className="col-span-full bg-card rounded-2xl p-10 border border-gray-150 shadow-xs flex flex-col items-center justify-center text-center gap-2">
                      <Compass size={24} className="text-gray-300" />
                      <span className="text-xs text-muted-foreground font-bold">{t("discover.noResults")}</span>
                    </div>
                  ) : (
                    trendingHashtags.map((tag) => (
                      <div key={tag.hashtag} className="bg-card rounded-xl p-4 border border-gray-150 shadow-xs flex flex-col justify-between min-h-[110px]">
                        <div>
                          <div className="font-bold text-foreground text-xs flex items-center gap-1">
                            <Globe size={11} className="text-muted-foreground" />
                            {tag.hashtag}
                          </div>
                          <div className="text-[9px] text-muted-foreground font-bold uppercase mt-1">
                            {tag.postsCount ? (tag.postsCount / 1000).toFixed(0) + "K" : "0"} {t("discover.posts")}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <span className={`text-[9px] font-extrabold ${tag.growthRate > 10 ? "text-green-500" : "text-muted-foreground"}`}>
                            {tag.growthRate > 10 ? t("discover.trending", { rate: tag.growthRate }) : t("discover.stable")}
                          </span>
                          <button 
                            onClick={() => handleTrackNewTag(tag.hashtag)}
                            className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            {t("discover.trackBtn")}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "stats" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {trackedHashtags.length === 0 ? (
                  <div className="bg-card rounded-2xl p-10 border border-gray-150 shadow-xs flex flex-col items-center justify-center text-center gap-2">
                    <AlertCircle size={24} className="text-gray-300" />
                    <span className="text-xs text-muted-foreground font-bold">{t("stats.empty.title")}</span>
                    <p className="text-[10px] text-muted-foreground max-w-[320px]">
                      {t("stats.empty.desc")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-card rounded-2xl p-6 border border-gray-150 shadow-xs">
                      <h3 className="text-xs font-bold text-foreground mb-6 uppercase tracking-wider">{t("stats.chartTitle")}</h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={trackedHashtags.map(t => ({ tag: t.hashtag, reach: t.totalReach || 0 }))}>
                          <XAxis dataKey="tag" tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="reach" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={35} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-card rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-150">
                            {[
                              t("stats.tableHeaders.hashtag"),
                              t("stats.tableHeaders.frequency"),
                              t("stats.tableHeaders.reach"),
                              t("stats.tableHeaders.platform"),
                              ""
                            ].map((h, i) => (
                              <th key={i} className="px-6 py-3.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {trackedHashtags.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-foreground">{row.hashtag}</td>
                              <td className="px-6 py-4 text-xs text-muted-foreground font-semibold">
                                {row.postsLast24h != null ? `${row.postsLast24h} ${t("stats.postsPerDay")}` : t("stats.noData")}
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-foreground">
                                {row.totalReach != null ? `${(row.totalReach / 1000).toFixed(1)}${t("stats.reachSuffix")}` : t("stats.noData")}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-0.5 rounded bg-pink-50 text-[#E1306C] text-[9px] font-bold uppercase tracking-tight">
                                  {row.platform === "TIKTOK" ? "TikTok" : row.platform === "INSTAGRAM" ? "Instagram" : row.platform}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                 <button
                                   onClick={() => handleRefreshTag(row.id)}
                                   disabled={refreshingTagId === row.id}
                                   className="text-muted-foreground text-[10px] font-bold hover:underline cursor-pointer mr-3 disabled:opacity-50"
                                 >
                                   {refreshingTagId === row.id ? t("stats.refreshing") : t("stats.refreshBtn")}
                                 </button>
                                 <button
                                   onClick={() => handleUntrackTag(row.id)}
                                   className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                                 >
                                   {t("stats.untrackBtn")}
                                 </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Editor Modal for Updating Set */}
      {selectedSet && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedSet(null)} />
           <div className="relative z-10 w-[450px] h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-350">
              <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                 <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                   <Sparkles className="text-indigo-500" size={16} />
                   {t("editor.editTitle", { name: selectedSet.name })}
                 </h3>
                 <button onClick={() => setSelectedSet(null)} className="p-2 hover:bg-muted rounded-full transition-all cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-5">
                 <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">{t("editor.nameLabel")}</label>
                    <input 
                      type="text"
                      value={selectedSet.name}
                      onChange={(e) => setSelectedSet({ ...selectedSet, name: e.target.value })}
                      className="w-full bg-slate-50 border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">{t("editor.hashtagsLabel")}</label>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-gray-150 min-h-[90px] mb-3">
                       {selectedSet.tags.map(t_node => (
                         <span key={t_node} className="px-2.5 py-1 bg-background rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-border">
                            {t_node} 
                            <button onClick={() => setSelectedSet({ ...selectedSet, tags: selectedSet.tags.filter(x => x !== t_node) })} className="hover:text-red-500"><X size={11} /></button>
                         </span>
                       ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder={t("editor.addPlaceholder")}
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={addTagToForm}
                        className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-foreground"
                      />
                      <button 
                        onClick={addTagToForm}
                        className="px-3.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {t("editor.addBtn")}
                      </button>
                    </div>
                 </div>
              </div>
              <div className="p-5 bg-slate-50 border-t border-gray-150 flex gap-2">
                 <button onClick={() => setSelectedSet(null)} className="flex-1 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold transition-all cursor-pointer">{t("editor.cancelBtn")}</button>
                 <button onClick={handleUpdateSet} className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer shadow-sm">{t("editor.saveBtn")}</button>
              </div>
           </div>
        </div>
      )}

      {/* Editor Modal for Creating new Set */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
           <div className="relative z-10 w-[450px] h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-350">
              <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                 <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                   <Plus className="text-blue-500" size={16} />
                   {t("editor.createTitle")}
                 </h3>
                 <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-muted rounded-full transition-all cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-5">
                 <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">{t("editor.nameLabel")}</label>
                    <input 
                      type="text"
                      placeholder={t("editor.namePlaceholder")}
                      value={setName}
                      onChange={(e) => setSetName(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">{t("editor.hashtagsLabel")}</label>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-gray-150 min-h-[90px] mb-3">
                       {setTags.map(t_node => (
                         <span key={t_node} className="px-2.5 py-1 bg-background rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-border">
                            {t_node} 
                            <button onClick={() => setSetTags(prev => prev.filter(x => x !== t_node))} className="hover:text-red-500"><X size={11} /></button>
                         </span>
                       ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder={t("editor.addPlaceholder")}
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={addTagToForm}
                        className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-foreground"
                      />
                      <button 
                        onClick={addTagToForm}
                        className="px-3.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {t("editor.addBtn")}
                      </button>
                    </div>
                 </div>
              </div>
              <div className="p-5 bg-slate-50 border-t border-gray-150 flex gap-2">
                 <button onClick={() => setIsCreateOpen(false)} className="flex-1 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold transition-all cursor-pointer">{t("editor.cancelBtn")}</button>
                 <button onClick={handleCreateSet} className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer shadow-sm">{t("editor.createBtn")}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
