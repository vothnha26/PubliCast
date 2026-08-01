import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Search, RefreshCw, Loader2, Folder, 
  ChevronLeft, Home, FileVideo, Play, FileImage, FileText 
} from 'lucide-react';
import socialService from '../../../../services/social.service';
import { toast } from 'sonner';

const FOLDERS = [
  { id: 'my-drive', label: 'My drive', icon: <Folder className="w-8 h-8 text-black" strokeWidth={1.5} /> },
  { id: 'shared', label: 'Shared with me', icon: <Folder className="w-8 h-8 text-black" strokeWidth={1.5} /> },
  { id: 'starred', label: 'Starred', icon: <Folder className="w-8 h-8 text-black" strokeWidth={1.5} /> },
];

export function GoogleDrivePickerModal({ isOpen, onClose, activeBrand, onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' | 'files'
  const [selectedFolder, setSelectedFolder] = useState('my-drive');
  const [searchQuery, setSearchQuery] = useState('');
  const [connected, setConnected] = useState(true);
  const [fileTypeFilter, setFileTypeFilter] = useState('all'); // 'all' | 'video' | 'image' | 'pdf'

  const fetchFiles = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const res = await socialService.getGoogleDriveFiles(activeBrand.id);
      setConnected(res.connected);
      setFiles(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Google Drive files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeBrand) {
      fetchFiles();
      setSearchQuery('');
      setFileTypeFilter('all');
    }
  }, [isOpen, activeBrand]);

  const filteredFiles = useMemo(() => {
    let result = [...files];
    if (searchQuery) {
      result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (fileTypeFilter !== 'all') {
      result = result.filter(f => {
        if (fileTypeFilter === 'video') return f.mimeType?.startsWith('video/');
        if (fileTypeFilter === 'image') return f.mimeType?.startsWith('image/');
        if (fileTypeFilter === 'pdf') return f.mimeType === 'application/pdf';
        return true;
      });
    }
    return result;
  }, [files, searchQuery, fileTypeFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card w-full max-w-2xl rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col h-[600px] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
                <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" fill="#FFC107" />
                <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" fill="#2196F3" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight leading-none">Google Drive</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Select a video, image, or PDF to import</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-black">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-gray-50 flex flex-col gap-3 bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input 
                type="text" 
                placeholder="Search files in your drive..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-xs font-bold focus:border-black outline-none shadow-sm transition-all"
              />
            </div>
            <button 
              onClick={fetchFiles}
              className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-black hover:shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {viewMode === 'files' && (
            <div className="flex gap-2 animate-in fade-in duration-250">
              {[
                { id: 'all', label: 'All Files' },
                { id: 'video', label: 'Videos' },
                { id: 'image', label: 'Images' },
                { id: 'pdf', label: 'PDFs' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFileTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    fileTypeFilter === tab.id
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:text-black hover:bg-gray-55'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Browser Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Breadcrumbs */}
          <div className="px-8 py-3 flex items-center gap-2 border-b border-gray-50">
            {viewMode === 'files' ? (
              <button 
                onClick={() => setViewMode('categories')}
                className="flex items-center gap-1.5 text-[11px] font-black text-muted-foreground hover:text-black uppercase tracking-widest transition-colors"
              >
                <ChevronLeft size={14} />
                <span>Home / {FOLDERS.find(f => f.id === selectedFolder)?.label}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-black text-foreground uppercase tracking-widest">
                <Home size={14} className="text-muted-foreground" />
                <span>Home Explorer</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-black mb-4" size={32} />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Loading cloud storage...</span>
              </div>
            ) : !connected ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 opacity-40" viewBox="0 0 24 24" fill="none">
                    <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
                  </svg>
                </div>
                <h3 className="text-base font-black text-foreground uppercase mb-2">Drive Disconnected</h3>
                <p className="text-xs text-muted-foreground font-bold leading-relaxed mb-6">Your Google account session has expired or was disconnected. Please reconnect from settings.</p>
                <button
                  onClick={async () => {
                    try {
                      if (!activeBrand?.id) {
                        toast.error('Please select a brand first');
                        return;
                      }
                      const res = await socialService.getGoogleDriveAuthUrl(activeBrand.id);
                      if (res.url) window.location.href = res.url;
                    } catch (err) {
                      toast.error('Failed to start Google Drive connection');
                    }
                  }}
                  className="px-6 py-3 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                >
                  Reconnect Now
                </button>
              </div>
            ) : viewMode === 'categories' ? (
              <div className="grid grid-cols-3 gap-6">
                {FOLDERS.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      setViewMode('files');
                    }}
                    className="group border border-border hover:border-black rounded-[24px] p-8 flex flex-col items-center gap-4 hover:shadow-xl hover:shadow-black/5 transition-all bg-card active:scale-95 duration-200"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300">
                      {folder.icon}
                    </div>
                    <span className="text-[11px] font-black text-muted-foreground group-hover:text-black uppercase tracking-widest">{folder.label}</span>
                  </button>
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <FileText size={48} className="text-gray-100 mb-4" />
                <p className="text-sm font-bold text-muted-foreground">No matching files found in this folder.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredFiles.map((file) => (
                  <div 
                    key={file.id}
                    onClick={() => onSelectFile(file)}
                    className="flex items-center gap-4 p-4 bg-card border border-border hover:border-black rounded-2xl transition-all cursor-pointer group active:scale-[0.98]"
                  >
                    <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-gray-50">
                      {file.thumbnailLink ? (
                        <img 
                          src={file.thumbnailLink} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=s220`;
                          }}
                          className="w-full h-full object-cover" 
                        />
                      ) : file.mimeType?.startsWith('video/') ? (
                        <FileVideo className="text-gray-300" size={24} />
                      ) : file.mimeType?.startsWith('image/') ? (
                        <FileImage className="text-gray-300" size={24} />
                      ) : (
                        <FileText className="text-gray-300" size={24} />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                        <Play size={16} className="text-white fill-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground truncate mb-1 uppercase tracking-tight">{file.name}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                        {(parseInt(file.size || '0') / (1024 * 1024)).toFixed(1)} MB • {new Date(file.createdTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/50 border-t border-border flex items-center justify-between shrink-0">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter max-w-[300px]">
            * Supports importing Videos, Images, and PDF documents from your Google Drive.
          </p>
          <div className="flex gap-3">
             <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-card hover:text-black transition-all">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
