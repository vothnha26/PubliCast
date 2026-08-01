import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { useConnections } from "../../context/ConnectionsContext";
import { ConnectionsGrid } from "./ConnectionsGrid";
import { useBrand } from "../../context/BrandContext";

export function ConnectionsOverlay() {
  const { isOpen, defaultBrandId, closeConnections } = useConnections();
  const { brands, activeBrand, loading: loadingBrands } = useBrand();
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (activeBrand) {
        setSelectedBrand(activeBrand);
      } else if (brands.length > 0) {
        const foundBrand = defaultBrandId 
          ? brands.find(b => b.id === defaultBrandId) 
          : null;
        setSelectedBrand(foundBrand || brands[0]);
      } else {
        setSelectedBrand(null);
      }
    }
  }, [isOpen, activeBrand, brands, defaultBrandId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[90vh] bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-10 py-8 flex items-center justify-between border-b border-border">
           <h1 className="text-2xl font-bold text-foreground">Manage connections</h1>
           <button 
             onClick={closeConnections}
             className="w-10 h-10 bg-[#2D1D35] text-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg"
           >
              <X size={20} />
           </button>
        </div>

        {/* Brand Selector Bar */}
        <div className="px-10 py-4 bg-[#F8F9FB] border-b border-border flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Brand:</span>
              {loadingBrands ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  Loading brands...
                </div>
              ) : selectedBrand ? (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="bg-card border border-border rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm hover:border-gray-300 transition-all font-bold text-sm text-foreground cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#E1306C] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                      {selectedBrand.name.charAt(0)}
                    </div>
                    <span>{selectedBrand.name}</span>
                    {isDropdownOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-[2010] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      {brands.map((brand) => (
                        <button 
                          key={brand.id}
                          onClick={() => { setSelectedBrand(brand); setIsDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#F3F4F6] transition-colors cursor-pointer border-none ${selectedBrand.id === brand.id ? 'bg-[#F9FAF8]' : 'bg-card'}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#E1306C] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {brand.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{brand.name}</div>
                            <div className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                              {brand.socialAccounts?.length || 0} connection{(brand.socialAccounts?.length || 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No brands found.</div>
              )}
           </div>
           
           <button 
             onClick={() => {
               closeConnections();
               window.location.href = "/manage/connections?tab=brand-settings";
             }}
             className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer border-none bg-transparent"
           >
             <Plus size={14} /> Add new brand
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-card custom-scrollbar">
           <ConnectionsGrid brand={selectedBrand} />
        </div>

        {/* Custom Scrollbar Styling */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        `}</style>
      </div>
    </div>
  );
}
