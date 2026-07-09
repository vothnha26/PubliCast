const platformLimitRepository = require('../../repositories/admin/platform-limit.repository');

/**
 * PlatformLimit Service - Business Logic Layer
 * Orchestrates business rules for platform limits
 */
class PlatformLimitService {
  /**
   * Get all limits
   */
  async getPlatformLimits() {
    return await platformLimitRepository.findAll();
  }

  /**
   * Get limit by ID
   */
  async getPlatformLimitById(id) {
    const limit = await platformLimitRepository.findById(id);
    if (!limit) {
      const error = new Error('Platform limit config not found');
      error.statusCode = 404;
      throw error;
    }
    return limit;
  }

  /**
   * Create a new limit configuration
   */
  async createPlatformLimit(data) {
    // Validate uniqueness of platform + subType
    const existing = await platformLimitRepository.findByPlatformAndSubType(data.platform, data.subType);
    if (existing) {
      const error = new Error(`Limit configuration for platform ${data.platform} with subType ${data.subType} already exists.`);
      error.statusCode = 400;
      throw error;
    }
    return await platformLimitRepository.create(data);
  }

  /**
   * Update an existing limit configuration
   */
  async updatePlatformLimit(id, data) {
    const existing = await platformLimitRepository.findById(id);
    if (!existing) {
      const error = new Error('Platform limit config not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if updating platform/subType causes unique conflict
    if ((data.platform && data.platform !== existing.platform) || (data.subType && data.subType !== existing.subType)) {
      const targetPlatform = data.platform || existing.platform;
      const targetSubType = data.subType || existing.subType;
      const conflict = await platformLimitRepository.findByPlatformAndSubType(targetPlatform, targetSubType);
      if (conflict && conflict.id !== id) {
        const error = new Error(`Limit configuration for platform ${targetPlatform} with subType ${targetSubType} already exists.`);
        error.statusCode = 400;
        throw error;
      }
    }

    return await platformLimitRepository.update(id, data);
  }

  /**
   * Toggle lock status on a limit configuration
   */
  async toggleLock(id, isLocked, lockReason) {
    const existing = await platformLimitRepository.findById(id);
    if (!existing) {
      const error = new Error('Platform limit config not found');
      error.statusCode = 404;
      throw error;
    }
    return await platformLimitRepository.update(id, {
      isLocked: isLocked === true || isLocked === 'true',
      lockReason: isLocked ? (lockReason || 'Tạm thời khóa') : null
    });
  }

  /**
   * Delete a limit configuration
   */
  async deletePlatformLimit(id) {
    const existing = await platformLimitRepository.findById(id);
    if (!existing) {
      const error = new Error('Platform limit config not found');
      error.statusCode = 404;
      throw error;
    }
    return await platformLimitRepository.delete(id);
  }
}

module.exports = new PlatformLimitService();
