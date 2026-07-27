import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, Check, ChevronRight, ChevronLeft, Globe, 
  Plus, Users, Image as ImageIcon, Upload, Sparkles, Diamond
} from "lucide-react";

export function CreateWorkplacePage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    industry: "Technology",
    logo: null,
    emails: ""
  });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#F8F8F7] overflow-y-auto">
      {/* Top Header / Progress */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
           <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white font-bold text-xs shadow-lg">S</div>
           <span className="text-sm font-bold text-[#0A0A0A]">Create New Workplace</span>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-2">
           {[1, 2, 3].map(i => (
             <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? "w-12 bg-[#0A0A0A]" : "w-6 bg-gray-200"}`} />
           ))}
        </div>

        <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
           <X size={20} />
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 mt-16 animate-in zoom-in-95 duration-300">
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
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recommended: Square</span>
                   </div>

                   {/* Basic Fields */}
                   <div className="col-span-8 space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Workplace Name</label>
                         <input 
                           placeholder="e.g. Acme Marketing" 
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                           className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 focus:border-black outline-none transition-all text-sm font-bold shadow-sm focus:shadow-md" 
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Industry</label>
                         <select 
                           value={formData.industry}
                           onChange={(e) => setFormData({...formData, industry: e.target.value})}
                           className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 focus:border-black outline-none text-sm font-bold bg-white shadow-sm cursor-pointer"
                         >
                            <option>Technology</option><option>Real Estate</option><option>Fashion</option><option>Entertainment</option><option>Food & Beverage</option>
                         </select>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={nextStep}
                  disabled={!formData.name}
                  className="w-full py-4 bg-[#0A0A0A] text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                   Next: Connectivity <ChevronRight size={18} />
                </button>
             </div>
           )}

           {step === 2 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-10">
                   <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                      <Globe size={28} className="text-blue-600" />
                   </div>
                   <h2 className="text-2xl font-black text-[#0A0A0A]">Connect Platforms</h2>
                   <p className="text-gray-500 mt-2">Connect at least one network to enable analytics.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-10">
                   {[
                     { name: "YouTube", color: "#FF0000" },
                     { name: "Facebook", color: "#1877F2" },
                     { name: "TikTok", color: "#000000" },
                     { name: "Instagram", color: "#E1306C" },
                   ].map(p => (
                     <div key={p.name} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-black transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: p.color }}>{p.name.slice(0,2).toUpperCase()}</div>
                           <span className="text-xs font-bold text-[#0A0A0A]">{p.name}</span>
                        </div>
                        <button className="text-[10px] font-black text-blue-600 uppercase group-hover:underline">Connect</button>
                     </div>
                   ))}
                </div>

                <div className="flex gap-3">
                   <button onClick={prevStep} className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-sm text-gray-500 hover:bg-gray-50">Back</button>
                   <button onClick={nextStep} className="flex-[2] py-4 bg-[#0A0A0A] text-white rounded-2xl font-bold text-sm shadow-xl">Continue to Team →</button>
                </div>
                <div className="text-center mt-6">
                   <button onClick={nextStep} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Skip for now</button>
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-10">
                   <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                      <Users size={28} className="text-purple-600" />
                   </div>
                   <h2 className="text-2xl font-black text-[#0A0A0A]">Invite Your Team</h2>
                   <p className="text-gray-500 mt-2">Workspaces are better with collaborators.</p>
                </div>

                <div className="space-y-4 mb-10">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Team Member Emails</label>
                   <textarea 
                     placeholder="Enter emails separated by comma..." 
                     className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-black outline-none text-sm font-medium h-32 resize-none shadow-inner bg-gray-50/50" 
                   />
                   <div className="flex items-center gap-2 px-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Pro: Up to 10 members in this workplace</span>
                   </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={prevStep} className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-sm text-gray-500">Back</button>
                   <button onClick={nextStep} className="flex-[2] py-4 bg-[#0A0A0A] text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2">
                      <Sparkles size={18} /> Finalize Workplace
                   </button>
                </div>
             </div>
           )}

           {step === 4 && (
             <div className="text-center py-10 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-green-100">
                   <Check size={48} className="text-green-600" strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black text-[#0A0A0A] mb-4">Workplace Created! 🎉</h2>
                <p className="text-gray-500 mb-10 max-w-sm mx-auto">Your new brand environment <b>{formData.name}</b> is ready for management.</p>
                
                <div className="flex flex-col gap-4">
                   <button onClick={() => navigate("/dashboard")} className="w-full py-4 bg-[#0A0A0A] text-white rounded-2xl font-bold shadow-xl">Go to Dashboard</button>
                   <button onClick={() => navigate("/manage/connections?tab=connections")} className="w-full py-4 bg-gray-50 text-[#6B7280] rounded-2xl font-bold text-sm">Add more connections</button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
