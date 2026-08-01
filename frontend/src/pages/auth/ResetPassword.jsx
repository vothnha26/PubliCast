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
        <span style={{ color: "#FFF", fontSize: 16, fontWeight: 500 }}>PubliCast</span>
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
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      <LeftPanel />

      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
        <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
          
          {isValidating ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 size={36} className="animate-spin text-gray-900" />
              <p className="text-sm text-gray-500">Đang xác thực liên kết...</p>
            </div>
          ) : !isTokenValid ? (
            <div className="text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 500, color: "#0A0A0A", marginBottom: 12 }}>Đường dẫn không hợp lệ</h3>
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 32 }}>
                Liên kết khôi phục mật khẩu này đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu một liên kết khôi phục mật khẩu mới.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => navigate("/forgot-password")}
                  className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  Yêu cầu liên kết mới
                </button>
                <button 
                  onClick={() => navigate("/login")}
                  className="w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Đặt lại mật khẩu</h3>
              <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>
                Đang thiết lập mật khẩu mới cho tài khoản: <strong className="text-gray-900">{email}</strong>
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mật khẩu mới</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type={showPass ? "text" : "password"} 
                      required
                      placeholder="Min. 8 characters" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-[#0A0A0A] outline-none text-sm transition-all" 
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type={showPass ? "text" : "password"} 
                      required
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-[#0A0A0A] outline-none text-sm transition-all" 
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
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
