const prisma = require('../../config/prisma');

/**
 * PlatformLimit Repository - Data Access Layer
 * Handles database operations for PlatformLimit model
 */
class PlatformLimitRepository {
  /**
   * Helper to convert BigInt fields to String for JSON safety
   * @param {Object} limit 
   * @returns {Object} cleaned limit
   */
  _serialize(limit) {
    if (!limit) return limit;
    const clean = { ...limit };
    if (clean.maxVideoSize !== undefined && clean.maxVideoSize !== null) {
      clean.maxVideoSize = clean.maxVideoSize.toString();
    }
    return clean;
  }

  /**
   * Find all platform limits
   */
  async findAll() {
    const limits = await prisma.platformLimit.findMany({
      orderBy: [
        { platform: 'asc' },
        { subType: 'asc' }
      ]
    });
    return limits.map(l => this._serialize(l));
  }

  /**
   * Find platform limit by ID
   */
  async findById(id) {
    const limit = await prisma.platformLimit.findUnique({
      where: { id }
    });
    return this._serialize(limit);
  }

  /**
   * Find platform limit by Platform and subType
   */
  async findByPlatformAndSubType(platform, subType) {
    const limit = await prisma.platformLimit.findUnique({
      where: {
        platform_subType: {
          platform,
          subType
        }
      }
    });
    return this._serialize(limit);
  }

  /**
   * Create a new platform limit
   */
  async create(limitData) {
    const data = { ...limitData };
    if (data.maxVideoSize !== undefined && data.maxVideoSize !== null) {
      data.maxVideoSize = BigInt(data.maxVideoSize);
    }
    const limit = await prisma.platformLimit.create({
      data
    });
    return this._serialize(limit);
  }

  /**
   * Update an existing platform limit
   */
  async update(id, updateData) {
    const data = { ...updateData };
    if (data.maxVideoSize !== undefined && data.maxVideoSize !== null) {
      data.maxVideoSize = BigInt(data.maxVideoSize);
    }
    const limit = await prisma.platformLimit.update({
      where: { id },
      data
    });
    return this._serialize(limit);
  }

  /**
   * Delete platform limit by ID
   */
  async delete(id) {
    const limit = await prisma.platformLimit.delete({
      where: { id }
    });
    return this._serialize(limit);
  }
}

module.exports = new PlatformLimitRepository();
