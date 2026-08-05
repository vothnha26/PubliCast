const channelGroupRepository = require('../../repositories/social/channel-group.repository');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { CHANNEL_GROUP_VISIBILITY } = require('../../utils/constants');

const VALID_VISIBILITIES = Object.values(CHANNEL_GROUP_VISIBILITY);

class ChannelGroupService {
  async listByBrand(brandId, userId) {
    const groups = await channelGroupRepository.findVisibleToUser(brandId, userId);
    return groups.map((g) => this._format(g));
  }

  async create(brandId, userId, { name, color, visibility }) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      const error = new Error('Group name is required');
      error.status = 400;
      throw error;
    }
    if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility)) {
      const error = new Error('Invalid visibility value');
      error.status = 400;
      throw error;
    }

    try {
      const group = await channelGroupRepository.create(brandId, userId, {
        name: trimmedName,
        color,
        visibility: visibility || CHANNEL_GROUP_VISIBILITY.TEAM
      });
      return this._format({ ...group, members: [] });
    } catch (err) {
      // Prisma unique constraint violation on (brandId, createdByUserId, name)
      if (err.code === 'P2002') {
        const error = new Error('A group with this name already exists');
        error.status = 409;
        throw error;
      }
      throw err;
    }
  }

  async update(id, brandId, userId, { name, color, visibility, socialAccountIds }) {
    await this._assertVisibleToUser(id, brandId, userId);

    if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility)) {
      const error = new Error('Invalid visibility value');
      error.status = 400;
      throw error;
    }

    if (name !== undefined || color !== undefined || visibility !== undefined) {
      const trimmedName = name !== undefined ? name?.trim() : undefined;
      if (name !== undefined && !trimmedName) {
        const error = new Error('Group name is required');
        error.status = 400;
        throw error;
      }
      try {
        await channelGroupRepository.update(id, { name: trimmedName, color, visibility });
      } catch (err) {
        if (err.code === 'P2002') {
          const error = new Error('A group with this name already exists');
          error.status = 409;
          throw error;
        }
        throw err;
      }
    }

    if (Array.isArray(socialAccountIds)) {
      // Guard against a client passing an account from a different brand —
      // setMembers itself has no brand check, so this is the actual
      // enforcement point.
      await this._assertAccountsBelongToBrand(socialAccountIds, brandId);
      await channelGroupRepository.setMembers(id, socialAccountIds);
    }

    const updated = await channelGroupRepository.findById(id);
    return this._format(updated);
  }

  async delete(id, brandId, userId) {
    await this._assertVisibleToUser(id, brandId, userId);
    await channelGroupRepository.delete(id);
    return { message: 'Channel group deleted successfully' };
  }

  /**
   * TEAM groups: any brand member can view/edit/delete, matching the rest
   * of the app's brand-scoped resources. PRIVATE groups: only the creator
   * — attempting to touch someone else's private group reports 404 rather
   * than 403 so its existence isn't leaked to other brand members.
   */
  async _assertVisibleToUser(id, brandId, userId) {
    const group = await channelGroupRepository.findById(id);
    const notFound = !group || group.brandId !== brandId
      || (group.visibility === CHANNEL_GROUP_VISIBILITY.PRIVATE && group.createdByUserId !== userId);
    if (notFound) {
      const error = new Error('Channel group not found');
      error.status = 404;
      throw error;
    }
    return group;
  }

  async _assertAccountsBelongToBrand(socialAccountIds, brandId) {
    for (const socialAccountId of socialAccountIds) {
      const account = await socialAccountRepository.findById(socialAccountId);
      if (!account || account.brandId !== brandId) {
        const error = new Error('One or more channels do not belong to this brand');
        error.status = 403;
        throw error;
      }
    }
  }

  _format(group) {
    return {
      id: group.id,
      brandId: group.brandId,
      createdByUserId: group.createdByUserId,
      name: group.name,
      color: group.color,
      visibility: group.visibility,
      createdAt: group.createdAt,
      members: (group.members || []).map((m) => ({
        socialAccountId: m.socialAccountId,
        platform: m.socialAccount?.platform,
        username: m.socialAccount?.username,
        displayName: m.socialAccount?.displayName,
        profilePictureUrl: m.socialAccount?.profilePictureUrl
      }))
    };
  }
}

module.exports = new ChannelGroupService();
