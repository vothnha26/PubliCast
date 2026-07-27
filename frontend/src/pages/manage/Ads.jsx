import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Plus, 
  DollarSign, 
  Eye, 
  MousePointerClick, 
  RefreshCw, 
  CheckCircle2, 
  X,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  AlertCircle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid
} from "recharts";
import { toast } from "sonner";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import apiService from "../../services/api";
import { useBrand } from "../../context/BrandContext";

export function AdsPage() {
  const { activeBrand } = useBrand();
  const [activePlatform, setActivePlatform] = useState("META_ADS"); // Matches schema PlatformType/Platform enum: META_ADS, GOOGLE_ADS, TIKTOK_ADS
  const [loading, setLoading] = useState(false);
  
  // Real DB States
  const [adAccounts, setAdAccounts] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignBudget, setNewCampaignBudget] = useState("100");

  // Account creation state
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState("META_ADS");
  const [newAccountCurrency, setNewAccountCurrency] = useState("USD");

  const loadData = async () => {
    if (!activeBrand?.id) return;
    setLoading(true);
    try {
      const res = await apiService.get(`/ad-accounts/performance?brandId=${activeBrand.id}`);
      setAdAccounts(res.data.adAccounts || []);
      
      const rawAnalytics = res.data.analytics || [];
      setAnalyticsData(rawAnalytics);
      
      // Parse campaigns from analytics data
      const campMap = {};
      rawAnalytics.forEach(item => {
        if (item.campaignId) {
          const acc = res.data.adAccounts.find(a => a.id === item.adAccountId);
          const platformType = acc ? acc.platform : 'META_ADS';
          
          if (!campMap[item.campaignId]) {
            campMap[item.campaignId] = {
              id: item.campaignId,
              name: item.campaignName,
              status: true,
              budget: 100, // mock base budget
              spent: 0,
              clicks: 0,
              impressions: 0,
              conversions: 0,
              platform: platformType
            };
          }
          campMap[item.campaignId].spent += parseFloat(item.totalSpend || 0);
          campMap[item.campaignId].clicks += parseInt(item.clicks || 0, 10);
          campMap[item.campaignId].impressions += parseInt(item.impressions || 0, 10);
          campMap[item.campaignId].conversions += parseInt(item.conversions || 0, 10);
        }
      });
      setCampaigns(Object.values(campMap));
    } catch (error) {
      toast.error("Không thể tải thông tin quảng cáo.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBrand?.id]);

  // Filter accounts/campaigns for the selected platform
  const currentAccounts = adAccounts.filter(acc => acc.platform === activePlatform);
  const currentCampaigns = campaigns.filter(c => c.platform === activePlatform);

  const totalSpend = currentCampaigns.reduce((acc, c) => acc + c.spent, 0);
  const totalImpressions = currentCampaigns.reduce((acc, c) => acc + c.impressions, 0);
  const totalClicks = currentCampaigns.reduce((acc, c) => acc + c.clicks, 0);
  const totalConversions = currentCampaigns.reduce((acc, c) => acc + c.conversions, 0);

  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const roiMultiplier = activePlatform === "TIKTOK_ADS" ? 3.4 : activePlatform === "GOOGLE_ADS" ? 4.2 : 3.8;
  const revenue = totalSpend * roiMultiplier;
  const roi = totalSpend > 0 ? ((revenue - totalSpend) / totalSpend) * 100 : 0;

  // Toggle Campaign Status
  const handleToggleStatus = async (campaignId) => {
    const target = campaigns.find(c => c.id === campaignId);
    if (!target) return;
    
    const nextStatus = !target.status;
    const account = currentAccounts[0]; // pick first active account for this platform
    if (!account) return;

    try {
      await apiService.post("/ad-accounts/campaigns/toggle", {
        adAccountId: account.id,
        campaignId: campaignId,
        status: nextStatus ? "ACTIVE" : "PAUSED"
      });
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, status: nextStatus } : c
      ));
      toast.success("Cập nhật trạng thái chiến dịch thành công!");
    } catch (error) {
      toast.error("Không thể cập nhật trạng thái chiến dịch.");
    }
  };

  // Edit Campaign Budget
  const handleBudgetChange = (campaignId, newBudget) => {
    const parsed = parseFloat(newBudget);
    if (isNaN(parsed) || parsed < 0) return;
    setCampaigns(prev => prev.map(c => 
      c.id === campaignId ? { ...c, budget: parsed } : c
    ));
  };

  // Connect Simulated Ad Account
  const handleConnectAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) {
      toast.error("Vui lòng điền tên tài khoản quảng cáo.");
      return;
    }
    try {
      await apiService.post("/ad-accounts/connect", {
        brandId: activeBrand.id,
        platform: newAccountPlatform,
        accountName: newAccountName,
        currency: newAccountCurrency
      });
      toast.success("Đã kết nối tài khoản quảng cáo thành công!");
      setIsCreateAccountOpen(false);
      setNewAccountName("");
      loadData();
    } catch (error) {
      toast.error("Không thể kết nối tài khoản.");
    }
  };

  // Create Campaign (Simulation)
  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!newCampaignName.trim()) {
      toast.error("Vui lòng nhập tên chiến dịch");
      return;
    }

    const newCamp = {
      id: `camp_${Date.now()}`,
      name: newCampaignName,
      status: true,
      budget: parseFloat(newCampaignBudget) || 100,
      spent: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      platform: activePlatform
    };

    setCampaigns(prev => [newCamp, ...prev]);
    toast.success(`Đã khởi tạo chiến dịch "${newCampaignName}" thành công!`);
    setIsModalOpen(false);
    setNewCampaignName("");
    setNewCampaignBudget("100");
  };

  // Chart data formatting
  const chartData = analyticsData
    .filter(item => {
      const acc = adAccounts.find(a => a.id === item.adAccountId);
      return acc && acc.platform === activePlatform;
    })
    .map(item => ({
      date: new Date(item.dateFrom).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      spend: item.totalSpend || 0,
      conversions: item.conversions || 0
    }));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#F8F9FA] p-6 space-y-6">
      
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1F36] flex items-center gap-2">
            <Sparkles className="text-[#FFB800] w-6 h-6 animate-pulse" />
            Ad Accounts Performance
          </h1>
          <p className="text-sm text-[#8792A2] mt-0.5">
            Quản lý chiến dịch, theo dõi ngân sách và tối ưu hóa chuyển đổi đa nền tảng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCreateAccountOpen(true)}
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-slate-50 text-[#1A1F36] text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-300 transform active:scale-95 shrink-0"
          >
            <Layers size={14} />
            Kết nối tài khoản Ads
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#0A0A0A] hover:bg-[#222] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 transform active:scale-95 shrink-0"
          >
            <Plus size={14} />
            Tạo chiến dịch mới
          </button>
        </div>
      </div>

      {/* Platform Switcher */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-[#E5E7EB] self-start">
        {[
          { key: "META_ADS", label: "Facebook Ads", icon: "Facebook" },
          { key: "GOOGLE_ADS", label: "Google Ads", icon: "Google" },
          { key: "TIKTOK_ADS", label: "TikTok Ads", icon: "TikTok" }
        ].map((plat) => (
          <button
            key={plat.key}
            onClick={() => setActivePlatform(plat.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activePlatform === plat.key 
                ? "bg-[#0A0A0A] text-white shadow-md scale-[1.02]" 
                : "text-[#4F5B66] hover:bg-[#F3F4F6]"
            }`}
          >
            <PlatformIcon platform={plat.icon} size={16} />
            {plat.label}
          </button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card: Total Spend */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#8792A2] uppercase tracking-wider">Tổng chi tiêu</span>
              <span className="p-2 bg-[#F3F4F6] rounded-xl text-[#0A0A0A]">
                <DollarSign size={16} />
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1F36] mt-2">${totalSpend.toLocaleString()}</h3>
            <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp size={12} /> +12.4% vs tháng trước
            </span>
          </div>
          <div className="h-10 mt-4 -mx-5 -mb-5 opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [{ spend: 0 }, { spend: 50 }, { spend: 100 }]}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="spend" stroke="#10B981" strokeWidth={1.5} fill="url(#spendGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card: Impressions */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#8792A2] uppercase tracking-wider">Lượt hiển thị</span>
              <span className="p-2 bg-[#F3F4F6] rounded-xl text-[#0A0A0A]">
                <Eye size={16} />
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1F36] mt-2">{totalImpressions.toLocaleString()}</h3>
            <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp size={12} /> +8.2% vs tháng trước
            </span>
          </div>
          <div className="h-10 mt-4 -mx-5 -mb-5 opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [{ spend: 0 }, { spend: 50 }, { spend: 100 }]}>
                <defs>
                  <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="spend" stroke="#3B82F6" strokeWidth={1.5} fill="url(#impGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card: Average CPC */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#8792A2] uppercase tracking-wider">Avg CPC</span>
              <span className="p-2 bg-[#F3F4F6] rounded-xl text-[#0A0A0A]">
                <MousePointerClick size={16} />
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1F36] mt-2">${avgCPC.toFixed(2)}</h3>
            <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5 mt-1">
              -4.3% so với tuần trước
            </span>
          </div>
          <div className="h-10 mt-4 -mx-5 -mb-5 opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData.map(d => ({ value: 1000 - d.spend })) : [{ value: 400 }, { value: 600 }]}>
                <defs>
                  <linearGradient id="cpcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={1.5} fill="url(#cpcGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card: ROI */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#8792A2] uppercase tracking-wider font-mono">ROI ước tính</span>
              <span className="p-2 bg-[#F3F4F6] rounded-xl text-[#0A0A0A]">
                <TrendingUp size={16} />
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1F36] mt-2">{roi.toFixed(0)}%</h3>
            <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5 mt-1">
              Doanh thu: ${(revenue).toLocaleString()}
            </span>
          </div>
          <div className="h-10 mt-4 -mx-5 -mb-5 opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData.map(d => ({ value: d.conversions * 10 })) : [{ value: 200 }, { value: 500 }]}>
                <defs>
                  <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={1.5} fill="url(#roiGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-20 text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin" />
          Đang tải dữ liệu chiến dịch quảng cáo...
        </div>
      ) : currentAccounts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle size={32} className="text-gray-300 mb-3" />
          <h4 className="text-sm font-bold text-gray-800">Chưa kết nối tài khoản quảng cáo</h4>
          <p className="text-xs text-gray-400 max-w-sm mt-1 mb-6">
            Vui lòng nhấn nút "Kết nối tài khoản Ads" phía trên để đồng bộ hóa và tối ưu hóa các chuyển đổi chiến dịch.
          </p>
          <button 
            onClick={() => setIsCreateAccountOpen(true)}
            className="px-5 py-2.5 bg-black text-white text-xs font-bold rounded-xl shadow-md hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Kết nối ngay
          </button>
        </div>
      ) : (
        /* Center Layout: Campaigns list + Conversion Funnel */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Campaigns Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#E5E7EB] flex justify-between items-center">
              <div>
                <h4 className="text-base font-bold text-[#1A1F36]">Chi tiết các chiến dịch</h4>
                <p className="text-xs text-[#8792A2] mt-0.5">Danh sách các nhóm quảng cáo hoạt động</p>
              </div>
              <span className="text-xs text-[#0A0A0A] font-bold bg-[#F3F4F6] px-2.5 py-1 rounded-lg">
                {currentCampaigns.length} Chiến dịch
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB]">
                    <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">Trạng thái</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">Chiến dịch</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">Ngân sách/ngày</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">Chi tiêu</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">Click/CTR</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-[#8792A2] uppercase tracking-wider">Chuyển đổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {currentCampaigns.map((c) => {
                    const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* Active switch */}
                        <td className="py-4 px-6">
                          <button 
                            onClick={() => handleToggleStatus(c.id)}
                            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                              c.status ? "bg-[#10B981]" : "bg-[#D1D5DB]"
                            }`}
                          >
                            <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                              c.status ? "translate-x-4.5" : "translate-x-0"
                            }`} />
                          </button>
                        </td>

                        {/* Campaign Name */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-sm text-[#1A1F36] max-w-[200px] truncate" title={c.name}>
                            {c.name}
                          </div>
                          <div className="text-xs text-[#8792A2] font-mono mt-0.5">{c.id}</div>
                        </td>

                        {/* Daily Budget (Editable) */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#E5E7EB] w-24">
                            <span className="text-xs text-[#4F5B66] font-semibold">$</span>
                            <input
                              type="number"
                              value={c.budget}
                              onChange={(e) => handleBudgetChange(c.id, e.target.value)}
                              className="bg-transparent text-xs font-bold text-[#1A1F36] outline-none w-full border-none p-0"
                            />
                          </div>
                        </td>

                        {/* Spent */}
                        <td className="py-4 px-6 text-sm font-semibold text-[#1A1F36]">
                          ${c.spent.toLocaleString()}
                        </td>

                        {/* Clicks & CTR */}
                        <td className="py-4 px-6">
                          <div className="text-sm font-semibold text-[#1A1F36]">{c.clicks.toLocaleString()}</div>
                          <div className="text-xs text-[#8792A2] font-medium">{ctr.toFixed(2)}% CTR</div>
                        </td>

                        {/* Conversions */}
                        <td className="py-4 px-6 text-sm font-semibold text-[#1A1F36]">
                          {c.conversions.toLocaleString()}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Funnel & Performance Graph */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-[#1A1F36] flex items-center gap-2">
                <BarChart3 size={18} className="text-[#3B82F6]" />
                Phễu chuyển đổi (Funnel)
              </h4>
              <p className="text-xs text-[#8792A2] mt-0.5">Tỷ lệ tương tác qua từng giai đoạn khách hàng</p>
            </div>

            <div className="space-y-5 my-6">
              
              {/* Step 1: Impressions */}
              <div>
                <div className="flex justify-between text-xs font-bold text-[#4F5B66] mb-1.5">
                  <span>1. Tiếp cận (Impressions)</span>
                  <span>100%</span>
                </div>
                <div className="w-full h-8 bg-slate-100 rounded-lg overflow-hidden relative flex items-center px-3 border border-[#E5E7EB]">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 w-full opacity-80" />
                  <span className="relative text-white font-mono text-xs font-black z-10">{totalImpressions.toLocaleString()}</span>
                </div>
              </div>

              {/* Step 2: Clicks */}
              <div>
                <div className="flex justify-between text-xs font-bold text-[#4F5B66] mb-1.5">
                  <span>2. Tương tác (Clicks)</span>
                  <span>{avgCTR.toFixed(2)}% tỷ lệ click (CTR)</span>
                </div>
                <div className="w-full h-8 bg-slate-100 rounded-lg overflow-hidden relative flex items-center px-3 border border-[#E5E7EB]">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80 transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(10, avgCTR * 8))}%` }}
                  />
                  <span className="relative text-[#1A1F36] group-hover:text-white font-mono text-xs font-black z-10">
                    {totalClicks.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Step 3: Conversions */}
              <div>
                <div className="flex justify-between text-xs font-bold text-[#4F5B66] mb-1.5">
                  <span>3. Chuyển đổi (Conversions)</span>
                  <span>{totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0}% tỷ lệ mua</span>
                </div>
                <div className="w-full h-8 bg-slate-100 rounded-lg overflow-hidden relative flex items-center px-3 border border-[#E5E7EB]">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-80 transition-all duration-500" 
                    style={{ width: `${totalClicks > 0 ? Math.min(100, Math.max(5, (totalConversions / totalClicks) * 150)) : 5}%` }}
                  />
                  <span className="relative text-[#1A1F36] font-mono text-xs font-black z-10">{totalConversions.toLocaleString()}</span>
                </div>
              </div>

            </div>

            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-[#E5E7EB] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8792A2] font-semibold">Giá mỗi Click (CPA):</span>
                <span className="text-[#1A1F36] font-bold">${avgCPA.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8792A2] font-semibold">Tỷ lệ chuyển đổi chung:</span>
                <span className="text-[#1A1F36] font-bold">
                  {totalImpressions > 0 ? ((totalConversions / totalImpressions) * 100).toFixed(3) : 0}%
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Modal: Connect Ad Account */}
      {isCreateAccountOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-[#E5E7EB]">
            <button 
              onClick={() => setIsCreateAccountOpen(false)}
              className="absolute top-4 right-4 text-[#8792A2] hover:text-[#0a0a0a] cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-[#1A1F36] flex items-center gap-2 mb-4">
              <Layers className="text-blue-500" size={20} />
              Kết nối tài khoản quảng cáo
            </h3>

            <form onSubmit={handleConnectAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4F5B66] uppercase mb-1.5">Tên tài khoản</label>
                <input
                  type="text"
                  placeholder="e.g. Meta Ads Business"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1F36] focus:border-[#0A0A0A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4F5B66] uppercase mb-1.5">Nền tảng</label>
                <select
                  value={newAccountPlatform}
                  onChange={(e) => setNewAccountPlatform(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1F36] focus:border-[#0A0A0A] bg-white outline-none"
                >
                  <option value="META_ADS">Facebook Ads</option>
                  <option value="GOOGLE_ADS">Google Ads</option>
                  <option value="TIKTOK_ADS">TikTok Ads</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4F5B66] uppercase mb-1.5">Loại tiền tệ</label>
                <select
                  value={newAccountCurrency}
                  onChange={(e) => setNewAccountCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1F36] focus:border-[#0A0A0A] bg-white outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="VND">VND (đ)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAccountOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E5E7EB] hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-black hover:bg-gray-800 text-white"
                >
                  Kết nối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Campaign */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-[#E5E7EB]">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#8792A2] hover:text-[#0a0a0a] cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-[#1A1F36] flex items-center gap-2 mb-4">
              <PlatformIcon platform={activePlatform === "META_ADS" ? "Facebook" : activePlatform === "GOOGLE_ADS" ? "Google" : "TikTok"} size={20} />
              Tạo chiến dịch {activePlatform === "META_ADS" ? "Facebook" : activePlatform === "GOOGLE_ADS" ? "Google" : "TikTok"} Ads
            </h3>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4F5B66] uppercase mb-1.5">Tên chiến dịch</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Campaign Tet Holiday 2026"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1F36] focus:border-[#0A0A0A] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4F5B66] uppercase mb-1.5">Ngân sách hàng ngày ($)</label>
                <input
                  type="number"
                  min="5"
                  value={newCampaignBudget}
                  onChange={(e) => setNewCampaignBudget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1F36] focus:border-[#0A0A0A] outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E5E7EB] hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#0A0A0A] hover:bg-[#222] text-white transition-colors"
                >
                  Kích hoạt ngay
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
