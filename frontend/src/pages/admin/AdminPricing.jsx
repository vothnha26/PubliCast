import { useState, useEffect } from "react";
import { Plus, X, Check, Settings2, Edit3, Trash2, Box, Layers, Globe, Zap, Megaphone, Loader2 } from "lucide-react";
import adminService from "../../services/admin.service";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";

// Icons mapping for products based on database IDs/slugs
const PRODUCT_ICONS = {
  youtube_analytics: <Globe size={14} />,
  facebook_management: <Globe size={14} />,
  tiktok_creative: <Globe size={14} />,
  instagram_insights: <Globe size={14} />,
  ai_content_engine: <Zap size={14} />,
  ai_best_time: <Zap size={14} />,
  ads_manager: <Megaphone size={14} />,
  unified_inbox: <Megaphone size={14} />,
  custom_links: <Box size={14} />
};

function PlanModal({ isOpen, onClose, onSave, plan = null, availableLimits = [], availableProducts = [] }) {
  const [formData, setFormData] = useState(plan ? {
    name: plan.name,
    priceAmount: plan.price.amount,
    billingCycle: plan.billingCycle,
    description: plan.description || "",
    planLimitId: plan.planLimitId || availableLimits[0]?.id || "",
    isActive: plan.isActive,
    includedProducts: plan.includedProducts || [],
    mostPopular: false
  } : {
    name: "STARTER",
    priceAmount: 19,
    currency: "USD",
    billingCycle: "MONTHLY",
    description: "",
    planLimitId: availableLimits[0]?.id || "",
    isActive: true,
    includedProducts: [],
    mostPopular: false
  });

  const toggleProduct = (prodId) => {
    const next = formData.includedProducts.includes(prodId)
      ? formData.includedProducts.filter(id => id !== prodId)
      : [...formData.includedProducts, prodId];
    setFormData({...formData, includedProducts: next});
  };

  const groupedProducts = availableProducts.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
           <div>
             <h3 className="text-xl font-bold text-[#0A0A0A]">{plan ? "Edit Plan Bundle" : "Create New Plan"}</h3>
             <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Package Configuration</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black">
              <X size={24} />
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-12">
           {/* Left Col: Basics & Limits */}
           <div className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan Name</label>
                   <select 
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all text-sm font-medium"
                   >
                      {["FREE", "STARTER", "PRO", "AGENCY"].map(n => <option key={n} value={n}>{n}</option>)}
                   </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price ($)</label>
                      <input 
                        type="number"
                        value={formData.priceAmount}
                        onChange={(e) => setFormData({...formData, priceAmount: Number(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all text-sm font-bold" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Billing Cycle</label>
                      <select 
                        value={formData.billingCycle}
                        onChange={(e) => setFormData({...formData, billingCycle: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all text-sm font-bold text-green-600"
                      >
                         <option value="MONTHLY">Monthly</option>
                         <option value="ANNUAL">Annual</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Limit Configuration</label>
                   <select 
                     value={formData.planLimitId}
                     onChange={(e) => setFormData({...formData, planLimitId: e.target.value})}
                     className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all text-sm font-medium"
                   >
                      {availableLimits.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.maxBrands} Brands / {l.maxSocialProfiles} Profiles / {l.maxStreamQuality}
                        </option>
                      ))}
                   </select>
                </div>
              </div>
           </div>

           {/* Right Col: Product Selection (Categorized) */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bundle Feature Catalog</label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formData.includedProducts.length} items bundled</span>
              </div>
              
              <div className="space-y-8 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                 {Object.entries(groupedProducts).map(([category, products]) => (
                   <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{category}</span>
                         <div className="h-px flex-1 bg-gray-100"></div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                         {products.map((prod) => {
                           const isSelected = formData.includedProducts.includes(prod.id);
                           const icon = PRODUCT_ICONS[prod.id] || <Box size={14} />;
                           return (
                             <div 
                               key={prod.id} 
                               onClick={() => toggleProduct(prod.id)}
                               className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? "border-[#0A0A0A] bg-gray-50 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}
                             >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? "bg-black text-white" : "bg-gray-100 text-gray-400"}`}>
                                   {icon}
                                </div>
                                <div className="flex-1">
                                   <div className="text-xs font-bold text-[#0A0A0A]">{prod.name}</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? "bg-[#16A34A] border-[#16A34A] scale-110" : "border-gray-200"}`}>
                                   {isSelected && <Check size={10} className="text-white" />}
                                </div>
                             </div>
                           );
                         })}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 flex justify-end gap-4 border-t border-gray-100">
           <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
           <button 
             onClick={() => onSave(formData)}
             className="px-8 py-2.5 rounded-xl bg-[#0A0A0A] text-white text-sm font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2"
           >
             <Check size={16} />
             {plan ? "Update Plan" : "Create Plan"}
           </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f9fafb; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 20px; }
      `}</style>
    </div>
  );
}

export function AdminPricing() {
  const confirm = useConfirm();
  const [plans, setPlans] = useState([]);
  const [limits, setLimits] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, limitsRes, productsRes] = await Promise.all([
        adminService.getPricingPlans(),
        adminService.getPricingLimits(),
        adminService.getPricingProducts()
      ]);
      setPlans(plansRes.plans || plansRes.data?.plans || []);
      setSummary(plansRes.summary || plansRes.data?.summary || null);
      setLimits(limitsRes || []);
      setProducts(productsRes || []);
    } catch (error) {
      toast.error("Failed to load pricing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (formData) => {
    try {
      const payload = {
        name: formData.name,
        priceAmount: formData.priceAmount,
        billingCycle: formData.billingCycle,
        description: formData.description,
        planLimitId: formData.planLimitId,
        isActive: formData.isActive,
        products: formData.includedProducts
      };

      if (editingPlan) {
        await adminService.updatePricingPlanPatch(editingPlan.id, payload);
        toast.success("Plan updated successfully");
      } else {
        await adminService.createPricingPlan({
           ...payload,
           currency: "USD"
        });
        toast.success("Plan created successfully");
      }
      setIsModalOpen(false);
      setEditingPlan(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to save plan");
    }
  };

  const deletePlan = async (id) => {
    const isConfirmed = await confirm({
      title: "Deactivate Plan?",
      description: "Are you sure you want to deactivate this plan? This will affect subscribers.",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (isConfirmed) {
      try {
        await adminService.deletePricingPlan(id);
        toast.success("Plan deactivated successfully");
        fetchData();
      } catch (error) {
        toast.error("Failed to deactivate plan");
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7]" style={{ padding: "40px 60px" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex gap-5">
           <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100">
              <Settings2 size={28} className="text-[#0A0A0A]" />
           </div>
           <div>
             <h1 className="text-2xl font-bold text-[#0A0A0A]">Subscription Plans</h1>
             <p className="text-gray-500 mt-1">Package Core Products and Features into commercial plans.</p>
           </div>
        </div>
        <button 
          onClick={() => { setEditingPlan(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl"
        >
          <Plus size={18} />
          Create New Plan
        </button>
      </div>

      {loading ? (
         <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-gray-300" size={40} />
         </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                   {["Plan Name", "Price", "Billing", "Usage Limits", "Subscriptions", "Status", ""].map(h => (
                     <th key={h} className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                   ))}
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
                {plans.length === 0 ? (
                  <tr><td colSpan={7} className="px-8 py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No plans defined</td></tr>
                ) : (
                  plans.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#0A0A0A]">{p.name}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{p.id}</div>
                       </td>
                       <td className="px-8 py-6">
                          <div className="text-sm font-bold text-[#0A0A0A]">${p.price.amount} <span className="text-gray-400 font-normal text-xs">{p.price.currency}</span></div>
                       </td>
                       <td className="px-8 py-6">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded border border-gray-100">{p.billingCycle}</span>
                       </td>
                       <td className="px-8 py-6 text-[11px] text-gray-500 leading-relaxed font-medium">
                          {p.limits.maxBrands} Brands · {p.limits.maxSocialProfiles} Profiles<br/>
                          {p.limits.maxPostsPerMonth} Posts · {p.limits.maxStreamQuality}
                       </td>
                       <td className="px-8 py-6">
                          <div className="text-sm font-bold text-[#0A0A0A]">{p.subscriptionCount}</div>
                       </td>
                       <td className="px-8 py-6">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                             {p.isActive ? "Active" : "Inactive"}
                          </span>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => { setEditingPlan(p); setIsModalOpen(true); }} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-black shadow-sm border border-transparent hover:border-gray-100"><Edit3 size={14} /></button>
                             <button onClick={() => deletePlan(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 shadow-sm border border-transparent hover:border-red-100"><Trash2 size={14} /></button>
                          </div>
                       </td>
                    </tr>
                  ))
                )}
             </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <PlanModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave} 
          plan={editingPlan} 
          availableLimits={limits}
          availableProducts={products}
        />
      )}
    </div>
  );
}
