const { POLICY_EVALUATORS } = require('../../src/services/workspace/policy-evaluators');

describe('POLICY_EVALUATORS', () => {
  describe('AT_LEAST_ONE', () => {
    const evaluator = POLICY_EVALUATORS.AT_LEAST_ONE;

    it('returns false when there are no decisions', () => {
      expect(evaluator.isSatisfied([])).toBe(false);
    });

    it('returns false when all decisions are PENDING', () => {
      expect(evaluator.isSatisfied([
        { reviewerId: 'a', status: 'PENDING' },
        { reviewerId: 'b', status: 'PENDING' }
      ])).toBe(false);
    });

    it('returns true when at least one decision is APPROVED among other PENDING ones', () => {
      expect(evaluator.isSatisfied([
        { reviewerId: 'a', status: 'APPROVED' },
        { reviewerId: 'b', status: 'PENDING' }
      ])).toBe(true);
    });
  });

  describe('ALL', () => {
    const evaluator = POLICY_EVALUATORS.ALL;

    it('returns false when there are no decisions (avoids false-positive on empty reviewer list)', () => {
      expect(evaluator.isSatisfied([])).toBe(false);
    });

    it('returns false when at least one decision is not APPROVED', () => {
      expect(evaluator.isSatisfied([
        { reviewerId: 'a', status: 'APPROVED' },
        { reviewerId: 'b', status: 'PENDING' }
      ])).toBe(false);
    });

    it('returns true when every decision is APPROVED', () => {
      expect(evaluator.isSatisfied([
        { reviewerId: 'a', status: 'APPROVED' },
        { reviewerId: 'b', status: 'APPROVED' }
      ])).toBe(true);
    });
  });
});
