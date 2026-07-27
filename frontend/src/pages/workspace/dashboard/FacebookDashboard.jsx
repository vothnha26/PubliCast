import React from "react";
import { FacebookOverviewTab }     from "./FacebookOverviewTab";
import { FacebookPostsTab }        from "./FacebookPostsTab";
import { FacebookPostsListTab }    from "./FacebookPostsListTab";
import { FacebookStoriesTab }      from "./FacebookStoriesTab";
import { FacebookCompetitorsTab }  from "./FacebookCompetitorsTab";

export function FacebookDashboard({
  metrics,
  loading,
  dateRange,
  setDateRange,
  realData,
  activeTab,
  setActiveTab,
  publishedVideos,
  isPublishedLoading,
  pageSize,
  setPageSize,
  fetchPublishedVideos,
  prevPageToken,
  nextPageToken,
  onVideoClick,
  // Competitors props
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
  return (
    <>
      {/* ── OVERVIEW: Followers + Clicks (gộp) ─────────────────────── */}
      {activeTab === "overview" && (
        <FacebookOverviewTab realData={realData} />
      )}

      {/* ── POSTS: Overview + Interactions + Types + List of posts ───── */}
      {activeTab === "posts" && (
        <FacebookPostsTab
          realData={realData}
          publishedVideos={publishedVideos}
          isPublishedLoading={isPublishedLoading}
          pageSize={pageSize}
          setPageSize={setPageSize}
          fetchPublishedVideos={fetchPublishedVideos}
          prevPageToken={prevPageToken}
          nextPageToken={nextPageToken}
          onVideoClick={onVideoClick}
        />
      )}

      {/* ── STORIES ──────────────────────────────────────────────────── */}
      {activeTab === "stories" && (
        <FacebookStoriesTab
          realData={realData}
          isLoading={isPublishedLoading}
          loading={loading}
        />
      )}

      {/* ── COMPETITORS ──────────────────────────────────────────────── */}
      {activeTab === "competitors" && (
        <FacebookCompetitorsTab
          isCompetitorModalOpen={isCompetitorModalOpen}
          setIsCompetitorModalOpen={setIsCompetitorModalOpen}
          competitorQuery={competitorQuery}
          setCompetitorQuery={setCompetitorQuery}
          handleSearchCompetitors={handleSearchCompetitors}
          isSearching={isSearching}
          searchResults={searchResults}
          handleAddCompetitor={handleAddCompetitor}
          handleDeleteCompetitor={handleDeleteCompetitor}
          isCompetitorLoading={isCompetitorLoading}
          competitors={competitors}
          isPlatformLocked={isPlatformLocked}
        />
      )}
    </>
  );
}
