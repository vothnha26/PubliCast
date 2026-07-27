/**
 * Pricing Validation Middleware
 * Validates pricing-related request data
 */

/**
 * Validate plan creation/update request body
 */
const validatePlanData = (req, res, next) => {
  const { name, priceAmount, currency, billingCycle, planLimitId } = req.body;

  // Validate name
  if (name !== undefined && (!name || !name.trim())) {
    return res.status(400).json({
      message: 'Validation error',
      errors: { name: 'Plan name is required and cannot be empty' }
    });
  }

  // Validate price amount
  if (priceAmount !== undefined) {
    if (typeof priceAmount !== 'number' && isNaN(parseFloat(priceAmount))) {
      return res.status(400).json({
        message: 'Validation error',
        errors: { priceAmount: 'Price amount must be a valid number' }
      });
    }

    if (parseFloat(priceAmount) < 0) {
      return res.status(400).json({
        message: 'Validation error',
        errors: { priceAmount: 'Price amount must be greater than or equal to 0' }
      });
    }
  }

  // Validate currency
  if (currency !== undefined && (!currency || !currency.trim())) {
    return res.status(400).json({
      message: 'Validation error',
      errors: { currency: 'Currency is required' }
    });
  }

  // Validate billing cycle
  if (billingCycle !== undefined) {
    const validCycles = ['MONTHLY', 'ANNUAL'];
    if (!validCycles.includes(billingCycle.toUpperCase())) {
      return res.status(400).json({
        message: 'Validation error',
        errors: { billingCycle: `Billing cycle must be one of: ${validCycles.join(', ')}` }
      });
    }
  }

  // Validate plan limit ID for creation
  if (req.method === 'POST' && (!planLimitId || !planLimitId.trim())) {
    return res.status(400).json({
      message: 'Validation error',
      errors: { planLimitId: 'Plan limit ID is required' }
    });
  }

  next();
};

module.exports = {
  validatePlanData
};
