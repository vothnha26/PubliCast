const { validatePlanData } = require('../../src/middlewares/pricing.validation');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('validatePlanData', () => {
  let res, next;

  beforeEach(() => {
    res = buildRes();
    next = jest.fn();
  });

  it('calls next() when the body is valid', () => {
    const req = { method: 'POST', body: { name: 'Pro', priceAmount: 10, currency: 'USD', billingCycle: 'MONTHLY', planLimitId: 'limit-1' } };
    validatePlanData(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an empty name', () => {
    const req = { method: 'PUT', body: { name: '   ' } };
    validatePlanData(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: { name: expect.any(String) } }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows an undefined name (partial update)', () => {
    const req = { method: 'PUT', body: { priceAmount: 5 } };
    validatePlanData(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects a non-numeric priceAmount', () => {
    const req = { method: 'PUT', body: { priceAmount: 'abc' } };
    validatePlanData(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: { priceAmount: expect.any(String) } }));
  });

  it('rejects a negative priceAmount', () => {
    const req = { method: 'PUT', body: { priceAmount: -5 } };
    validatePlanData(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: { priceAmount: expect.any(String) } }));
  });

  it('accepts a zero priceAmount', () => {
    const req = { method: 'PUT', body: { priceAmount: 0 } };
    validatePlanData(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('accepts a numeric-string priceAmount', () => {
    const req = { method: 'PUT', body: { priceAmount: '19.99' } };
    validatePlanData(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects an empty currency', () => {
    const req = { method: 'PUT', body: { currency: '' } };
    validatePlanData(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: { currency: expect.any(String) } }));
  });

  it('rejects an invalid billingCycle', () => {
    const req = { method: 'PUT', body: { billingCycle: 'WEEKLY' } };
    validatePlanData(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: { billingCycle: expect.any(String) } }));
  });

  it('accepts billingCycle regardless of case', () => {
    const req = { method: 'PUT', body: { billingCycle: 'annual' } };
    validatePlanData(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('requires planLimitId on POST', () => {
    const req = { method: 'POST', body: { name: 'Pro' } };
    validatePlanData(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: { planLimitId: expect.any(String) } }));
  });

  it('does not require planLimitId on PUT', () => {
    const req = { method: 'PUT', body: { name: 'Pro' } };
    validatePlanData(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
