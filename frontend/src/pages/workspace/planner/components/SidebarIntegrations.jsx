import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, Play, FileVideo, RefreshCw, X, 
  MoreVertical, Filter, ArrowUpDown, Home, Folder, 
  ChevronLeft, FileImage, FileText, Sparkles
} from 'lucide-react';
import socialService from '../../../../services/social.service';
import { toast } from 'sonner';
import { useConfirm } from "@/hooks/useConfirm";
import { useFeatureGate } from '../../../../hooks/useFeatureGate';
import { PRODUCT_IDS } from '../../../../constants/products';
import { useTranslation } from "react-i18next";
import { usePostCreator } from '../../../../context/PostCreatorContext';
import { useNavigate } from 'react-router-dom';

// Custom icons mapping for category folders matching the screenshot design
const FOLDERS = [
  { id: 'my-drive', labelKey: 'sidebarIntegrations.folders.myDrive', icon: (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <Folder className="w-8 h-8 text-black" strokeWidth={1.5} />
      <div className="absolute inset-0 flex items-center justify-center pt-1">
        <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" />
          <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" />
          <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" />
        </svg>
      </div>
    </div>
  )},
  { id: 'shared', labelKey: 'sidebarIntegrations.folders.shared', icon: (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <Folder className="w-8 h-8 text-black" strokeWidth={1.5} />
      <div className="absolute inset-0 flex items-center justify-center pt-1">
        <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      </div>
    </div>
  )},
  { id: 'starred', labelKey: 'sidebarIntegrations.folders.starred', icon: (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <Folder className="w-8 h-8 text-black" strokeWidth={1.5} />
      <div className="absolute inset-0 flex items-center justify-center pt-1">
        <svg className="w-3 h-3 text-black fill-black" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
    </div>
  )},
  { id: 'recent', labelKey: 'sidebarIntegrations.folders.recent', icon: (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <Folder className="w-8 h-8 text-black" strokeWidth={1.5} />
      <div className="absolute inset-0 flex items-center justify-center pt-1">
        <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    </div>
  )}
];

// OCP Strategy definitions
const INTEGRATIONS = [
  {
    id: 'drive',
    icon: (isActive) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
        <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" fill="#FFC107" />
        <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" fill="#2196F3" />
      </svg>
    ),
    titleKey: 'sidebarIntegrations.drivePromo.title',
    descKey: 'sidebarIntegrations.drivePromo.desc',
    buttonTextKey: 'sidebarIntegrations.drivePromo.btn',
    hasDiamond: true,
    illustration: () => (
      <div className="w-28 h-28 mx-auto flex items-center justify-center bg-blue-50/50 rounded-full mb-6">
        {/* Triangle colored Drive logo */}
        <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none">
          <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
          <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" fill="#FFC107" />
          <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" fill="#2196F3" />
        </svg>
      </div>
    )
  },
  {
    id: 'canva',
    icon: (isActive) => (
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#00C4CC]">
        C
      </div>
    ),
    titleKey: 'sidebarIntegrations.canvaPromo.title',
    descKey: 'sidebarIntegrations.canvaPromo.desc',
    buttonTextKey: 'sidebarIntegrations.canvaPromo.btn',
    hasDiamond: false,
    illustration: () => (
      <div className="w-28 h-28 mx-auto flex items-center justify-center bg-[#E6F9FA] rounded-full mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold text-white bg-[#00C4CC] shadow-md">
          C
        </div>
      </div>
    )
  },
  {
    id: 'ideas',
    icon: (isActive) => (
      <svg className={`w-5 h-5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    titleKey: 'sidebarIntegrations.ideasPromo.title',
    descKey: 'sidebarIntegrations.ideasPromo.desc',
    buttonTextKey: 'sidebarIntegrations.ideasPromo.btn',
    hasDiamond: false,
    illustration: () => (
      <div className="w-28 h-28 mx-auto flex items-center justify-center bg-yellow-50 rounded-full mb-6">
        <svg className="w-16 h-16 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
];

export function SidebarIntegrations({ activeBrand, onClose }) {
  const { t } = useTranslation("planner");
  const confirm = useConfirm();
  const { openPostCreator } = usePostCreator();
  const navigate = useNavigate();
  const { hasAccess } = useFeatureGate();
  const hasDriveAccess = hasAccess(PRODUCT_IDS.GOOGLE_DRIVE);
  const [activeTab, setActiveTab] = useState('drive');
  const [files, setFiles] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Custom Google Drive layout states
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' | 'files'
  const [selectedFolder, setSelectedFolder] = useState('my-drive');
  const [searchInDrive, setSearchInDrive] = useState('');
  
  // Filter & Sort state variables
  const [filterFormat, setFilterFormat] = useState('all'); // 'all' | 'mp4' | 'webm' | 'mov'
  const [filterSize, setFilterSize] = useState('all'); // 'all' | 'small' | 'medium' | 'large'
  const [sortField, setSortField] = useState('date'); // 'name' | 'date' | 'size'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showSortPopover, setShowSortPopover] = useState(false);
  
  // Caching & Profile metadata states
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(true);

  const activeStrategy = INTEGRATIONS.find(item => item.id === activeTab) || INTEGRATIONS[0];

  const handleFolderClick = (folderId) => {
    setSelectedFolder(folderId);
    setViewMode('files');
  };

  const filteredFiles = useMemo(() => {
    let result = [...files];
    
    // Virtual folder content separation
    if (selectedFolder === 'recent') {
      result.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
    } else if (selectedFolder === 'starred') {
      result = result.filter((_, idx) => idx % 2 === 0);
    } else if (selectedFolder === 'shared') {
      result = result.filter((_, idx) => idx % 2 !== 0);
    }
    
    // Search filtering
    if (searchInDrive) {
      result = result.filter(f => f.name.toLowerCase().includes(searchInDrive.toLowerCase()));
    }

    // Format filtering
    if (filterFormat !== 'all') {
      result = result.filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        return ext === filterFormat;
      });
    }

    // Size filtering
    if (filterSize !== 'all') {
      result = result.filter(f => {
        const bytes = parseInt(f.size || '0', 10);
        const mb = bytes / (1024 * 1024);
        if (filterSize === 'small') return mb < 25;
        if (filterSize === 'medium') return mb < 100;
        if (filterSize === 'large') return mb >= 100;
        return true;
      });
    }
    
    // Sort ordering
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'date') {
        comparison = new Date(a.createdTime) - new Date(b.createdTime);
      } else if (sortField === 'size') {
        const sizeA = parseInt(a.size || '0', 10);
        const sizeB = parseInt(b.size || '0', 10);
        comparison = sizeA - sizeB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [files, selectedFolder, searchInDrive, sortField, sortOrder, filterFormat, filterSize]);

  const fetchDriveFiles = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const res = await socialService.getGoogleDriveFiles(activeBrand.id);
      setConnected(!!res?.connected);
      setFiles(res?.data || []);
      setConnectedAccount(res?.account || null);
      setHasFetched(true);
    } catch (err) {
      console.error('Drive files fetch check:', err);
      const status = err.response?.status;
      const errMsg = err.response?.data?.message || err.message || '';
      
      // If error indicates Google Drive is not connected, handle gracefully without toast
      const isNotConnectedErr = 
        status === 404 || 
        status === 401 || 
        status === 400 ||
        errMsg.toLowerCase().includes('not connected') ||
        errMsg.toLowerCase().includes('chưa kết nối') ||
        errMsg.toLowerCase().includes('no account') ||
        errMsg.toLowerCase().includes('token');

      if (isNotConnectedErr) {
        setConnected(false);
        setFiles([]);
        setConnectedAccount(null);
        setHasFetched(true);
        return;
      }

      if (errMsg.includes('Google Drive API has not been used') || errMsg.includes('disabled')) {
        const urlMatch = errMsg.match(/https:\/\/console\S+/);
        const enableUrl = urlMatch ? urlMatch[0].replace(/[.,;]$/, '') : 'https://console.developers.google.com';

        toast.error(
          <div className="flex flex-col gap-1 text-left text-xs font-semibold">
            <span className="font-black text-red-600 uppercase tracking-wide">{t("sidebarIntegrations.toasts.apiDisabledTitle")}</span>
            <span className="text-muted-foreground font-bold leading-normal">{t("sidebarIntegrations.toasts.apiDisabledDesc")}</span>
            <a 
              href={enableUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="underline text-red-500 hover:text-red-700 font-black animate-pulse"
            >
              {t("sidebarIntegrations.toasts.apiDisabledClick")}
            </a>
            <span className="text-muted-foreground font-bold text-[9px] uppercase mt-1">{t("sidebarIntegrations.toasts.apiDisabledFooter")}</span>
          </div>,
          { duration: 15000 }
        );
      } else {
        toast.error(errMsg || t("sidebarIntegrations.toasts.loadFail"));
      }
    } finally {
      setLoading(false);
      setIsVerifyingConnection(false);
    }
  };

  useEffect(() => {
    setFiles([]);
    setConnectedAccount(null);
    setHasFetched(false);
    setIsVerifyingConnection(true);
  }, [activeBrand]);

  useEffect(() => {
    if (activeTab === 'drive' && activeBrand && !hasFetched) {
      fetchDriveFiles();
    } else if (activeTab === 'drive' && hasFetched) {
      setIsVerifyingConnection(false);
    }
  }, [activeTab, activeBrand, hasFetched]);

  const handleConnect = async () => {
    if (!activeBrand) return;
    try {
      const res = await socialService.getGoogleDriveAuthUrl(activeBrand.id);
      if (res.url) {
        window.location.href = res.url;
      } else {
        toast.error(t("sidebarIntegrations.toasts.authUrlFail"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("sidebarIntegrations.toasts.fetchAuthUrlFail"));
    }
  };

  const handleDisconnect = async () => {
    if (!activeBrand) return;
    const isConfirmed = await confirm({
      title: t("sidebarIntegrations.toasts.disconnectConfirmTitle"),
      description: t("sidebarIntegrations.toasts.disconnectConfirmDesc"),
      confirmText: t("sidebarIntegrations.toasts.disconnectConfirmBtn"),
      cancelText: t("sidebarIntegrations.toasts.cancelBtn"),
      variant: "destructive"
    });
    if (!isConfirmed) return;
    setLoading(true);
    try {
      await socialService.disconnectGoogleDriveAccount(activeBrand.id);
      toast.success(t("sidebarIntegrations.toasts.disconnectSuccess"));
      setConnected(false);
      setFiles([]);
    } catch (err) {
      console.error(err);
      toast.error(t("sidebarIntegrations.toasts.disconnectFail"));
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-card text-foreground border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col h-full no-print shrink-0 w-full">
      {/* Header Tabs Navigation */}
      <div className="flex border-b border-border h-12 shrink-0 items-center pr-2">
        <div className="flex-1 flex h-full">
          {INTEGRATIONS.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex-1 flex flex-col items-center justify-center relative hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="h-full flex items-center justify-center">
                  {item.icon(isActive)}
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                )}
              </button>
            );
          })}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title={t("sidebarIntegrations.explorer.collapseSidebar", { defaultValue: "Collapse sidebar" })}
            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all cursor-pointer shrink-0 border-none bg-transparent"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Dynamic strategies / tabs rendering */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'drive' ? (
          // Google Drive real layout
          <div className="flex-1 flex flex-col overflow-hidden select-none bg-card relative">
            {/* Top drive header row */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 relative">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
                  <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" fill="#FFC107" />
                  <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" fill="#2196F3" />
                </svg>
                <span className="text-[9px] font-extrabold bg-foreground text-background px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">{t("sidebarIntegrations.explorer.beta")}</span>
                {connected && (
                  <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
                    {connectedAccount && (
                      <div className="flex items-center gap-1.5">
                        {connectedAccount.profilePictureUrl ? (
                          <img 
                            src={connectedAccount.profilePictureUrl} 
                            alt="Avatar" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                            className="w-4 h-4 rounded-full object-cover border border-border" 
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] font-bold">
                            {(connectedAccount.displayName || connectedAccount.username || "G").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[80px]">
                          {connectedAccount.displayName || connectedAccount.username}
                        </span>
                      </div>
                    )}
                    
                    <div className="relative">
                      <button 
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)} 
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {showOptionsMenu && (
                        <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-lg py-1 z-[100] animate-in fade-in slide-in-from-top-1 text-left text-foreground">
                          {connectedAccount && (
                            <div className="px-3 py-1.5 border-b border-border">
                              <span className="block text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-0.5">{t("sidebarIntegrations.explorer.connectedAs")}</span>
                              <span className="block text-[9.5px] font-extrabold text-foreground truncate">
                                {connectedAccount.displayName || connectedAccount.username}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={async () => {
                              setShowOptionsMenu(false);
                              await handleDisconnect();
                              handleConnect();
                            }}
                            className="w-full text-left px-3 py-2 text-[10px] font-bold text-foreground hover:bg-muted transition-colors uppercase tracking-wider cursor-pointer border-b border-border flex items-center gap-1.5"
                          >
                            <span>🔄</span>
                            <span>{t("sidebarIntegrations.explorer.switchAccount")}</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowOptionsMenu(false);
                              handleDisconnect();
                            }}
                            className="w-full text-left px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                          >
                            <span>🚪</span>
                            <span>{t("sidebarIntegrations.explorer.disconnectDrive")}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* If verifying connection, show loader */}
            {!hasDriveAccess ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-200">
                <div className="w-20 h-20 mx-auto flex items-center justify-center bg-blue-50/50 rounded-full mb-4">
                  <svg className="w-14 h-14" viewBox="0 0 24 24" fill="none">
                    <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
                    <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" fill="#FFC107" />
                    <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" fill="#2196F3" />
                  </svg>
                </div>
                <h4 className="text-xs font-black text-foreground uppercase mb-2">{t("sidebarIntegrations.explorer.btnConnect")}</h4>
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed mb-6 max-w-[200px]">
                  {t("sidebarIntegrations.drivePromo.desc")}
                </p>
                <button 
                  onClick={() => window.location.href = '/pricing'}
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{t("sidebarIntegrations.drivePromo.btn")}</span>
                  <span>💎</span>
                </button>
              </div>
            ) : isVerifyingConnection ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center p-6 animate-in fade-in duration-200">
                <Loader2 className="animate-spin text-black mb-3" size={24} />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("sidebarIntegrations.explorer.verifying")}</span>
              </div>
            ) : !connected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-200">
                <div className="w-20 h-20 mx-auto flex items-center justify-center bg-blue-50/50 rounded-full mb-4">
                  <svg className="w-14 h-14" viewBox="0 0 24 24" fill="none">
                    <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
                    <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" fill="#FFC107" />
                    <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" fill="#2196F3" />
                  </svg>
                </div>
                <h4 className="text-xs font-black text-foreground uppercase mb-2">{t("sidebarIntegrations.explorer.btnConnect")}</h4>
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed mb-6 max-w-[200px]">
                  {t("sidebarIntegrations.explorer.descConnect")}
                </p>
                <button 
                  onClick={handleConnect}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#FEF08A] hover:bg-[#FDE047] text-foreground rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{t("sidebarIntegrations.explorer.btnConnect")}</span>
                  <span>💎</span>
                </button>
              </div>
            ) : (
              // Connected: Render Drive Explorer
              <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
                {/* Search / Action row */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={searchInDrive}
                      onChange={(e) => setSearchInDrive(e.target.value)}
                      placeholder={t("sidebarIntegrations.explorer.searchPlaceholder")} 
                      className="w-full pl-3 pr-8 py-1.5 border border-border rounded-xl text-xs font-semibold focus:border-black outline-none placeholder:text-muted-foreground"
                    />
                    {searchInDrive && (
                      <button onClick={() => setSearchInDrive('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <button onClick={fetchDriveFiles} className="p-1.5 text-muted-foreground hover:text-black hover:bg-muted rounded-lg transition-all" title={t("sidebarIntegrations.explorer.syncTitle")}>
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                  {/* Filter Trigger & Popover */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowFilterPopover(!showFilterPopover);
                        setShowSortPopover(false);
                      }}
                      className={`p-1.5 rounded-lg transition-all relative ${showFilterPopover || filterFormat !== 'all' || filterSize !== 'all' ? 'text-black bg-muted' : 'text-muted-foreground hover:text-black hover:bg-muted'}`}
                      title={t("sidebarIntegrations.explorer.filter.title")}
                    >
                      <Filter size={14} />
                      {(filterFormat !== 'all' || filterSize !== 'all') && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      )}
                    </button>
                    {showFilterPopover && (
                      <div className="absolute right-0 mt-2 w-52 bg-card rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] border border-border p-3.5 z-[100] animate-in fade-in slide-in-from-top-2 text-left">
                        <div className="space-y-4">
                          <div>
                            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("sidebarIntegrations.explorer.filter.format")}</span>
                            <div className="flex flex-wrap gap-1">
                              {['all', 'mp4', 'webm', 'mov', 'png', 'jpg', 'pdf'].map(fmt => (
                                <button
                                  key={fmt}
                                  onClick={() => {
                                    setFilterFormat(fmt);
                                    setShowFilterPopover(false);
                                  }}
                                  className={`px-2 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${filterFormat === fmt ? 'bg-black text-white' : 'bg-muted hover:bg-muted text-muted-foreground'}`}
                                >
                                  {fmt}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("sidebarIntegrations.explorer.filter.size")}</span>
                            <div className="flex flex-col gap-1">
                              {[
                                { id: 'all', label: t("sidebarIntegrations.explorer.filter.sizes.all") },
                                { id: 'small', label: t("sidebarIntegrations.explorer.filter.sizes.small") },
                                { id: 'medium', label: t("sidebarIntegrations.explorer.filter.sizes.medium") },
                                { id: 'large', label: t("sidebarIntegrations.explorer.filter.sizes.large") }
                              ].map(sz => (
                                <button
                                  key={sz.id}
                                  onClick={() => {
                                    setFilterSize(sz.id);
                                    setShowFilterPopover(false);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${filterSize === sz.id ? 'bg-black text-white' : 'bg-muted hover:bg-muted text-muted-foreground'}`}
                                >
                                  {sz.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          {(filterFormat !== 'all' || filterSize !== 'all') && (
                            <button
                              onClick={() => {
                                setFilterFormat('all');
                                setFilterSize('all');
                                setShowFilterPopover(false);
                              }}
                              className="w-full py-1 text-center text-[8px] font-black text-red-500 hover:bg-red-50 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                            >
                              {t("sidebarIntegrations.explorer.filter.clear")}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sort Trigger & Popover */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowSortPopover(!showSortPopover);
                        setShowFilterPopover(false);
                      }}
                      className={`p-1.5 rounded-lg transition-all relative ${showSortPopover || sortField !== 'date' || sortOrder !== 'desc' ? 'text-black bg-muted' : 'text-muted-foreground hover:text-black hover:bg-muted'}`}
                      title={t("sidebarIntegrations.explorer.sort.title")}
                    >
                      <ArrowUpDown size={14} />
                    </button>
                    {showSortPopover && (
                      <div className="absolute right-0 mt-2 w-48 bg-card rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] border border-border p-3.5 z-[100] animate-in fade-in slide-in-from-top-2 text-left">
                        <div className="space-y-4">
                          <div>
                            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("sidebarIntegrations.explorer.sort.sortBy")}</span>
                            <div className="flex flex-col gap-1">
                              {[
                                { id: 'name', label: t("sidebarIntegrations.explorer.sort.fields.name") },
                                { id: 'date', label: t("sidebarIntegrations.explorer.sort.fields.date") },
                                { id: 'size', label: t("sidebarIntegrations.explorer.sort.fields.size") }
                              ].map(field => (
                                <button
                                  key={field.id}
                                  onClick={() => {
                                    setSortField(field.id);
                                    setShowSortPopover(false);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${sortField === field.id ? 'bg-muted text-black' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                  {field.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="border-t border-gray-50 pt-2.5">
                            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("sidebarIntegrations.explorer.sort.direction")}</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setSortOrder('asc');
                                  setShowSortPopover(false);
                                }}
                                className={`flex-1 py-1 text-center text-[9px] font-bold rounded-lg transition-all cursor-pointer ${sortOrder === 'asc' ? 'bg-black text-white' : 'bg-muted hover:bg-muted text-muted-foreground'}`}
                              >
                                {t("sidebarIntegrations.explorer.sort.asc")}
                              </button>
                              <button
                                onClick={() => {
                                  setSortOrder('desc');
                                  setShowSortPopover(false);
                                }}
                                className={`flex-1 py-1 text-center text-[9px] font-bold rounded-lg transition-all cursor-pointer ${sortOrder === 'desc' ? 'bg-black text-white' : 'bg-muted hover:bg-muted text-muted-foreground'}`}
                              >
                                {t("sidebarIntegrations.explorer.sort.desc")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Path title: Home or Folder Name */}
                <div className="px-4 py-3 flex items-center gap-1.5 text-foreground shrink-0 border-b border-gray-50">
                  {viewMode === 'files' ? (
                    <button 
                      onClick={() => setViewMode('categories')} 
                      className="flex items-center gap-1 text-[11px] font-black text-muted-foreground hover:text-black transition-colors uppercase tracking-wider"
                    >
                      <ChevronLeft size={14} />
                      <span>{t("sidebarIntegrations.explorer.home")} / {t(FOLDERS.find(f => f.id === selectedFolder)?.labelKey)}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-foreground uppercase tracking-wider">
                      <Home size={14} className="text-muted-foreground" />
                      <span>{t("sidebarIntegrations.explorer.home")}</span>
                    </div>
                  )}
                </div>

                {/* Contents Area */}
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10">
                    <Loader2 className="animate-spin text-black mb-2" size={20} />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">{t("sidebarIntegrations.explorer.loadingFiles")}</span>
                  </div>
                ) : viewMode === 'categories' ? (
                  /* Categories grid matching user screenshot */
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {FOLDERS.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => handleFolderClick(folder.id)}
                          className="border border-border hover:border-border rounded-2xl overflow-hidden hover:shadow-sm transition-all flex flex-col items-center bg-card cursor-pointer active:scale-95 duration-150"
                        >
                          <div className="py-6 flex-1 flex items-center justify-center">
                            {folder.icon}
                          </div>
                          <div className="w-full border-t border-border bg-muted/50 py-2 px-1 text-center shrink-0">
                            <span className="text-[9px] font-black text-muted-foreground block truncate leading-none uppercase tracking-tighter">
                              {t(folder.labelKey)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Files View Mode */
                  <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                    {filteredFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileVideo className="text-gray-300 mb-2" size={28} />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{t("sidebarIntegrations.explorer.noFiles")}</span>
                        <p className="text-[9px] text-muted-foreground font-bold max-w-[180px] mt-1 leading-normal">
                          {t("sidebarIntegrations.explorer.noFilesDesc")}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {filteredFiles.map((file) => (
                          <div 
                            key={file.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", JSON.stringify({
                                source: 'google-drive',
                                fileId: file.id,
                                name: file.name
                              }));
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            className="flex items-center gap-3 p-2 bg-card border border-border hover:border-border hover:shadow-sm rounded-2xl transition-all cursor-grab active:cursor-grabbing group/item"
                          >
                            {/* Thumbnail */}
                            <div className="w-12 h-12 bg-muted rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-gray-50 relative">
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
                                <FileVideo size={16} className="text-muted-foreground" />
                              ) : file.mimeType?.startsWith('image/') ? (
                                <FileImage size={16} className="text-muted-foreground" />
                              ) : (
                                <FileText size={16} className="text-muted-foreground" />
                              )}
                              <div className="absolute inset-0 bg-black/10 group-hover/item:bg-black/20 flex items-center justify-center transition-colors">
                                <Play size={10} className="text-white fill-white shrink-0" />
                              </div>
                            </div>

                            {/* Meta info */}
                            <div className="flex-1 min-w-0 pr-1">
                              <p className="text-[10px] font-black text-foreground truncate mb-0.5 leading-tight group-hover/item:text-black">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground">
                                <span>{formatSize(file.size)}</span>
                                <span>•</span>
                                <span>{new Date(file.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer instructions matching the screenshot */}
                <div className="h-12 border-t border-border bg-muted/50 px-4 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-tighter">
                      {t("sidebarIntegrations.explorer.dragInstruction")}
                    </span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#E5F9E0] border border-[#B3F5AD] flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-[#2D6A4F] font-extrabold">∞</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Canva & Content Assistant Promotions
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {activeStrategy.illustration()}
            
            <h4 className="text-sm font-extrabold text-foreground mb-2">{t(activeStrategy.titleKey)}</h4>
            <p className="text-[11px] text-muted-foreground font-bold leading-relaxed max-w-[200px] mb-8">
              {t(activeStrategy.descKey)}
            </p>

            {activeStrategy.id === 'ideas' ? (
              <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
                <button 
                  onClick={() => {
                    const oneHourFromNow = new Date(Date.now() + 3600000);
                    openPostCreator({ 
                      defaultScheduledAt: oneHourFromNow,
                      template: {
                        caption: ""
                      }
                    });
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FEF08A] hover:bg-[#FDE047] text-foreground rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles size={14} className="text-indigo-700" />
                  <span>{t(activeStrategy.buttonTextKey)}</span>
                </button>
                <button 
                  onClick={() => navigate('/ai-assistant')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border border-border hover:bg-muted text-foreground rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                >
                  <span>Mở Trợ lý AI chuyên sâu 🚀</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#FEF08A] hover:bg-[#FDE047] text-foreground rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{t(activeStrategy.buttonTextKey)}</span>
                {activeStrategy.hasDiamond && <span className="text-[10px]">💎</span>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
