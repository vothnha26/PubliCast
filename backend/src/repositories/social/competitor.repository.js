const prisma = require('../../config/prisma');

class CompetitorRepository {
  async createCompetitor(brandId, platform, competitorData) {
    return prisma.competitorAnalysis.create({
      data: {
        brandId,
        platform,
        competitorHandle: competitorData.competitorHandle,
        competitorDisplayName: competitorData.competitorDisplayName,
        competitorAvatarUrl: competitorData.competitorAvatarUrl,
        followersCount: competitorData.followersCount,
        addedAt: new Date()
      }
    });
  }

  /**
   * Upsert competitor: tạo mới nếu chưa tồn tại, cập nhật nếu đã có.
   * Sử dụng unique constraint [brandId, platform, competitorHandle].
   */
  async upsertCompetitor(brandId, platform, competitorData) {
    return prisma.competitorAnalysis.upsert({
      where: {
        brandId_platform_competitorHandle: {
          brandId,
          platform,
          competitorHandle: competitorData.competitorHandle,
        }
      },
      update: {
        competitorDisplayName: competitorData.competitorDisplayName,
        competitorAvatarUrl:   competitorData.competitorAvatarUrl,
        competitorProfileUrl:  competitorData.competitorProfileUrl,
        followersCount:        competitorData.followersCount,
        followersGrowth:       competitorData.followersGrowth,
        avgEngagementRate:     competitorData.avgEngagementRate,
        avgReach:              competitorData.avgReach,
        postsPerWeek:          competitorData.postsPerWeek,
        topPostType:           competitorData.topPostType,
        lastFetchedAt:         new Date(),
      },
      create: {
        brandId,
        platform,
        competitorHandle:      competitorData.competitorHandle,
        competitorDisplayName: competitorData.competitorDisplayName,
        competitorAvatarUrl:   competitorData.competitorAvatarUrl,
        competitorProfileUrl:  competitorData.competitorProfileUrl,
        followersCount:        competitorData.followersCount,
        addedAt:               new Date(),
        lastFetchedAt:         new Date(),
      }
    });
  }

  async getCompetitors(brandId, platform) {
    return prisma.competitorAnalysis.findMany({
      where: { brandId, platform },
      orderBy: { addedAt: 'desc' }
    });
  }

  // Not brand-scoped — callers (youtube-analytics.service.js, facebook-competitor.service.js
  // deleteCompetitor) are responsible for verifying the returned row's brandId
  // before acting on it. Don't reuse this without re-adding that check.
  async findById(id) {
    return prisma.competitorAnalysis.findUnique({
      where: { id }
    });
  }

  async deleteCompetitor(id) {
    return prisma.competitorAnalysis.delete({
      where: { id }
    });
  }
}

module.exports = new CompetitorRepository();

