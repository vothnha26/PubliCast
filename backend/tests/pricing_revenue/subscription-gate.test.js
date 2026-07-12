const subscriptionGate = require('../../src/services/subscription/subscription-gate.facade');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const { PRODUCT_IDS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findBrandWithSubscription: jest.fn()
}));

describe('SubscriptionGateFacade Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return false if brandId or productId is missing', async () => {
    const result1 = await subscriptionGate.checkFeatureAccess('', PRODUCT_IDS.AI_CONTENT_ENGINE);
    const result2 = await subscriptionGate.checkFeatureAccess('brand-1', '');
    expect(result1).toBe(false);
    expect(result2).toBe(false);
  });

  it('should return false if brand is not found', async () => {
    brandRepository.findBrandWithSubscription.mockResolvedValue(null);
    const result = await subscriptionGate.checkFeatureAccess('brand-1', PRODUCT_IDS.AI_CONTENT_ENGINE);
    expect(result).toBe(false);
  });

  it('should return false if brand has no active subscription', async () => {
    brandRepository.findBrandWithSubscription.mockResolvedValue({
      id: 'brand-1',
      subscription: null
    });
    const result = await subscriptionGate.checkFeatureAccess('brand-1', PRODUCT_IDS.AI_CONTENT_ENGINE);
    expect(result).toBe(false);
  });

  it('should return false if subscription status is not ACTIVE', async () => {
    brandRepository.findBrandWithSubscription.mockResolvedValue({
      id: 'brand-1',
      subscription: {
        status: 'EXPIRED',
        plan: {
          products: [{ id: PRODUCT_IDS.AI_CONTENT_ENGINE }]
        }
      }
    });
    const result = await subscriptionGate.checkFeatureAccess('brand-1', PRODUCT_IDS.AI_CONTENT_ENGINE);
    expect(result).toBe(false);
  });

  it('should return true if brand has active plan containing the product', async () => {
    brandRepository.findBrandWithSubscription.mockResolvedValue({
      id: 'brand-1',
      subscription: {
        status: 'ACTIVE',
        plan: {
          products: [
            { id: PRODUCT_IDS.YOUTUBE_ANALYTICS },
            { id: PRODUCT_IDS.AI_CONTENT_ENGINE }
          ]
        }
      }
    });
    const result = await subscriptionGate.checkFeatureAccess('brand-1', PRODUCT_IDS.AI_CONTENT_ENGINE);
    expect(result).toBe(true);
  });

  it('should return false if brand has active plan but product is not included', async () => {
    brandRepository.findBrandWithSubscription.mockResolvedValue({
      id: 'brand-1',
      subscription: {
        status: 'ACTIVE',
        plan: {
          products: [
            { id: PRODUCT_IDS.YOUTUBE_ANALYTICS }
          ]
        }
      }
    });
    const result = await subscriptionGate.checkFeatureAccess('brand-1', PRODUCT_IDS.AI_CONTENT_ENGINE);
    expect(result).toBe(false);
  });

  it('should return true for google_drive if the active plan contains the product', async () => {
    brandRepository.findBrandWithSubscription.mockResolvedValue({
      id: 'brand-1',
      subscription: {
        status: 'ACTIVE',
        plan: {
          name: 'PRO',
          products: [{ id: PRODUCT_IDS.GOOGLE_DRIVE }]
        }
      }
    });
    const result = await subscriptionGate.checkFeatureAccess('brand-1', PRODUCT_IDS.GOOGLE_DRIVE);
    expect(result).toBe(true);
  });

  it('should return false for google_drive if the active plan does not contain the product', async () => {
    brandRepository.findBrandWithSubscription.mockResolvedValue({
      id: 'brand-1',
      subscription: {
        status: 'ACTIVE',
        plan: {
          name: 'FREE',
          products: []
        }
      }
    });
    const result = await subscriptionGate.checkFeatureAccess('brand-1', PRODUCT_IDS.GOOGLE_DRIVE);
    expect(result).toBe(false);
  });
});
