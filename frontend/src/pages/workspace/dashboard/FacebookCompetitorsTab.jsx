import React, { useState } from "react";
import {
  Loader2, MoreVertical, Star, Trash2, ExternalLink, TrendingUp, TrendingDown,
} from "lucide-react";
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
import { useConfirm } from "@/hooks/useConfirm";

// ─── Format helpers ──────────────────────────────────────────────────────────
function formatNumber(num) {
  if (!num) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toString();
}

// ─── Growth badge ────────────────────────────────────────────────────────────
function GrowthBadge({ value }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-[9px] font-bold ${
        up ? "text-green-500" : "text-red-400"
      }`}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─── Stat mini card ──────────────────────────────────────────────────────────
function StatCell({ label, value, color = "text-[#0A0A0A]" }) {
  return (
    <td className="px-4 py-4 text-center">
      <span className={`text-sm font-black ${color}`}>{value ?? "--"}</span>
    </td>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="w-28 h-3 bg-gray-100 rounded" />
            <div className="w-20 h-2 bg-gray-50 rounded" />
          </div>
        </div>
      </td>
      {[1, 2, 3, 4, 5].map((n) => (
        <td key={n} className="px-4 py-4">
          <div className="w-16 h-4 bg-gray-100 rounded mx-auto" />
        </td>
      ))}
      <td className="px-4 py-4 text-right">
        <div className="inline-block w-8 h-8 bg-gray-100 rounded-lg" />
      </td>
    </tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function FacebookCompetitorsTab({
  isCompetitorModalOpen,
  setIsCompetitorModalOpen,
  competitorQuery,
  setCompetitorQuery,
  handleSearchCompetitors,
  isSearching,
  searchResults = [],
  handleAddCompetitor,
  handleDeleteCompetitor,
  isCompetitorLoading,
  competitors = [],
  isPlatformLocked = false,
}) {
  const confirm = useConfirm();
  const [favorites, setFavorites] = useState({});

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
    toast.success(favorites[id] ? "Removed from favorites" : "Added to favorites");
  };

  const openFacebookPage = (comp) => {
    const handle = comp.competitorHandle || "";
    const url =
      comp.competitorProfileUrl ||
      (handle.startsWith("http")
        ? handle
        : `https://www.facebook.com/${handle.replace(/^@/, "")}`);
    window.open(url, "_blank");
  };

  const HEADERS = [
    "Competitor",
    "Followers",
    "Eng. Rate",
    "Avg Reach",
    "Posts/wk",
    "Top Type",
    "Added",
    "",
  ];

  return (
    <div className="space-y-6">
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          List of competitors
        </h3>

        <Dialog open={isCompetitorModalOpen} onOpenChange={setIsCompetitorModalOpen}>
          <DialogTrigger asChild>
            <button 
              disabled={isPlatformLocked}
              className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-xl text-[10px] font-bold hover:bg-blue-600 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ADD COMPETITOR
            </button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Facebook Competitor</DialogTitle>
              <DialogDescription>
                Nhập tên trang hoặc handle Facebook để so sánh metrics.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter page name or @handle..."
                  value={competitorQuery}
                  onChange={(e) => setCompetitorQuery(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSearchCompetitors()
                  }
                />
                <Button onClick={handleSearchCompetitors} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>

              {/* Search results */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {searchResults.map((page) => (
                  <div
                    key={page.pageId || page.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {page.thumbnail ? (
                        <img
                          src={page.thumbnail}
                          className="w-8 h-8 rounded-full border border-gray-100"
                          alt=""
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                          f
                        </div>
                      )}
                      <span className="text-xs font-bold truncate max-w-[150px]">
                        {page.title || page.name}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => handleAddCompetitor(page.pageId || page.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Competitors Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50/50">
              <tr>
                {HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest ${
                      h === "" ? "text-right" : i === 0 ? "text-left" : "text-center"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            {isCompetitorLoading ? (
              <tbody className="divide-y divide-gray-50">
                {[1, 2, 3].map((n) => (
                  <SkeletonRow key={n} />
                ))}
              </tbody>
            ) : (
              <tbody className="divide-y divide-gray-50">
                {competitors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={HEADERS.length}
                      className="px-6 py-12 text-center text-gray-400 text-xs"
                    >
                      No Facebook competitors added yet.
                    </td>
                  </tr>
                ) : (
                  competitors.map((comp, i) => (
                    <tr
                      key={comp.id || i}
                      className="hover:bg-[#F8F8F7]/50 transition-colors"
                    >
                      {/* Competitor info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {comp.competitorAvatarUrl ? (
                            <img
                              src={comp.competitorAvatarUrl}
                              className="w-10 h-10 rounded-full border border-gray-100 object-cover"
                              referrerPolicy="no-referrer"
                              alt=""
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                              f
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-[#0A0A0A] truncate max-w-[160px]">
                              {comp.competitorDisplayName || comp.competitorHandle}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400">
                              {comp.competitorHandle}
                            </span>
                            <GrowthBadge value={comp.followersGrowth} />
                          </div>
                        </div>
                      </td>

                      {/* Followers */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-black text-[#0A0A0A]">
                          {formatNumber(comp.followersCount)}
                        </span>
                      </td>

                      {/* Engagement Rate */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`text-sm font-bold ${
                            comp.avgEngagementRate > 3
                              ? "text-green-600"
                              : comp.avgEngagementRate > 1
                              ? "text-amber-500"
                              : "text-gray-400"
                          }`}
                        >
                          {comp.avgEngagementRate != null
                            ? `${comp.avgEngagementRate.toFixed(2)}%`
                            : "--"}
                        </span>
                      </td>

                      {/* Avg Reach */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-gray-700">
                          {comp.avgReach != null
                            ? formatNumber(Math.round(comp.avgReach))
                            : "--"}
                        </span>
                      </td>

                      {/* Posts/week */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-gray-700">
                          {comp.postsPerWeek != null
                            ? comp.postsPerWeek.toFixed(1)
                            : "--"}
                        </span>
                      </td>

                      {/* Top Post Type */}
                      <td className="px-4 py-4 text-center">
                        {comp.topPostType ? (
                          <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase bg-indigo-50 text-indigo-600">
                            {comp.topPostType}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">--</span>
                        )}
                      </td>

                      {/* Added At */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-[10px] font-medium text-gray-400">
                          {new Date(comp.addedAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button
                             onClick={() => !isPlatformLocked && toggleFavorite(comp.id)}
                             disabled={isPlatformLocked}
                             className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             <Star
                               size={15}
                               className={
                                 favorites[comp.id]
                                   ? "fill-yellow-400 stroke-yellow-400"
                                   : "text-gray-300 hover:text-yellow-400"
                               }
                             />
                           </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent focus:outline-none">
                                <MoreVertical
                                  size={15}
                                  className="text-gray-400 hover:text-[#0A0A0A]"
                                />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50"
                            >
                              <DropdownMenuItem
                                onClick={() => openFacebookPage(comp)}
                                className="px-4 py-2 flex items-center gap-2.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                              >
                                <ExternalLink size={13} className="text-gray-400" />
                                Visit Facebook page
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-100 my-1" />
                               <DropdownMenuItem
                                 disabled={isPlatformLocked}
                                 onClick={async () => {
                                   if (isPlatformLocked) return;
                                   const ok = await confirm({
                                     title: "Delete Competitor?",
                                     description:
                                       "Are you sure you want to remove this competitor?",
                                     confirmText: "Delete",
                                     cancelText: "Cancel",
                                     variant: "destructive",
                                   });
                                   if (ok) handleDeleteCompetitor(comp.id);
                                 }}
                                 className="px-4 py-2 flex items-center gap-2.5 text-xs text-red-600 hover:bg-red-50 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 <Trash2 size={13} className="text-red-400" />
                                 Delete competitor
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
