import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Loader2, MoreVertical, Star, BarChart2, Trash2, Search, ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";
import CompetitorStatsModal from './CompetitorStatsModal';
import { useConfirm } from "@/hooks/useConfirm";

export function CompetitorsTab({
  isCompetitorModalOpen,
  setIsCompetitorModalOpen,
  competitorQuery,
  setCompetitorQuery,
  handleSearchCompetitors,
  isSearching,
  searchResults,
  handleAddCompetitor,
  handleDeleteCompetitor,
  isCompetitorLoading,
  competitors,
  isPlatformLocked = false
}) {
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [selectedCompetitorForStats, setSelectedCompetitorForStatsState] = useState(null);

  const setSelectedCompetitorForStats = (comp) => {
    setSelectedCompetitorForStatsState(comp);
    setSearchParams(prev => {
      if (comp) {
        prev.set("competitorId", comp.id);
      } else {
        prev.delete("competitorId");
      }
      return prev;
    }, { replace: true });
  };

  useEffect(() => {
    const competitorId = searchParams.get("competitorId");
    if (competitorId && competitors && competitors.length > 0) {
      const found = competitors.find(c => String(c.id) === String(competitorId));
      if (found) {
        setSelectedCompetitorForStatsState(found);
      }
    } else {
      setSelectedCompetitorForStatsState(null);
    }
  }, [searchParams, competitors]);
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
    toast.success(favorites[id] ? "Removed from favorites" : "Added to favorites");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">List of competitors</h3>
        
        <Dialog open={isCompetitorModalOpen} onOpenChange={setIsCompetitorModalOpen}>
          <DialogTrigger asChild>
            <button 
              disabled={isPlatformLocked}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] text-white rounded-xl text-[10px] font-bold hover:bg-black/90 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ADD COMPETITOR
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add YouTube Competitor</DialogTitle>
              <DialogDescription>Search for a channel to compare metrics.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter channel name or handle..." 
                  value={competitorQuery}
                  onChange={(e) => setCompetitorQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchCompetitors()}
                />
                <Button onClick={handleSearchCompetitors} disabled={isSearching}>
                  {isSearching ? <Loader2 className="animate-spin" size={16} /> : "Search"}
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {searchResults.map((channel) => (
                  <div key={channel.channelId} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg border border-border">
                     <div className="flex items-center gap-3">
                        <img 
                          src={channel.thumbnail} 
                          className="w-8 h-8 rounded-full" 
                          referrerPolicy="no-referrer" 
                        />
                        <span className="text-xs font-bold truncate max-w-[150px]">{channel.title}</span>
                     </div>
                     <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleAddCompetitor(channel.channelId)}>Add</Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Competitors Table */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
              <thead className="bg-muted/50">
                <tr>
                  {["Competitor", "Subscribers", "Views", "Videos", "Added At", ""].map((h, i) => (
                    <th 
                      key={i} 
                      className={`px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${
                        h === "" 
                          ? "text-right sticky right-0 bg-muted/95 z-10 border-l border-border/50 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.05)]" 
                          : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              {isCompetitorLoading ? (
                <tbody className="divide-y divide-border">
                  {[1, 2, 3].map((n) => (
                    <tr key={n} className="animate-pulse">
                       <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted" />
                          <div className="flex flex-col gap-2">
                            <div className="w-28 h-3 bg-muted rounded" />
                            <div className="w-20 h-2 bg-muted/50 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="w-16 h-4 bg-muted rounded" /></td>
                      <td className="px-6 py-4"><div className="w-20 h-4 bg-muted rounded" /></td>
                      <td className="px-6 py-4"><div className="w-12 h-4 bg-muted rounded" /></td>
                      <td className="px-6 py-4"><div className="w-20 h-3 bg-muted/50 rounded" /></td>
                      <td className="px-6 py-4 text-right sticky right-0 bg-card z-10 border-l border-border/50 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.05)]"><div className="inline-block w-8 h-8 bg-muted rounded-lg" /></td>
                    </tr>
                  ))}
                </tbody>
              ) : (
                <tbody className="divide-y divide-border">
                  {competitors.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-10 text-center text-muted-foreground text-xs">No competitors added yet.</td></tr>
                  ) : competitors.map((comp, i) => (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={comp.competitorAvatarUrl} 
                              className="w-10 h-10 rounded-full border border-border object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground">{comp.competitorDisplayName}</span>
                                <span className="text-[10px] font-medium text-muted-foreground">{comp.competitorHandle}</span>
                            </div>
                          </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{comp.followersCount?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{comp.totalViews?.toLocaleString() || '0'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{comp.totalVideos?.toLocaleString() || '0'}</td>
                      <td className="px-6 py-4 text-[10px] font-medium text-muted-foreground">{new Date(comp.addedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right sticky right-0 bg-card z-10 border-l border-border/50 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                             onClick={() => !isPlatformLocked && toggleFavorite(comp.id)}
                             disabled={isPlatformLocked}
                             className="p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                            <Star 
                              size={16} 
                              className={favorites[comp.id] ? "fill-yellow-400 stroke-yellow-400" : "text-muted-foreground hover:text-yellow-400"} 
                            />
                          </button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer border-none bg-transparent focus:outline-none">
                                <MoreVertical size={16} className="text-muted-foreground hover:text-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-card border border-border rounded-2xl shadow-xl py-2 z-50 text-left">
                              <DropdownMenuItem 
                                onClick={() => setSelectedCompetitorForStats(comp)}
                                className="px-4 py-2 flex items-center gap-2.5 text-xs text-foreground hover:bg-muted font-medium cursor-pointer border-none outline-none focus:outline-none"
                              >
                                <BarChart2 size={14} className="text-muted-foreground" /> More stats
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  const url = comp.competitorHandle.startsWith('@') 
                                    ? `https://www.youtube.com/${comp.competitorHandle}` 
                                    : `https://www.youtube.com/channel/${comp.competitorHandle}`;
                                  window.open(url, '_blank');
                                }}
                                className="px-4 py-2 flex items-center gap-2.5 text-xs text-foreground hover:bg-muted font-medium cursor-pointer border-none outline-none focus:outline-none"
                              >
                                <ExternalLink size={14} className="text-muted-foreground" /> Watch the original
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border my-1" />
                              <DropdownMenuItem 
                                 disabled={isPlatformLocked}
                                 onClick={async () => {
                                   if (isPlatformLocked) return;
                                   const isConfirmed = await confirm({
                                     title: "Delete Competitor?",
                                     description: "Are you sure you want to delete this competitor?",
                                     confirmText: "Delete",
                                     cancelText: "Cancel",
                                     variant: "destructive"
                                   });
                                   if (isConfirmed) {
                                     handleDeleteCompetitor(comp.id);
                                   }
                                 }}
                                 className="px-4 py-2 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 font-medium cursor-pointer border-none outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                <Trash2 size={14} className="text-red-400" /> Delete competitor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
          </table>
        </div>
      </div>

      {/* Latest Videos Section */}
      {!isCompetitorLoading && competitors.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LATEST VIDEOS COMPARISON</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitors.map((comp) => (
              <div key={comp.id} className="bg-card rounded-3xl border border-border p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  {/* Competitor Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
                    <img 
                      src={comp.competitorAvatarUrl} 
                      className="w-8 h-8 rounded-full border border-border object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{comp.competitorDisplayName}</h4>
                      <p className="text-[9px] text-muted-foreground truncate">{comp.competitorHandle}</p>
                    </div>
                  </div>
                  
                  {/* Videos list */}
                  <div className="space-y-3">
                    {!comp.latestVideos || comp.latestVideos.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">No recent videos found.</p>
                    ) : (
                      comp.latestVideos.slice(0, 5).map((vid) => (
                        <div key={vid.id} className="flex gap-3 hover:bg-muted/50 p-2 rounded-2xl transition-all border border-transparent hover:border-border">
                          <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0 border border-border relative bg-muted shadow-sm">
                            <img 
                              src={vid.thumbnailUrl} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <h5 className="text-[10px] font-bold text-foreground line-clamp-1 leading-snug" title={vid.title}>
                              {vid.title}
                            </h5>
                            <div className="flex items-center gap-2 text-[8px] text-muted-foreground font-bold uppercase tracking-wider">
                              <span className="text-[#16A34A]">{vid.views?.toLocaleString()} views</span>
                              <span>•</span>
                              <span>{new Date(vid.publishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal More Stats */}
      <CompetitorStatsModal 
        selectedCompetitorForStats={selectedCompetitorForStats}
        setSelectedCompetitorForStats={setSelectedCompetitorForStats}
      />
    </div>
  );
}
