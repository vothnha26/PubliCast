const prisma = require('../../config/prisma');

class TrackedVideoRepository {
  async upsertTrackedVideo(brandId, videoId, videoData) {
    return prisma.trackedVideo.upsert({
      where: { brandId_videoId: { brandId, videoId } },
      update: {
        title: videoData.title,
        thumbnailUrl: videoData.thumbnailUrl,
        lastViews: videoData.lastViews,
        lastLikes: videoData.lastLikes,
        lastComments: videoData.lastComments,
        lastSyncedAt: new Date()
      },
      create: {
        brandId,
        videoId,
        title: videoData.title,
        thumbnailUrl: videoData.thumbnailUrl,
        channelId: videoData.channelId,
        channelName: videoData.channelName,
        publishedAt: videoData.publishedAt,
        lastViews: videoData.lastViews,
        lastLikes: videoData.lastLikes,
        lastComments: videoData.lastComments,
        lastSyncedAt: new Date()
      }
    });
  }

  async getTrackedVideos(brandId) {
    return prisma.trackedVideo.findMany({
      where: { brandId },
      orderBy: { addedAt: 'desc' }
    });
  }
}

module.exports = new TrackedVideoRepository();
