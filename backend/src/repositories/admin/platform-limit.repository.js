const prisma = require('../../config/prisma');

/**
 * PlatformLimit Repository - Data Access Layer
 * Handles database operations for PlatformCapabilityOverride model
 */
class PlatformLimitRepository {
  async findAll() {
    return await prisma.platformCapabilityOverride.findMany({
      orderBy: { platform: 'asc' }
    });
  }

  async findById(platform) {
    return await prisma.platformCapabilityOverride.findUnique({
      where: { platform }
    });
  }

  async findByPlatformAndSubType(platform, subType) {
    const key = `${platform.toUpperCase()}_${subType.toUpperCase()}`;
    return await this.findById(key);
  }

  async create(data) {
    const { platform, isLocked, lockReason, overrides, updatedBy } = data;
    return await prisma.platformCapabilityOverride.create({
      data: {
        platform,
        isLocked: !!isLocked,
        lockReason,
        overrides: overrides || {},
        updatedBy
      }
    });
  }

  async update(platform, updateData) {
    const { isLocked, lockReason, overrides, updatedBy } = updateData;
    return await prisma.platformCapabilityOverride.upsert({
      where: { platform },
      update: {
        ...(isLocked !== undefined && { isLocked }),
        ...(lockReason !== undefined && { lockReason }),
        ...(overrides !== undefined && { overrides }),
        ...(updatedBy !== undefined && { updatedBy })
      },
      create: {
        platform,
        isLocked: !!isLocked,
        lockReason,
        overrides: overrides || {},
        updatedBy
      }
    });
  }

  async delete(platform) {
    return await prisma.platformCapabilityOverride.delete({
      where: { platform }
    });
  }
}

module.exports = new PlatformLimitRepository();
