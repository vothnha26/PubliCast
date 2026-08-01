import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Wifi, Check, Mail, ChevronLeft, ArrowRight, Loader2, Lock } from "lucide-react";
import authService from "../../services/auth.service";
import { toast } from "sonner";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { useTranslation } from "react-i18next";

function LeftPanel() {
  const { t } = useTranslation("auth");
  return (
    <div
      className="hidden md:flex flex-col h-full"
      style={{ background: "#0A0A0A", padding: "48px 60px", flex: "0 0 45%" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-auto">
        <div style={{ width: 32, height: 32, background: "#FFF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Wifi size={16} color="#0A0A0A" />
        </div>
        <span style={{ color: "#FFF", fontSize: 16, fontWeight: 500 }}>PubliCast</span>
      </div>

      <div className="flex flex-col justify-center flex-1 py-12">
        <h2 style={{ fontSize: 32, fontWeight: 500, color: "#FFF", marginBottom: 24, lineHeight: 1.3, maxWidth: 440 }}>
          {t("forgot.panelTagline")}
        </h2>
        <div className="flex flex-col gap-4">
          {[
            t("forgot.panelFeature1"),
            t("forgot.panelFeature2"),
            t("forgot.panelFeature3")
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <Check size={11} color="#FFF" />
              </div>
              <span style={{ fontSize: 15, color: "#CCC", lineHeight: 1.6 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-auto">
        <span style={{ fontSize: 13, color: "#777" }}>{t("forgot.panelFooter")}</span>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("email") || "";
  });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

  // Restore timer from localStorage on mount
  useEffect(() => {
    const timerExpiry = localStorage.getItem(STORAGE_KEYS.FORGOT_RESEND_TIMER_EXPIRY);
    if (timerExpiry) {
      const remaining = Math.round((parseInt(timerExpiry) - Date.now()) / 1000);
      if (remaining > 0) {
        setResendTimer(remaining);
      } else {
        localStorage.removeItem(STORAGE_KEYS.FORGOT_RESEND_TIMER_EXPIRY);
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      localStorage.removeItem(STORAGE_KEYS.FORGOT_RESEND_TIMER_EXPIRY);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
      
      const expiry = Date.now() + 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.FORGOT_RESEND_TIMER_EXPIRY, expiry.toString());
      setResendTimer(60);
      
      toast.success("Liên kết khôi phục mật khẩu đã được gửi!");
    } catch (err) {
      toast.error(err.message || t("forgot.toastSendFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      const expiry = Date.now() + 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.FORGOT_RESEND_TIMER_EXPIRY, expiry.toString());
      setResendTimer(60);
      toast.success("Đã gửi lại liên kết khôi phục mật khẩu!");
    } catch (err) {
      toast.error(err.message || t("forgot.toastResendFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      <LeftPanel />

      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
        <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
          <button 
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-8 transition-colors"
          >
            <ChevronLeft size={16} /> {t("forgot.backToLogin")}
          </button>

          {!submitted ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>{t("forgot.title")}</h3>
              <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>
                {t("forgot.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t("forgot.emailLabel")}</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" 
                      required
                      placeholder="you@company.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0A0A0A] outline-none text-sm transition-all" 
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>{t("forgot.sendBtn")} <ArrowRight size={16} /></>}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={32} className="text-green-600" />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 500, color: "#0A0A0A", marginBottom: 12 }}>Kiểm tra Email</h3>
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 32 }}>
                Chúng tôi đã gửi một liên kết đặt lại mật khẩu đến địa chỉ email <strong>{email}</strong>. Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư rác).
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleResend}
                  disabled={isLoading || resendTimer > 0}
                  className="w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {resendTimer > 0 ? `Gửi lại sau ${resendTimer}s` : "Gửi lại email khôi phục"}
                </button>
                <button 
                  onClick={() => navigate("/login")}
                  className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  Trở lại Đăng nhập
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
