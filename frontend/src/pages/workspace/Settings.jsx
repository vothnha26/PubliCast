import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { 
  User, Shield, CreditCard, Globe, 
  Mail, Lock, Smartphone, ExternalLink,
  MessageCircle, Send, Paperclip, CheckCircle2, Search,
  AlertTriangle, Loader2, Plus, FileText, ChevronRight,
  Sun, Moon
} from "lucide-react";
import profileService from "../../services/profile.service";
import apiService from "../../services/api";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { useBrand } from "../../context/BrandContext";
import socketClient from "../../services/socket";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { LANGUAGES } from "../../constants/language";

export function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { activeBrand } = useBrand();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState("account");

  // State for form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [receiveSummary, setReceiveSummary] = useState(true);
  const [customSummaryEmail, setCustomSummaryEmail] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Billing States
  const [currentPlan, setCurrentPlan] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingBilling, setLoadingBilling] = useState(false);

  // Support History Tickets State (Closed tickets)
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Real Active Support Chat State (Connected to backend sockets)
  const [activeSupportTicket, setActiveSupportTicket] = useState(null);
  const [activeSupportMessages, setActiveSupportMessages] = useState([]);
  const [activeSupportInput, setActiveSupportInput] = useState("");
  const activeMessagesEndRef = useRef(null);

  // Auto-scroll active messages to bottom
  useEffect(() => {
    activeMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSupportMessages]);

  // Handle tab switching from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    
    if (tabParam === "support") setActiveTab("support");
    else if (tabParam === "access") setActiveTab("access");
    else if (tabParam === "billing") setActiveTab("billing");
    else setActiveTab("account");
  }, [location.search]);

  // Fetch support tickets (History)
  const fetchSupportHistory = async () => {
    if (!activeBrand) return;
    setLoadingTickets(true);
    try {
      const res = await apiService.get(`/tickets?brandId=${activeBrand.id}`);
      setTickets(res.data.data || []);
    } catch (err) {
      console.error("Error fetching support history:", err);
      toast.error("Không thể tải lịch sử hỗ trợ");
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch current active support session
  const fetchActiveSession = async () => {
    if (!activeBrand) return;
    try {
      const res = await apiService.get(`/tickets/active?brandId=${activeBrand.id}`);
      const activeTicket = res.data.data;
      if (activeTicket) {
        setActiveSupportTicket(activeTicket);
        
        // Map messages to view format
        const formatted = (activeTicket.messages || []).map(m => ({
          id: m.id,
          role: (m.sender?.role === 'STAFF' || m.sender?.role === 'ADMIN') ? "agent" : "user",
          text: m.content,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        if (!activeTicket.assignedAgentId && formatted.length > 0) {
          formatted.push({
            role: "system",
            text: "Hệ thống: Vui lòng đợi trong giây lát, nhân viên hỗ trợ đang được kết nối...",
            time: ""
          });
        }
        setActiveSupportMessages(formatted);
      } else {
        setActiveSupportTicket(null);
        setActiveSupportMessages([
          { role: "agent", text: "Chào bạn! 👋 Mình có thể hỗ trợ gì cho bạn hôm nay? Gửi tin nhắn để bắt đầu phiên hỗ trợ mới nhé.", time: "" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching active chat session in settings:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "support" && activeBrand) {
      fetchSupportHistory();
      fetchActiveSession();
    }
  }, [activeTab, activeBrand]);

  useEffect(() => {
    if (activeTab === "billing" && activeBrand?.id) {
      setLoadingBilling(true);
      Promise.all([
        apiService.get(`/billing/subscriptions/current?brandId=${activeBrand.id}`),
        apiService.get(`/billing/subscriptions/history?brandId=${activeBrand.id}`)
      ])
        .then(([currentRes, historyRes]) => {
          setCurrentPlan(currentRes.data.data);
          setPaymentHistory(historyRes.data.data || []);
        })
        .catch(console.error)
        .finally(() => setLoadingBilling(false));
    }
  }, [activeTab, activeBrand?.id]);

  // Real-time socket event subscription for active support ticket
  useEffect(() => {
    if (activeTab === "support" && activeSupportTicket) {
      socketClient.emit('join_room', { ticketId: activeSupportTicket.id });

      const handleNewMessage = (msg) => {
        if (msg.ticketId === activeSupportTicket.id) {
          setActiveSupportMessages(prev => {
            if (prev.some(p => p.id === msg.id)) return prev;

            if (msg.sender === 'user') {
              const tempIndex = prev.findIndex(p => p.id && String(p.id).startsWith('temp-'));
              if (tempIndex !== -1) {
                const updated = [...prev];
                updated[tempIndex] = {
                  id: msg.id,
                  role: 'user',
                  text: msg.text,
                  time: msg.time,
                };
                return updated;
              }
            }

            const updatedList = [...prev, {
              id: msg.id,
              role: msg.sender === 'user' ? 'user' : 'agent',
              text: msg.text,
              time: msg.time,
            }];

            if (msg.sender === 'staff') {
              return updatedList.filter(m => m.role !== 'system');
            }
            return updatedList;
          });
        }
      };

      const handleStatusUpdated = (payload) => {
        if (payload.ticketId === activeSupportTicket.id && payload.status === 'RESOLVED') {
          toast.info("Phiên hỗ trợ này đã được đóng.");
          setActiveSupportTicket(null);
          setActiveSupportMessages([
            { role: "agent", text: "Phiên chat đã kết thúc. Bạn có thể xem lại lịch sử hỗ trợ trong Cài đặt.", time: "" }
          ]);
          fetchSupportHistory();
        }
      };

      const handleTicketAssigned = (payload) => {
        if (payload.ticketId === activeSupportTicket.id) {
          setActiveSupportTicket(prev => prev && prev.id === payload.ticketId ? {
            ...prev,
            assignedAgentId: payload.assignedAgent.id,
            assignedAgent: payload.assignedAgent
          } : prev);

          setActiveSupportMessages(prev => {
            const filtered = prev.filter(m => m.role !== 'system');
            return [
              ...filtered,
              {
                role: "system",
                text: `Hệ thống: Nhân viên ${payload.assignedAgent.name} đã kết nối vào cuộc trò chuyện.`,
                time: ""
              }
            ];
          });
          toast.success(`Nhân viên ${payload.assignedAgent.name} đã nhận hỗ trợ phiên chat của bạn.`);
        }
      };

      socketClient.on('new_message', handleNewMessage);
      socketClient.on('ticket_status_updated', handleStatusUpdated);
      socketClient.on('ticket_assigned', handleTicketAssigned);

      return () => {
        socketClient.emit('leave_room', { ticketId: activeSupportTicket.id });
        socketClient.off('new_message', handleNewMessage);
        socketClient.off('ticket_status_updated', handleStatusUpdated);
        socketClient.off('ticket_assigned', handleTicketAssigned);
      };
    }
  }, [activeTab, activeSupportTicket]);

  const handleSendSupportMessage = async () => {
    if (!activeSupportInput.trim()) return;
    if (!activeBrand) return;

    let currentTicket = activeSupportTicket;
    const originalText = activeSupportInput;

    try {
      if (!currentTicket) {
        const res = await apiService.post('/tickets', {
          brandId: activeBrand.id,
          subject: originalText.substring(0, 40) || 'Hỗ trợ khách hàng'
        });
        currentTicket = res.data.data;
        setActiveSupportTicket(currentTicket);
        setActiveSupportMessages([]);
        socketClient.emit('join_room', { ticketId: currentTicket.id });
      }

      setActiveSupportMessages(prev => {
        const updated = [...prev, {
          id: 'temp-' + Date.now(),
          role: "user",
          text: originalText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }];

        if (!currentTicket.assignedAgentId) {
          const filtered = updated.filter(m => m.role !== 'system');
          filtered.push({
            role: "system",
            text: "Hệ thống: Vui lòng đợi trong giây lát, nhân viên hỗ trợ đang được kết nối...",
            time: ""
          });
          return filtered;
        }
        return updated;
      });

      const payload = {
        ticketId: currentTicket.id,
        messageType: 'TEXT',
        content: originalText,
      };

      socketClient.emit('send_message', payload);
      setActiveSupportInput("");
    } catch (err) {
      console.error("Failed to send support message from Settings:", err);
      toast.error("Không thể gửi tin nhắn hỗ trợ");
    }
  };

  const loadTicketMessages = async (ticket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const res = await apiService.get(`/tickets/${ticket.id}`);
      setTicketMessages(res.data.data?.messages || []);
    } catch (err) {
      console.error("Error fetching ticket messages:", err);
      toast.error("Không thể tải nội dung phiên chat");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCancelPayment = async (transactionCode) => {
    const isConfirmed = window.confirm("Bạn có chắc chắn muốn hủy yêu cầu thanh toán này không?");
    if (!isConfirmed) return;

    try {
      await apiService.post('/billing/subscriptions/cancel', { transactionCode });
      toast.success("Hủy yêu cầu thanh toán thành công!");
      if (activeBrand?.id) {
        setLoadingBilling(true);
        const historyRes = await apiService.get(`/billing/subscriptions/history?brandId=${activeBrand.id}`);
        setPaymentHistory(historyRes.data.data || []);
        setLoadingBilling(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Không thể hủy yêu cầu thanh toán.");
    }
  };

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await profileService.getUserProfile();
        if (res && res.data) {
          const userData = res.data;
          setFullName(userData.fullName || "");
          setEmail(userData.email || "");
          setAccounts(userData.accounts || []);
        }
      } catch (err) {
        toast.error("Không thể lấy thông tin profile");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Handle URL query parameters (e.g. google link callback redirection)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success") === "google_linked") {
      toast.success("Liên kết tài khoản Google thành công!");
      navigate("/settings?tab=access", { replace: true });
    }
  }, [location.search, navigate]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Tên không được để trống");
      return;
    }
    
    if (receiveSummary && customSummaryEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customSummaryEmail)) {
        toast.error("Email không đúng định dạng");
        return;
      }
    }

    setIsSaving(true);
    try {
      await profileService.editProfile({ fullName });
      toast.success("Cập nhật thành công!");
    } catch (err) {
      toast.error(err.message || "Cập nhật thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      const res = await apiService.get("/auth/google?state=settings");
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Không thể lấy URL liên kết tài khoản Google");
      }
    } catch (err) {
      toast.error(err.message || "Đã xảy ra lỗi khi liên kết Google");
    }
  };

  const handleUnlink = async (provider) => {
    const isConfirmed = await confirm({
      title: "Hủy liên kết tài khoản?",
      description: `Bạn có chắc chắn muốn hủy liên kết tài khoản ${provider}?`,
      confirmText: "Hủy liên kết",
      cancelText: "Hủy",
      variant: "destructive"
    });
    if (!isConfirmed) return;
    try {
      await apiService.delete(`/profile/accounts/${provider.toLowerCase()}`);
      toast.success(`Hủy liên kết tài khoản ${provider} thành công!`);
      // Refresh profile info
      const res = await profileService.getUserProfile();
      if (res && res.data) {
        setAccounts(res.data.accounts || []);
      }
    } catch (err) {
      toast.error(err.message || "Hủy liên kết thất bại");
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast.error("Vui lòng nhập mật khẩu mới!");
      return;
    }
    // [BUG INJECTED] Removed password length validation check
    // if (newPassword.length < 6) { ... }

    setIsUpdatingPassword(true);
    try {
      await apiService.put("/profile/change-password", {
        currentPassword,
        newPassword
      });
      toast.success("Cập nhật mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.message || "Không thể cập nhật mật khẩu");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F8F7] p-8 font-sans">
      {/* Top horizontal navigation instead of a vertical sidebar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-lg font-extrabold text-[#0A0A0A] tracking-tight pl-2">Cài đặt hệ thống</h1>
        
        <div className="flex flex-wrap gap-1 bg-gray-55/60 p-1 rounded-xl">
          {[
            { id: "account", label: "Hồ sơ cá nhân", icon: User },
            { id: "access", label: "Bảo mật & Đăng nhập", icon: Shield },
            { id: "support", label: "Hỗ trợ (Chat)", icon: MessageCircle },
            { id: "billing", label: "Cổng thanh toán", icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedTicket(null);
                  navigate(`/settings?tab=${tab.id}`, { replace: true });
                }}
                data-testid={`settings-tab-${tab.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isTabActive 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 overflow-y-auto bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        {activeTab === "account" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <User size={18} className="text-gray-400" />
                 <h2 className="text-lg font-bold text-[#0A0A0A]">Personal profile</h2>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                 Manage your public profile settings and customize how summary metrics are received.
              </p>
            </div>

            <section className="space-y-6 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    data-testid="profile-fullname-input"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</label>
                  <input value={email} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-450 text-sm font-medium" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 size={18} className="text-green-600" />
                       <span className="text-sm font-bold text-[#0A0A0A]">Monthly metrics report</span>
                    </div>
                    <div 
                      onClick={() => setReceiveSummary(!receiveSummary)}
                      data-testid="toggle-monthly-summary"
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all ${receiveSummary ? 'bg-green-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-all ${receiveSummary ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                 </div>
                 <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                    We will send you a monthly analytics report containing reach, content overview, and comparison indices automatically.
                 </p>

                 <div className="space-y-1.5 pt-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alternative Email (Optional)</label>
                   <input 
                     type="email" 
                     placeholder="Enter destination email address"
                     value={customSummaryEmail}
                     onChange={(e) => setCustomSummaryEmail(e.target.value)}
                     className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-medium" 
                   />
                   <p className="text-[10px] text-gray-400 italic">When this field is empty the monthly summary is sent to <b>{email}</b></p>
                 </div>
              </div>

               {/* Display Theme */}
               <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[var(--muted)]/20 border border-slate-100 dark:border-[var(--border)] space-y-4">
                 <div>
                   <h3 className="text-sm font-bold text-[var(--foreground)]">Display theme</h3>
                   <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed font-medium mt-1">
                     Choose between light and dark interface.
                   </p>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   {[
                     { id: 'light', label: 'Light', icon: Sun },
                     { id: 'dark', label: 'Dark', icon: Moon },
                   ].map((t) => {
                     const Icon = t.icon;
                     const isSelected = theme === t.id;
                     return (
                       <button
                         key={t.id}
                         type="button"
                         onClick={() => {
                           setTheme(t.id);
                           toast.success(`Switched to ${t.label} mode`);
                         }}
                         className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                           isSelected
                             ? "bg-gray-900 border-gray-900 text-white shadow-md"
                             : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                         }`}
                       >
                         <Icon size={18} />
                         <span className="text-[10px] font-bold tracking-tight">{t.label}</span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* Language Preference */}
               <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[var(--muted)]/20 border border-slate-100 dark:border-[var(--border)] space-y-4">
                 <div>
                   <h3 className="text-sm font-bold text-[var(--foreground)]">Language</h3>
                   <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed font-medium mt-1">
                     Select your preferred interface language.
                   </p>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   {LANGUAGES.map((lang) => {
                     const isSelected = language === lang.code;
                     return (
                       <button
                         key={lang.code}
                         type="button"
                         onClick={() => {
                           setLanguage(lang.code);
                           toast.success(`Language changed to ${lang.label}`);
                         }}
                         className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                           isSelected
                             ? "bg-gray-900 border-gray-900 text-white shadow-md"
                             : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                         }`}
                       >
                         <span className="text-base leading-none">{lang.flag}</span>
                         <div className="text-left">
                           <div className="text-xs font-bold">{lang.label}</div>
                           <div className={`text-[10px] font-medium ${ isSelected ? 'text-white/60' : 'text-[var(--muted-foreground)]'}`}>{lang.nativeLabel}</div>
                         </div>
                       </button>
                     );
                   })}
                 </div>
               </div>
            </section>

            <button 
              onClick={handleSave}
              disabled={isSaving || isLoading}
              data-testid="profile-save-btn"
              className="px-10 py-3 bg-[#0A0A0A] text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2"
            >
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Save All Changes
            </button>
          </div>
        )}

        {activeTab === "access" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Shield size={18} className="text-gray-400" />
                 <h2 className="text-lg font-bold text-[#0A0A0A]">Access information</h2>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                 This is your access information. You'll need to introduce your password to perform any change.
              </p>
            </div>

            <div className="space-y-6 max-w-md">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</label>
                <input value={email} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm font-medium" />
              </div>

              {accounts.some(acc => acc.provider === 'LOCAL') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mật khẩu hiện tại</label>
                    <Link 
                      to={`/forgot-password?email=${encodeURIComponent(email)}`}
                      className="text-[10px] font-bold text-blue-600 hover:underline hover:text-blue-700 transition-colors"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="password" 
                      placeholder="Nhập mật khẩu hiện tại" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      data-testid="profile-current-password-input"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-medium" 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {accounts.some(acc => acc.provider === 'LOCAL') ? "Mật khẩu mới" : "Thiết lập mật khẩu mới"}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="password" 
                    placeholder={accounts.some(acc => acc.provider === 'LOCAL') ? "Nhập mật khẩu mới" : "Tạo mật khẩu đăng nhập trực tiếp"} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="profile-new-password-input"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-medium" 
                  />
                </div>
                <p className="text-[10px] text-gray-400 italic">
                  {accounts.some(acc => acc.provider === 'LOCAL') 
                    ? "Nhập mật khẩu mới có độ dài tối thiểu 6 ký tự để thay đổi mật khẩu hiện tại."
                    : "Tài khoản của bạn đang đăng nhập bằng Google. Hãy thiết lập mật khẩu tại đây nếu bạn muốn đăng nhập song song bằng Email & Mật khẩu."
                  }
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Smartphone size={18} className="text-blue-600" />
                       <span className="text-sm font-bold text-[#0A0A0A]">Two factor authentication</span>
                    </div>
                    <div 
                      onClick={() => setTwoFactor(!twoFactor)}
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all ${twoFactor ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-all ${twoFactor ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                 </div>
                 <p className="text-[11px] text-blue-700/70 leading-relaxed font-medium">
                    To increase the security of your account you can enable 2-factor authentication (2FA) with your mobile device.
                 </p>
              </div>
              
              <button 
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                data-testid="profile-update-password-btn"
                className="px-8 py-3 bg-[#0A0A0A] text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2"
              >
                {isUpdatingPassword && <Loader2 size={16} className="animate-spin" />}
                Update Access
              </button>
            </div>

            {/* Linked Accounts Section */}
            <div className="pt-8 border-t border-gray-100 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-[#0A0A0A]">Liên kết tài khoản mạng xã hội</h3>
                <p className="text-xs text-gray-500 mt-1">Liên kết với tài khoản Google để đăng nhập nhanh chóng bằng 1-click.</p>
              </div>

              <div className="space-y-3 max-w-xl">
                {/* Google OAuth Method */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-xl">
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.94 5.94 0 0 1 8 12.57c0-3.3 2.685-5.97 5.99-5.97 1.5 0 2.87.55 3.94 1.45l3.12-3.12C19.18 3.12 16.27 2 13.99 2A10.57 10.57 0 0 0 3.42 12.57a10.57 10.57 0 0 0 10.57 10.57c5.83 0 10.13-4.1 10.13-10.27 0-.7-.08-1.2-.2-1.585H12.24z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0A0A0A]">Tài khoản Google</div>
                      <div className="text-xs text-gray-400 font-medium mt-0.5">
                        {accounts.some(acc => acc.provider === "GOOGLE") 
                          ? `Đã liên kết (ID: ${accounts.find(acc => acc.provider === "GOOGLE")?.providerId || "N/A"})`
                          : "Chưa liên kết tài khoản Google"
                        }
                      </div>
                    </div>
                  </div>

                  {accounts.some(acc => acc.provider === "GOOGLE") ? (
                    <button
                      onClick={() => handleUnlink("GOOGLE")}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      Hủy liên kết
                    </button>
                  ) : (
                    <button
                      onClick={handleLinkGoogle}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Liên kết ngay
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB SUPPORT (Archived Ticket support chat sessions & Live Chat) */}
        {activeTab === "support" && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-lg font-bold text-[#0A0A0A]">Hỗ trợ kỹ thuật (Chat)</h2>
                   <p className="text-sm text-gray-500 mt-1">Xem lại lịch sử hỗ trợ hoặc trò chuyện trực tiếp với chúng tôi.</p>
                </div>
                {selectedTicket && (
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 bg-[#2D1D35] text-white hover:opacity-90 transition-all text-xs font-bold rounded-xl shadow-sm"
                  >
                     Quay lại Chat trực tuyến
                  </button>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
                {/* Left ticket list */}
                <div className="md:col-span-4 bg-white rounded-3xl border border-gray-150 p-4 space-y-2 max-h-[500px] overflow-y-auto">
                   <button
                     onClick={() => setSelectedTicket(null)}
                     className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                       !selectedTicket 
                         ? "bg-pink-50/50 border-pink-200 shadow-sm" 
                         : "border-gray-100 hover:bg-slate-50/50"
                     }`}
                   >
                     <div className="p-2 bg-pink-500 text-white rounded-xl">
                        <MessageCircle size={16} />
                     </div>
                     <div>
                       <div className="text-xs font-bold text-[#0A0A0A]">Chat trực tuyến (Live)</div>
                       <div className="text-[9px] text-gray-400 mt-0.5">Trợ lý hỗ trợ 24/7</div>
                     </div>
                   </button>
                   
                   <div className="h-px bg-gray-100 my-2" />
                   
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">Các phiên đã đóng</h3>
                   {loadingTickets ? (
                     <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-gray-400" size={20} /></div>
                   ) : tickets.length === 0 ? (
                     <div className="text-xs text-gray-400 text-center py-8">Chưa có phiên hỗ trợ nào.</div>
                   ) : (
                     tickets.map((t) => (
                       <button
                         key={t.id}
                         onClick={() => loadTicketMessages(t)}
                         className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                           selectedTicket?.id === t.id 
                             ? "bg-slate-50 border-slate-300/80 shadow-sm" 
                             : "border-transparent hover:bg-slate-50/50"
                         }`}
                       >
                         <div className="min-w-0">
                           <div className="text-xs font-bold text-[#0A0A0A] truncate">{t.subject}</div>
                           <div className="text-[9px] text-gray-400 mt-0.5 font-mono">Phiên: {t.id.substring(0, 8)}</div>
                         </div>
                         <ChevronRight size={14} className="text-gray-400 shrink-0" />
                       </button>
                     ))
                   )}
                </div>

                {/* Right ticket messages box */}
                <div className="md:col-span-8 bg-white rounded-3xl border border-gray-150 overflow-hidden flex flex-col h-[500px] shadow-sm">
                   {selectedTicket ? (
                     <>
                       {/* Box Header */}
                       <div className="bg-[#2D1D35]/5 p-4 border-b border-gray-150 flex items-center justify-between">
                         <div>
                           <div className="text-xs font-bold text-[#0A0A0A]">{selectedTicket.subject}</div>
                           <div className="text-[9px] text-gray-400 mt-0.5">Trạng thái: <span className="text-green-600 font-bold uppercase">{selectedTicket.status}</span> · Đóng ngày: {new Date(selectedTicket.updatedAt).toLocaleDateString()}</div>
                         </div>
                       </div>
                       
                       {/* Messages content (Read-only view) */}
                       <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
                         {loadingMessages ? (
                           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
                         ) : (
                           ticketMessages.map((msg) => {
                             const isUser = msg.senderId === selectedTicket.userId;
                             return (
                               <div key={msg.id} data-testid="chat-message" className={`flex ${!isUser ? 'justify-start' : 'justify-end'}`}>
                                 <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                   isUser 
                                     ? 'bg-[#2D1D35] text-white rounded-tr-none shadow-sm' 
                                     : 'bg-white text-gray-700 shadow-sm border border-gray-150 rounded-tl-none'
                                 }`}>
                                   <div>{msg.content}</div>
                                   <div className={`text-[8px] mt-1.5 font-medium ${isUser ? 'text-white/40' : 'text-gray-400'}`}>
                                     {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                 </div>
                               </div>
                             );
                           })
                         )}
                       </div>
                       
                       {/* Disabled Input Info footer */}
                       <div className="p-4 bg-gray-50 border-t border-gray-150 text-center text-[10px] text-gray-400 font-bold tracking-wider uppercase">
                         Đây là lịch sử lưu trữ. Cuộc hội thoại này đã đóng.
                       </div>
                     </>
                   ) : (
                     <>
                       {/* Active chat window box header */}
                       <div className="bg-pink-500/5 p-4 border-b border-gray-150 flex items-center justify-between">
                         <div>
                           <div className="text-xs font-bold text-[#0A0A0A]">Chat hỗ trợ trực tiếp</div>
                           <div className="text-[9px] text-gray-400 mt-0.5">Đặt câu hỏi để được trợ giúp ngay lập tức</div>
                         </div>
                       </div>
                       
                       {/* Messages list (Real-time live session simulation) */}
                       <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
                         {activeSupportMessages.map((msg, i) => (
                           <div key={msg.id || i} data-testid="chat-message" className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                msg.role === 'user' 
                                  ? 'bg-[#2D1D35] text-white rounded-tr-none shadow-sm' 
                                  : msg.role === 'system'
                                    ? 'bg-amber-50 text-amber-800 text-[10px] text-center mx-auto rounded-xl border border-amber-200'
                                    : 'bg-white text-gray-700 shadow-sm border border-gray-150 rounded-tl-none'
                              }`}>
                                 <div>{msg.text}</div>
                                 {msg.role !== 'system' && (
                                   <div className={`text-[8px] mt-1.5 font-medium ${msg.role === 'user' ? 'text-white/45' : 'text-gray-400'}`}>{msg.time}</div>
                                 )}
                              </div>
                           </div>
                         ))}
                         <div ref={activeMessagesEndRef} />
                       </div>
                       
                       {/* Input Form area */}
                       <div className="p-4 bg-white border-t border-gray-150">
                          <div className="flex gap-2">
                             <input 
                               value={activeSupportInput}
                               onChange={(e) => setActiveSupportInput(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleSendSupportMessage()}
                               placeholder="Nhập tin nhắn..." 
                               data-testid="support-chat-input"
                               className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-black outline-none text-sm transition-all font-medium" 
                             />
                             <button 
                               onClick={handleSendSupportMessage} 
                               data-testid="support-chat-send-btn"
                               className="p-2.5 bg-[#2D1D35] text-white rounded-xl hover:opacity-90 transition-all shadow-md"
                             >
                                <Send size={18} />
                             </button>
                          </div>
                       </div>
                     </>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-8 animate-in fade-in duration-300">
             {loadingBilling ? (
               <div className="flex items-center justify-center p-20">
                 <Loader2 className="animate-spin text-gray-400" size={32} />
               </div>
             ) : (
               <>
                 {/* Current Plan Card */}
                 <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-2">
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gói hiện tại</span>
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                         currentPlan?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                       }`}>
                         {currentPlan?.status || 'Chưa đăng ký'}
                       </span>
                     </div>
                      <h3 className="text-xl font-extrabold text-[#0A0A0A]">
                        {currentPlan?.planName ? currentPlan.planName.charAt(0) + currentPlan.planName.slice(1).toLowerCase() : 'Free Plan'}
                      </h3>
                      
                      {/* Usage Tracker */}
                      <div className="pt-2 pb-2 max-w-sm space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-700">
                          <span>Sản lượng bài đăng đã dùng:</span>
                          <span className="text-gray-900 font-extrabold">{currentPlan?.postsUsedThisMonth || 0} / {currentPlan?.limits?.maxPostsPerMonth || 10} bài</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-black rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(((currentPlan?.postsUsedThisMonth || 0) / (currentPlan?.limits?.maxPostsPerMonth || 10)) * 100, 100)}%` }} 
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium italic">
                          (Giới hạn này tự động được làm mới vào đầu chu kỳ thanh toán tiếp theo)
                        </p>
                      </div>
                     {currentPlan?.periodEnd ? (
                       <p className="text-xs text-gray-500 font-medium">
                         Ngày hết hạn: <b>{new Date(currentPlan.periodEnd).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</b>
                       </p>
                     ) : (
                       <p className="text-xs text-gray-500 font-medium">
                         Trải nghiệm các tính năng mở rộng của hệ thống.
                       </p>
                     )}
                   </div>
                   
                   <button 
                     onClick={() => navigate("/pricing")} 
                     data-testid="billing-upgrade-btn"
                     className="px-6 py-3 bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 self-start md:self-auto"
                   >
                     Nâng cấp gói dịch vụ <ExternalLink size={14} />
                   </button>
                 </div>

                 {/* Payment History Section */}
                 <div className="space-y-4">
                   <div>
                     <h3 className="text-sm font-bold text-[#0A0A0A]">Lịch sử giao dịch</h3>
                     <p className="text-xs text-gray-400 mt-1">Các lượt thanh toán nâng cấp tài khoản và mua Add-on qua cổng thanh toán QR code.</p>
                   </div>

                   {paymentHistory.length === 0 ? (
                     <div className="p-10 border border-gray-150 rounded-3xl flex flex-col items-center justify-center text-center bg-gray-50/30">
                       <CreditCard size={32} className="text-gray-300 mb-2" />
                       <p className="text-xs text-gray-400 font-medium">Chưa có giao dịch thanh toán nào được thực hiện.</p>
                     </div>
                   ) : (
                     <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                       <table className="w-full border-collapse text-left">
                         <thead>
                           <tr className="bg-slate-50 border-b border-gray-100">
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mã Giao Dịch</th>
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sản Phẩm</th>
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Số Tiền</th>
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời Gian</th>
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng Thái</th>
                           </tr>
                         </thead>
                         <tbody>
                           {paymentHistory.map((history) => {
                             const isPaid = history.status === 'PAID';
                             const isPending = history.status === 'PENDING';
                             const isExpired = history.status === 'EXPIRED';
                             const isCancelled = history.status === 'CANCELLED';
                             
                             let statusLabel = 'Đang chờ';
                             let statusClass = 'bg-amber-100 text-amber-700';
                             if (isPaid) {
                               statusLabel = 'Thành công';
                               statusClass = 'bg-green-100 text-green-700';
                             } else if (isExpired) {
                               statusLabel = 'Đã hết hạn';
                               statusClass = 'bg-gray-100 text-gray-600';
                             } else if (isCancelled) {
                               statusLabel = 'Đã hủy';
                               statusClass = 'bg-red-100 text-red-700';
                             } else if (history.status === 'UNDERPAID') {
                               statusLabel = 'Thiếu tiền';
                               statusClass = 'bg-red-100 text-red-700';
                             }

                             const productName = history.plan 
                               ? `Nâng cấp gói ${history.plan.name.charAt(0) + history.plan.name.slice(1).toLowerCase()}` 
                               : history.addon 
                                 ? `Mua Add-on: ${history.addon.name}` 
                                 : 'Thanh toán dịch vụ';

                             return (
                               <tr key={history.id} className="border-b border-gray-100 hover:bg-slate-50/40 transition-colors">
                                 <td className="p-4 text-xs font-mono text-gray-600 font-bold">{history.transactionCode}</td>
                                 <td className="p-4 text-xs font-medium text-gray-700">{productName}</td>
                                 <td className="p-4 text-xs font-bold text-gray-900">{Number(history.amount).toLocaleString('vi-VN')} VND</td>
                                 <td className="p-4 text-xs text-gray-500 font-medium font-sans">
                                   {new Date(history.createdAt).toLocaleString('vi-VN')}
                                 </td>
                                 <td className="p-4">
                                   <div className="flex items-center gap-2">
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}`}>
                                       {statusLabel}
                                     </span>
                                     {isPending && (
                                       <button
                                         onClick={() => handleCancelPayment(history.transactionCode)}
                                         className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline transition-all active:scale-95 cursor-pointer bg-transparent border-none p-0 outline-none"
                                       >
                                         Hủy
                                       </button>
                                     )}
                                   </div>
                                 </td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
                   )}
                 </div>
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
