import { useState, useEffect, useRef } from "react";
import { Plus, X, Check, Globe, Zap, Megaphone, Box, Layers, Filter, Edit3, Trash2, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import adminService from "../../services/admin.service";
import { toast } from "sonner";

function MatrixCell({ exists, module, platform, onAdd, onDisable }) {
  if (!exists) {
    return (
      <div 
        id={`cell-add-${module.id}-${platform.id}`}
        onClick={() => onAdd(module, platform)}
        className="h-12 border border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer hover:bg-muted hover:border-gray-300 transition-all group"
      >
        <Plus size={14} className="text-gray-300 group-hover:text-black" />
      </div>
    );
  }

  return (
    <div className="h-12 bg-card border border-[#0A0A0A] rounded-xl flex flex-col items-center justify-center shadow-sm relative overflow-hidden group">
      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
      <span className="text-[10px] font-black text-foreground uppercase tracking-tighter">Active</span>
      <div className="hidden group-hover:flex absolute inset-0 bg-black/90 items-center justify-center gap-3 animate-in fade-in duration-150">
         <button id={`cell-delete-${module.id}-${platform.id}`} onClick={() => onDisable(module, platform)} className="text-white hover:text-red-400"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

function PlatformModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [color, setColor] = useState("#000000");
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-card rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center px-8 py-6 border-b border-border">
             <h3 className="text-xl font-bold text-foreground">Add New Platform</h3>
             <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-black"><X size={24} /></button>
          </div>
          <div className="p-8 space-y-6 overflow-y-auto">
             <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-3xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted hover:border-gray-300 transition-all relative overflow-hidden group"
                >
                   {image ? (
                     <>
                       <img src={image} className="w-full h-full object-cover" alt="Preview" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <Upload size={20} className="text-white" />
                       </div>
                     </>
                   ) : (
                     <>
                       <ImageIcon size={24} className="text-gray-300 mb-1" />
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">Upload Icon</span>
                     </>
                   )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-bold">Square PNG/SVG recommended</p>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Platform Name</label>
                   <input id="input-platform-name" placeholder="e.g. Threads" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Platform ID</label>
                      <input id="input-platform-id" placeholder="TH" value={id} onChange={(e) => setId(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-mono" maxLength={3} />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Brand Color</label>
                      <div className="flex items-center gap-2">
                         <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent" />
                         <span className="text-xs font-mono text-muted-foreground uppercase">{color}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
          <div className="px-8 py-6 bg-muted flex gap-3 border-t border-border">
             <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-border bg-card text-sm font-bold text-muted-foreground">Cancel</button>
             <button id="btn-submit-platform" onClick={() => { onSave({ id, name, color, image }); onClose(); }} className="flex-1 py-3 rounded-2xl bg-[#0A0A0A] text-white text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">Add Platform</button>
          </div>
       </div>
    </div>
  );
}

function ModuleModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  if (!isOpen) return null;

  return (
    <div id="modal-module" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-card rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden p-8">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-foreground">Add New Module</h3>
             <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-black"><X size={24} /></button>
          </div>
          <div className="space-y-4 mb-8">
             <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Module Name</label>
                <input id="input-module-name" placeholder="e.g. Reporting" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm" />
             </div>
             <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Description</label>
                <textarea id="input-module-desc" placeholder="e.g. Automated PDF report generation" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm h-24 resize-none" />
             </div>
          </div>
          <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-border bg-card text-sm font-bold text-muted-foreground">Cancel</button>
             <button id="btn-submit-module" onClick={() => { onSave({ id: `M${Math.floor(Math.random()*100)}`, name, description: desc, icon: <Layers size={18} /> }); onClose(); }} className="flex-1 py-3 rounded-2xl bg-[#0A0A0A] text-white text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">Add Module</button>
          </div>
       </div>
    </div>
  );
}

export function AdminProducts() {
  const [modules, setModules] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [activeSelection, setActiveSelection] = useState(null);

  useEffect(() => {
    const fetchMatrix = async () => {
      setLoading(true);
      try {
        const response = await adminService.getProductsMatrix();
        const data = response || {};
        setModules(data.modules || []);
        setPlatforms(data.platforms || []);
        setMatrix(data.matrix || {});
      } catch (error) {
        toast.error("Failed to load product matrix");
      } finally {
        setLoading(false);
      }
    };

    fetchMatrix();
  }, []);

  const handleAddProduct = (module, platform) => {
    setActiveSelection({ module, platform });
    setShowAddModal(true);
  };

  const saveProductMatrix = async () => {
    try {
      const response = await adminService.saveProductsMatrix({
        platformId: activeSelection.platform.id,
        moduleId: activeSelection.module.id
      });
      const key = `${activeSelection.module.id}-${activeSelection.platform.id}`;
      setMatrix({
        ...matrix,
        [key]: {
          status: "ACTIVE",
          sku: response?.sku || response?.data?.sku
        }
      });
      setShowAddModal(false);
      toast.success(`Module enabled for ${activeSelection.platform.name}`);
    } catch (error) {
      toast.error(error.message || "Failed to enable module");
    }
  };

  const handleDisableProduct = async (module, platform) => {
    if (window.confirm(`Are you sure you want to disable ${module.name} for ${platform.name}?`)) {
      try {
        await adminService.disableProductsMatrix({
          platformId: platform.id,
          moduleId: module.id
        });
        const key = `${module.id}-${platform.id}`;
        const newMatrix = { ...matrix };
        delete newMatrix[key];
        setMatrix(newMatrix);
        toast.success(`Module ${module.name} disabled for ${platform.name}`);
      } catch (error) {
        toast.error(error.message || "Failed to disable module");
      }
    }
  };

  const addNewPlatform = async (newPlatform) => {
    try {
      const response = await adminService.createProductPlatform({
        id: newPlatform.id,
        name: newPlatform.name,
        color: newPlatform.color,
        image: newPlatform.image
      });
      setPlatforms([...platforms, response]);
      toast.success(`Platform ${newPlatform.name} added successfully`);
    } catch (error) {
      toast.error(error.message || "Failed to add platform");
    }
  };

  const addNewModule = async (newModule) => {
    try {
      const response = await adminService.createProductModule({
        id: newModule.id,
        name: newModule.name,
        description: newModule.description
      });
      setModules([...modules, response]);
      toast.success(`Module ${newModule.name} added successfully`);
    } catch (error) {
      toast.error(error.message || "Failed to add module");
    }
  };

  const getModuleIcon = (name) => {
    if (name.includes("Analytics")) return <Globe size={18} />;
    if (name.includes("Automation")) return <Zap size={18} />;
    if (name.includes("Engagement")) return <Megaphone size={18} />;
    return <Filter size={18} />;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background" style={{ padding: "40px 60px" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex gap-5">
           <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center shadow-sm border border-border text-foreground">
              <Layers size={28} />
           </div>
           <div>
             <h1 className="text-2xl font-bold text-foreground">Product Matrix Admin</h1>
             <p className="text-muted-foreground mt-1">Cross-reference Modules and Platforms to define base products.</p>
           </div>
        </div>
        <div className="flex gap-3">
           <button 
             id="btn-manage-modules"
             onClick={() => setShowModuleModal(true)}
             className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors"
           >
             Manage Modules
           </button>
           <button 
             id="btn-add-platform"
             onClick={() => setShowPlatformModal(true)}
             className="px-5 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-xl"
           >
             + New Platform
           </button>
        </div>
      </div>

      {/* The Matrix */}
      <div className="bg-card rounded-[32px] border border-border shadow-sm p-8 overflow-x-auto">
        <table className="w-full border-separate border-spacing-3">
           <thead>
              <tr>
                 <th className="p-0 min-w-[200px]">
                    <div className="h-12 bg-muted rounded-xl border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                       Module \ Platform
                    </div>
                 </th>
                 {platforms.map(p => (
                   <th key={p.id} className="p-0 min-w-[100px]">
                      <div className="h-12 flex flex-col items-center justify-center">
                         {p.image ? (
                            <img src={p.image} className="w-6 h-6 rounded-md mb-1 object-cover shadow-sm" alt={p.name} />
                         ) : (
                           <div className="w-6 h-6 rounded-md mb-1 flex items-center justify-center shadow-sm" style={{ backgroundColor: p.color }}>
                              <span className="text-[10px] text-white font-bold">{p.id}</span>
                           </div>
                         )}
                         <span className="text-[10px] font-bold text-foreground">{p.name}</span>
                      </div>
                   </th>
                 ))}
              </tr>
           </thead>
           <tbody>
              {modules.map(m => (
                <tr key={m.id}>
                   <td className="p-0">
                      <div className="h-12 bg-card border border-border rounded-xl flex items-center gap-3 px-4 shadow-sm">
                         <div className="text-muted-foreground">{getModuleIcon(m.name)}</div>
                         <span className="text-xs font-bold text-foreground">{m.name}</span>
                      </div>
                   </td>
                   {platforms.map(p => {
                      const key = `${m.id}-${p.id}`;
                      return (
                        <td key={p.id} className="p-0">
                           <MatrixCell 
                             exists={matrix[key] && matrix[key].status === 'ACTIVE'} 
                             module={m} 
                             platform={p} 
                             onAdd={handleAddProduct} 
                             onDisable={handleDisableProduct}
                           />
                        </td>
                      );
                   })}
                </tr>
              ))}
           </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-8 flex gap-6 px-4">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-card border border-[#0A0A0A] rounded shadow-sm" />
            <span className="text-xs text-muted-foreground font-medium">Core Feature Created</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-dashed border-border rounded" />
            <span className="text-xs text-muted-foreground font-medium">Feature Unavailable</span>
         </div>
      </div>

      {/* Add Product Modal (Matrix Cell Action) */}
      {showAddModal && (
        <div id="modal-matrix-add" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-card rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
              <div className="text-center mb-8">
                 <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border shadow-inner text-muted-foreground">
                    {getModuleIcon(activeSelection.module.name)}
                 </div>
                 <h3 className="text-xl font-black text-foreground">Enable {activeSelection.module.name}</h3>
                 <p className="text-sm text-muted-foreground mt-1">Activate this module for <b>{activeSelection.platform.name}</b></p>
              </div>

              <div className="space-y-4 mb-8">
                 <div className="p-4 rounded-2xl bg-muted border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Generated ID</div>
                    <div className="text-sm font-mono text-foreground">SKU-{activeSelection.platform.id}-{activeSelection.module.id}-AUTO</div>
                 </div>
                 <p className="text-xs text-muted-foreground leading-relaxed px-2">Once enabled, this product will be available for bundling in your Subscription Plans.</p>
              </div>

              <div className="flex gap-3">
                 <button id="btn-cancel-matrix" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-2xl border border-border bg-card text-sm font-bold text-muted-foreground">Cancel</button>
                 <button id="btn-submit-matrix" onClick={saveProductMatrix} className="flex-1 py-3 rounded-2xl bg-[#0A0A0A] text-white text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">Enable Module</button>
              </div>
           </div>
        </div>
      )}

      {/* Platform Modal */}
      <PlatformModal 
        isOpen={showPlatformModal} 
        onClose={() => setShowPlatformModal(false)} 
        onSave={addNewPlatform} 
      />

      {/* Module Modal */}
      <ModuleModal
        isOpen={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        onSave={addNewModule}
      />
    </div>
  );
}
