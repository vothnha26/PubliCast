/**
 * Regression tests for #97:
 * - getInsights previously swallowed ANY fetch failure as a silent `null`
 *   (unlike every sibling method in this file), so callers couldn't tell
 *   "no insights yet" from "the API call actually failed" — real errors
 *   fell straight through to a fabricated views estimate with no signal.
 * - createComment's publish-step error handling read res.json() (the
 *   FIRST fetch's already-consumed response) instead of publishRes.json(),
 *   misreporting or throwing on publish failures.
 */
global.fetch = jest.fn();

const threadsGateway = require('../../src/services/social/threads/threads.gateway');

describe('ThreadsGateway (#97)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInsights', () => {
    it('throws with the real API error message on failure, instead of silently returning null', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid OAuth access token' } })
      });

      await expect(threadsGateway.getInsights('user-1', 'bad-token'))
        .rejects.toThrow('Invalid OAuth access token');
    });

    it('returns the parsed body on success', async () => {
      const mockBody = { data: [{ name: 'views', values: [{ value: 100 }] }] };
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBody) });

      const result = await threadsGateway.getInsights('user-1', 'good-token');

      expect(result).toEqual(mockBody);
    });
  });

  describe('createComment', () => {
    it('reports the real error from the publish step, not the container-creation response', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'container-1' }) }) // creation succeeds
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: { message: 'Publish step failed: media not ready' } })
        }); // publish step fails

      await expect(threadsGateway.createComment('user-1', 'token', 'parent-1', 'hello'))
        .rejects.toThrow('Publish step failed: media not ready');
    });

    it('succeeds end-to-end when both steps succeed', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'container-1' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'published-1' }) });

      const result = await threadsGateway.createComment('user-1', 'token', 'parent-1', 'hello');

      expect(result).toEqual({ id: 'published-1' });
    });
  });
});
