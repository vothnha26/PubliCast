import React, { useState, useEffect } from "react";
import { Search, Hash, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import socialService from "../../../services/social.service";

export function SubredditSelector({ brandId, value = {}, onChange }) {
  const [subreddit, setSubreddit] = useState(value.subreddit || "");
  const [flairId, setFlairId] = useState(value.flairId || "");
  const [isNsfw, setIsNsfw] = useState(!!value.isNsfw);
  const [isSpoiler, setIsSpoiler] = useState(!!value.isSpoiler);

  const [subredditsList, setSubredditsList] = useState([]);
  const [flairsList, setFlairsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingFlairs, setLoadingFlairs] = useState(false);

  useEffect(() => {
    if (brandId) {
      fetchUserSubreddits();
    }
  }, [brandId]);

  useEffect(() => {
    if (subreddit && brandId) {
      fetchSubredditFlairs(subreddit);
    } else {
      setFlairsList([]);
    }
  }, [subreddit, brandId]);

  const updateMetadata = (updates) => {
    const next = {
      subreddit,
      flairId,
      isNsfw,
      isSpoiler,
      ...updates
    };
    if (onChange) onChange(next);
  };

  const fetchUserSubreddits = async () => {
    try {
      setLoadingSubs(true);
      const res = await socialService.getRedditUserSubreddits(brandId);
      if (res?.success) {
        setSubredditsList(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch user subreddits:", err);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleSearchSubreddits = async (q) => {
    setSearchQuery(q);
    if (!q || q.length < 2) return;
    try {
      setLoadingSubs(true);
      const res = await socialService.searchRedditSubreddits(brandId, q);
      if (res?.success) {
        setSubredditsList(res.data || []);
      }
    } catch (err) {
      console.error("Failed to search subreddits:", err);
    } finally {
      setLoadingSubs(false);
    }
  };

  const fetchSubredditFlairs = async (sub) => {
    try {
      setLoadingFlairs(true);
      const res = await socialService.getSubredditFlairs(brandId, sub);
      if (res?.success) {
        setFlairsList(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sub flairs:", err);
      setFlairsList([]);
    } finally {
      setLoadingFlairs(false);
    }
  };

  const handleSelectSubreddit = (subName) => {
    setSubreddit(subName);
    setFlairId("");
    updateMetadata({ subreddit: subName, flairId: "" });
  };

  const handleFlairChange = (e) => {
    const selectedFlair = e.target.value;
    setFlairId(selectedFlair);
    updateMetadata({ flairId: selectedFlair });
  };

  const handleNsfwChange = (e) => {
    const val = e.target.checked;
    setIsNsfw(val);
    updateMetadata({ isNsfw: val });
  };

  const handleSpoilerChange = (e) => {
    const val = e.target.checked;
    setIsSpoiler(val);
    updateMetadata({ isSpoiler: val });
  };

  return (
    <div className="bg-orange-50/40 p-4 rounded-2xl border border-orange-100/80 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-orange-600" />
          Cấu hình Reddit Subreddit
        </span>
        {subreddit && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500 text-white">
            r/{subreddit}
          </span>
        )}
      </div>

      {/* Target Subreddit Selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 block">Subreddit đích</label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery || subreddit}
            onChange={(e) => handleSearchSubreddits(e.target.value)}
            placeholder="Tìm hoặc nhập tên subreddit (vd: askreddit, technology)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {loadingSubs && <p className="text-[10px] text-gray-400">Đang tìm subreddit...</p>}

        {subredditsList.length > 0 && (
          <div className="max-h-36 overflow-y-auto bg-white border border-gray-100 rounded-xl p-1 shadow-sm space-y-1">
            {subredditsList.map((sub) => (
              <button
                key={sub.name}
                type="button"
                onClick={() => handleSelectSubreddit(sub.name)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-orange-50 ${
                  subreddit === sub.name ? "bg-orange-100/80 font-bold text-orange-900" : "text-gray-700"
                }`}
              >
                <span>r/{sub.name}</span>
                {sub.subscribers && (
                  <span className="text-[10px] text-gray-400">{sub.subscribers.toLocaleString()} members</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Link Flair Selection */}
      {subreddit && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 block">Link Flair (Thẻ bài viết)</label>
          <select
            value={flairId}
            onChange={handleFlairChange}
            disabled={loadingFlairs}
            className="w-full text-xs py-2 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">-- Không chọn Flair --</option>
            {flairsList.map((flair) => (
              <option key={flair.id} value={flair.id}>
                {flair.text}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tags: NSFW & Spoiler */}
      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isNsfw}
            onChange={handleNsfwChange}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Gắn thẻ NSFW (18+)</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isSpoiler}
            onChange={handleSpoilerChange}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Gắn thẻ Spoiler</span>
        </label>
      </div>
    </div>
  );
}
