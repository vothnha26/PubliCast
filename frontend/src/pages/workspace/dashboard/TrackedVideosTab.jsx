import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";

export function TrackedVideosTab({
  isVideoModalOpen,
  setIsVideoModalOpen,
  videoUrl,
  setVideoUrl,
  handleTrackVideo,
  isTrackingLoading,
  trackedVideos,
  isPlatformLocked = false
}) {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tracked Videos</h3>
          <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
             <DialogTrigger asChild>
                <button 
                  disabled={isPlatformLocked}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   START TRACKING
                </button>
             </DialogTrigger>
             <DialogContent>
                <DialogHeader>
                   <DialogTitle>Track New Video</DialogTitle>
                   <DialogDescription>Paste a YouTube URL to start tracking its performance.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                   <Label htmlFor="video-url">Video URL</Label>
                   <Input 
                     id="video-url" 
                     placeholder="https://www.youtube.com/watch?v=..." 
                     value={videoUrl}
                     onChange={(e) => setVideoUrl(e.target.value)}
                   />
                </div>
                <DialogFooter>
                   <Button onClick={handleTrackVideo}>Start Tracking</Button>
                </DialogFooter>
             </DialogContent>
          </Dialog>
       </div>

        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
             <thead>
                <tr className="bg-card border-b border-border">
                   {["Video", "Channel", "Views", "Likes", "Comments", "Last Sync"].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                   ))}
                </tr>
             </thead>
             {isTrackingLoading ? (
                <tbody className="divide-y divide-border">
                   {[1, 2, 3].map((n) => (
                      <tr key={n} className="animate-pulse">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                               <div className="w-16 h-10 bg-muted rounded-lg shrink-0" />
                               <div className="w-36 h-3 bg-muted rounded" />
                            </div>
                         </td>
                         <td className="px-6 py-4"><div className="w-24 h-3 bg-muted rounded" /></td>
                         <td className="px-6 py-4"><div className="w-16 h-4 bg-muted rounded" /></td>
                         <td className="px-6 py-4"><div className="w-12 h-3 bg-muted/60 rounded" /></td>
                         <td className="px-6 py-4"><div className="w-12 h-3 bg-muted/60 rounded" /></td>
                         <td className="px-6 py-4"><div className="w-28 h-3 bg-muted/60 rounded" /></td>
                      </tr>
                   ))}
                </tbody>
             ) : (
                <tbody className="divide-y divide-border">
                   {trackedVideos.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-10 text-center text-muted-foreground text-xs">No videos tracked yet.</td></tr>
                   ) : trackedVideos.map((video, i) => (
                      <tr key={i} className="hover:bg-muted/50 transition-colors group">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                               <img src={video.thumbnailUrl} className="w-16 h-10 rounded-lg object-cover" />
                               <span className="text-sm font-bold text-foreground truncate max-w-[200px]">{video.title}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{video.channelName}</td>
                         <td className="px-6 py-4 text-sm font-bold text-foreground">{video.lastViews.toLocaleString()}</td>
                         <td className="px-6 py-4 text-sm text-muted-foreground">{video.lastLikes.toLocaleString()}</td>
                         <td className="px-6 py-4 text-sm text-muted-foreground">{video.lastComments.toLocaleString()}</td>
                         <td className="px-6 py-4 text-[10px] text-muted-foreground">{video.lastSyncedAt ? new Date(video.lastSyncedAt).toLocaleString() : 'Never'}</td>
                      </tr>
                   ))}
                </tbody>
             )}
          </table>
        </div>
    </div>
  );
}
