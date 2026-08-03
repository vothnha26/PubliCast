import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  ChevronDown, HelpCircle, Plus, Diamond, Share2, 
  Check, Youtube, ChevronUp, Loader2, AlertTriangle
} from "lucide-react";
import { ConnectionsGrid } from "../../components/shared/ConnectionsGrid";
import { WorkplaceHeader } from "../../components/shared/WorkplaceHeader";
import { BrandTableOverlay } from "../../components/shared/BrandTableOverlay";
import { CreateBrandModal } from "../../components/shared/CreateBrandModal";
import { useBrand } from "../../context/BrandContext";
import { toast } from "sonner";
import socialService from "../../services/social.service";
import aiService from "../../services/ai.service";
import { useConfirm } from "@/hooks/useConfirm";
import { useTranslation } from "react-i18next";

export function BrandSettingsPage() {
  const { t } = useTranslation(["manage", "common"]);
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("brand-settings");
  
  const { brands, createBrand, updateBrand, deleteBrand, activeBrand, selectBrand, loading, refreshBrands } = useBrand();

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTableOverlayOpen, setIsTableOverlayOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  // AI Model Configuration tab — which already-configured provider
  // (OpenAI/Gemini) this brand's AI generations use. null/"" = follow the
  // app-wide default. Never collects a brand-supplied API key.
  const [aiProviderInput, setAiProviderInput] = useState("");
  const [aiModelInput, setAiModelInput] = useState("");
  const [isAiSettingsLoading, setIsAiSettingsLoading] = useState(false);
  const [isAiSettingsSaving, setIsAiSettingsSaving] = useState(false);

  const allowedBrandsLimit = brands.reduce((max, b) => {
    const planName = b.currentPlan?.name;
    const fallbackMax = planName === 'PRO' ? 10 : planName === 'AGENCY' ? 50 : 3;
    const brandMax = b.currentPlan?.limits?.maxBrands ?? fallbackMax;
    return Math.max(max, brandMax);
  }, 3);
  const isLimitReached = brands.length >= allowedBrandsLimit;
  
  const dropdownRef = useRef(null);

  // Sync selected brand with activeBrand on initial load or switch
  useEffect(() => {
    if (activeBrand) {
      setSelectedBrand({ ...activeBrand });
    } else if (brands.length > 0) {
      setSelectedBrand({ ...brands[0] });
    } else {
      setSelectedBrand(null);
    }
  }, [activeBrand, brands]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const success = params.get("success");
    const error = params.get("error");

    if (success === "youtube_connected") {
      toast.success(t("brand.youtubeConnected"));
    } else if (success === "facebook_connected") {
      toast.success(t("brand.facebookConnected"));
    } else if (success === "tiktok_connected") {
      toast.success(t("brand.tiktokConnected"));
    }

    if (error === "social_connection_conflict") {
      const conflictType = params.get("conflictType");
      const channelName = params.get("channelName");
      const platformAccountId = params.get("platformAccountId");
      const platform = params.get("platform");
      const existingBrandName = params.get("existingBrandName");

      if (conflictType === "DIFFERENT_OWNER") {
        toast.error(t("brand.differentOwnerConflict", { channelName }));
      } else if (conflictType === "SAME_OWNER") {
        setConflictData({ channelName, platformAccountId, platform, existingBrandName });
      }
    } else if (error) {
      const errorMsg = params.get("message");
      toast.error(errorMsg || t("brand.connectionError", { error }));
    }
    
    if (tabParam === "connections") setActiveTab("connections");
    else if (tabParam === "ai") setActiveTab("ai-configuration");
    else setActiveTab("brand-settings");
  }, [location.search]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    let query = "";
    if (tabId === "connections") query = "?tab=connections";
    else if (tabId === "ai-configuration") query = "?tab=ai";
    else query = "?tab=brand-settings";
    navigate(`${location.pathname}${query}`);
  };

  useEffect(() => {
    if (activeTab !== "ai-configuration" || !activeBrand) return;
    let isMounted = true;
    setIsAiSettingsLoading(true);
    aiService.getSettings(activeBrand.id)
      .then((settings) => {
        if (!isMounted) return;
        setAiProviderInput(settings?.aiProvider || "");
        setAiModelInput(settings?.aiModel || "");
      })
      .catch((err) => {
        console.error("Failed to load AI settings:", err);
        toast.error(t("brand.aiLoadFailed", "Không thể tải cấu hình AI"));
      })
      .finally(() => {
        if (isMounted) setIsAiSettingsLoading(false);
      });
    return () => { isMounted = false; };
  }, [activeTab, activeBrand?.id]);

  const handleSaveAiSettings = async () => {
    if (!activeBrand) return;
    setIsAiSettingsSaving(true);
    try {
      await aiService.updateSettings(activeBrand.id, {
        aiProvider: aiProviderInput || null,
        aiModel: aiModelInput || null
      });
      toast.success(t("brand.aiSaveSuccess", "Đã lưu cấu hình AI"));
    } catch (err) {
      toast.error(err.message || t("brand.aiSaveFailed", "Không thể lưu cấu hình AI"));
    } finally {
      setIsAiSettingsSaving(false);
    }
  };

  const handleCreateBrand = async (brandData) => {
    try {
      const newBrand = await createBrand(brandData);
      if (newBrand) {
        setSelectedBrand({ ...newBrand });
        selectBrand(newBrand.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBrand = async () => {
    if (!selectedBrand || !selectedBrand.name.trim()) return;
    setIsUpdating(true);
    try {
      await updateBrand(selectedBrand.id, { name: selectedBrand.name.trim() });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!selectedBrand) return;
    if (brands.length <= 1) {
      toast.error(t("brand.cannotDeleteOnlyBrand"));
      return;
    }
    const isConfirmed = await confirm({
      title: t("brand.deleteConfirmTitle"),
      description: t("brand.deleteConfirmDesc", { name: selectedBrand.name }),
      confirmText: t("common:delete"),
      cancelText: t("common:cancel"),
      variant: "destructive"
    });
    if (!isConfirmed) return;
    setIsDeleting(true);
    try {
      await deleteBrand(selectedBrand.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReassign = async () => {
    if (!conflictData || !activeBrand) return;
    setIsUpdating(true);
    try {
      await socialService.reassignSocialAccount(conflictData.platform, conflictData.platformAccountId, activeBrand.id);
      toast.success(t("brand.moveSuccess", { channelName: conflictData.channelName, brandName: activeBrand.name }));
      await refreshBrands(activeBrand.id);
      setConflictData(null);
      navigate(location.pathname + "?tab=connections");
    } catch (e) {
      toast.error(e.message || t("brand.moveFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading && brands.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 font-sans">
      <h1 className="text-xl font-medium text-foreground mb-8">{t("brand.title")}</h1>

      {/* Brands Selector Section */}
      <div className="bg-muted/50 rounded-2xl p-6 border border-border mb-10 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">{t("brand.brands")}</span>
            <span className="text-xs text-muted-foreground font-medium">{brands.length > 0 ? t("brand.brandsCount", { count: brands.length }) : t("brand.noBrandsCount")}</span>
            <HelpCircle size={14} className="text-muted-foreground/50 ml-1" />
          </div>
          <button
            onClick={() => {
              if (isLimitReached) {
                setIsLimitModalOpen(true);
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#FEFCE8] border border-[#FEF08A] rounded-lg text-xs font-bold text-[#854D0E] hover:bg-[#FEF9C3] transition-all shadow-sm cursor-pointer add-brand-btn"
            data-testid="add-brand-btn"
          >
            <Plus size={14} /> {t("brand.addBrand")} <Diamond size={12} className="fill-current" />
          </button>
        </div>

        {selectedBrand ? (
          <div className="max-w-xl relative" ref={dropdownRef}>
             {/* Main Selection Bar */}
             <div 
               onClick={() => setIsDropdownOpen(!isDropdownOpen)}
               className={`bg-muted border border-border rounded-xl p-3 flex items-center justify-between shadow-sm cursor-pointer hover:border-foreground/30 transition-all ${isDropdownOpen ? 'rounded-b-none border-b-transparent' : ''}`}
             >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-[#E1306C] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {selectedBrand.name.charAt(0)}
                   </div>
                   <div>
                      <div className="text-sm font-bold text-foreground">{selectedBrand.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {selectedBrand.socialAccounts?.some(sa => sa.platform === 'YOUTUBE') && <Youtube size={12} className="text-red-600" />}
                      </div>
                   </div>
                </div>
                {isDropdownOpen ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
             </div>

             {/* Dropdown Menu */}
             {isDropdownOpen && (
               <div className="absolute top-full left-0 right-0 bg-card border border-border border-t-transparent rounded-b-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                  {brands.map((brand) => (
                    <div 
                      key={brand.id}
                      onClick={() => { setSelectedBrand({ ...brand }); selectBrand(brand.id); setIsDropdownOpen(false); }}
                      className="p-3 flex items-center gap-3 hover:bg-muted transition-colors cursor-pointer group brand-row"
                      data-testid={`brand-row-${brand.id}`}
                    >
                       <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ backgroundColor: '#E1306C' }}>
                          {brand.name.charAt(0)}
                       </div>
                       <div>
                          <div className="text-sm font-bold text-foreground">{brand.name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                             {brand.socialAccounts?.some(sa => sa.platform === 'YOUTUBE') && <Youtube size={12} className="text-red-600" />}
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
             )}

             <button 
               onClick={() => setIsTableOverlayOpen(true)}
               className="mt-3 text-xs text-muted-foreground hover:text-foreground font-medium ml-1 cursor-pointer"
             >
               {t("brand.viewAsTable")}
             </button>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm italic">{t("brand.noBrands")}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border mb-8">
        <div className="flex gap-10">
          {[
            { id: "brand-settings", label: t("brand.tabSettings") },
            { id: "connections", label: t("brand.tabConnections") },
            { id: "ai-configuration", label: t("brand.tabAi") },
          ].map((tab) => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`pb-4 text-sm font-black transition-all relative cursor-pointer ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground"}`}>
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-foreground" />}
            </button>
          ))}
        </div>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Share2 size={18} /></button>
      </div>

      <div className="max-w-6xl pb-20">
        {activeTab === "brand-settings" && selectedBrand && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
            <div className="grid grid-cols-2 gap-x-20 gap-y-10">
              <div className="space-y-8 col-span-2 md:col-span-1">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{t("brand.name")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("brand.nameDesc")}</p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("brand.brandName")}</label>
                    <input 
                      placeholder={t("brand.brandName")} 
                      value={selectedBrand.name} 
                      onChange={(e) => setSelectedBrand({...selectedBrand, name: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:border-foreground outline-none text-sm font-medium" 
                      data-testid="brand-name-input"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{t("brand.engagement")}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t("brand.engagementDesc")}</p>
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h3 className="text-lg font-bold text-foreground mb-2">{t("brand.image")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("brand.imageDesc")}</p>
                <div className="w-16 h-16 rounded-xl bg-[#581C2C] flex items-center justify-center relative cursor-pointer border-2 border-transparent hover:border-gray-200 shadow-sm">
                  {selectedBrand.logoUrl ? (
                     <img src={selectedBrand.logoUrl} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#34D399] flex items-center justify-center absolute -top-2 -right-2 border-2 border-white shadow-sm"><Check size={14} className="text-white" strokeWidth={3} /></div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="border-t border-border pt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDeleteBrand}
                disabled={isDeleting || brands.length <= 1}
                className="px-6 py-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed delete-btn"
                data-testid="delete-brand-btn"
                title={brands.length <= 1 ? t("brand.cannotDeleteOnlyBrand") : ""}
              >
                {isDeleting ? t("brand.deleting") : t("brand.deleteBrand")}
              </button>
              
              <button
                type="button"
                onClick={handleSaveBrand}
                disabled={isUpdating || !selectedBrand.name.trim() || selectedBrand.name.trim() === activeBrand?.name?.trim()}
                className="px-6 py-3 bg-[#2D1D35] hover:bg-[#3D2D45] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5 save-brand-btn"
                data-testid="save-brand-btn"
              >
                {isUpdating && <Loader2 className="animate-spin" size={12} />}
                {t("brand.saveChanges")}
              </button>
            </div>
          </div>
        )}

        {activeTab === "connections" && selectedBrand && (
           <div className="animate-in fade-in duration-300">
              <ConnectionsGrid brand={selectedBrand} />
           </div>
        )}

        {activeTab === "ai-configuration" && (
           <div className="space-y-8 animate-in fade-in duration-300 max-w-xl">
              <div>
                 <h3 className="text-lg font-bold text-foreground mb-2">{t("brand.aiProviderTitle", "Nhà cung cấp AI")}</h3>
                 <p className="text-sm text-muted-foreground mb-4">
                    {t("brand.aiProviderDesc", "Chọn model AI được dùng khi tạo nội dung cho thương hiệu này. Để trống để dùng mặc định của hệ thống.")}
                 </p>
              </div>

              {isAiSettingsLoading ? (
                 <div className="h-32 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="animate-spin" size={20} />
                 </div>
              ) : (
                 <div className="space-y-6">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("brand.aiProviderLabel", "Nhà cung cấp")}</label>
                       <select
                         value={aiProviderInput}
                         onChange={(e) => setAiProviderInput(e.target.value)}
                         className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:border-foreground outline-none text-sm font-medium cursor-pointer"
                       >
                          <option value="">{t("brand.aiProviderDefault", "Mặc định hệ thống")}</option>
                          <option value="GEMINI">Gemini</option>
                          <option value="OPENAI">OpenAI</option>
                       </select>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("brand.aiModelLabel", "Model (tuỳ chọn)")}</label>
                       <input
                         placeholder={t("brand.aiModelPlaceholder", "vd: gpt-4o-mini, gemini-2.5-flash")}
                         value={aiModelInput}
                         onChange={(e) => setAiModelInput(e.target.value)}
                         className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:border-foreground outline-none text-sm font-medium"
                       />
                       <p className="text-xs text-muted-foreground">
                          {t("brand.aiModelDesc", "Để trống để dùng model mặc định của nhà cung cấp đã chọn.")}
                       </p>
                    </div>

                    <div className="border-t border-border pt-6 flex justify-end">
                       <button
                         type="button"
                         onClick={handleSaveAiSettings}
                         disabled={isAiSettingsSaving}
                         className="px-6 py-3 bg-[#2D1D35] hover:bg-[#3D2D45] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                       >
                          {isAiSettingsSaving && <Loader2 className="animate-spin" size={12} />}
                          {t("brand.saveChanges")}
                       </button>
                    </div>
                 </div>
              )}
           </div>
        )}
      </div>

      {/* Table Overlay */}
      <BrandTableOverlay 
        isOpen={isTableOverlayOpen} 
        onClose={() => setIsTableOverlayOpen(false)} 
        brands={brands}
        onSelect={(brandName) => {
          const brand = brands.find(b => b.name === brandName);
          if (brand) {
            setSelectedBrand({ ...brand });
            selectBrand(brand.id);
          }
        }}
      />

      {/* Create Brand Modal */}
      <CreateBrandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateBrand}
      />

      {/* Limit Reached Modal */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-8 max-w-md w-full border border-border shadow-2xl mx-4 transform animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-200/40 rounded-full filter blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-200/30 rounded-full filter blur-2xl pointer-events-none"></div>

            <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-purple-200 mx-auto">
              <AlertTriangle size={26} className="animate-bounce" />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-2 font-sans">{t("brand.limitReachedTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-sans">
              {t("brand.limitReachedDesc", { limit: allowedBrandsLimit })}
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(false)}
                className="flex-1 py-3 border border-border hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer text-center font-sans"
              >
                {t("brand.cancel")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLimitModalOpen(false);
                  navigate('/pricing');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 font-sans"
              >
                {t("brand.upgradeNow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Connection Conflict Modal */}
      {conflictData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-8 max-w-md w-full border border-border shadow-2xl mx-4 transform animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
              <AlertTriangle size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-foreground mb-2 font-sans">{t("brand.conflictTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-sans">
              {t("brand.conflictDesc", { channelName: conflictData.channelName, existingBrandName: conflictData.existingBrandName, activeBrandName: activeBrand?.name })}
            </p>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setConflictData(null);
                  navigate(location.pathname + "?tab=connections");
                }}
                className="flex-1 py-3 border border-border hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer text-center font-sans"
              >
                {t("brand.cancel")}
              </button>
              
              <button
                type="button"
                onClick={handleReassign}
                disabled={isUpdating}
                className="flex-1 py-3 bg-[#2D1D35] hover:bg-[#3D2D45] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 font-sans"
              >
                {isUpdating && <Loader2 className="animate-spin" size={12} />}
                {t("brand.moveChannel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
