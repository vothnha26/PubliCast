import React, { useState } from 'react';
import { Search, Loader2, Image as ImageIcon, Video as VideoIcon, Download, X } from 'lucide-react';
import socialService from '../../services/social.service';
import { STOCK_PROVIDERS, STOCK_MEDIA_TYPES } from '../../constants/platforms';
import { parseAttributionHtml, appendUnsplashReferral } from '../../utils/sanitize';

export default function StockMediaPicker({ brandId, onSelectMedia, onClose }) {
  const [provider, setProvider] = useState(STOCK_PROVIDERS.UNSPLASH);
  const [mediaType, setMediaType] = useState(STOCK_MEDIA_TYPES.PHOTO);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    setPage(1);
    if (newProvider === STOCK_PROVIDERS.UNSPLASH) {
      setMediaType(STOCK_MEDIA_TYPES.PHOTO);
    }
  };

  const handleMediaTypeChange = (newMediaType) => {
    setMediaType(newMediaType);
    setPage(1);
  };

  const handleSearch = async (e, targetPage = 1) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setPage(targetPage);

    try {
      const response = await socialService.searchStockMedia({
        provider,
        query: query.trim(),
        page: targetPage,
        mediaType
      });
      setResults(response.items || []);
    } catch (err) {
      console.error('Failed to search stock media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (item) => {
    if (!brandId) {
      console.error('brandId is required to import stock media');
      return;
    }
    setImportingId(item.externalId);
    try {
      const importedItem = await socialService.importStockMedia({
        brandId,
        provider: item.provider,
        externalId: item.externalId,
        downloadUrl: item.downloadUrl,
        downloadLocationUrl: item.downloadLocationUrl,
        photographerName: item.photographerName,
        photographerUrl: appendUnsplashReferral(item.photographerUrl),
        attributionHtml: item.attributionHtml,
        mediaType: item.mediaType
      });

      if (onSelectMedia) {
        onSelectMedia(importedItem.data || importedItem);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to import stock media:', err);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card dark:bg-gray-900 rounded-2xl max-w-5xl w-full p-6 max-h-[90vh] flex flex-col shadow-2xl border border-border dark:border-gray-800">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-border dark:border-gray-800 mb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md">
              <ImageIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground dark:text-white flex items-center gap-2">
                Stock Media Library
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  ToS Compliant & XSS-Safe
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">Free high-resolution photos & videos from Unsplash & Pexels</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200 rounded-xl hover:bg-muted dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search Bar */}
        <form onSubmit={(e) => handleSearch(e, 1)} className="flex flex-wrap gap-3 mb-4">
          <select 
            value={provider} 
            onChange={(e) => handleProviderChange(e.target.value)} 
            className="px-3.5 py-2.5 border rounded-xl bg-card dark:bg-gray-800 text-sm font-medium border-border dark:border-gray-700 text-foreground dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value={STOCK_PROVIDERS.UNSPLASH}>Unsplash (Photos)</option>
            <option value={STOCK_PROVIDERS.PEXELS}>Pexels (Photos & Videos)</option>
          </select>

          {provider === STOCK_PROVIDERS.PEXELS && (
            <select 
              value={mediaType} 
              onChange={(e) => handleMediaTypeChange(e.target.value)} 
              className="px-3.5 py-2.5 border rounded-xl bg-card dark:bg-gray-800 text-sm font-medium border-border dark:border-gray-700 text-foreground dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={STOCK_MEDIA_TYPES.PHOTO}>Photos</option>
              <option value={STOCK_MEDIA_TYPES.VIDEO}>Videos</option>
            </select>
          )}

          <div className="flex-1 relative min-w-[220px]">
            <input
              type="text"
              placeholder="Search high-res photos, wallpapers, tech, nature..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-card dark:bg-gray-800 border-border dark:border-gray-700 text-foreground dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
          </div>

          <button 
            type="submit" 
            disabled={loading || !query.trim()} 
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Search'}
          </button>
        </form>

        {/* Results Grid / Loading Skeleton */}
        <div className="flex-1 overflow-y-auto min-h-[320px] max-h-[58vh] pr-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 h-48 border border-border dark:border-gray-700 flex flex-col justify-between p-3">
                  <div className="w-16 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
                  <div className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((item) => (
                <div 
                  key={item.externalId} 
                  className="group relative rounded-xl overflow-hidden bg-muted dark:bg-gray-800 border border-border dark:border-gray-800 flex flex-col hover:shadow-lg transition duration-200"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <img 
                      src={item.previewUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                    />

                    {/* Provider Visual Branding Badge */}
                    <span 
                      className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-md shadow-md text-white backdrop-blur-sm ${
                        item.provider === STOCK_PROVIDERS.UNSPLASH 
                          ? 'bg-black/80' 
                          : 'bg-[#05a081]/90'
                      }`}
                    >
                      {item.provider}
                    </span>

                    {/* Video Indicator */}
                    {item.mediaType === STOCK_MEDIA_TYPES.VIDEO && (
                      <span className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-lg backdrop-blur-sm">
                        <VideoIcon className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {/* Hover Overlay Button */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center p-2">
                      <button 
                        onClick={() => handleImport(item)}
                        disabled={importingId === item.externalId}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition duration-200"
                      >
                        {importingId === item.externalId ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" /> Import & Use
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Attribution: rendered as safe JSX — no dangerouslySetInnerHTML */}
                  <div className="p-2.5 text-[11px] text-muted-foreground dark:text-muted-foreground bg-card dark:bg-gray-900 border-t border-border dark:border-gray-800 truncate">
                    {parseAttributionHtml(item.attributionHtml).map((seg, i) =>
                      seg.type === 'link' ? (
                        <a
                          key={i}
                          href={seg.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground dark:hover:text-gray-200"
                        >
                          {seg.text}
                        </a>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching with different keywords or switch provider.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Search className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Search for photos & videos</p>
              <p className="text-xs text-muted-foreground mt-1">Type keywords like "business", "technology", "nature" above</p>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {results.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t border-border dark:border-gray-800 mt-4 text-xs text-muted-foreground">
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button 
                disabled={page <= 1 || loading}
                onClick={(e) => handleSearch(e, page - 1)}
                className="px-3.5 py-1.5 border rounded-lg hover:bg-muted dark:hover:bg-gray-800 disabled:opacity-40 font-medium"
              >
                Previous
              </button>
              <button 
                disabled={loading}
                onClick={(e) => handleSearch(e, page + 1)}
                className="px-3.5 py-1.5 border rounded-lg hover:bg-muted dark:hover:bg-gray-800 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
