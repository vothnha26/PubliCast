const prisma = require('../../config/prisma');
const brandRepository = require('../../repositories/workspace/brand.repository');
const outboxEventRepository = require('../../repositories/core/outbox-event.repository');
const revocationWebhookService = require('../integrations/revocation-webhook.service');
const { OUTBOX_EVENT_TYPES } = require('../../constants/outbox.constants');
const { WORKSPACE_DEFAULTS } = require('../../utils/constants');

class BrandService {
  async getUserBrands(userId) {
    return await brandRepository.findManySummaryByUserId(userId);
  }

  async getFullBrand(brandId, userId) {
    const brand = await brandRepository.findFullBrandById(brandId, userId);
    if (!brand) {
      const error = new Error('Brand not found');
      error.statusCode = 404;
      throw error;
    }
    return brand;
  }

  async createDefaultBrand(userId) {
    return await brandRepository.create({
      name: WORKSPACE_DEFAULTS.BRAND_NAME,
      ownerId: userId
    });
  }

  async createBrand(userId, brandData) {
    // Lấy tất cả thương hiệu mà user sở hữu kèm theo giới hạn gói dịch vụ
    const ownedBrands = await brandRepository.findOwnedBrandsWithSubscription(userId);
    
    // Tìm giới hạn maxBrands cao nhất từ các thương hiệu đang sở hữu
    const allowedLimit = ownedBrands.reduce((max, b) => {
      const brandMax = b.subscription?.plan?.planLimit?.maxBrands || 1;
      return Math.max(max, brandMax);
    }, 1);

    if (ownedBrands.length >= allowedLimit) {
      const error = new Error(`Brand limit reached. Your current plan allows you to create up to ${allowedLimit} brand(s).`);
      error.statusCode = 403;
      throw error;
    }

    return await brandRepository.create({
      name: brandData.name,
      timezone: brandData.timezone,
      defaultLanguage: brandData.defaultLanguage,
      ownerId: userId
    });
  }

  async updateBrand(brandId, userId, updateData) {
    const brand = await brandRepository.findById(brandId);
    if (!brand) {
      const error = new Error('Brand not found');
      error.statusCode = 404;
      throw error;
    }

    if (brand.ownerId !== userId) {
      const error = new Error('Only the brand owner can update settings');
      error.statusCode = 403;
      throw error;
    }

    // onboardingCompleted flips to true when explicitly provided or when name is changed
    const finalUpdateData = { ...updateData };
    if (
      !brand.onboardingCompleted &&
      (updateData.onboardingCompleted === true || (updateData.name && updateData.name !== WORKSPACE_DEFAULTS.BRAND_NAME))
    ) {
      finalUpdateData.onboardingCompleted = true;
    }

    return await brandRepository.update(brandId, finalUpdateData);
  }

  async deleteBrand(brandId, userId) {
    const brand = await brandRepository.findById(brandId);
    if (!brand) {
      const error = new Error('Brand not found');
      error.statusCode = 404;
      throw error;
    }

    if (brand.ownerId !== userId) {
      const error = new Error('Only the brand owner can delete this brand');
      error.statusCode = 403;
      throw error;
    }

    // Không cho phép xóa brand cuối cùng của user
    const activeBrandsCount = await brandRepository.countActiveBrandsByOwnerId(userId);
    if (activeBrandsCount <= 1) {
      const error = new Error('Cannot delete your only brand. You must keep at least one brand.');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.$transaction(async (tx) => {
      const deletedBrand = await brandRepository.delete(brandId, tx);

      // Critical-event push to external integrations (plan.txt mục 6) — same
      // reasoning as team.service.js#removeMember: a deactivated brand may
      // have live real-time sessions tied to it that need to be cut
      // immediately. Enqueued in the same transaction as the deactivation.
      const outboxPayloads = await revocationWebhookService.buildOutboxPayloadsForAllClients(
        'BRAND_DEACTIVATED',
        { brandId }
      );
      for (const { clientId, payload } of outboxPayloads) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.INTEGRATION_REVOCATION_WEBHOOK,
          `${brandId}:${clientId}`,
          { clientId, eventPayload: payload },
          {},
          tx
        );
      }

      return deletedBrand;
    });
  }
}

module.exports = new BrandService();
