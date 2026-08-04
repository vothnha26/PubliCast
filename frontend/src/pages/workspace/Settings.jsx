import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  User, Shield, CreditCard, Globe,
  Mail, Lock, Smartphone, ExternalLink,
  MessageCircle, Send, Paperclip, CheckCircle2, Search,
  AlertTriangle, Loader2, Plus, FileText, ChevronRight,
  Sun, Moon, Bell, BellOff
} from "lucide-react";
import profileService from "../../services/profile.service";
import ticketService from "../../services/ticket.service";
import billingService from "../../services/billing.service";
import apiService from "../../services/api";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { useBrand } from "../../context/BrandContext";
import socketClient from "../../services/socket";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { LANGUAGES } from "../../constants/language";
import { useTranslation } from "react-i18next";

export function SettingsPage() {
  const { t } = useTranslation("settings");
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

  // 2FA Setup states
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [modalType, setModalType] = useState(""); // "enable", "disable", "backup"
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [is2FALoading, setIs2FALoading] = useState(false);

  // Billing States
  const [currentPlan, setCurrentPlan] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingBilling, setLoadingBilling] = useState(false);

  // Notification preference toggles
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [loadingNotificationSettings, setLoadingNotificationSettings] = useState(false);
  const [savingNotificationKey, setSavingNotificationKey] = useState(null);

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
    const successParam = params.get("success");

    if (successParam === "google_linked") {
      toast.success(language === 'vi' ? "Liên kết tài khoản Google thành công!" : "Google account linked successfully!");
      setActiveTab("access");
      fetchUserProfile();
      setTimeout(() => {
        navigate("/settings?tab=access", { replace: true });
      }, 100);
      return;
    }
    
    if (tabParam === "support") setActiveTab("support");
    else if (tabParam === "access") setActiveTab("access");
    else if (tabParam === "billing") setActiveTab("billing");
    else if (tabParam === "notifications") setActiveTab("notifications");
    else setActiveTab("account");
  }, [location.search, navigate, language]);

  // Fetch notification preferences when the tab is opened
  const fetchNotificationSettings = async () => {
    setLoadingNotificationSettings(true);
    try {
      const res = await profileService.getNotificationSettings();
      setNotificationSettings(res?.data || res);
    } catch (err) {
      console.error("Error fetching notification settings:", err);
      toast.error(language === 'vi' ? "Không thể tải cài đặt thông báo" : "Failed to load notification settings");
    } finally {
      setLoadingNotificationSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab === "notifications" && !notificationSettings) {
      fetchNotificationSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const toggleNotificationSetting = async (key) => {
    if (!notificationSettings) return;
    const previous = notificationSettings;
    const nextValue = !previous[key];

    // Optimistic update — the toggle is the whole UI, so a round-trip
    // before it visually flips would feel laggy for what's a single
    // boolean write.
    setNotificationSettings({ ...previous, [key]: nextValue });
    setSavingNotificationKey(key);
    try {
      const res = await profileService.updateNotificationSettings({ [key]: nextValue });
      setNotificationSettings(res?.data || res);
    } catch (err) {
      console.error("Error updating notification setting:", err);
      toast.error(language === 'vi' ? "Không thể cập nhật cài đặt" : "Failed to update setting");
      setNotificationSettings(previous);
    } finally {
      setSavingNotificationKey(null);
    }
  };

  // Fetch support tickets (History)
  const fetchSupportHistory = async () => {
    if (!activeBrand) return;
    setLoadingTickets(true);
    try {
      const res = await ticketService.getTickets(activeBrand.id);
      setTickets(res || []);
    } catch (err) {
      console.error("Error fetching support history:", err);
      toast.error(t("support.errorFetchHistory"));
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch current active support session
  const fetchActiveSession = async () => {
    if (!activeBrand) return;
    try {
      const activeTicket = await ticketService.getActiveTicket(activeBrand.id);
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
            text: t("support.systemWaitMessage"),
            time: ""
          });
        }
        setActiveSupportMessages(formatted);
      } else {
        setActiveSupportTicket(null);
        setActiveSupportMessages([
          { role: "agent", text: t("support.welcomeMessage"), time: "" }
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
        billingService.getCurrentSubscription(activeBrand.id),
        billingService.getSubscriptionHistory(activeBrand.id)
      ])
        .then(([currentPlanData, historyData]) => {
          setCurrentPlan(currentPlanData);
          setPaymentHistory(historyData || []);
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
          toast.info(t("support.sessionClosed"));
          setActiveSupportTicket(null);
          setActiveSupportMessages([
            { role: "agent", text: t("support.resolvedMessage"), time: "" }
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
                text: t("support.agentConnected", { name: payload.assignedAgent.name }),
                time: ""
              }
            ];
          });
          toast.success(t("support.agentAssigned", { name: payload.assignedAgent.name }));
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
        currentTicket = await ticketService.createTicket(
          activeBrand.id,
          originalText.substring(0, 40) || 'Hỗ trợ khách hàng'
        );
        setActiveSupportTicket(currentTicket);
        socketClient.emit('join_room', { ticketId: currentTicket.id });
      }

      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        role: "user",
        text: originalText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setActiveSupportMessages(prev => [...prev, tempMessage]);
      setActiveSupportInput("");

      await ticketService.sendMessage(currentTicket.id, originalText);
    } catch (err) {
      console.error("Error sending support message:", err);
      toast.error(language === 'vi' ? "Gửi tin nhắn thất bại" : "Failed to send message");
    }
  };

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const res = await profileService.getUserProfile();
      const userData = res?.data || res;
      if (userData) {
        setFullName(userData.name || "");
        setEmail(userData.email || "");
        setReceiveSummary(userData.receiveSummary ?? true);
        setCustomSummaryEmail(userData.customSummaryEmail || "");
        setTwoFactor(userData.isTwoFactorEnabled ?? false);
        setAccounts(userData.accounts || []);
      }
    } catch (err) {
      toast.error(language === 'vi' ? "Không thể tải thông tin cá nhân" : "Failed to load profile details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await profileService.editProfile({
        fullName,
        name: fullName,
        receiveSummary,
        customSummaryEmail
      });
      toast.success(language === 'vi' ? "Cập nhật hồ sơ thành công!" : "Profile updated successfully!");
    } catch (err) {
      toast.error(err.message || (language === 'vi' ? "Cập nhật thất bại" : "Failed to update profile"));
    } finally {
      setIsSaving(false);
    }
  };

  const loadTicketMessages = async (t) => {
    setSelectedTicket(t);
    setLoadingMessages(true);
    try {
      const res = await ticketService.getTicketMessages(t.id);
      setTicketMessages(res || []);
    } catch (err) {
      console.error("Error loading ticket messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      const res = await profileService.getGoogleAuthUrl("settings");
      const url = res?.url || res?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      toast.error(err.message || (language === 'vi' ? "Không thể khởi tạo liên kết Google" : "Failed to initialize Google linking"));
    }
  };

  const handleCancelPayment = async (txCode) => {
    const ok = await confirm({
      title: language === 'vi' ? "Hủy giao dịch?" : "Cancel transaction?",
      message: language === 'vi' 
        ? "Bạn có chắc chắn muốn hủy giao dịch đang chờ này không?" 
        : "Are you sure you want to cancel this pending transaction?"
    });
    if (!ok) return;

    try {
      await billingService.cancelTransaction(txCode);
      toast.success(language === 'vi' ? "Đã hủy giao dịch thanh toán." : "Payment transaction cancelled.");
      // Reload history
      if (activeBrand?.id) {
        const historyRes = await billingService.getSubscriptionHistory(activeBrand.id);
        setPaymentHistory(historyRes || []);
      }
    } catch (err) {
      toast.error(err.message || (language === 'vi' ? "Lỗi khi hủy giao dịch" : "Error cancelling transaction"));
    }
  };

  const handleUnlink = async (provider) => {
    const ok = await confirm({
      title: language === 'vi' ? "Hủy liên kết?" : "Unlink account?",
      message: language === 'vi' 
        ? `Bạn có chắc chắn muốn hủy liên kết với tài khoản ${provider} không?` 
        : `Are you sure you want to unlink your ${provider} account?`
    });
    if (!ok) return;

    try {
      await profileService.unlinkAccount(provider);
      toast.success(language === 'vi' ? `Hủy liên kết tài khoản ${provider} thành công!` : `Unlinked ${provider} account successfully!`);
      // Refresh profile info
      const res = await profileService.getUserProfile();
      if (res) {
        setAccounts(res.accounts || res.data?.accounts || []);
      }
    } catch (err) {
      toast.error(err.message || (language === 'vi' ? "Hủy liên kết thất bại" : "Failed to unlink"));
    }
  };

  const handleUpdatePassword = async () => {
    const hasLocalAccount = accounts.some(acc => acc.provider === 'LOCAL');
    if (hasLocalAccount && !currentPassword) {
      toast.error("mật khẩu hiện tại là bắt buộc.");
      return;
    }
    if (!newPassword) {
      toast.error(language === 'vi' ? "Vui lòng nhập mật khẩu mới!" : "Please enter a new password!");
      return;
    }
    if (newPassword.length < 8) {
      toast.error(language === 'vi' ? "Mật khẩu mới phải có ít nhất 8 ký tự!" : "New password must be at least 8 characters!");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await profileService.changePassword({
        currentPassword,
        newPassword
      });
      toast.success(language === 'vi' ? "Cập nhật mật khẩu thành công!" : "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.message || (language === 'vi' ? "Không thể cập nhật mật khẩu" : "Failed to update password"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    if (!twoFactor) {
      setIs2FALoading(true);
      try {
        const authService = (await import("../../services/auth.service")).default;
        const res = await authService.setup2FA();
        setQrCodeUrl(res.qrCodeDataUrl);
        setSecretKey(res.secret);
        setOtpCode("");
        setModalType("enable");
        setShow2FAModal(true);
      } catch (err) {
        toast.error(err.message || "Không thể khởi tạo bảo mật 2 lớp");
      } finally {
        setIs2FALoading(false);
      }
    } else {
      setModalType("disable");
      setOtpCode("");
      setShow2FAModal(true);
    }
  };

  const handleConfirmEnable2FA = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode) {
      toast.error("Vui lòng nhập mã OTP 6 số.");
      return;
    }
    setIs2FALoading(true);
    try {
      const authService = (await import("../../services/auth.service")).default;
      const res = await authService.verify2FA(otpCode);
      setBackupCodes(res.backupCodes);
      setTwoFactor(true);
      setModalType("backup");
      toast.success("Kích hoạt bảo mật 2 lớp thành công!");
    } catch (err) {
      toast.error(err.message || "Xác thực mã OTP thất bại.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmDisable2FA = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode) {
      toast.error("Vui lòng nhập mã OTP 6 số.");
      return;
    }
    setIs2FALoading(true);
    try {
      const authService = (await import("../../services/auth.service")).default;
      await authService.disable2FA(otpCode);
      setTwoFactor(false);
      setShow2FAModal(false);
      toast.success("Đã tắt bảo mật 2 lớp thành công.");
    } catch (err) {
      toast.error(err.message || "Tắt bảo mật 2 lớp thất bại.");
    } finally {
      setIs2FALoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background p-8 font-sans">
      {/* Top horizontal navigation instead of a vertical sidebar */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-lg font-extrabold text-foreground tracking-tight pl-2">{t("title")}</h1>
        
        <div className="flex flex-wrap gap-1 bg-gray-55/60 p-1 rounded-xl">
          {[
            { id: "account", label: t("tabs.account"), icon: User },
            { id: "access", label: t("tabs.security"), icon: Shield },
            { id: "notifications", label: t("tabs.notifications"), icon: Bell },
            { id: "support", label: t("tabs.support"), icon: MessageCircle },
            { id: "billing", label: t("tabs.billing"), icon: CreditCard },
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
      <div className="flex-1 overflow-y-auto bg-card rounded-3xl border border-gray-150 p-8 shadow-sm">
        {activeTab === "account" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <User size={18} className="text-muted-foreground" />
                 <h2 className="text-lg font-bold text-foreground">{t("profile.title")}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                 {t("profile.subtitle")}
              </p>
            </div>

            <section className="space-y-6 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("profile.fullName")}</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    data-testid="profile-fullname-input"
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("profile.email")}</label>
                  <input value={email} disabled className="w-full px-4 py-3 rounded-xl border border-border bg-gray-55 text-gray-450 text-sm font-medium" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 size={18} className="text-green-600" />
                       <span className="text-sm font-bold text-foreground">{t("profile.metricsReport")}</span>
                    </div>
                    <div 
                      onClick={() => setReceiveSummary(!receiveSummary)}
                      data-testid="toggle-monthly-summary"
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all ${receiveSummary ? 'bg-green-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-card rounded-full shadow-sm transform transition-all ${receiveSummary ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                 </div>
                 <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    {t("profile.metricsReportDesc")}
                 </p>

                 <div className="space-y-1.5 pt-2">
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("profile.alternativeEmail")}</label>
                   <input 
                     type="email" 
                     placeholder={t("profile.alternativeEmail")}
                     value={customSummaryEmail}
                     onChange={(e) => setCustomSummaryEmail(e.target.value)}
                     className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium" 
                   />
                   <p className="text-[10px] text-muted-foreground italic">{t("profile.alternativeEmailDesc", { email })}</p>
                 </div>
              </div>

               {/* Display Theme */}
               <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[var(--muted)]/20 border border-slate-100 dark:border-[var(--border)] space-y-4">
                 <div>
                   <h3 className="text-sm font-bold text-[var(--foreground)]">{t("profile.theme")}</h3>
                   <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed font-medium mt-1">
                     {t("profile.themeDesc")}
                   </p>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   {[
                     { id: 'light', label: 'Light', icon: Sun },
                     { id: 'dark', label: 'Dark', icon: Moon },
                   ].map((tTheme) => {
                     const Icon = tTheme.icon;
                     const isSelected = theme === tTheme.id;
                     return (
                       <button
                         key={tTheme.id}
                         type="button"
                         onClick={() => {
                           setTheme(tTheme.id);
                           toast.success(t("profile.toastTheme", { mode: tTheme.label }));
                         }}
                         className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                           isSelected
                             ? "bg-gray-900 border-gray-900 text-white shadow-md"
                             : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                         }`}
                       >
                         <Icon size={18} />
                         <span className="text-[10px] font-bold tracking-tight">{tTheme.label}</span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* Language Preference */}
               <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[var(--muted)]/20 border border-slate-100 dark:border-[var(--border)] space-y-4">
                 <div>
                   <h3 className="text-sm font-bold text-[var(--foreground)]">{t("profile.language")}</h3>
                   <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed font-medium mt-1">
                     {t("profile.languageDesc")}
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
                           toast.success(t("profile.toastLanguage", { lang: lang.label }));
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
              {t("profile.saveBtn")}
            </button>
          </div>
        )}

        {activeTab === "access" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Shield size={18} className="text-muted-foreground" />
                 <h2 className="text-lg font-bold text-foreground">{t("security.title")}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                 {t("security.subtitle")}
              </p>
            </div>

            <div className="space-y-6 max-w-md">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("profile.email")}</label>
                <input value={email} disabled className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-muted-foreground text-sm font-medium" />
              </div>

              {accounts.some(acc => acc.provider === 'LOCAL') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("security.currentPassword")}</label>
                    <Link 
                      to={`/forgot-password?email=${encodeURIComponent(email)}`}
                      className="text-[10px] font-bold text-blue-600 hover:underline hover:text-blue-700 transition-colors"
                    >
                      {t("security.forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="password" 
                      placeholder={t("security.currentPasswordPlaceholder")} 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      data-testid="profile-current-password-input"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium" 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {accounts.some(acc => acc.provider === 'LOCAL') ? t("security.newPassword") : t("security.setupNewPassword")}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="password" 
                    placeholder={accounts.some(acc => acc.provider === 'LOCAL') ? t("security.newPasswordPlaceholder") : t("security.createNewPasswordPlaceholder")} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="profile-new-password-input"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium" 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  {accounts.some(acc => acc.provider === 'LOCAL') 
                    ? t("security.passwordHint")
                    : t("security.googleHint")
                  }
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Smartphone size={18} className="text-blue-600" />
                       <span className="text-sm font-bold text-foreground">{t("security.twoFactor")}</span>
                    </div>
                    <button 
                      onClick={handleToggle2FA}
                      disabled={is2FALoading}
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all border-none outline-none ${twoFactor ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      {is2FALoading ? (
                        <Loader2 size={12} className="animate-spin text-white mx-auto" />
                      ) : (
                        <div className={`w-4 h-4 bg-card rounded-full shadow-sm transform transition-all ${twoFactor ? 'translate-x-4' : 'translate-x-0'}`} />
                      )}
                    </button>
                 </div>
                 <p className="text-[11px] text-blue-700/70 leading-relaxed font-medium">
                    {t("security.twoFactorDesc")}
                 </p>
              </div>
              
              <button 
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                data-testid="profile-update-password-btn"
                className="px-8 py-3 bg-[#0A0A0A] text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2"
              >
                {isUpdatingPassword && <Loader2 size={16} className="animate-spin" />}
                {t("security.updateBtn")}
              </button>
            </div>

            {/* Linked Accounts Section */}
            <div className="pt-8 border-t border-border space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground">{t("security.linkedAccounts")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("security.linkedAccountsDesc")}</p>
              </div>

              <div className="space-y-3 max-w-xl">
                {/* Google OAuth Method */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm">
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
                      <div className="text-sm font-bold text-foreground">{t("security.googleAccount")}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">
                        {accounts.some(acc => acc.provider === "GOOGLE") 
                          ? t("security.linked", { id: accounts.find(acc => acc.provider === "GOOGLE")?.providerId || "N/A" })
                          : t("security.notLinked")
                        }
                      </div>
                    </div>
                  </div>

                  {accounts.some(acc => acc.provider === "GOOGLE") ? (
                    <button
                      onClick={() => handleUnlink("GOOGLE")}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      {t("security.unlinkBtn")}
                    </button>
                  ) : (
                    <button
                      onClick={handleLinkGoogle}
                      className="px-4 py-2 bg-card text-foreground border border-border hover:bg-gray-55 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Plus size={14} /> {t("security.linkNowBtn")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bell size={18} className="text-muted-foreground" />
                <h2 className="text-lg font-bold text-foreground">{t("notifications.title")}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("notifications.subtitle")}
              </p>
            </div>

            {loadingNotificationSettings || !notificationSettings ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6 max-w-2xl">
                {/* Master toggle — overrides every category below */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {notificationSettings.notificationsEnabled ? (
                      <Bell size={20} className="text-foreground" />
                    ) : (
                      <BellOff size={20} className="text-muted-foreground" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-foreground">{t("notifications.masterToggle")}</div>
                      <div className="text-[11px] text-muted-foreground font-medium">{t("notifications.masterToggleDesc")}</div>
                    </div>
                  </div>
                  <div
                    onClick={() => toggleNotificationSetting('notificationsEnabled')}
                    data-testid="toggle-notifications-master"
                    className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all shrink-0 ${
                      savingNotificationKey === 'notificationsEnabled' ? 'opacity-50' : ''
                    } ${notificationSettings.notificationsEnabled ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <div className={`w-4 h-4 bg-card rounded-full shadow-sm transform transition-all ${notificationSettings.notificationsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div className={`space-y-6 transition-opacity ${!notificationSettings.notificationsEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t("notifications.groups.activity")}</h3>
                    <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                      {[
                        { key: 'notifyPostFailure', label: t("notifications.items.postFailure"), desc: t("notifications.items.postFailureDesc") },
                        { key: 'notifyPublishSuccess', label: t("notifications.items.publishSuccess"), desc: t("notifications.items.publishSuccessDesc") },
                        { key: 'notifyChannelDisconnect', label: t("notifications.items.channelDisconnect"), desc: t("notifications.items.channelDisconnectDesc") },
                        { key: 'notifyCollaboration', label: t("notifications.items.collaboration"), desc: t("notifications.items.collaborationDesc") },
                        { key: 'notifyEmptyQueue', label: t("notifications.items.emptyQueue"), desc: t("notifications.items.emptyQueueDesc") },
                        { key: 'notifyBilling', label: t("notifications.items.billing"), desc: t("notifications.items.billingDesc") },
                      ].map((item) => (
                        <div key={item.key} className="p-4 flex items-center justify-between gap-4 bg-card">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground">{item.label}</div>
                            <div className="text-[11px] text-muted-foreground font-medium">{item.desc}</div>
                          </div>
                          <div
                            onClick={() => toggleNotificationSetting(item.key)}
                            data-testid={`toggle-${item.key}`}
                            className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all shrink-0 ${
                              savingNotificationKey === item.key ? 'opacity-50' : ''
                            } ${notificationSettings[item.key] ? 'bg-green-600' : 'bg-gray-300'}`}
                          >
                            <div className={`w-4 h-4 bg-card rounded-full shadow-sm transform transition-all ${notificationSettings[item.key] ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t("notifications.groups.insights")}</h3>
                    <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                      {[
                        { key: 'notifyDailyRecap', label: t("notifications.items.dailyRecap"), desc: t("notifications.items.dailyRecapDesc") },
                        { key: 'notifyWeeklyReport', label: t("notifications.items.weeklyReport"), desc: t("notifications.items.weeklyReportDesc") },
                      ].map((item) => (
                        <div key={item.key} className="p-4 flex items-center justify-between gap-4 bg-card">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground">{item.label}</div>
                            <div className="text-[11px] text-muted-foreground font-medium">{item.desc}</div>
                          </div>
                          <div
                            onClick={() => toggleNotificationSetting(item.key)}
                            data-testid={`toggle-${item.key}`}
                            className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all shrink-0 ${
                              savingNotificationKey === item.key ? 'opacity-50' : ''
                            } ${notificationSettings[item.key] ? 'bg-green-600' : 'bg-gray-300'}`}
                          >
                            <div className={`w-4 h-4 bg-card rounded-full shadow-sm transform transition-all ${notificationSettings[item.key] ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB SUPPORT (Archived Ticket support chat sessions & Live Chat) */}
        {activeTab === "support" && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-lg font-bold text-foreground">{t("support.title")}</h2>
                   <p className="text-sm text-muted-foreground mt-1">{t("support.subtitle")}</p>
                </div>
                {selectedTicket && (
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 bg-[#2D1D35] text-white hover:opacity-90 transition-all text-xs font-bold rounded-xl shadow-sm"
                  >
                     {t("support.backToLive")}
                  </button>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
                {/* Left ticket list */}
                <div className="md:col-span-4 bg-card rounded-3xl border border-gray-150 p-4 space-y-2 max-h-[500px] overflow-y-auto">
                   <button
                     onClick={() => setSelectedTicket(null)}
                     className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                       !selectedTicket 
                         ? "bg-pink-50/50 border-pink-200 shadow-sm" 
                         : "border-border hover:bg-slate-50/50"
                     }`}
                   >
                     <div className="p-2 bg-pink-500 text-white rounded-xl">
                        <MessageCircle size={16} />
                     </div>
                     <div>
                       <div className="text-xs font-bold text-foreground">{t("support.liveChat")}</div>
                       <div className="text-[9px] text-muted-foreground mt-0.5">{t("support.liveChatDesc")}</div>
                     </div>
                   </button>
                   
                   <div className="h-px bg-muted my-2" />
                   
                   <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-2">{t("support.closedSessions")}</h3>
                   {loadingTickets ? (
                     <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
                   ) : tickets.length === 0 ? (
                     <div className="text-xs text-muted-foreground text-center py-8">{t("support.noSessions")}</div>
                   ) : (
                     tickets.map((ticketItem) => (
                       <button
                         key={ticketItem.id}
                         onClick={() => loadTicketMessages(ticketItem)}
                         className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                           selectedTicket?.id === ticketItem.id 
                             ? "bg-slate-50 border-slate-300/80 shadow-sm" 
                             : "border-transparent hover:bg-slate-50/50"
                         }`}
                       >
                         <div className="min-w-0">
                           <div className="text-xs font-bold text-foreground truncate">{ticketItem.subject}</div>
                           <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">ID: {ticketItem.id.substring(0, 8)}</div>
                         </div>
                         <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                       </button>
                     ))
                   )}
                </div>

                {/* Right ticket messages box */}
                <div className="md:col-span-8 bg-card rounded-3xl border border-gray-150 overflow-hidden flex flex-col h-[500px] shadow-sm">
                   {selectedTicket ? (
                     <>
                       {/* Box Header */}
                       <div className="bg-[#2D1D35]/5 p-4 border-b border-gray-150 flex items-center justify-between">
                         <div>
                           <div className="text-xs font-bold text-foreground">{selectedTicket.subject}</div>
                           <div className="text-[9px] text-muted-foreground mt-0.5">
                             {t("support.status")}: <span className="text-green-600 font-bold uppercase">{selectedTicket.status}</span> · {t("support.closedDate", { date: new Date(selectedTicket.updatedAt).toLocaleDateString() })}
                           </div>
                         </div>
                       </div>
                       
                       {/* Messages content (Read-only view) */}
                       <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20">
                         {loadingMessages ? (
                           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
                         ) : (
                           ticketMessages.map((msg) => {
                             const isUser = msg.senderId === selectedTicket.userId;
                             return (
                               <div key={msg.id} data-testid="chat-message" className={`flex ${!isUser ? 'justify-start' : 'justify-end'}`}>
                                 <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                   isUser 
                                     ? 'bg-[#2D1D35] text-white rounded-tr-none shadow-sm' 
                                     : 'bg-card text-foreground shadow-sm border border-gray-150 rounded-tl-none'
                                 }`}>
                                   <div>{msg.content}</div>
                                   <div className={`text-[8px] mt-1.5 font-medium ${isUser ? 'text-white/40' : 'text-muted-foreground'}`}>
                                     {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                 </div>
                                </div>
                             );
                           })
                         )}
                       </div>
                       
                       {/* Disabled Input Info footer */}
                       <div className="p-4 bg-gray-55 border-t border-gray-150 text-center text-[10px] text-muted-foreground font-bold tracking-wider uppercase">
                         {t("support.archiveHint")}
                       </div>
                     </>
                   ) : (
                     <>
                       {/* Active chat window box header */}
                       <div className="bg-pink-500/5 p-4 border-b border-gray-150 flex items-center justify-between">
                         <div>
                           <div className="text-xs font-bold text-foreground">{t("support.liveChatTitle")}</div>
                           <div className="text-[9px] text-muted-foreground mt-0.5">{t("support.liveChatSubtitle")}</div>
                         </div>
                       </div>
                       
                       {/* Messages list (Real-time live session simulation) */}
                       <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20">
                         {activeSupportMessages.map((msg, i) => (
                           <div key={msg.id || i} data-testid="chat-message" className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                msg.role === 'user' 
                                  ? 'bg-[#2D1D35] text-white rounded-tr-none shadow-sm' 
                                  : msg.role === 'system'
                                    ? 'bg-amber-50 text-amber-800 text-[10px] text-center mx-auto rounded-xl border border-amber-200'
                                    : 'bg-card text-foreground shadow-sm border border-gray-150 rounded-tl-none'
                              }`}>
                                 <div>{msg.text}</div>
                                 {msg.role !== 'system' && (
                                   <div className={`text-[8px] mt-1.5 font-medium ${msg.role === 'user' ? 'text-white/45' : 'text-muted-foreground'}`}>{msg.time}</div>
                                 )}
                              </div>
                           </div>
                         ))}
                         <div ref={activeMessagesEndRef} />
                       </div>
                       
                       {/* Input Form area */}
                       <div className="p-4 bg-card border-t border-gray-150">
                          <div className="flex gap-2">
                             <input 
                               value={activeSupportInput}
                               onChange={(e) => setActiveSupportInput(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleSendSupportMessage()}
                               placeholder={t("support.inputPlaceholder")} 
                               data-testid="support-chat-input"
                               className="flex-1 px-4 py-2.5 bg-gray-55 border border-border rounded-xl focus:bg-card focus:border-black outline-none text-sm transition-all font-medium" 
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
                 <Loader2 className="animate-spin text-muted-foreground" size={32} />
               </div>
             ) : (
               <>
                 {/* Current Plan Card */}
                 <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-2">
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("billing.currentPlan")}</span>
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                         currentPlan?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                       }`}>
                         {currentPlan ? t("billing.planStatus", { status: currentPlan.status }) : t("billing.unregistered")}
                       </span>
                     </div>
                      <h3 className="text-xl font-extrabold text-foreground">
                        {currentPlan?.planName ? currentPlan.planName.charAt(0) + currentPlan.planName.slice(1).toLowerCase() : t("billing.freePlan")}
                      </h3>
                      
                      {/* Usage Tracker */}
                      <div className="pt-2 pb-2 max-w-sm space-y-2">
                        <div className="flex justify-between text-xs font-bold text-foreground">
                          <span>{t("billing.postsUsed")}</span>
                          <span className="text-foreground font-extrabold">
                            {t("billing.postsQuota", { used: currentPlan?.postsUsedThisMonth || 0, max: currentPlan?.limits?.maxPostsPerMonth || 10 })}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-black rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(((currentPlan?.postsUsedThisMonth || 0) / (currentPlan?.limits?.maxPostsPerMonth || 10)) * 100, 100)}%` }} 
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium italic">
                          {t("billing.postsQuotaHint")}
                        </p>
                      </div>
                     {currentPlan?.periodEnd ? (
                       <p className="text-xs text-muted-foreground font-medium">
                         {t("billing.expirationDate", { date: new Date(currentPlan.periodEnd).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}
                       </p>
                     ) : (
                       <p className="text-xs text-muted-foreground font-medium">
                         {t("billing.promoHint")}
                       </p>
                     )}
                   </div>
                   
                   <button 
                     onClick={() => navigate("/pricing")} 
                     data-testid="billing-upgrade-btn"
                     className="px-6 py-3 bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 self-start md:self-auto"
                   >
                     {t("billing.upgradeBtn")} <ExternalLink size={14} />
                   </button>
                 </div>

                 {/* Payment History Section */}
                 <div className="space-y-4">
                   <div>
                     <h3 className="text-sm font-bold text-foreground">{t("billing.transactionHistory")}</h3>
                     <p className="text-xs text-muted-foreground mt-1">{t("billing.transactionHistoryDesc")}</p>
                   </div>

                   {paymentHistory.length === 0 ? (
                     <div className="p-10 border border-gray-150 rounded-3xl flex flex-col items-center justify-center text-center bg-gray-55/30">
                       <CreditCard size={32} className="text-gray-300 mb-2" />
                       <p className="text-xs text-muted-foreground font-medium">{t("billing.noTransactions")}</p>
                     </div>
                   ) : (
                     <div className="border border-border rounded-2xl overflow-hidden shadow-sm bg-card">
                       <table className="w-full border-collapse text-left">
                         <thead>
                           <tr className="bg-slate-50 border-b border-border">
                             <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("billing.colTxCode")}</th>
                             <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("billing.colProduct")}</th>
                             <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("billing.colAmount")}</th>
                             <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("billing.colTime")}</th>
                             <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("billing.colStatus")}</th>
                           </tr>
                         </thead>
                         <tbody>
                           {paymentHistory.map((history) => {
                             const isPaid = history.status === 'PAID';
                             const isPending = history.status === 'PENDING';
                             const isExpired = history.status === 'EXPIRED';
                             const isCancelled = history.status === 'CANCELLED';
                             
                             let statusLabel = t("billing.statusPending");
                             let statusClass = 'bg-amber-100 text-amber-700';
                             if (isPaid) {
                               statusLabel = t("billing.statusSuccess");
                               statusClass = 'bg-green-100 text-green-700';
                             } else if (isExpired) {
                               statusLabel = t("billing.statusExpired");
                               statusClass = 'bg-muted text-muted-foreground';
                             } else if (isCancelled) {
                               statusLabel = t("billing.statusCancelled");
                               statusClass = 'bg-red-100 text-red-700';
                             } else if (history.status === 'UNDERPAID') {
                               statusLabel = t("billing.statusUnderpaid");
                               statusClass = 'bg-red-100 text-red-700';
                             }

                             const productName = history.plan 
                               ? t("billing.upgradeProduct", { name: history.plan.name.charAt(0) + history.plan.name.slice(1).toLowerCase() }) 
                               : history.addon 
                                 ? t("billing.buyAddonProduct", { name: history.addon.name }) 
                                 : t("billing.fallbackProduct");

                             return (
                               <tr key={history.id} className="border-b border-border hover:bg-slate-50/40 transition-colors">
                                 <td className="p-4 text-xs font-mono text-muted-foreground font-bold">{history.transactionCode}</td>
                                 <td className="p-4 text-xs font-medium text-foreground">{productName}</td>
                                 <td className="p-4 text-xs font-bold text-foreground">{Number(history.amount).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} {language === 'vi' ? 'VND' : 'VND'}</td>
                                 <td className="p-4 text-xs text-muted-foreground font-medium font-sans">
                                   {new Date(history.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
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
                                         {t("billing.cancelBtn")}
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

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl border border-gray-150 p-8 max-w-md w-full shadow-2xl space-y-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            {modalType === "enable" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-foreground">Kích hoạt bảo mật 2 lớp</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Quét mã QR dưới đây bằng Google Authenticator hoặc ứng dụng TOTP khác.</p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-gray-55 rounded-2xl border border-border">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Mã QR 2FA" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <Loader2 className="animate-spin text-muted-foreground" size={24} />
                    </div>
                  )}
                  <div className="text-center mt-3 space-y-1">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Secret Key (nhập thủ công)</div>
                    <code className="text-xs font-bold bg-card px-3 py-1.5 rounded-lg border border-gray-150 select-all tracking-wider text-foreground block">{secretKey}</code>
                  </div>
                </div>

                <form onSubmit={handleConfirmEnable2FA} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Mã xác thực 6 số</label>
                    <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-center text-lg font-bold tracking-widest"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShow2FAModal(false)}
                      className="flex-1 py-3 border border-border hover:bg-gray-55 text-gray-750 text-xs font-bold rounded-xl transition-all cursor-pointer bg-card"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={is2FALoading}
                      className="flex-1 py-3 bg-[#0A0A0A] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
                    >
                      {is2FALoading && <Loader2 size={14} className="animate-spin" />}
                      Kích hoạt
                    </button>
                  </div>
                </form>
              </div>
            )}

            {modalType === "disable" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-foreground">Tắt bảo mật 2 lớp</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Xác nhận bằng mã OTP 6 số từ ứng dụng Authenticator của bạn.</p>
                  </div>
                </div>

                <form onSubmit={handleConfirmDisable2FA} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Mã xác thực 6 số</label>
                    <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-center text-lg font-bold tracking-widest"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShow2FAModal(false)}
                      className="flex-1 py-3 border border-border hover:bg-gray-55 text-gray-755 text-xs font-bold rounded-xl transition-all cursor-pointer bg-card"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={is2FALoading}
                      className="flex-1 py-3 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
                    >
                      {is2FALoading && <Loader2 size={14} className="animate-spin" />}
                      Xác nhận tắt
                    </button>
                  </div>
                </form>
              </div>
            )}

            {modalType === "backup" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-foreground">Lưu mã dự phòng (Backup Codes)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Lưu lại 10 mã dự phòng này ở nơi an toàn. Mỗi mã chỉ dùng được một lần để đăng nhập khi mất điện thoại.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 bg-gray-55 rounded-2xl border border-border font-mono text-center">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-card border border-gray-150 rounded-lg py-2 text-sm font-bold text-foreground select-all">
                      {code}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="w-full py-3 bg-[#0A0A0A] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
                >
                  Tôi đã lưu lại
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
