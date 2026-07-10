import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { X, Plus, Hash, Layers, BarChart2, Compass, Trash2, Globe, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import apiService from "../../services/api";
import { useBrand } from "../../context/BrandContext";
import { useConfirm } from "@/hooks/useConfirm";

const CATEGORIES_CONFIG = {
  Instagram: { platform: "INSTAGRAM", label: "Instagram" },
  TikTok: { platform: "TIKTOK", label: "TikTok" },
  General: { platform: "TIKTOK", label: "General" }
};
const categories = Object.keys(CATEGORIES_CONFIG);
const platformColors = { YT: "#FF0000", IG: "#E1306C", TK: "#000000", LI: "#0A66C2", X: "#0A0A0A" };

export function HashtagManager() {
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
  const [customTag, setCustomTag] = useState("");
  const [customPlatform, setCustomPlatform] = useState("IG");
  
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
      const res = await apiService.get(`/hashtags?brandId=${activeBrand.id}`);
      setHashtagSets(res.data.sets || []);
      setTrackedHashtags(res.data.trackers || []);
    } catch (err) {
      toast.error("Không thể tải dữ liệu Hashtags.");
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
      const platformParam = CATEGORIES_CONFIG[cat]?.platform || "TIKTOK";
      const res = await apiService.get(`/hashtags/trending?platform=${platformParam}&limit=20&brandId=${activeBrand.id}`);
      setTrendingHashtags(res.data.trending || []);
    } catch (err) {
      setTrendingError(err.response?.data?.message || "Không thể tải danh sách hashtag đang thịnh hành.");
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
      toast.warning("Vui lòng điền tên bộ hashtag và thêm ít nhất một thẻ tag.");
      return;
    }
    try {
      const payload = {
        brandId: activeBrand.id,
        name: setName,
        hashtags: setTags,
        targetPlatforms
      };
      await apiService.post("/hashtags/sets", payload);
      toast.success("Đã tạo bộ hashtag thành công!");
      setIsCreateOpen(false);
      setSetName("");
      setSetTags([]);
      loadData(true);
    } catch (error) {
      toast.error(error.message || "Tạo bộ hashtag thất bại.");
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
      await apiService.put(`/hashtags/sets/${selectedSet.id}`, payload);
      toast.success("Cập nhật bộ hashtag thành công!");
      setSelectedSet(null);
      loadData(true);
    } catch (error) {
      toast.error(error.message || "Cập nhật thất bại.");
    }
  };

  // Delete Set Action
  const handleDeleteSet = async (setId) => {
    const isConfirmed = await confirm({
      title: "Xóa bộ Hashtag",
      description: "Bạn có chắc chắn muốn xóa bộ hashtag này?",
      confirmText: "Xóa",
      cancelText: "Hủy"
    });
    if (!isConfirmed) return;
    try {
      await apiService.delete(`/hashtags/sets/${setId}`);
      toast.success("Đã xóa bộ hashtag thành công.");
      loadData(true);
    } catch (error) {
      toast.error(error.message || "Xóa thất bại.");
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
      await apiService.delete(`/hashtags/track/${trackerId}`);
      toast.success("Đã ngưng theo dõi hashtag.");
      loadData(true);
    } catch (error) {
      toast.error("Không thể ngưng theo dõi tag.");
    }
  };

  // Track new tag from search/discover panel
  const handleTrackNewTag = async (tagText) => {
    if (!activeBrand?.id) return;
    try {
      await apiService.post("/hashtags/track", {
        brandId: activeBrand.id,
        hashtag: tagText,
        platform: "IG"
      });
      toast.success(`Đang theo dõi tag: ${tagText}`);
      loadData(true);
    } catch (error) {
      toast.error(error.message || "Không thể theo dõi tag.");
    }
  };

  // Track custom tag from stats panel input
  const handleTrackCustomTag = async (e) => {
    e.preventDefault();
    if (!customTag.trim()) {
      toast.warning("Vui lòng nhập hashtag.");
      return;
    }
    if (!activeBrand?.id) return;
    try {
      const formatted = customTag.trim().startsWith("#") ? customTag.trim() : `#${customTag.trim()}`;
      await apiService.post("/hashtags/track", {
        brandId: activeBrand.id,
        hashtag: formatted,
        platform: customPlatform
      });
      toast.success(`Đang theo dõi tag: ${formatted} trên ${customPlatform === 'IG' ? 'Instagram' : 'TikTok'}`);
      setCustomTag("");
      loadData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Không thể theo dõi tag.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      {/* Header */}
      <div className="px-10 py-8 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Hash className="text-blue-500" size={24} />
            Hashtag Manager & Analytics
          </h1>
          <p className="text-xs text-gray-400 mt-1">Lưu trữ bộ hashtag thương hiệu và kiểm tra phân tích reach thực tế.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} />
          CREATE SET
        </button>
      </div>

      {/* Internal Tabs */}
      <div className="px-10 bg-white border-b border-gray-100 flex gap-8">
        {[
          { id: "sets", label: "Bộ Hashtag (My Sets)", icon: <Layers size={14} /> },
          { id: "discover", label: "Khám phá (Discover Trend)", icon: <Compass size={14} /> },
          { id: "stats", label: "Hiệu suất (Performance)", icon: <BarChart2 size={14} /> },
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
          <div className="flex items-center justify-center py-20 text-xs text-gray-400 font-bold gap-2">
            <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin" />
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            {activeTab === "sets" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {hashtagSets.map((set) => {
                  const tagList = set.hashtags ? set.hashtags.split(",") : [];
                  const platformList = set.targetPlatforms ? set.targetPlatforms.split(",") : ["IG"];
                  return (
                    <div key={set.id} className="bg-white rounded-2xl p-6 border border-gray-150 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <span className="text-sm font-bold text-gray-900">{set.name}</span>
                          <button 
                            onClick={() => handleDeleteSet(set.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {tagList.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-semibold border border-gray-100">{tag}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
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
                          className="py-1.5 px-3 rounded-lg bg-gray-50 text-gray-600 text-[10px] font-bold hover:bg-black hover:text-white transition-all cursor-pointer border border-gray-150"
                        >
                          Sửa Set
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Create new dashed card */}
                <div 
                  onClick={() => setIsCreateOpen(true)}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-white flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all group min-h-[220px]"
                >
                   <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                      <Plus size={20} />
                   </div>
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Create New Set</span>
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
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeCategory === c ? "bg-[#0A0A0A] text-white border-black" : "bg-white text-gray-400 border-gray-100 hover:border-gray-200 cursor-pointer"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 border border-gray-150 shadow-xs flex flex-col justify-between min-h-[110px] animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-2/3" />
                          <div className="h-3 bg-gray-100 rounded w-1/3" />
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                          <div className="h-3 bg-gray-100 rounded w-1/4" />
                        </div>
                      </div>
                    ))
                  ) : trendingError ? (
                    <div className="col-span-full bg-white rounded-2xl p-10 border border-gray-150 shadow-xs flex flex-col items-center justify-center text-center gap-3">
                      <AlertCircle size={24} className="text-red-500" />
                      <span className="text-xs text-gray-500 font-bold">{trendingError}</span>
                      <button 
                        onClick={() => loadTrendingHashtags(activeCategory)} 
                        className="px-4 py-2 bg-black text-white text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        Tải lại
                      </button>
                    </div>
                  ) : trendingHashtags.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl p-10 border border-gray-150 shadow-xs flex flex-col items-center justify-center text-center gap-2">
                      <Compass size={24} className="text-gray-300" />
                      <span className="text-xs text-gray-500 font-bold">Không tìm thấy hashtag nào thịnh hành.</span>
                    </div>
                  ) : (
                    trendingHashtags.map((tag) => (
                      <div key={tag.hashtag} className="bg-white rounded-xl p-4 border border-gray-150 shadow-xs flex flex-col justify-between min-h-[110px]">
                        <div>
                          <div className="font-bold text-gray-900 text-xs flex items-center gap-1">
                            <Globe size={11} className="text-gray-400" />
                            {tag.hashtag}
                          </div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                            {tag.postsCount ? (tag.postsCount / 1000).toFixed(0) + "K" : "0"} posts
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <span className={`text-[9px] font-extrabold ${tag.growthRate > 10 ? "text-green-500" : "text-gray-400"}`}>
                            {tag.growthRate > 10 ? `TRENDING ↑ ${tag.growthRate}%` : "STABLE →"}
                          </span>
                          <button 
                            onClick={() => handleTrackNewTag(tag.hashtag)}
                            className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            + Track Tag
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
                {/* Form thêm hashtag theo dõi thủ công */}
                <form onSubmit={handleTrackCustomTag} className="bg-white rounded-2xl p-5 border border-gray-150 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-[280px]">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">Theo dõi Hashtag mới</h4>
                    <p className="text-[10px] text-gray-400">Nhập hashtag và chọn nền tảng để bắt đầu phân tích dữ liệu hiệu suất thật.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input 
                      type="text" 
                      placeholder="ví dụ: #inbound18" 
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      className="bg-white border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-gray-400 w-44"
                    />
                    <select 
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      className="bg-white border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-gray-400 cursor-pointer"
                    >
                      <option value="IG">Instagram</option>
                      <option value="TK">TikTok</option>
                    </select>
                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Theo dõi
                    </button>
                  </div>
                </form>

                {trackedHashtags.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-gray-150 shadow-xs flex flex-col items-center justify-center text-center gap-2">
                    <AlertCircle size={24} className="text-gray-300" />
                    <span className="text-xs text-gray-500 font-bold">Chưa theo dõi thẻ phân tích nào</span>
                    <p className="text-[10px] text-gray-400 max-w-[320px]">
                      Vào tab Khám phá và chọn bấm "+ Track Tag" để thêm thẻ hashtag phân tích reach và số bài đăng thực tế.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-xs">
                      <h3 className="text-xs font-bold text-gray-800 mb-6 uppercase tracking-wider">Reach Performance of Tracked Tags</h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={trackedHashtags.map(t => ({ tag: t.hashtag, reach: t.totalReach || 0 }))}>
                          <XAxis dataKey="tag" tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="reach" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={35} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-150">
                            {["Hashtag", "Usage Frequency", "Avg Reach", "Platform", ""].map((h) => (
                              <th key={h} className="px-6 py-3.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {trackedHashtags.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                              <td 
                                className="px-6 py-4 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                onClick={() => navigate('/hashtags/analysis/' + row.id)}
                              >
                                {row.hashtag}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-400 font-semibold">{row.postsLast24h} posts/24h</td>
                              <td className="px-6 py-4 text-xs font-bold text-gray-900">{(row.totalReach / 1000).toFixed(1)}K reach</td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-0.5 rounded bg-pink-50 text-[#E1306C] text-[9px] font-bold uppercase tracking-tight">{row.platform}</span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-3">
                                 <button 
                                   onClick={() => navigate('/hashtags/analysis/' + row.id)}
                                   className="text-blue-600 text-[10px] font-bold hover:underline cursor-pointer"
                                 >
                                   Phân tích
                                 </button>
                                 <button 
                                   onClick={() => handleUntrackTag(row.id)}
                                   className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                                 >
                                   Ngừng Track
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
           <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setSelectedSet(null)} />
           <div className="relative z-10 w-[450px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-350">
              <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                 <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                   <Sparkles className="text-indigo-500" size={16} />
                   Edit Set: {selectedSet.name}
                 </h3>
                 <button onClick={() => setSelectedSet(null)} className="p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-5">
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tên bộ</label>
                    <input 
                      type="text"
                      value={selectedSet.name}
                      onChange={(e) => setSelectedSet({ ...selectedSet, name: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Hashtags</label>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-gray-150 min-h-[90px] mb-3">
                       {selectedSet.tags.map(t => (
                         <span key={t} className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-gray-200">
                            {t} 
                            <button onClick={() => setSelectedSet({ ...selectedSet, tags: selectedSet.tags.filter(x => x !== t) })} className="hover:text-red-500"><X size={11} /></button>
                         </span>
                       ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Thêm hashtag mới..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={addTagToForm}
                        className="flex-1 bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400"
                      />
                      <button 
                        onClick={addTagToForm}
                        className="px-3.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Thêm
                      </button>
                    </div>
                 </div>
              </div>
              <div className="p-5 bg-slate-50 border-t border-gray-150 flex gap-2">
                 <button onClick={() => setSelectedSet(null)} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-250 text-gray-700 text-xs font-bold transition-all cursor-pointer">Hủy</button>
                 <button onClick={handleUpdateSet} className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer shadow-sm">Lưu thay đổi</button>
              </div>
           </div>
        </div>
      )}

      {/* Editor Modal for Creating new Set */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
           <div className="relative z-10 w-[450px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-350">
              <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                 <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                   <Plus className="text-blue-500" size={16} />
                   Tạo bộ Hashtag mới
                 </h3>
                 <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-5">
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tên bộ</label>
                    <input 
                      type="text"
                      placeholder="e.g. Technology Trends"
                      value={setName}
                      onChange={(e) => setSetName(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Hashtags</label>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-gray-150 min-h-[90px] mb-3">
                       {setTags.map(t => (
                         <span key={t} className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-gray-200">
                            {t} 
                            <button onClick={() => setSetTags(prev => prev.filter(x => x !== t))} className="hover:text-red-500"><X size={11} /></button>
                         </span>
                       ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Thêm hashtag mới..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={addTagToForm}
                        className="flex-1 bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400"
                      />
                      <button 
                        onClick={addTagToForm}
                        className="px-3.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Thêm
                      </button>
                    </div>
                 </div>
              </div>
              <div className="p-5 bg-slate-50 border-t border-gray-150 flex gap-2">
                 <button onClick={() => setIsCreateOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-250 text-gray-700 text-xs font-bold transition-all cursor-pointer">Hủy</button>
                 <button onClick={handleCreateSet} className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer shadow-sm">Tạo bộ</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
