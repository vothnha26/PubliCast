import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Wifi, Check, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/auth.service";
import { toast } from "sonner";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { GOOGLE_OAUTH_ERROR_CODES } from "../../constants/authErrors";
import { useTranslation } from "react-i18next";

function LeftPanel({ tagline, features, trustedText }) {
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
                   <span style={{ color: "#0A0A0A", fontSize: 16, fontWeight: 500 }}>PubliCast</span>
      </div>

      <div className="flex flex-col justify-center flex-1 py-12">
        <h2 style={{ fontSize: 32, fontWeight: 500, color: "#FFF", marginBottom: 24, lineHeight: 1.3, maxWidth: 440 }}>
          {tagline}
        </h2>
        <div className="flex flex-col gap-4">
          {features.map((f, i) => (
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
        <div className="flex" style={{ marginLeft: -4 }}>
          {["NM", "SJ", "DC"].map((i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: "#333", border: "2px solid #0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#FFF", marginLeft: -4 }}>
              {i}
            </div>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "#777" }}>{trustedText}</span>
      </div>
    </div>
  );
}

export function LoginPage({ initialScreen = "login" }) {
  const { t } = useTranslation("auth");
  const { login, register, verifyOTP, loginVerify2FA } = useAuth();
  const [screen, setScreen] = useState(initialScreen);
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [preAuthToken, setPreAuthToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passStrength, setPassStrength] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Restore timer from localStorage on mount
  useEffect(() => {
    const timerExpiry = localStorage.getItem(STORAGE_KEYS.RESEND_TIMER_EXPIRY);
    if (timerExpiry) {
      const remaining = Math.round((parseInt(timerExpiry) - Date.now()) / 1000);
      if (remaining > 0) {
        setResendTimer(remaining);
      } else {
        localStorage.removeItem(STORAGE_KEYS.RESEND_TIMER_EXPIRY);
      }
    }
  }, []);

  // Restore state from router state
  useEffect(() => {
    if (initialScreen === "verify-otp") {
      const stateEmail = location.state?.email;
      if (!stateEmail) {
        toast.error("Không tìm thấy thông tin xác thực. Vui lòng đăng ký lại.");
        navigate("/signup", { replace: true });
        return;
      }
      setEmail(stateEmail);
    }
    setScreen(initialScreen);
  }, [initialScreen, location.state, navigate]);

  // Surface OAuth callback errors redirected back from the backend (e.g. Google
  // login attempted with an email that has no account yet).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("error") === GOOGLE_OAUTH_ERROR_CODES.ACCOUNT_NOT_LINKED) {
      toast.error(t("errors.googleAccountNotLinked"));
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, t]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error(t("errors.fillLogin"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (res && res.require2FA) {
        setPreAuthToken(res.preAuthToken);
        setScreen("verify-2fa");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (err.message && err.message.includes("Account not activated")) {
        toast.info(t("errors.activationRequired"));
        navigate("/register/verify-otp", { state: { email } });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    if (e) e.preventDefault();
    if (!twoFactorCode) {
      toast.error("Vui lòng nhập mã xác thực bảo mật 2 lớp.");
      return;
    }
    setIsLoading(true);
    try {
      await loginVerify2FA(preAuthToken, twoFactorCode);
      navigate("/dashboard");
    } catch (err) {
      // Handled by store
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error(t("errors.fillAll"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("errors.passwordMismatch"));
      return;
    }
    setIsLoading(true);
    try {
      await register({ name: fullName, email, password, confirmPassword });
      
      const expiry = Date.now() + 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.RESEND_TIMER_EXPIRY, expiry.toString());
      setResendTimer(60);
      
      navigate("/register/verify-otp", { state: { email } });
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      toast.error(t("errors.enterOtp"));
      return;
    }
    setIsLoading(true);
    try {
      await verifyOTP(email, otp);
      localStorage.removeItem(STORAGE_KEYS.IS_VERIFYING_OTP);
      localStorage.removeItem(STORAGE_KEYS.PENDING_VERIFY_EMAIL);
      // Sau khi verify thành công, vào thẳng Dashboard — Dashboard tự redirect
      // sang /manage/workplace/new khi phát hiện brand vẫn còn tên mặc định
      // lúc đăng ký.
      navigate("/dashboard");
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      await authService.resendOTP(email);
      toast.success(t("verify.otpResentSuccess"));
      const expiry = Date.now() + 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.RESEND_TIMER_EXPIRY, expiry.toString());
      setResendTimer(60);
    } catch (err) {
      toast.error(err.message || t("verify.otpResentFailure"));
    }
  };

  const checkPasswordStrength = (p) => {
    let strength = 0;
    if (p.length > 6) strength++;
    if (/[A-Z]/.test(p)) strength++;
    if (/[0-9]/.test(p)) strength++;
    if (/[!@#$%]/.test(p)) strength++;
    setPassStrength(strength);
  };

  const STRENGTH_COLOR = ["#E5E7EB", "#DC2626", "#D97706", "#16A34A", "#16A34A"];
  const STRENGTH_LABEL = ["", t("strength.weak"), t("strength.medium"), t("strength.strong"), t("strength.veryStrong")];

  const handleGoogleLogin = async () => {
    try {
      const { url } = await authService.getGoogleLoginUrl();
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(t("errors.googleLoginFailed"));
    }
  };

  if (screen === "login" || screen === "signup" || screen === "verify-otp" || screen === "verify-2fa") {
    return (
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <LeftPanel
          tagline="Manage your social media — all in one place"
          features={[
            "Schedule posts across 7+ platforms simultaneously",
            "Publish & analyze content on YouTube, Facebook, TikTok & more",
            "Collaborate with your team using role-based permissions",
          ]}
          trustedText="Trusted by 150,000+ creators"
        />

        {/* Right Panel */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
          <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
            {screen === "login" ? (
              <>
                <div className="md:hidden flex items-center gap-2 mb-8">
                   <div style={{ width: 28, height: 28, background: "#0A0A0A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Wifi size={14} color="#FFF" />
                   </div>
                   <span style={{ color: "#0A0A0A", fontSize: 16, fontWeight: 500 }}>PubliCast</span>
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>{t("login.title")}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>{t("login.subtitle")}</p>

                <form onSubmit={handleLogin} className="flex flex-col gap-4 mb-6">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>{t("login.emailLabel")}</label>
                    <input id="email" type="email" placeholder="you@company.com" value={email || ""} onChange={(e) => setEmail(e.target.value)}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} required />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{t("login.passwordLabel")}</label>
                      <button 
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-[12px] color-[#2563EB] cursor-pointer bg-transparent border-none hover:underline"
                        style={{ color: "#2563EB" }}
                      >
                        {t("login.forgotPassword")}
                      </button>
                    </div>
                    <div className="relative">
                      <input id="password" type={showPass ? "text" : "password"} placeholder="••••••••" value={password || ""} onChange={(e) => setPassword(e.target.value)}
                        style={{ width: "100%", padding: "12px 40px 12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} required />
                      <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{ width: "100%", height: 46, borderRadius: 10, background: "#0A0A0A", color: "#FFF", fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 12, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : t("login.submitBtn")}
                  </button>
                </form>

                <div className="flex items-center gap-3 mb-6">
                  <div style={{ flex: 1, height: 0.5, background: "#E5E7EB" }} />
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>or</span>
                  <div style={{ flex: 1, height: 0.5, background: "#E5E7EB" }} />
                </div>

                <div className="flex flex-col gap-3 mb-8">
                  <button 
                    onClick={handleGoogleLogin}
                    style={{ width: "100%", height: 46, borderRadius: 10, background: "#FFF", color: "#0A0A0A", fontSize: 14, fontWeight: 400, cursor: "pointer", border: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 16 }}>G</span> {t("login.continueGoogle")}
                  </button>
                </div>

                <div style={{ textAlign: "center", fontSize: 14, color: "#6B7280" }}>
                  {t("login.noAccount")}{" "}
                  <span style={{ color: "#0A0A0A", fontWeight: 500, cursor: "pointer" }} onClick={() => navigate("/signup")}>
                    {t("login.signupLink")}
                  </span>
                </div>
              </>
            ) : screen === "signup" ? (
              <>
                <div className="md:hidden flex items-center gap-2 mb-8">
                   <div style={{ width: 28, height: 28, background: "#0A0A0A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Wifi size={14} color="#FFF" />
                   </div>
                   <span style={{ color: "#0A0A0A", fontSize: 16, fontWeight: 500 }}>PubliCast</span>
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>{t("register.title")}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>{t("register.subtitle")}</p>

                <form onSubmit={handleRegister} className="flex flex-col gap-4 mb-6">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>{t("register.fullNameLabel")}</label>
                    <input type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>{t("register.emailLabel")}</label>
                    <input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>{t("register.passwordLabel")}</label>
                    <div className="relative">
                      <input id="password" type={showPass ? "text" : "password"} placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          checkPasswordStrength(e.target.value);
                        }}
                        style={{ width: "100%", padding: "12px 40px 12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} required />
                      <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passStrength > 0 && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex gap-1.5 flex-1">
                          {[1, 2, 3, 4].map((s) => (
                            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= passStrength ? STRENGTH_COLOR[passStrength] : "#E5E7EB" }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: STRENGTH_COLOR[passStrength] }}>{STRENGTH_LABEL[passStrength]}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>{t("register.confirmPasswordLabel")}</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ width: "100%", padding: "12px 40px 12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} required />
                    </div>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer mt-2">
                    <input type="checkbox" style={{ accentColor: "#0A0A0A", marginTop: 2 }} required />
                    <span style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                      {t("register.termsText")}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{ width: "100%", height: 46, borderRadius: 10, background: "#0A0A0A", color: "#FFF", fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 12, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : t("register.submitBtn")}
                  </button>
                </form>

                <div style={{ textAlign: "center", fontSize: 14, color: "#6B7280" }}>
                  {t("register.hasAccount")}{" "}
                  <span style={{ color: "#0A0A0A", fontWeight: 500, cursor: "pointer" }} onClick={() => navigate("/login")}>
                    {t("register.loginLink")}
                  </span>
                </div>
              </>
            ) : screen === "verify-2fa" ? (
              <>
                <div className="md:hidden flex items-center gap-2 mb-8">
                   <div style={{ width: 28, height: 28, background: "#0A0A0A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Wifi size={14} color="#FFF" />
                   </div>
                   <span style={{ color: "#0A0A0A", fontSize: 16, fontWeight: 500 }}>PubliCast</span>
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>Bảo mật 2 lớp</h3>
                <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>Vui lòng nhập mã xác thực từ ứng dụng Authenticator của bạn hoặc mã backup dự phòng.</p>

                <form onSubmit={handleVerify2FA} className="flex flex-col gap-6 mb-6">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Mã xác thực (TOTP / Backup Code)</label>
                    <input type="text" placeholder="000000" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} maxLength={8}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 24, fontWeight: 700, letterSpacing: 4, textAlign: "center", outline: "none", height: 56 }} required />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{ width: "100%", height: 46, borderRadius: 10, background: "#0A0A0A", color: "#FFF", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Xác nhận đăng nhập"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setScreen("login");
                      setTwoFactorCode("");
                    }}
                    style={{ width: "100%", marginTop: 12 }}
                    className="text-center text-sm text-muted-foreground hover:text-black transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Quay lại đăng nhập
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="md:hidden flex items-center gap-2 mb-8">
                   <div style={{ width: 28, height: 28, background: "#0A0A0A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Wifi size={14} color="#FFF" />
                   </div>
                   <span style={{ color: "#0A0A0A", fontSize: 16, fontWeight: 500 }}>PubliCast</span>
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>{t("verify.title")}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>{t("verify.subtitle", { email })}</p>

                <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6 mb-6">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>{t("verify.codeLabel")}</label>
                    <input type="text" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 24, fontWeight: 700, letterSpacing: 8, textAlign: "center", outline: "none", height: 56 }} required />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{ width: "100%", height: 46, borderRadius: 10, background: "#0A0A0A", color: "#FFF", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : t("verify.submitBtn")}
                  </button>
                </form>

                <div style={{ textAlign: "center", fontSize: 14, color: "#6B7280" }}>
                  {t("verify.noCode")}{" "}
                  <button 
                    type="button"
                    disabled={resendTimer > 0}
                    style={{ color: resendTimer > 0 ? "#9CA3AF" : "#0A0A0A", fontWeight: 500, cursor: resendTimer > 0 ? "not-allowed" : "pointer", background: "none", border: "none", padding: 0, fontSize: 14 }} 
                    onClick={handleResendOTP}
                  >
                    {resendTimer > 0 ? t("verify.resendTimer", { n: resendTimer }) : t("verify.resendBtn")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
