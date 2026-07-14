import React from "react";
import { X, Search, Youtube, Facebook, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";

export function BrandTableOverlay({ isOpen, onClose, onSelect, brands = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-6">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* Close Button (Matching Image) */}
        <button 
          onClick={onClose}
          className="absolute -top-3 -right-3 w-10 h-10 bg-[#2D1D35] text-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg z-[2100] border-2 border-white"
        >
           <X size={20} />
        </button>

        {/* Header */}
        <div className="px-10 pt-10 pb-6">
           <h2 className="text-2xl font-bold text-[#0A0A0A] mb-8">Brands</h2>
           
           {/* Search Bar */}
           <div className="relative mb-8">
              <input 
                placeholder="Search" 
                className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-gray-200 focus:border-gray-400 outline-none text-sm transition-all shadow-sm" 
              />
           </div>

           {/* Table Headers */}
           <div className="grid grid-cols-12 px-6 py-4 text-[13px] font-bold text-gray-400">
              <div className="col-span-4 flex items-center gap-1.5 cursor-pointer hover:text-black transition-colors">
                Name <ArrowUp size={14} />
              </div>
              <div className="col-span-2">Networks</div>
              <div className="col-span-4 flex items-center gap-1.5 cursor-pointer hover:text-black transition-colors">
                Owner <ArrowDown size={14} />
              </div>
              <div className="col-span-2"></div>
           </div>

           {/* Table Rows */}
           <div className="space-y-3">
              {brands.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm font-medium">No brands available</div>
              ) : brands.map((brand) => (
                <div key={brand.id} className="grid grid-cols-12 items-center px-6 py-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:border-gray-200 transition-all group">
                   <div className="col-span-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ backgroundColor: '#E1306C' }}>
                         {brand.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-[#0A0A0A]">{brand.name}</span>
                   </div>
                   
                   <div className="col-span-2 flex items-center gap-2">
                      {brand.socialAccounts?.some(sa => sa.platform === 'YOUTUBE') && <Youtube size={18} className="text-red-600" />}
                      {brand.socialAccounts?.some(sa => sa.platform === 'FACEBOOK') && <Facebook size={18} className="text-blue-600" />}
                   </div>

                   <div className="col-span-4 text-xs text-gray-500 font-medium">
                      {brand.owner?.email || 'N/A'}
                   </div>

                   <div className="col-span-2 flex items-center justify-end gap-5">
                      <button className="p-2 text-gray-400 hover:text-black transition-colors">
                         <ExternalLink size={18} />
                      </button>
                      <button 
                        onClick={() => { onSelect(brand.name); onClose(); }}
                        className="px-6 py-1.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                      >
                         Select
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Footer info (optional spacing) */}
        <div className="h-10"></div>
      </div>
    </div>
  );
}
