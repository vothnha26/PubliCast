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
        <span style={{ color: "#FFF", fontSize: 16, fontWeight: 500 }}>StreamHub</span>
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
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      <LeftPanel />

      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
        <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
          <button 
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> {t("forgot.backToLogin")}
          </button>

          {!submitted ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-2xl font-medium text-foreground mb-2">{t("forgot.title")}</h3>
              <p className="text-sm text-muted-foreground mb-8">
                {t("forgot.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("forgot.emailLabel")}</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="email" 
                      required
                      placeholder="you@company.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-foreground outline-none text-sm transition-all" 
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#0A0A0A] dark:bg-lime-400 text-white dark:text-black rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>{t("forgot.sendBtn")} <ArrowRight size={16} /></>}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-medium text-foreground mb-3">Kiểm tra Email</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Chúng tôi đã gửi một liên kết đặt lại mật khẩu đến địa chỉ email <strong className="text-foreground">{email}</strong>. Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư rác).
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleResend}
                  disabled={isLoading || resendTimer > 0}
                  className="w-full py-3 border border-border bg-card rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {resendTimer > 0 ? `Gửi lại sau ${resendTimer}s` : "Gửi lại email khôi phục"}
                </button>
                <button 
                  onClick={() => navigate("/login")}
                  className="w-full py-3 bg-[#0A0A0A] dark:bg-lime-400 text-white dark:text-black rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
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
