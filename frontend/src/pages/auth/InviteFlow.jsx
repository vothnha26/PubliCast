import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, AlertTriangle, Loader2 } from "lucide-react";
import teamService from "../../services/team.service";
import { toast } from "sonner";
import { STORAGE_KEYS } from "../../constants/storageKeys";

export function InviteFlow() {
  const location = useLocation();
  const navigate = useNavigate();

  const [screen, setScreen] = useState("loading"); // loading, landing, accepted, expired, already-member
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const params = new URLSearchParams(location.search);
  const token = params.get("token");

  useEffect(() => {
    if (!token) {
      setScreen("expired");
      setErrorMsg("Mã lời mời không tồn tại.");
      return;
    }

    const validateToken = async () => {
      try {
        const response = await teamService.validateInvitation(token);
        setInviteDetails(response);
        setScreen("landing");
      } catch (err) {
        setScreen("expired");
        setErrorMsg(err.message || "Liên kết lời mời không hợp lệ hoặc đã hết hạn.");
      }
    };

    validateToken();
  }, [token]);

  const handleAccept = async () => {
    if (inviteDetails?.isNewUser && (!name.trim() || !password.trim())) {
      toast.error("Vui lòng nhập đầy đủ Họ tên và Mật khẩu");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await teamService.acceptInvitation({
        token,
        name: inviteDetails?.isNewUser ? name : undefined,
        password: inviteDetails?.isNewUser ? password : undefined
      });

      // Auth is via the HttpOnly cookies the backend sets alongside this
      // response — the subsequent full-page navigation to /dashboard below
      // re-authenticates via that cookie, no token needs to be stored here.
      const brandId = response?.brandId;
      if (brandId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BRAND_ID, brandId);
      }

      setScreen("accepted");
      toast.success("Chấp nhận lời mời thành công!");
    } catch (err) {
      toast.error(err.message || "Không thể chấp nhận lời mời");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F7]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-black" size={32} />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang kiểm tra lời mời...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {screen === "landing" && inviteDetails && (
        <div className="flex h-screen">
          {/* Left - black */}
          <div className="w-2/5 bg-[#0A0A0A] flex flex-col p-8">
            <div className="flex items-center gap-2 mb-auto">
              <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                <span style={{ fontSize: 10, color: "#0A0A0A", fontWeight: 700 }}>P</span>
              </div>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>PubliCast</span>
            </div>
            <div className="flex flex-col items-center text-center py-12">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mb-3">
                <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
                  {inviteDetails.inviterName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 15, color: "#fff", marginBottom: 4 }}>
                {inviteDetails.inviterName} đã mời bạn
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>
                tham gia vào thương hiệu trên PubliCast
              </p>
              <div className="px-4 py-2 rounded-full mb-4" style={{ backgroundColor: "#1E1E1E", border: "0.5px solid #333" }}>
                <span style={{ fontSize: 14, color: "#DDD" }}>Lời mời làm cộng tác viên</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                  {inviteDetails.brandName?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, color: "#fff" }}>{inviteDetails.brandName}</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#555", marginTop: "auto" }}>publicast.com</p>
          </div>

          {/* Right - white */}
          <div className="flex-1 flex items-center justify-center p-12 bg-[#F8F8F7]">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm" style={{ maxWidth: 400, width: "100%" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0A0A0A", marginBottom: 6 }}>
                {inviteDetails.isNewUser ? "Tạo tài khoản & Tham gia" : "Chấp nhận lời mời"}
              </h2>
              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>
                {inviteDetails.isNewUser 
                  ? "Vui lòng hoàn tất thông tin bên dưới để bắt đầu." 
                  : `Bạn đang đăng nhập bằng email ${inviteDetails.email}.`
                }
              </p>
              <div className="space-y-4">
                {inviteDetails.isNewUser ? (
                  <>
                    <div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Họ tên của bạn"
                        className="w-full px-3 py-2.5 rounded-xl outline-none"
                        style={{ fontSize: 14, border: "1px solid #E5E7EB", color: "#0A0A0A", height: 42 }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <input
                        value={inviteDetails.email}
                        disabled
                        className="w-full px-3 py-2.5 rounded-xl"
                        style={{ fontSize: 14, height: 42, backgroundColor: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E5E7EB" }}
                      />
                      <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>Email nhận lời mời</p>
                    </div>
                    <div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        className="w-full px-3 py-2.5 rounded-xl outline-none"
                        style={{ fontSize: 14, border: "1px solid #E5E7EB", color: "#0A0A0A", height: 42 }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Bạn sẽ tham gia thương hiệu này với tài khoản:</p>
                    <p className="text-sm font-bold text-black mt-1">{inviteDetails.email}</p>
                  </div>
                )}
                <button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#0A0A0A] text-white hover:bg-[#1E1E1E] transition-colors flex items-center justify-center gap-2"
                  style={{ fontSize: 14, fontWeight: 700 }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Đang chấp nhận...
                    </>
                  ) : (
                    inviteDetails.isNewUser ? "Tạo tài khoản & Chấp nhận" : "Chấp nhận lời mời"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === "accepted" && inviteDetails && (
        <div className="flex items-center justify-center h-screen bg-[#F8F8F7]">
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm" style={{ maxWidth: 480 }}>
            <div className="w-14 h-14 rounded-full bg-[#0A0A0A] flex items-center justify-center mx-auto mb-5">
              <Check size={24} color="#fff" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", marginBottom: 6 }}>Chào mừng bạn đến với thương hiệu!</h2>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>Bạn đã tham gia nhóm thành công.</p>
            <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-2xl bg-gray-50" style={{ border: "1px solid #E5E7EB" }}>
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                {inviteDetails.brandName?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>{inviteDetails.brandName}</span>
            </div>
            <button 
              onClick={() => {
                // Force a page refresh to reload brand context with new membership
                window.location.href = "/dashboard";
              }}
              className="w-full py-3 rounded-xl bg-[#0A0A0A] text-white mb-3 hover:bg-gray-900 transition-all font-bold"
              style={{ fontSize: 14 }}
            >
              Đi tới Dashboard →
            </button>
          </div>
        </div>
      )}

      {screen === "expired" && (
        <div className="flex items-center justify-center h-screen bg-[#F8F8F7]">
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm" style={{ maxWidth: 480 }}>
            <AlertTriangle size={48} color="#EF4444" className="mx-auto mb-5" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0A0A0A", marginBottom: 8 }}>Lời mời đã hết hạn hoặc không tồn tại</h2>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
              {errorMsg || "Liên kết mời cộng tác viên chỉ có hiệu lực trong vòng 7 ngày. Vui lòng liên hệ với người quản trị để nhận lại lời mời mới."}
            </p>
            <button 
              onClick={() => navigate("/login")}
              className="px-5 py-2.5 rounded-xl w-full bg-[#0A0A0A] text-white font-bold text-xs hover:bg-gray-900 transition-all"
            >
              Đi tới trang Đăng nhập
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
