import React, { useState, useEffect } from 'react';
import { 
  X, BarChart2, Users, Image as ImageIcon, Globe, Search, 
  MessageSquare, Heart, RefreshCw, Eye, ShieldAlert, Award
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, 
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { toast } from 'sonner';
import apiService from '../../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

export function HashtagAnalysisModal({ trackerId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // States for Word Cloud search
  const [wordSearch, setWordSearch] = useState('');
  
  // States for Top Pictures sorting
  const [pictureOrderBy, setPictureOrderBy] = useState('impressions'); // impressions, likes, reposts, followers

  // Fetch analysis data from API
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const res = await apiService.get(`/hashtags/analysis/${trackerId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        toast.error('Không thể tải dữ liệu phân tích chi tiết.');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    if (trackerId) {
      fetchAnalysis();
    }
  }, [trackerId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-10 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-t-transparent border-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-bold text-gray-700 animate-pulse">Đang phân tích hashtag dữ liệu lớn...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Format numbers (e.g. 1500000 -> 1.5M)
  const formatNum = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
  };

  // Filter used tags for Word Cloud search
  const filteredTags = data.usedTags.filter(t => 
    t.text.toLowerCase().includes(wordSearch.toLowerCase().trim())
  );

  // Sort top pictures based on active ordering option
  const sortedPictures = [...data.topPictures].sort((a, b) => b[pictureOrderBy] - a[pictureOrderBy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-7xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-[#E1306C] border border-pink-100 shadow-sm font-black text-lg">
              #
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">{data.hashtag}</h2>
                <span className="px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                  {data.platform} Tracker
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">
                Last updated: {data.lastFetchedAt ? new Date(data.lastFetchedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:shadow-md transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-8 bg-white border-b border-gray-150 flex gap-8">
          {[
            { id: 'overview', label: 'TỔNG QUAN & EVOLUTION', icon: <BarChart2 size={13} /> },
            { id: 'demographics', label: 'NHÂN KHẨU HỌC & PHÂN BỐ', icon: <Globe size={13} /> },
            { id: 'media', label: 'MEDIA & HASHTAGS', icon: <ImageIcon size={13} /> },
            { id: 'toplists', label: 'BẢNG XẾP HẠNG (TOP 100)', icon: <Users size={13} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="py-4 text-[11px] font-black tracking-widest transition-all relative flex items-center gap-2"
              style={{ color: activeTab === tab.id ? '#0F172A' : '#94A3B8' }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-900 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'POSTS', val: data.summary.posts, icon: <ImageIcon size={18} className="text-blue-500" />, desc: 'Tổng số bài viết đăng' },
                  { label: 'PARTICIPANTS', val: data.summary.participants, icon: <Users size={18} className="text-emerald-500" />, desc: 'Người dùng tham gia' },
                  { label: 'PICTURES', val: data.summary.pictures, icon: <ImageIcon size={18} className="text-amber-500" />, desc: 'Hình ảnh đính kèm' },
                  { label: 'IMPRESSIONS', val: data.summary.impressions, icon: <Eye size={18} className="text-rose-500" />, desc: 'Tổng lượt tiếp cận' }
                ].map(c => (
                  <div key={c.label} className="bg-white rounded-2xl p-5 border border-gray-150 shadow-xs hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.label}</span>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">{c.icon}</div>
                    </div>
                    <div className="text-2xl font-black text-gray-900">{formatNum(c.val)}</div>
                    <span className="text-[10px] text-gray-400 font-semibold mt-1 block">{c.desc}</span>
                  </div>
                ))}
              </div>

              {/* Evolution Chart */}
              <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-xs">
                <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase mb-5">Hashtag Evolution (Hourly)</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      <Line type="monotone" dataKey="posts" stroke="#3B82F6" strokeWidth={2.5} activeDot={{ r: 6 }} name="Posts" />
                      <Line type="monotone" dataKey="participants" stroke="#10B981" strokeWidth={2.5} name="Participants" />
                      <Line type="monotone" dataKey="pictures" stroke="#F59E0B" strokeWidth={2.5} name="Pictures" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Averages Section */}
              <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-xs">
                <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase mb-5">Average Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {[
                    { label: 'POSTS / HOUR', val: data.summary.averages.postsPerHour },
                    { label: 'PICTURES / HOUR', val: data.summary.averages.picturesPerHour },
                    { label: 'IMPRESSIONS / HOUR', val: formatNum(data.summary.averages.impressionsPerHour) },
                    { label: 'POSTS / USER', val: data.summary.averages.postsPerParticipant },
                    { label: 'PICTURES / USER', val: data.summary.averages.picturesPerParticipant },
                    { label: 'IMPRESSIONS / USER', val: formatNum(data.summary.averages.impressionsPerParticipant) }
                  ].map(avg => (
                    <div key={avg.label} className="text-center p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{avg.label}</div>
                      <div className="text-lg font-black text-slate-800">{avg.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Demographics */}
          {activeTab === 'demographics' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Distribution Charts */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Languages Pie */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-xs flex flex-col justify-between h-[280px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">LANGUAGES</span>
                    <div className="flex-1 flex justify-center items-center">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={data.distributions.languages} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50}>
                            {data.distributions.languages.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 9 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center mt-2">
                      {data.distributions.languages.slice(0, 3).map((l, idx) => (
                        <div key={l.name} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[8px] font-bold text-gray-600 uppercase">{l.name} ({l.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sources Pie */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-xs flex flex-col justify-between h-[280px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">SOURCES</span>
                    <div className="flex-1 flex justify-center items-center">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={data.distributions.sources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50}>
                            {data.distributions.sources.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 9 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center mt-2">
                      {data.distributions.sources.slice(0, 3).map((s, idx) => (
                        <div key={s.name} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[8px] font-bold text-gray-600 uppercase">{s.name} ({s.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Post Types Pie */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-xs flex flex-col justify-between h-[280px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">POST TYPES</span>
                    <div className="flex-1 flex justify-center items-center">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={data.distributions.types} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50}>
                            {data.distributions.types.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 9 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center mt-2">
                      {data.distributions.types.map((t, idx) => (
                        <div key={t.name} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[8px] font-bold text-gray-600 uppercase">{t.name} ({t.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Country Heatmap Mockup Map */}
                <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-xs">
                  <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase mb-5">Geographic Heatmap (Mockup)</h3>
                  <div className="w-full h-[220px] bg-slate-100 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    {/* Mock map graphic style */}
                    <div className="text-gray-300 font-black text-6xl tracking-widest uppercase select-none opacity-30">WORLD MAP</div>
                    <div className="absolute inset-0 flex flex-wrap gap-4 p-8 pointer-events-none">
                      {data.countries.slice(0, 5).map((c, i) => (
                        <div 
                          key={c.countryCode} 
                          className="absolute w-6 h-6 rounded-full bg-blue-600/30 border border-blue-600 flex items-center justify-center text-[8px] font-extrabold text-blue-800"
                          style={{
                            top: `${30 + (i * 12) % 60}%`,
                            left: `${15 + (i * 18) % 70}%`
                          }}
                        >
                          {c.countryCode}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Countries Table */}
              <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden h-fit">
                <div className="p-5 border-b border-gray-150">
                  <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase">Participants Countries</h3>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-150">
                      <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Country</th>
                      <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Users</th>
                      <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.countries.map(c => (
                      <tr key={c.countryCode} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-3.5 bg-slate-200 border border-slate-300 rounded-sm text-[8px] font-black flex items-center justify-center text-slate-500 uppercase">{c.countryCode}</span>
                          {c.countryName}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{c.participants}</td>
                        <td className="px-5 py-3.5 text-xs font-black text-slate-900 text-right">{c.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Tab 3: Media & Tags */}
          {activeTab === 'media' && (
            <div className="space-y-8">
              
              {/* Word Cloud section */}
              <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase">Used tags</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Đám mây từ khóa các hashtag liên quan</p>
                  </div>
                  
                  {/* Search word form */}
                  <div className="flex items-center gap-2 max-w-sm w-full">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                      <input 
                        type="text"
                        placeholder="Word(s) to find..."
                        value={wordSearch}
                        onChange={(e) => setWordSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-250 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-slate-400 transition-all"
                      />
                    </div>
                    {wordSearch && (
                      <button 
                        onClick={() => setWordSearch('')}
                        className="px-3.5 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                      >
                        Clean
                      </button>
                    )}
                  </div>
                </div>

                {/* Word Cloud box */}
                <div className="min-h-[200px] border border-gray-100 rounded-2xl bg-slate-50/50 p-8 flex flex-wrap gap-x-6 gap-y-4 items-center justify-center relative">
                  {filteredTags.length === 0 ? (
                    <div className="text-xs text-gray-400 font-bold">Không tìm thấy từ khóa phù hợp.</div>
                  ) : (
                    filteredTags.map((t, idx) => {
                      // Kích thước font dựa trên value (tần suất)
                      let size = 'text-sm';
                      if (t.value >= 90) size = 'text-4xl md:text-5xl font-black text-slate-800 tracking-tight';
                      else if (t.value >= 40) size = 'text-2xl font-black text-blue-600/80';
                      else if (t.value >= 25) size = 'text-lg font-bold text-purple-600/70';
                      else if (t.value >= 15) size = 'text-sm font-semibold text-emerald-600/70';
                      else size = 'text-xs font-medium text-amber-600/70';

                      return (
                        <span 
                          key={t.text} 
                          className={`${size} cursor-pointer hover:scale-110 transition-transform select-none`}
                        >
                          {t.text}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Top Pictures Grid (TOP 25) */}
              <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase">Pictures (TOP 25)</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Lưới ảnh tương tác tốt nhất</p>
                  </div>

                  {/* Sắp xếp hình ảnh */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1.5">Order by:</span>
                    {[
                      { id: 'impressions', label: 'Impressions' },
                      { id: 'likes', label: 'Likes' },
                      { id: 'reposts', label: 'Reposts' },
                      { id: 'followers', label: 'Followers' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setPictureOrderBy(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${pictureOrderBy === opt.id ? 'bg-[#0F172A] text-white border-slate-900 shadow-sm' : 'bg-white text-gray-400 border-gray-150 hover:border-gray-250 cursor-pointer'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Picture Grid layout */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {sortedPictures.map((pic, idx) => (
                    <div key={pic.id} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-150 shadow-sm group bg-slate-100">
                      
                      {/* Rank badge */}
                      <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-md bg-black/75 flex items-center justify-center text-[9px] font-black text-white">
                        {idx + 1}
                      </div>

                      {/* Image tag */}
                      <img 
                        src={pic.url} 
                        alt={`Top picture ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Bottom Stat Badge */}
                      <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs flex items-center gap-1">
                        <Eye size={9} className="text-white fill-none" />
                        <span className="text-[8px] font-extrabold text-white">
                          {pictureOrderBy === 'impressions' && formatNum(pic.impressions)}
                          {pictureOrderBy === 'likes' && formatNum(pic.likes) + ' likes'}
                          {pictureOrderBy === 'reposts' && formatNum(pic.reposts) + ' reps'}
                          {pictureOrderBy === 'followers' && formatNum(pic.followers) + ' folls'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 4: Top Lists */}
          {activeTab === 'toplists' && (
            <div className="space-y-8">
              
              {/* Top Participants */}
              <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-150">
                  <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase">Top Participants (TOP 100)</h3>
                </div>
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 sticky top-0 z-10">
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rank</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Followers</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Posts</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Pictures</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Impressions</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Interactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topParticipants.map(user => (
                        <tr key={user.screenName} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 text-xs font-black text-gray-400">{user.rank}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-800">
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-[10px] text-blue-600 font-semibold">{user.screenName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{formatNum(user.followers)}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{user.posts}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{user.pictures}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-700 text-right">{formatNum(user.impressions)}</td>
                          <td className="px-5 py-3.5 text-xs font-black text-slate-900 text-right">{formatNum(user.interactions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Posts */}
              <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-150">
                  <h3 className="text-xs font-black text-gray-900 tracking-wider uppercase">Top Posts (TOP 100)</h3>
                </div>
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 sticky top-0 z-10">
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rank</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Author</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[200px]">Caption</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Reach</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Likes</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Reposts</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Replies</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topPosts.map(post => (
                        <tr key={post.rank} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 text-xs font-black text-gray-400">{post.rank}</td>
                          <td className="px-5 py-3.5 text-[10px] text-gray-400 font-semibold">{post.date}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-800">
                            <div className="flex flex-col">
                              <span>{post.authorName}</span>
                              <span className="text-[9px] text-gray-400">{post.authorHandle}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 truncate max-w-[200px]">{post.caption}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{formatNum(post.impressions)}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{post.likes}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{post.reposts}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 text-right">{post.replies}</td>
                          <td className="px-5 py-3.5 text-xs font-black text-slate-900 text-right">{post.engagement}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
