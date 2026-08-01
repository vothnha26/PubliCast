import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import profileService from "../../services/profile.service";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { icon: "🎬", label: "Solo Creator", desc: "I create content independently" },
  { icon: "📣", label: "Marketing Team", desc: "I manage social for a company" },
  { icon: "🏢", label: "Agency", desc: "I manage multiple client brands" },
  { icon: "🏷️", label: "Brand", desc: "I represent a business brand" },
];

const PLATFORM_OPTIONS = [
  { name: "YouTube", emoji: "▶️" },
  { name: "Facebook", emoji: "📘" },
  { name: "Instagram", emoji: "📸" },
  { name: "TikTok", emoji: "🎵" },
  { name: "Twitch", emoji: "🎮" },
  { name: "LinkedIn", emoji: "💼" },
];

export function OnboardingModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { activeBrand, updateBrand } = useBrand();
  const [screen, setScreen] = useState("onboard1");
  const [selectedRole, setSelectedRole] = useState(null);
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [website, setWebsite] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const steps = ["onboard1", "onboard2", "onboard3", "complete"];
  const stepIdx = steps.indexOf(screen);

  const handleFinishSetup = async () => {
    if (!activeBrand) {
      toast.error("Không tìm thấy thương hiệu để cập nhật");
      return;
    }
    setIsLoading(true);
    try {
      await profileService.editProfile({
        fullName: user?.fullName,
        bio: selectedRole !== null ? ROLE_OPTIONS[selectedRole].label : "",
        industry,
      });

      // The default brand created at signup ("New Workspace") is renamed
      // here with the name entered in step 3, instead of leaving it as the
      // placeholder default forever or creating a second, redundant brand.
      // Note: Brand has no `website` column in the schema — the field above
      // is collected for a future use but isn't persisted anywhere yet.
      await updateBrand(activeBrand.id, {
        name: brandName.trim(),
      });

      setScreen("complete");
    } catch (err) {
      toast.error("Không thể lưu thông tin thiết lập");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setScreen("onboard1");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-6 overflow-y-auto">
      <div className="relative w-full max-w-[640px] bg-card rounded-[20px] p-12 border border-border shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
        {screen !== "complete" && (
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="absolute -top-3 -right-3 w-10 h-10 bg-[#2D1D35] text-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg z-[2100] border-2 border-white cursor-pointer disabled:opacity-50"
          >
            <X size={20} />
          </button>
        )}

        {/* Progress */}
        {screen !== "complete" && (
          <div className="flex items-center justify-center gap-3 mb-10">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: i === stepIdx ? 40 : 12, height: 8, borderRadius: 9999,
                background: i <= stepIdx ? "#0A0A0A" : "#E5E7EB",
                transition: "all 0.4s ease-in-out" }} />
            ))}
          </div>
        )}

        {screen === "onboard1" && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", marginBottom: 12 }}>
              Step 1 of 3
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", textAlign: "center", marginBottom: 8 }}>Tell us about yourself</h3>
            <p style={{ fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 36 }}>What best describes your use case?</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36 }}>
              {ROLE_OPTIONS.map((role, i) => (
                <button
                  key={role.label}
                  onClick={() => setSelectedRole(i)}
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    border: selectedRole === i ? "2px solid #0A0A0A" : "1px solid #E5E7EB",
                    cursor: "pointer",
                    background: "#FFF",
                    position: "relative",
                    textAlign: "left",
                    transition: "all 0.2s" }}
                >
                  {selectedRole === i && (
                    <div style={{ position: "absolute", top: 12, right: 12, width: 20, height: 20, borderRadius: "50%", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={11} color="#FFF" />
                    </div>
                  )}
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{role.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 4 }}>{role.label}</div>
                  <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.4 }}>{role.desc}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setScreen("onboard2")}
              style={{ width: "100%", height: 50, borderRadius: 12, background: "#0A0A0A", color: "#FFF", fontSize: 15, fontWeight: 600, cursor: "pointer", border: "none", opacity: selectedRole === null ? 0.5 : 1 }}
              disabled={selectedRole === null}
            >
              Continue →
            </button>
          </>
        )}

        {screen === "onboard2" && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", marginBottom: 12 }}>
              Step 2 of 3
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", textAlign: "center", marginBottom: 8 }}>Connect your platforms</h3>
            <p style={{ fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 36 }}>Connect at least one to get started. You can add more later.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 36 }}>
              {PLATFORM_OPTIONS.map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, border: "1px solid #E5E7EB", background: "#FFF" }}>
                  <span style={{ fontSize: 24 }}>{p.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", flex: 1 }}>{p.name}</span>
                  <button style={{ padding: "6px 12px", borderRadius: 8, background: "#0A0A0A", color: "#FFF", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none" }}>
                    Connect
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setScreen("onboard3")} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, color: "#9CA3AF", cursor: "pointer", background: "transparent" }}>
                Skip for now
              </button>
              <button onClick={() => setScreen("onboard3")} style={{ padding: "12px 32px", borderRadius: 12, background: "#0A0A0A", color: "#FFF", fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {screen === "onboard3" && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", marginBottom: 12 }}>
              Step 3 of 3
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", textAlign: "center", marginBottom: 8 }}>Name your Workspace</h3>
            <p style={{ fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 36 }}>Your workspace groups all your social accounts together.</p>

            <div className="flex flex-col gap-4 mb-8">
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Brand Name</label>
                <input placeholder="e.g. TechVN Studio" autoFocus
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", cursor: "pointer", height: 46 }}>
                  <option>Technology</option><option>Entertainment</option><option>Education</option><option>E-commerce</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Website URL (optional)</label>
                <input placeholder="https://yourbrand.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #E5E7EB", fontSize: 14, outline: "none", height: 46 }} />
              </div>
            </div>

            <button
              onClick={handleFinishSetup}
              disabled={isLoading || !brandName.trim()}
              style={{ width: "100%", height: 50, borderRadius: 12, background: "#0A0A0A", color: "#FFF", fontSize: 15, fontWeight: 600, cursor: "pointer", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Finish Setup →"}
            </button>
          </>
        )}

        {screen === "complete" && (
          <div className="flex flex-col items-center text-center gap-6 py-4">
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
              <Check size={40} color="#FFF" />
            </div>
            <div>
              <h3 style={{ fontSize: 28, fontWeight: 500, color: "#0A0A0A", marginBottom: 12 }}>You're all set! 🎉</h3>
              <p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.6, maxWidth: 400 }}>Your workspace is ready. Let's schedule your first post.</p>
            </div>
            <div className="flex flex-col w-full gap-3 mt-6">
              <button onClick={onClose}
                style={{ width: "100%", height: 50, borderRadius: 12, background: "#0A0A0A", color: "#FFF", fontSize: 15, fontWeight: 600, cursor: "pointer", border: "none" }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
