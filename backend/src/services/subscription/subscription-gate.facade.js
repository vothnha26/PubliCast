const brandRepository = require('../../repositories/workspace/brand.repository');

class SubscriptionGateFacade {
  /**
   * Check if a brand has access to a specific product/feature
   * @param {string} brandId - ID of the brand
   * @param {string} productId - ID/slug of the product (from PRODUCT_IDS)
   * @returns {Promise<boolean>}
   */
  async checkFeatureAccess(brandId, productId) {
    if (!brandId || !productId) {
      return false;
    }

    const brand = await brandRepository.findBrandWithSubscription(brandId);

    if (!brand || !brand.subscription || !brand.subscription.plan) {
      return false;
    }

    // Active subscription status check
    if (brand.subscription.status !== 'ACTIVE') {
      return false;
    }

    const plan = brand.subscription.plan;
    
    // Verify if the connected products list contains the requested product ID
    return plan.products.some(product => product.id === productId);
  }
}

module.exports = new SubscriptionGateFacade();
