const prisma = require('../../config/prisma');
const { CHANNEL_GROUP_VISIBILITY } = require('../../utils/constants');

class ChannelGroupRepository {
  /**
   * TEAM-visibility groups are visible to every brand member; PRIVATE
   * groups only to their creator — same shape as Buffer's channel groups
   * (never shared, even within an org).
   */
  async findVisibleToUser(brandId, userId) {
    return prisma.channelGroup.findMany({
      where: {
        brandId,
        OR: [
          { visibility: CHANNEL_GROUP_VISIBILITY.TEAM },
          { visibility: CHANNEL_GROUP_VISIBILITY.PRIVATE, createdByUserId: userId }
        ]
      },
      include: {
        members: {
          include: { socialAccount: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findById(id) {
    return prisma.channelGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: { socialAccount: true }
        }
      }
    });
  }

  async create(brandId, createdByUserId, { name, color, visibility }) {
    return prisma.channelGroup.create({
      data: { brandId, createdByUserId, name, color: color || null, visibility: visibility || CHANNEL_GROUP_VISIBILITY.TEAM }
    });
  }

  async update(id, { name, color, visibility }) {
    const data = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (visibility !== undefined) data.visibility = visibility;
    return prisma.channelGroup.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.channelGroup.delete({ where: { id } });
  }

  /**
   * Replaces the group's full member list in one transaction — the caller
   * (service layer) always sends the intended final set of socialAccountIds
   * rather than incremental add/remove calls, so a diff-based
   * deleteMany+createMany here keeps the UI's "edit members" flow a single
   * round-trip.
   */
  async setMembers(channelGroupId, socialAccountIds) {
    return prisma.$transaction([
      prisma.channelGroupMember.deleteMany({ where: { channelGroupId } }),
      prisma.channelGroupMember.createMany({
        data: socialAccountIds.map((socialAccountId) => ({ channelGroupId, socialAccountId }))
      })
    ]);
  }
}

module.exports = new ChannelGroupRepository();
