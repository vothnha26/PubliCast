const prisma = require('../../../config/prisma');
const { PLATFORMS, POST_STATUS, YOUTUBE_API } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

function formatVideoList(items) {
  return (items || [])
    .filter(v => v.status?.privacyStatus !== 'private')
    .map(v => ({
      id: v.id,
      title: v.snippet.title,
      thumbnailUrl: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default.url,
      publishedAt: v.snippet.publishedAt,
      views: v.statistics?.viewCount || 0,
      likes: v.statistics?.likeCount || 0,
      comments: v.statistics?.commentCount || 0,
      duration: v.contentDetails?.duration,
      status: POST_STATUS.PUBLISHED,
      privacyStatus: v.status?.privacyStatus || 'public',
      platform: PLATFORMS.YOUTUBE,
      postUrl: YOUTUBE_API.videoUrl(v.id),
      madeForKids: v.status?.madeForKids ?? v.status?.selfDeclaredMadeForKids ?? false
    }));
}

function formatVideoDetails(video, channel) {
  return {
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
    channelId: video.snippet.channelId,
    channelTitle: video.snippet.channelTitle,
    subscriberCount: channel?.statistics?.subscriberCount,
    viewCount: video.statistics.viewCount,
    likeCount: video.statistics.likeCount,
    publishedAt: video.snippet.publishedAt,
    madeForKids: video.status?.madeForKids ?? video.status?.selfDeclaredMadeForKids ?? false
  };
}

function formatTrackedVideoAsDetails(tracked) {
  return {
    id: tracked.videoId,
    title: tracked.title,
    description: undefined,
    thumbnailUrl: tracked.thumbnailUrl,
    channelId: tracked.channelId,
    channelTitle: tracked.channelName,
    subscriberCount: undefined,
    viewCount: tracked.lastViews,
    likeCount: tracked.lastLikes,
    publishedAt: tracked.publishedAt ? tracked.publishedAt.toISOString() : undefined,
    madeForKids: undefined
  };
}

function prepareTrackedVideoData(video) {
  return {
    title: video.snippet.title,
    thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
    lastViews: parseInt(video.statistics.viewCount) || 0,
    lastLikes: parseInt(video.statistics.likeCount) || 0,
    lastComments: parseInt(video.statistics.commentCount) || 0,
    channelId: video.snippet.channelId,
    channelName: video.snippet.channelTitle,
    publishedAt: new Date(video.snippet.publishedAt)
  };
}

// Attributes a persisted Post to the YouTube channel it was actually pulled
// from — without this, getPublishedVideos's PostTarget-scoped DB query has no
// row to filter on, and a brand with 2+ YouTube channels can't distinguish
// which channel a DB-cached video belongs to.
async function upsertPostTargetForVideo(postId, socialAccountId) {
  await prisma.postTarget.upsert({
    where: { postId_socialAccountId: { postId, socialAccountId } },
    update: {},
    create: {
      postId,
      socialAccountId,
      platform: PLATFORMS.YOUTUBE,
      publishStatus: 'PUBLISHED',
      publishedAt: new Date()
    }
  });
}

async function upsertPublishedVideosToDb(brandId, videos, socialAccountId = null) {
  if (!videos || videos.length === 0) return;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { ownerId: true }
  });
  if (!brand || !brand.ownerId) return;

  for (const v of videos) {
    try {
      const existing = await prisma.post.findFirst({
        where: { brandId, platformPostId: v.id }
      });

      let postId;
      if (existing) {
        const updated = await prisma.post.update({
          where: { id: existing.id },
          data: {
            title: v.title || existing.title,
            caption: v.description || existing.caption,
            mediaThumbnailUrls: v.thumbnailUrl || existing.mediaThumbnailUrls,
            publishedAt: v.publishedAt ? new Date(v.publishedAt) : existing.publishedAt,
            status: POST_STATUS.PUBLISHED
          }
        });
        postId = updated.id;
      } else {
        const created = await prisma.post.create({
          data: {
            brandId,
            createdByUserId: brand.ownerId,
            title: v.title || 'YouTube Video',
            caption: v.description || '',
            type: 'VIDEO',
            status: POST_STATUS.PUBLISHED,
            targetPlatforms: 'YOUTUBE',
            platformPostId: v.id,
            mediaThumbnailUrls: v.thumbnailUrl || '',
            publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
            scheduledAt: v.publishedAt ? new Date(v.publishedAt) : null
          }
        });
        postId = created.id;
      }

      if (socialAccountId) {
        await upsertPostTargetForVideo(postId, socialAccountId);
      }
    } catch (err) {
      logger.warn(`[YouTubeVideoPersistenceUtil] Failed to upsert video ${v.id} into post DB:`, err.message);
    }
  }
}

module.exports = {
  formatVideoList,
  formatVideoDetails,
  formatTrackedVideoAsDetails,
  prepareTrackedVideoData,
  upsertPublishedVideosToDb,
  upsertPostTargetForVideo
};
