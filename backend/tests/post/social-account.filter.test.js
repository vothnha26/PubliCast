const PostSocialAccountFilter = require('../../src/services/workspace/post/filters/social-account.filter');

describe('PostSocialAccountFilter', () => {
  let filter;

  beforeEach(() => {
    filter = new PostSocialAccountFilter();
  });

  it('should not mutate where clause if socialAccountId is not present in queryParams', () => {
    const where = {};
    filter.apply(where, {});
    expect(where).toEqual({});
  });

  it('should filter by PostTarget when socialAccountId query param is present', () => {
    const where = {};
    const queryParams = { socialAccountId: 'acc_123456' };
    filter.apply(where, queryParams);

    expect(where.targets).toEqual({
      some: { socialAccountId: 'acc_123456' }
    });
  });

  it('should not touch existing where.OR conditions', () => {
    const where = { OR: [{ title: { contains: 'test' } }] };
    const queryParams = { socialAccountId: 'acc_789' };
    filter.apply(where, queryParams);

    expect(where.OR).toEqual([{ title: { contains: 'test' } }]);
    expect(where.targets).toEqual({
      some: { socialAccountId: 'acc_789' }
    });
  });
});
