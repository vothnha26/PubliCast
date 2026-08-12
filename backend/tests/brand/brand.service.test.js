const brandService = require('../../src/services/workspace/brand.service');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const outboxEventRepository = require('../../src/repositories/core/outbox-event.repository');
const { WORKSPACE_DEFAULTS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findManySummaryByUserId: jest.fn(),
  findFullBrandById: jest.fn(),
  countActiveBrandsByOwnerId: jest.fn(),
  findOwnedBrandsWithSubscription: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}));

// deleteBrand now wraps the deletion + revocation-webhook outbox enqueue in
// prisma.$transaction — mock it to just invoke the callback with a stub tx,
// matching how brandRepository/outboxEventRepository are mocked below (both
// receive whatever "tx" object $transaction hands them, so it doesn't need
// to behave like a real Prisma transaction client for these unit tests).
jest.mock('../../src/config/prisma', () => ({
  $transaction: jest.fn((callback) => callback({}))
}));

// No active integration clients registered in these tests, so deleteBrand's
// revocation-webhook fan-out enqueues nothing.
jest.mock('../../src/services/integrations/integration-client.service', () => ({
  findAllActiveWithWebhook: jest.fn().mockResolvedValue([])
}));

jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  create: jest.fn().mockResolvedValue({})
}));

describe('BrandService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'user-owner-123';
  const mockBrandId = 'brand-abc-456';
  const mockBrandData = {
    id: mockBrandId,
    name: 'TechCorp Global',
    timezone: 'Asia/Ho_Chi_Minh',
    defaultLanguage: 'vi',
    ownerId: mockUserId,
    createdAt: new Date(),
    deletedAt: null
  };

  describe('getUserBrands', () => {
    it('should query the repository to find all brands for a user', async () => {
      brandRepository.findManySummaryByUserId.mockResolvedValue([mockBrandData]);

      const result = await brandService.getUserBrands(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockBrandData);
      expect(brandRepository.findManySummaryByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getFullBrand', () => {
    it('should return the full brand detail from the repository', async () => {
      brandRepository.findFullBrandById.mockResolvedValue(mockBrandData);

      const result = await brandService.getFullBrand(mockBrandId, mockUserId);

      expect(result).toEqual(mockBrandData);
      expect(brandRepository.findFullBrandById).toHaveBeenCalledWith(mockBrandId, mockUserId);
    });

    it('should throw a 404 error when the brand is not found', async () => {
      brandRepository.findFullBrandById.mockResolvedValue(null);

      await expect(brandService.getFullBrand(mockBrandId, mockUserId)).rejects.toMatchObject({
        message: 'Brand not found',
        statusCode: 404
      });
    });
  });

  describe('createDefaultBrand', () => {
    it('should create a brand with default workspace names and settings', async () => {
      brandRepository.create.mockResolvedValue({
        id: 'brand-default',
        name: WORKSPACE_DEFAULTS.BRAND_NAME,
        ownerId: mockUserId
      });

      const result = await brandService.createDefaultBrand(mockUserId);

      expect(result.id).toBe('brand-default');
      expect(result.name).toBe(WORKSPACE_DEFAULTS.BRAND_NAME);
      expect(brandRepository.create).toHaveBeenCalledWith({
        name: WORKSPACE_DEFAULTS.BRAND_NAME,
        ownerId: mockUserId
      });
    });
  });

  describe('createBrand (BRAND_001 & BRAND_002)', () => {
    it('should create brand successfully if user brand count is below dynamic quota limit', async () => {
      const existingBrands = [
        { id: 'b1', subscription: { plan: { planLimit: { maxBrands: 5 } } } },
        { id: 'b2', subscription: { plan: { planLimit: { maxBrands: 5 } } } },
        { id: 'b3', subscription: { plan: { planLimit: { maxBrands: 5 } } } }
      ];
      brandRepository.findOwnedBrandsWithSubscription.mockResolvedValue(existingBrands);
      brandRepository.create.mockResolvedValue(mockBrandData);

      const brandInput = {
        name: 'TechCorp Global',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultLanguage: 'vi'
      };

      const result = await brandService.createBrand(mockUserId, brandInput);

      expect(result.id).toBe(mockBrandId);
      expect(result.name).toBe('TechCorp Global');
      expect(brandRepository.findOwnedBrandsWithSubscription).toHaveBeenCalledWith(mockUserId);
      expect(brandRepository.create).toHaveBeenCalledWith({
        name: 'TechCorp Global',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultLanguage: 'vi',
        ownerId: mockUserId
      });
    });

    it('should throw a 403 error and block creation if user already has reached their dynamic brand limit', async () => {
      const existingBrands = [
        { id: 'b1', subscription: { plan: { planLimit: { maxBrands: 1 } } } }
      ];
      brandRepository.findOwnedBrandsWithSubscription.mockResolvedValue(existingBrands);

      const brandInput = {
        name: 'Brand Second',
        timezone: 'UTC',
        defaultLanguage: 'en'
      };

      await expect(brandService.createBrand(mockUserId, brandInput))
        .rejects
        .toThrow('Brand limit reached. Your current plan allows you to create up to 1 brand(s).');

      try {
        await brandService.createBrand(mockUserId, brandInput);
      } catch (error) {
        expect(error.statusCode).toBe(403);
      }

      expect(brandRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateBrand', () => {
    it('should update brand settings successfully if the user is the owner', async () => {
      brandRepository.findById.mockResolvedValue(mockBrandData);
      brandRepository.update.mockResolvedValue({
        ...mockBrandData,
        name: 'TechCorp Updated'
      });

      const updateData = { name: 'TechCorp Updated' };
      const result = await brandService.updateBrand(mockBrandId, mockUserId, updateData);

      expect(result.name).toBe('TechCorp Updated');
      expect(brandRepository.findById).toHaveBeenCalledWith(mockBrandId);
      // mockBrandData has no onboardingCompleted flag (undefined, i.e. not
      // yet onboarded), and the new name isn't the signup placeholder — the
      // service auto-flips onboardingCompleted to true on top of the raw
      // updateData the caller sent (see brand.service.js updateBrand()).
      expect(brandRepository.update).toHaveBeenCalledWith(mockBrandId, {
        ...updateData,
        onboardingCompleted: true
      });
    });

    it('should throw a 404 error if the brand is not found', async () => {
      brandRepository.findById.mockResolvedValue(null);

      await expect(brandService.updateBrand('non-existent', mockUserId, { name: 'New' }))
        .rejects
        .toThrow('Brand not found');

      try {
        await brandService.updateBrand('non-existent', mockUserId, { name: 'New' });
      } catch (error) {
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw a 403 error if user is not the owner of the brand', async () => {
      brandRepository.findById.mockResolvedValue(mockBrandData); // ownerId is mockUserId

      await expect(brandService.updateBrand(mockBrandId, 'imposter-user-789', { name: 'Hacked' }))
        .rejects
        .toThrow('Only the brand owner can update settings');

      try {
        await brandService.updateBrand(mockBrandId, 'imposter-user-789', { name: 'Hacked' });
      } catch (error) {
        expect(error.statusCode).toBe(403);
      }

      expect(brandRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteBrand', () => {
    it('should delete brand successfully if the user is the owner and has more than 1 active brand', async () => {
      brandRepository.findById.mockResolvedValue(mockBrandData);
      brandRepository.countActiveBrandsByOwnerId.mockResolvedValue(2); // Has 2 active brands
      brandRepository.delete.mockResolvedValue(mockBrandData);

      const result = await brandService.deleteBrand(mockBrandId, mockUserId);

      expect(result.id).toBe(mockBrandId);
      expect(brandRepository.findById).toHaveBeenCalledWith(mockBrandId);
      expect(brandRepository.countActiveBrandsByOwnerId).toHaveBeenCalledWith(mockUserId);
      expect(brandRepository.delete).toHaveBeenCalledWith(mockBrandId, {});
    });

    it('should throw a 404 error if the brand to delete is not found', async () => {
      brandRepository.findById.mockResolvedValue(null);

      await expect(brandService.deleteBrand('non-existent', mockUserId))
        .rejects
        .toThrow('Brand not found');

      try {
        await brandService.deleteBrand('non-existent', mockUserId);
      } catch (error) {
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw a 403 error if a non-owner tries to delete the brand', async () => {
      brandRepository.findById.mockResolvedValue(mockBrandData);

      await expect(brandService.deleteBrand(mockBrandId, 'imposter-user-789'))
        .rejects
        .toThrow('Only the brand owner can delete this brand');

      try {
        await brandService.deleteBrand(mockBrandId, 'imposter-user-789');
      } catch (error) {
        expect(error.statusCode).toBe(403);
      }

      expect(brandRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw a 400 error if the user tries to delete their only remaining brand', async () => {
      brandRepository.findById.mockResolvedValue(mockBrandData);
      brandRepository.countActiveBrandsByOwnerId.mockResolvedValue(1); // Only 1 active brand left

      await expect(brandService.deleteBrand(mockBrandId, mockUserId))
        .rejects
        .toThrow('Cannot delete your only brand. You must keep at least one brand.');

      try {
        await brandService.deleteBrand(mockBrandId, mockUserId);
      } catch (error) {
        expect(error.statusCode).toBe(400);
      }

      expect(brandRepository.delete).not.toHaveBeenCalled();
    });
  });
});
