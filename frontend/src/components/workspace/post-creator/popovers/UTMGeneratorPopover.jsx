import * as React from "react";
import { useState } from "react";

export function UTMGeneratorPopover({ onAddUrl, onClose }) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');

  const handleClean = () => {
    setWebsiteUrl('');
    setSource('');
    setMedium('');
    setCampaign('');
    setTerm('');
    setContent('');
  };

  const handleAdd = () => {
    if (!websiteUrl) return;
    
    // Tự động sinh UTM campaign URL
    let finalUrl = websiteUrl;
    const params = [];
    if (source) params.push(`utm_source=${encodeURIComponent(source)}`);
    if (medium) params.push(`utm_medium=${encodeURIComponent(medium)}`);
    if (campaign) params.push(`utm_campaign=${encodeURIComponent(campaign)}`);
    if (term) params.push(`utm_term=${encodeURIComponent(term)}`);
    if (content) params.push(`utm_content=${encodeURIComponent(content)}`);

    if (params.length > 0) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}${params.join('&')}`;
    }

    onAddUrl(finalUrl);
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 z-50 animate-in fade-in slide-in-from-bottom-2 text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
        <h3 className="text-sm font-black text-gray-800">URL Generator for campaigns</h3>
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={handleClean} 
            className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest cursor-pointer"
          >
            Clean
          </button>
          <button 
            type="button"
            onClick={handleAdd}
            disabled={!websiteUrl}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${websiteUrl ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            Add
          </button>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 leading-normal font-semibold uppercase tracking-wider mb-4">
        This section allows you to add parameters of your campaigns in URLs for tracking.
      </p>

      {/* Grid Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">URL of the website</label>
          <input
            type="text"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://facebook.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all font-medium text-gray-700"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Instagram, Facebook..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all font-medium text-gray-700"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Medium</label>
          <input
            type="text"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            placeholder="Post, email, cpc, banner..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all font-medium text-gray-700"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Name of the campaign</label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="Black Friday, Christmas..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all font-medium text-gray-700"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Search term</label>
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Keywords"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all font-medium text-gray-700"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Content</label>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Campaign ID"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all font-medium text-gray-700"
          />
        </div>
      </div>
    </div>
  );
}
