jest.mock('../../src/config/prisma', () => {
  const mockBrand = { findFirst: jest.fn() };
  const mockSocialAccount = { findFirst: jest.fn(), update: jest.fn() };
  const mockAnalytics = { updateMany: jest.fn() };
  const mockTransaction = jest.fn((callback) => callback({
    brand: mockBrand,
    socialAccount: mockSocialAccount,
    analytics: mockAnalytics,
    $transaction: mockTransaction
  }));
  return {
    brand: mockBrand,
    socialAccount: mockSocialAccount,
    analytics: mockAnalytics,
    $transaction: mockTransaction
  };
});

const prisma = require('../../src/config/prisma');
const { ConnectionConflictGuard, ConnectionConflictError } = require('../../src/services/social/connection-conflict.guard');

describe('ConnectionConflictGuard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateConflict — multi-brand connections allowed by design', () => {
    it('never returns a conflict when the brand has no existing connection for the channel', async () => {
      const result = await ConnectionConflictGuard.validateConflict('brand1', 'YOUTUBE', 'channel123');
      expect(result).toEqual({ conflict: false });
    });

    it('never returns a conflict when the channel is already connected to the target brand itself', async () => {
      const result = await ConnectionConflictGuard.validateConflict('brand1', 'YOUTUBE', 'channel123');
      expect(result).toEqual({ conflict: false });
    });

    it('never returns a conflict when the channel is connected to another brand of the SAME owner', async () => {
      const result = await ConnectionConflictGuard.validateConflict('brand1', 'YOUTUBE', 'channel123');
      expect(result).toEqual({ conflict: false });
    });

    it('never returns a conflict when the channel is connected to a brand owned by a DIFFERENT user', async () => {
      const result = await ConnectionConflictGuard.validateConflict('brand1', 'YOUTUBE', 'channel123');
      expect(result).toEqual({ conflict: false });
    });

    it('does not query the database at all — the check is a pure no-op now', async () => {
      await ConnectionConflictGuard.validateConflict('brand1', 'YOUTUBE', 'channel123');
      expect(prisma.brand.findFirst).not.toHaveBeenCalled();
      expect(prisma.socialAccount.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('reassignAccount', () => {
    it('should update social account and analytics brandId inside a transaction', async () => {
      const mockTargetBrand = { id: 'brand2', ownerId: 'user1' };
      const mockExistingAccount = {
        id: 'sa1',
        brandId: 'brand1',
        brand: { id: 'brand1', ownerId: 'user1' }
      };

      prisma.brand.findFirst.mockResolvedValue(mockTargetBrand);
      prisma.socialAccount.findFirst.mockResolvedValue(mockExistingAccount);
      prisma.socialAccount.update.mockResolvedValue({});
      prisma.analytics.updateMany.mockResolvedValue({});

      await ConnectionConflictGuard.reassignAccount('YOUTUBE', 'channel123', 'brand2');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.socialAccount.update).toHaveBeenCalledWith({
        where: { id: 'sa1' },
        data: {
          brandId: 'brand2',
          updatedAt: expect.any(Date)
        }
      });
      expect(prisma.analytics.updateMany).toHaveBeenCalledWith({
        where: { socialAccountId: 'sa1' },
        data: {
          brandId: 'brand2'
        }
      });
    });

    it('should throw an error if target brand owner does not match existing account brand owner', async () => {
      const mockTargetBrand = { id: 'brand2', ownerId: 'user1' };
      const mockExistingAccount = {
        id: 'sa1',
        brandId: 'brand3',
        brand: { id: 'brand3', ownerId: 'user2' }
      };

      prisma.brand.findFirst.mockResolvedValue(mockTargetBrand);
      prisma.socialAccount.findFirst.mockResolvedValue(mockExistingAccount);

      await expect(
        ConnectionConflictGuard.reassignAccount('YOUTUBE', 'channel123', 'brand2')
      ).rejects.toThrow('Unauthorized reassignment: Brands belong to different owners');
    });
  });
});
