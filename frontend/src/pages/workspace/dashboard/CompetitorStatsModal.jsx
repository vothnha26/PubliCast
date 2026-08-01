import React, { useState, useMemo } from 'react';
import { 
  X, HelpCircle, Search, Download, Columns, Star, ExternalLink,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../../components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "../../../components/ui/dropdown-menu";
import { 
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip 
} from "recharts";
import { toast } from "sonner";

export default function CompetitorStatsModal({
  selectedCompetitorForStats,
  setSelectedCompetitorForStats
}) {
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [favoriteVideos, setFavoriteVideos] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    views: true,
    likes: true,
    dislikes: true,
    comments: true
  });

  const [showSubscribers, setShowSubscribers] = useState(true);
  const [showViews, setShowViews] = useState(true);
  const [showVideos, setShowVideos] = useState(true);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const formatAxisNumber = (num) => {
    if (!num) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(0) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toString();
  };

  // Sinh dữ liệu tăng trưởng giả lập cho đối thủ dựa trên số liệu thật
  const chartData = useMemo(() => {
    if (!selectedCompetitorForStats) return [];
    
    const data = [];
    const days = 15;
    const comp = selectedCompetitorForStats;
    
    const followers = comp.followersCount || 100000;
    const views = comp.totalViews || 1000000;
    
    // Bắt đầu từ giá trị thấp hơn và tăng luỹ tiến rõ rệt
    let currentSub = followers * 0.97;
    let currentViews = views * 0.95;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Tăng trưởng luỹ tiến chân thực
      const subGrowth = followers * (0.0015 + Math.random() * 0.001);
      const viewsGrowth = views * (0.003 + Math.random() * 0.002);
      
      // Số video tải lên mỗi ngày (đa số bằng 0, thỉnh thoảng có ngày đăng 1-2 video)
      const dailyVideos = Math.random() > 0.8 ? (Math.random() > 0.85 ? 2 : 1) : 0;
      
      currentSub += subGrowth;
      currentViews += viewsGrowth;
      
      data.push({
        date: dateStr,
        Subscribers: Math.min(Math.round(currentSub), followers),
        Views: Math.min(Math.round(currentViews), views),
        DailyVideos: dailyVideos,
      });
    }
    
    // Ngày cuối cùng khớp chuẩn xác số liệu thực
    if (data.length > 0) {
      data[data.length - 1].Subscribers = followers;
      data[data.length - 1].Views = views;
    }
    
    return data;
  }, [selectedCompetitorForStats]);

  // Lọc danh sách video của đối thủ trong popup
  const filteredVideos = useMemo(() => {
    if (!selectedCompetitorForStats || !selectedCompetitorForStats.latestVideos) return [];
    return selectedCompetitorForStats.latestVideos.filter(vid => 
      vid.title.toLowerCase().includes(videoSearchQuery.toLowerCase())
    );
  }, [selectedCompetitorForStats, videoSearchQuery]);

  // Phân trang danh sách video
  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVideos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVideos, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredVideos.length / itemsPerPage) || 1;
  }, [filteredVideos, itemsPerPage]);

  const toggleFavoriteVideo = (id) => {
    setFavoriteVideos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Xuất danh sách video của đối thủ ra file CSV
  const handleDownloadCSV = (comp) => {
    if (!comp.latestVideos || comp.latestVideos.length === 0) {
      toast.error("No videos available to download");
      return;
    }
    const headers = ["Title", "Published At", "Views", "Likes", "Comments"];
    const rows = comp.latestVideos.map(v => [
      `"${v.title.replace(/"/g, '""')}"`,
      new Date(v.publishedAt).toLocaleString(),
      v.views,
      v.likes,
      v.comments
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `competitor_${comp.competitorDisplayName.replace(/\s+/g, '_')}_videos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  if (!selectedCompetitorForStats) return null;

  return (
    <Dialog open={!!selectedCompetitorForStats} onOpenChange={() => setSelectedCompetitorForStats(null)}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background text-foreground">
        <DialogTitle className="sr-only">
          Competitor Stats - {selectedCompetitorForStats.competitorDisplayName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Detailed metrics, growth analytics and list of videos for competitor {selectedCompetitorForStats.competitorDisplayName}.
        </DialogDescription>
        {/* Modal Header */}
        <div className="px-8 py-5 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src={selectedCompetitorForStats.competitorAvatarUrl} 
              className="w-10 h-10 rounded-full border border-border object-cover" 
              referrerPolicy="no-referrer" 
            />
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {selectedCompetitorForStats.competitorDisplayName}
                <span className="bg-[#FF0000] text-[8px] text-white px-1.5 py-0.5 rounded font-black tracking-widest uppercase">YouTube</span>
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium">{selectedCompetitorForStats.competitorHandle}</span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* Higher Plan Upgrade Alert */}
          <div className="bg-[#FEFCE8] dark:bg-amber-950/30 border border-[#FEF08A] dark:border-amber-800/50 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="text-[#EAB308] shrink-0" size={20} />
              <div className="text-xs text-[#854D0E] dark:text-amber-200 font-medium">
                <span className="font-bold">Do you need a higher plan?</span> Upgrade your plan to learn more about your competitor's strategy.
              </div>
            </div>
            <div className="shrink-0">
              <button className="px-4 py-2 bg-foreground text-background rounded-xl text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer">
                Upgrade your plan
              </button>
            </div>
          </div>

          {/* Chart Growth analysis & Metricool Filters */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Community</h4>
                <h3 className="text-lg font-black text-foreground mt-0.5">Growth</h3>
              </div>
              
              {/* Metricool style interactive buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setShowSubscribers(!showSubscribers)}
                  className={`px-4 py-2 rounded-2xl flex flex-col items-start gap-0.5 transition-all border text-left cursor-pointer ${
                    showSubscribers 
                      ? 'bg-[#EEF2FF] dark:bg-indigo-950/40 border-[#C7D2FE] dark:border-indigo-800/60 text-[#4F46E5] dark:text-indigo-300 shadow-sm' 
                      : 'bg-card border-border text-muted-foreground opacity-60 hover:opacity-90'
                  }`}
                >
                  <span className="text-base font-black flex items-center gap-1.5">
                    {formatNumber(selectedCompetitorForStats.followersCount)} 
                    <span className="text-[10px] font-bold">↑</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Subscribers</span>
                </button>

                <button 
                  onClick={() => setShowViews(!showViews)}
                  className={`px-4 py-2 rounded-2xl flex flex-col items-start gap-0.5 transition-all border text-left cursor-pointer ${
                    showViews 
                      ? 'bg-[#ECFDF5] dark:bg-emerald-950/40 border-[#A7F3D0] dark:border-emerald-800/60 text-[#059669] dark:text-emerald-300 shadow-sm' 
                      : 'bg-card border-border text-muted-foreground opacity-60 hover:opacity-90'
                  }`}
                >
                  <span className="text-base font-black flex items-center gap-1.5">
                    {formatNumber(selectedCompetitorForStats.totalViews)} 
                    <span className="text-[10px] font-bold">↑</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Total views</span>
                </button>

                <button 
                  onClick={() => setShowVideos(!showVideos)}
                  className={`px-4 py-2 rounded-2xl flex flex-col items-start gap-0.5 transition-all border text-left cursor-pointer ${
                    showVideos 
                      ? 'bg-[#FFFBEB] dark:bg-amber-950/40 border-[#FDE68A] dark:border-amber-800/60 text-[#D97706] dark:text-amber-300 shadow-sm' 
                      : 'bg-card border-border text-muted-foreground opacity-60 hover:opacity-90'
                  }`}
                >
                  <span className="text-base font-black flex items-center gap-1.5">
                    {formatNumber(selectedCompetitorForStats.totalVideos)} 
                    <span className="text-[10px] font-bold">↑</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Videos</span>
                </button>
              </div>
            </div>

            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #F3F4F6)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--muted-foreground, #9CA3AF)' }} stroke="var(--border, #E5E7EB)" tickLine={false} />
                  
                  {/* Trục Y trái dành riêng cho Subscribers để tránh bị bẹp do chênh lệch scale */}
                  {showSubscribers && (
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 9, fill: '#4F46E5' }} 
                      stroke="#4F46E5" 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatAxisNumber(v)}
                    />
                  )}
                  
                  {/* Trục Y phải dành riêng cho Views */}
                  {showViews && (
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 9, fill: '#10B981' }} 
                      stroke="#10B981" 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatAxisNumber(v)}
                    />
                  )}

                  {/* Trục Y phụ độc lập dành riêng cho Videos để giữ tỉ lệ cột đẹp mắt, ẩn đi để không làm rối mắt */}
                  <YAxis 
                    yAxisId="videos"
                    orientation="left"
                    domain={[0, 6]} 
                    hide={true}
                  />

                  <Tooltip 
                    contentStyle={{ background: 'var(--card, #FFF)', border: '1px solid var(--border, #E5E7EB)', borderRadius: '16px', fontSize: '11px', color: 'var(--foreground, #000)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }} 
                    formatter={(value, name) => [value.toLocaleString(), name]}
                  />

                  {/* Vẽ cột Video (Bar) dạng cột mờ màu vàng cam nhạt ở đáy */}
                  {showVideos && (
                    <Bar 
                      yAxisId="videos"
                      name="Daily Videos" 
                      dataKey="DailyVideos" 
                      fill="#FDE68A" 
                      barSize={16} 
                      radius={[4, 4, 0, 0]} 
                    />
                  )}

                  {/* Vẽ đường Subscribers (Line) */}
                  {showSubscribers && (
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      name="Subscribers" 
                      dataKey="Subscribers" 
                      stroke="#4F46E5" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: '#4F46E5', strokeWidth: 1, stroke: '#FFF' }} 
                      activeDot={{ r: 6 }} 
                    />
                  )}

                  {/* Vẽ đường Views (Line) */}
                  {showViews && (
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      name="Views" 
                      dataKey="Views" 
                      stroke="#10B981" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: '#10B981', strokeWidth: 1, stroke: '#FFF' }} 
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Videos list in modal */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
              {/* Search video bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 text-muted-foreground" size={14} />
                <input 
                  type="text"
                  placeholder="Search"
                  value={videoSearchQuery}
                  onChange={(e) => {
                    setVideoSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-card border border-border rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:border-foreground outline-none transition-all text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border hover:border-border text-foreground rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer outline-none select-none">
                      <Columns size={14} /> Columns
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-4 w-72 bg-card rounded-2xl border border-border shadow-xl flex gap-4" align="end">
                    {/* Cột trái */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground font-bold">Date</span>
                        <button 
                          onClick={() => setVisibleColumns(prev => ({ ...prev, date: !prev.date }))}
                          className={`w-8 h-4 rounded-full relative transition-colors ${visibleColumns.date ? 'bg-indigo-600' : 'bg-muted'}`}
                        >
                          <span className={`w-3 h-3 rounded-full bg-background absolute top-0.5 transition-transform ${visibleColumns.date ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground font-bold">Video views</span>
                        <button 
                          onClick={() => setVisibleColumns(prev => ({ ...prev, views: !prev.views }))}
                          className={`w-8 h-4 rounded-full relative transition-colors ${visibleColumns.views ? 'bg-indigo-600' : 'bg-muted'}`}
                        >
                          <span className={`w-3 h-3 rounded-full bg-background absolute top-0.5 transition-transform ${visibleColumns.views ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground font-bold">Likes</span>
                        <button 
                          onClick={() => setVisibleColumns(prev => ({ ...prev, likes: !prev.likes }))}
                          className={`w-8 h-4 rounded-full relative transition-colors ${visibleColumns.likes ? 'bg-indigo-600' : 'bg-muted'}`}
                        >
                          <span className={`w-3 h-3 rounded-full bg-background absolute top-0.5 transition-transform ${visibleColumns.likes ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Đường phân tách dọc */}
                    <div className="border-r border-border" />
                    
                    {/* Cột phải */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground font-bold">Dislikes</span>
                        <button 
                          onClick={() => setVisibleColumns(prev => ({ ...prev, dislikes: !prev.dislikes }))}
                          className={`w-8 h-4 rounded-full relative transition-colors ${visibleColumns.dislikes ? 'bg-indigo-600' : 'bg-muted'}`}
                        >
                          <span className={`w-3 h-3 rounded-full bg-background absolute top-0.5 transition-transform ${visibleColumns.dislikes ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground font-bold">Comments</span>
                        <button 
                          onClick={() => setVisibleColumns(prev => ({ ...prev, comments: !prev.comments }))}
                          className={`w-8 h-4 rounded-full relative transition-colors ${visibleColumns.comments ? 'bg-indigo-600' : 'bg-muted'}`}
                        >
                          <span className={`w-3 h-3 rounded-full bg-background absolute top-0.5 transition-transform ${visibleColumns.comments ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button 
                  onClick={() => handleDownloadCSV(selectedCompetitorForStats)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#FEF9C3] dark:bg-amber-950/40 hover:bg-[#FEF08A] text-[#854D0E] dark:text-amber-300 border border-[#FEF08A] dark:border-amber-800/60 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>
            </div>

            {/* Videos Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Title</th>
                    {visibleColumns.date && <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>}
                    {visibleColumns.views && <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Video views</th>}
                    {visibleColumns.likes && <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Likes</th>}
                    {visibleColumns.dislikes && <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dislikes</th>}
                    {visibleColumns.comments && <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Comments</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedVideos.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={1 + Object.values(visibleColumns).filter(Boolean).length} 
                        className="py-8 text-center text-muted-foreground text-xs"
                      >
                        No videos found.
                      </td>
                    </tr>
                  ) : paginatedVideos.map((vid, index) => (
                    <tr key={index} className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 max-w-xs">
                        <div className="flex gap-3">
                          <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0 border border-border relative bg-muted shadow-sm">
                            <img 
                              src={vid.thumbnailUrl} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                          <div className="min-w-0 flex flex-col justify-between py-0.5">
                            <h5 className="text-[11px] font-bold text-foreground line-clamp-1 leading-snug" title={vid.title}>
                              {vid.title}
                            </h5>
                            <div className="flex items-center gap-2 mt-1">
                              <button 
                                onClick={() => toggleFavoriteVideo(vid.id)}
                                className="cursor-pointer"
                              >
                                <Star 
                                  size={12} 
                                  className={favoriteVideos[vid.id] ? "fill-yellow-400 stroke-yellow-400" : "text-muted-foreground hover:text-yellow-400"} 
                                />
                              </button>
                              <button 
                                onClick={() => window.open(`https://www.youtube.com/watch?v=${vid.id}`, '_blank')}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      {visibleColumns.date && (
                        <td className="py-4 text-xs font-bold text-foreground">
                          {new Date(vid.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <div className="text-[9px] text-muted-foreground font-medium mt-0.5">
                            {new Date(vid.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                      )}
                      {visibleColumns.views && <td className="py-4 text-xs font-black text-foreground">{formatNumber(vid.views)}</td>}
                      {visibleColumns.likes && <td className="py-4 text-xs font-bold text-foreground">{vid.likes ? formatNumber(vid.likes) : '-'}</td>}
                      {visibleColumns.dislikes && <td className="py-4 text-xs font-medium text-muted-foreground">-</td>}
                      {visibleColumns.comments && <td className="py-4 text-xs font-bold text-foreground">{vid.comments ? formatNumber(vid.comments) : '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-end gap-6 pt-4 border-t border-border text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <span>Items per page:</span>
                <div className="relative">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-card border border-border rounded-xl px-2 py-1 outline-none text-xs font-bold text-foreground cursor-pointer"
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                {filteredVideos.length > 0 ? (
                  <span>
                    {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredVideos.length)} of {filteredVideos.length}
                  </span>
                ) : (
                  <span>0-0 of 0</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
