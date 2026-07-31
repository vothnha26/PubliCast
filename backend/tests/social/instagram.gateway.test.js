/**
 * Unit tests for InstagramGateway.getAccountInsights — regression coverage
 * for a live-API-verified breaking change: Graph API v25.0 rejects the
 * `impressions` account-level metric outright, and its replacement (`views`)
 * only supports `metric_type=total_value` (rejects `time_series`), which
 * collapses an entire since/until window into a single number instead of
 * returning one value per day. See guide/instagram/PUBLICAST_INTEGRATION_NOTES.md.
 *
 * getAccountInsights was rewritten to issue one single-day request per
 * calendar day in the range and reassemble the old
 * `{ name, values: [{ value, end_time }] }` shape callers expect.
 */
const instagramGateway = require('../../src/services/social/instagram/instagram.gateway');

describe('InstagramGateway.getAccountInsights', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('issues one request per day in the range, each with metric_type=total_value (not time_series)', async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        data: [
          { name: 'views', total_value: { value: 5 } },
          { name: 'reach', total_value: { value: 3 } },
          { name: 'profile_views', total_value: { value: 1 } }
        ]
      })
    }));

    await instagramGateway.getAccountInsights('ig_123', 'token', '2026-05-01', '2026-05-03');

    // 3 calendar days: May 1, 2, 3
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [url] of fetchMock.mock.calls) {
      expect(url).toContain('metric_type=total_value');
      expect(url).not.toContain('metric_type=time_series');
      expect(url).toContain('metric=views,reach,profile_views');
    }
  });

  it('reassembles per-day total_value responses into a values[] array with one entry per day, keyed by metric name', async () => {
    fetchMock.mockImplementation(async (url) => {
      const isFirstDay = url.includes('since=') && url.match(/since=(\d+)/)[1] === Math.floor(new Date('2026-05-01T00:00:00Z').getTime() / 1000).toString();
      return {
        ok: true,
        json: async () => ({
          data: [
            { name: 'views', total_value: { value: isFirstDay ? 10 : 0 } },
            { name: 'reach', total_value: { value: isFirstDay ? 7 : 2 } }
          ]
        })
      };
    });

    const result = await instagramGateway.getAccountInsights('ig_123', 'token', '2026-05-01', '2026-05-02');

    const views = result.find(m => m.name === 'views');
    const reach = result.find(m => m.name === 'reach');
    expect(views.values).toHaveLength(2);
    expect(views.values[0].value).toBe(10);
    expect(views.values[1].value).toBe(0);
    expect(reach.values[0].value).toBe(7);
    expect(reach.values[1].value).toBe(2);
    // end_time must be present so instagram-analytics.service.js can key
    // results back into its per-date dailyMap via date-string splitting.
    expect(views.values[0].end_time).toBeDefined();
  });

  it('skips a failing day instead of aborting the whole range (one bad day should not blank out the rest)', async () => {
    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, json: async () => ({ error: { message: 'Some transient Graph API error' } }) };
      }
      return { ok: true, json: async () => ({ data: [{ name: 'views', total_value: { value: 9 } }] }) };
    });

    const result = await instagramGateway.getAccountInsights('ig_123', 'token', '2026-05-01', '2026-05-02');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const views = result.find(m => m.name === 'views');
    // Only the second (successful) day should be present.
    expect(views.values).toHaveLength(1);
    expect(views.values[0].value).toBe(9);
  });

  it('omits a metric entirely from the result if no day returned data for it', async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ data: [{ name: 'views', total_value: { value: 1 } }] }) // no reach/profile_views ever returned
    }));

    const result = await instagramGateway.getAccountInsights('ig_123', 'token', '2026-05-01', '2026-05-01');

    expect(result.map(m => m.name)).toEqual(['views']);
  });
});
