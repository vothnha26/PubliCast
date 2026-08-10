import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  X, Check, ChevronRight, ChevronLeft, Globe,
  Plus, Users, Image as ImageIcon, Upload, Sparkles, Diamond, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import profileService from "../../services/profile.service";
import socialService from "../../services/social.service";
import teamService from "../../services/team.service";

export function CreateWorkplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeBrand, updateBrand, createBrand } = useBrand();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: activeBrand?.name || "",
    industry: activeBrand?.industry || "Technology",
    logo: activeBrand?.logo || null
  });
  const [emailList, setEmailList] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);

  const addEmailFromInput = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed && trimmed.includes("@") && !emailList.includes(trimmed)) {
      setEmailList(prev => [...prev, trimmed]);
      setEmailInput("");
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
      e.preventDefault();
      addEmailFromInput();
    } else if (e.key === "Backspace" && !emailInput && emailList.length > 0) {
      setEmailList(prev => prev.slice(0, -1));
    }
  };

  const removeEmail = (emailToRemove) => {
    setEmailList(prev => prev.filter(e => e !== emailToRemove));
  };
  const fileInputRef = useRef(null);

  // Đồng bộ thông tin thương hiệu hiện tại vào formData
  useEffect(() => {
    if (activeBrand?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: activeBrand.name }));
    }
  }, [activeBrand]);

  // Kiểm tra nếu quay lại từ OAuth callback với query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get("success");
    const error = params.get("error");
    const targetStep = params.get("step");

    if (targetStep) {
      setStep(parseInt(targetStep, 10));
    }

    if (success) {
      const platformName = success.replace("_connected", "").toUpperCase();
      toast.success(`Kết nối ${platformName} thành công!`);
      setStep(2); // Giữ người dùng ở bước 2 Connect Platforms
      // Dọn dẹp query param trên URL
      const cleanUrl = location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else if (error) {
      toast.error(`Kết nối thất bại: ${params.get("message") || error}`);
      setStep(2);
      const cleanUrl = location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [location.search, location.pathname]);

  const closeTarget = (typeof location.state?.from === "string" && location.state.from.startsWith("/"))
    ? location.state.from
    : "/dashboard";

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, logo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const isOnboarding = activeBrand && !activeBrand.onboardingCompleted;

  const handleStep1Next = async () => {
    if (!formData.name.trim()) return;
    setIsSaving(true);
    try {
      if (isOnboarding) {
        await profileService.editProfile({
          fullName: user?.fullName,
          industry: formData.industry,
        });
        await updateBrand(activeBrand.id, { 
          name: formData.name.trim(),
          onboardingCompleted: true 
        });
      } else {
        const newBrand = await createBrand({ 
          name: formData.name.trim(), 
          industry: formData.industry,
          onboardingCompleted: true
        });
      }
      nextStep();
    } catch (err) {
      toast.error("Không thể lưu thông tin thương hiệu");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectPlatform = async (platformName) => {
    if (!activeBrand?.id) {
      toast.error("Vui lòng hoàn thành thông tin thương hiệu trước khi kết nối.");
      return;
    }

    setConnectingPlatform(platformName);
    try {
      let res;
      // Đường dẫn hiện tại để backend redirect quay lại sau khi xác thực OAuth
      const returnOrigin = `${window.location.origin}/manage/workplace/new?step=2`;

      switch (platformName.toUpperCase()) {
        case "YOUTUBE":
          res = await socialService.getGoogleAuthUrl(activeBrand.id, returnOrigin);
          break;
        case "FACEBOOK":
          res = await socialService.getFacebookAuthUrl(activeBrand.id, returnOrigin);
          break;
        case "TIKTOK":
          res = await socialService.getTikTokAuthUrl(activeBrand.id, returnOrigin);
          break;
        case "INSTAGRAM":
          res = await socialService.getInstagramAuthUrl(activeBrand.id, returnOrigin);
          break;
        default:
          toast.error("Nền tảng chưa hỗ trợ OAuth tự động.");
          return;
      }

      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error("Không thể lấy liên kết xác thực.");
      }
    } catch (err) {
      toast.error(`Lỗi kết nối ${platformName}: ${err.message || "Thử lại sau"}`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleFinalize = async () => {
    setIsSaving(true);
    try {
      // Brand đã được tạo/cập nhật xong ở handleStep1Next (step 1) — Finalize
      // chỉ còn việc gửi lời mời, không tạo/update brand lần nữa (làm vậy
      // trước đây tạo ra một workspace trùng tên mỗi lần hoàn tất wizard).
      const targetBrandId = activeBrand?.id;

      // Gom cả email đang nhập dở trong ô input nếu có
      const finalEmails = [...emailList];
      const pendingInput = emailInput.trim().toLowerCase();
      if (pendingInput && pendingInput.includes("@") && !finalEmails.includes(pendingInput)) {
        finalEmails.push(pendingInput);
      }

      if (finalEmails.length > 0 && targetBrandId) {
        let successCount = 0;
        for (const email of finalEmails) {
          try {
            await teamService.inviteMember({
              brandId: targetBrandId,
              email,
              role: "STAFF"
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to invite ${email}:`, err);
          }
        }
        if (successCount > 0) {
          toast.success(`Đã gửi lời mời tới ${successCount} thành viên!`);
        }
      }

      nextStep();
    } catch (err) {
      toast.error("Không thể lưu thông tin thiết lập");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background overflow-y-auto">
      {/* Top Header / Progress */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
           <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center text-background font-bold text-xs shadow-lg">S</div>
           <span className="text-sm font-bold text-foreground">Create New Workplace</span>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-2">
           {[1, 2, 3].map(i => (
             <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? "w-12 bg-foreground" : "w-6 bg-muted"}`} />
           ))}
        </div>

        <button onClick={() => navigate(closeTarget)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground cursor-pointer">
           <X size={20} />
        </button>
      </div>

      <div className="w-full max-w-2xl bg-card rounded-[40px] shadow-2xl overflow-hidden border border-border mt-16 animate-in zoom-in-95 duration-300">
        <div className="p-12">
           {step === 1 && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                   <div className="w-16 h-16 bg-yellow-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-yellow-100 shadow-inner">
                      <Diamond size={28} className="text-yellow-600" />
                   </div>
                   <h2 className="text-2xl font-black text-[#0A0A0A]">Brand Identity</h2>
                   <p className="text-gray-500 mt-2">Define your brand and give it a unique look.</p>
                </div>

                <div className="grid grid-cols-12 gap-8 mb-10">
                   {/* Logo Upload */}
                   <div className="col-span-4 flex flex-col items-center gap-3">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-[32px] bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all relative overflow-hidden group shadow-inner"
                      >
                         {formData.logo ? (
                           <img src={formData.logo} className="w-full h-full object-cover" alt="Logo" />
                         ) : (
                           <>
                             <ImageIcon size={24} className="text-gray-300 mb-1" />
                             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Logo</span>
                           </>
                         )}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recommended: Square</span>
                   </div>

                   {/* Basic Fields */}
                   <div className="col-span-8 space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Workplace Name</label>
                         <input 
                           placeholder="e.g. Acme Marketing" 
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                           className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background text-foreground focus:border-foreground outline-none transition-all text-sm font-bold shadow-sm focus:shadow-md" 
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Industry</label>
                         <select 
                           value={formData.industry}
                           onChange={(e) => setFormData({...formData, industry: e.target.value})}
                           className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background text-foreground focus:border-foreground outline-none text-sm font-bold shadow-sm cursor-pointer"
                         >
                            <option>Technology</option><option>Real Estate</option><option>Fashion</option><option>Entertainment</option><option>Food & Beverage</option>
                         </select>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={handleStep1Next}
                  disabled={!formData.name || isSaving}
                  className="w-full py-4 bg-foreground text-background rounded-2xl font-bold text-sm shadow-xl hover:bg-foreground/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                   {isSaving ? <Loader2 size={18} className="animate-spin" /> : <>Next: Connectivity <ChevronRight size={18} /></>}
                </button>
             </div>
           )}

           {step === 2 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-10">
                   <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                      <Globe size={28} className="text-blue-600" />
                   </div>
                   <h2 className="text-2xl font-black text-foreground">Connect Platforms</h2>
                   <p className="text-muted-foreground mt-2">Connect at least one network to enable analytics.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-10">
                   {[
                     { name: "YouTube", color: "#FF0000" },
                     { name: "Facebook", color: "#1877F2" },
                     { name: "TikTok", color: "#000000" },
                     { name: "Instagram", color: "#E1306C" },
                   ].map(p => (
                     <div key={p.name} className="p-4 rounded-2xl border border-border flex items-center justify-between group hover:border-foreground transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: p.color }}>{p.name.slice(0,2).toUpperCase()}</div>
                           <span className="text-xs font-bold text-foreground">{p.name}</span>
                        </div>
                        <button 
                          onClick={() => handleConnectPlatform(p.name)}
                          disabled={connectingPlatform === p.name}
                          className="text-[10px] font-black text-blue-500 uppercase group-hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          {connectingPlatform === p.name ? <Loader2 size={12} className="animate-spin" /> : "Connect"}
                        </button>
                     </div>
                   ))}
                </div>

                <div className="flex gap-3">
                   <button onClick={prevStep} className="flex-1 py-4 border border-border rounded-2xl font-bold text-sm text-muted-foreground hover:bg-muted cursor-pointer">Back</button>
                   <button onClick={nextStep} className="flex-[2] py-4 bg-foreground text-background rounded-2xl font-bold text-sm shadow-xl hover:bg-foreground/90 cursor-pointer">Continue to Team →</button>
                </div>
                <div className="text-center mt-6">
                   <button onClick={nextStep} className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer">Skip for now</button>
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-10">
                   <div className="w-16 h-16 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                      <Users size={28} className="text-purple-600" />
                   </div>
                   <h2 className="text-2xl font-black text-foreground">Invite Your Team</h2>
                   <p className="text-muted-foreground mt-2">Workspaces are better with collaborators.</p>
                </div>

                <div className="space-y-4 mb-10">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Team Member Emails</label>
                    
                    {/* Tag Emails Container */}
                    <div className="min-h-32 p-4 rounded-2xl border border-border bg-background flex flex-wrap gap-2 items-start focus-within:border-foreground transition-all shadow-inner">
                       {emailList.map((email, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-xs border border-purple-500/20 animate-in fade-in zoom-in-95">
                             {email}
                             <button type="button" onClick={() => removeEmail(email)} className="hover:text-purple-900 cursor-pointer">
                                <X size={14} />
                             </button>
                          </span>
                       ))}
                       <input 
                         type="email"
                         value={emailInput}
                         onChange={(e) => setEmailInput(e.target.value)}
                         onKeyDown={handleEmailKeyDown}
                         onBlur={addEmailFromInput}
                         placeholder={emailList.length === 0 ? "Type email and press Enter, comma or space..." : "Add more email..."}
                         className="flex-1 min-w-[200px] bg-transparent outline-none text-sm font-medium py-1 placeholder:text-muted-foreground/60"
                       />
                    </div>

                    <div className="flex items-center justify-between px-1">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Pro: Up to 10 members in this workplace</span>
                       </div>
                       {emailList.length > 0 && (
                          <span className="text-[10px] font-black text-purple-600 uppercase">{emailList.length} member(s) added</span>
                       )}
                    </div>
                 </div>

                <div className="flex gap-3">
                   <button onClick={prevStep} disabled={isSaving} className="flex-1 py-4 border border-border rounded-2xl font-bold text-sm text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">Back</button>
                   <button onClick={handleFinalize} disabled={isSaving} className="flex-[2] py-4 bg-foreground text-background rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-foreground/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Finalize Workplace</>}
                   </button>
                </div>
             </div>
           )}

           {step === 4 && (
             <div className="text-center py-10 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-500/20">
                   <Check size={48} className="text-emerald-500" strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black text-foreground mb-4">Workplace Created! 🎉</h2>
                <p className="text-muted-foreground mb-10 max-w-sm mx-auto">Your new brand environment <b>{formData.name}</b> is ready for management.</p>
                
                <div className="flex flex-col gap-4">
                   <button onClick={() => navigate("/dashboard")} className="w-full py-4 bg-foreground text-background rounded-2xl font-bold shadow-xl hover:bg-foreground/90 cursor-pointer">Go to Dashboard</button>
                   <button onClick={() => navigate("/manage/connections?tab=connections")} className="w-full py-4 bg-muted text-muted-foreground rounded-2xl font-bold text-sm hover:bg-muted/80 cursor-pointer">Add more connections</button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
