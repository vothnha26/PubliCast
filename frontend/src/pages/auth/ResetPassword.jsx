import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wifi, Check, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import authService from "../../services/auth.service";
import { toast } from "sonner";

function LeftPanel() {
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
          Bảo mật tài khoản của bạn
        </h2>
        <div className="flex flex-col gap-4">
          {[
            "Sử dụng mật khẩu mạnh với tối thiểu 8 ký tự",
            "Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt",
            "Không sử dụng lại mật khẩu cũ của bạn"
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
        <span style={{ fontSize: 13, color: "#777" }}>Được tin dùng bởi hơn 150,000+ nhà sáng tạo</span>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const queryToken = new URLSearchParams(location.search).get("token");
    if (!queryToken) {
      setIsTokenValid(false);
      setIsValidating(false);
      return;
    }
    setToken(queryToken);
    
    // Gọi API verify token
    authService.verifyResetToken(queryToken)
      .then((res) => {
        if (res.valid) {
          setIsTokenValid(true);
          setEmail(res.email);
        } else {
          setIsTokenValid(false);
        }
      })
      .catch((err) => {
        setIsTokenValid(false);
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Vui lòng điền đầy đủ các thông tin.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải dài ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ token, newPassword, confirmPassword });
      toast.success("Mật khẩu đã được đặt lại thành công!");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      <LeftPanel />

      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
        <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
          
          {isValidating ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 size={36} className="animate-spin text-foreground" />
              <p className="text-sm text-muted-foreground">Đang xác thực liên kết...</p>
            </div>
          ) : !isTokenValid ? (
            <div className="text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-3">Đường dẫn không hợp lệ</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Liên kết khôi phục mật khẩu này đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu một liên kết khôi phục mật khẩu mới.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => navigate("/forgot-password")}
                  className="w-full py-3 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Yêu cầu liên kết mới
                </button>
                <button 
                  onClick={() => navigate("/login")}
                  className="w-full py-3 border border-border bg-card rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-2xl font-medium text-foreground mb-2">Đặt lại mật khẩu</h3>
              <p className="text-sm text-muted-foreground mb-8">
                Đang thiết lập mật khẩu mới cho tài khoản: <strong className="text-foreground">{email}</strong>
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Mật khẩu mới</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type={showPass ? "text" : "password"} 
                      required
                      placeholder="Min. 8 characters" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card text-foreground focus:border-foreground outline-none text-sm transition-all" 
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type={showPass ? "text" : "password"} 
                      required
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card text-foreground focus:border-foreground outline-none text-sm transition-all" 
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Đặt lại mật khẩu"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
