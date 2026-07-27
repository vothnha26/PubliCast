jest.mock('axios');
const axios = require('axios');

const GeminiProvider = require('../../src/services/workspace/ai/providers/gemini.provider');
const MockAiProvider = require('../../src/services/workspace/ai/providers/mock.provider');

/**
 * Regression tests for issue #105: GeminiProvider must NOT silently fall back
 * to MockAiProvider on API/parse failure (which returns fabricated content while
 * the caller still charges a credit). It must propagate the error instead.
 */
describe('GeminiProvider error handling (#105)', () => {
  const OLD_ENV = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = OLD_ENV;
  });

  test('throws (does not return mock content) when the API call fails', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: { message: 'quota exceeded' } } } });
    const mockSpy = jest.spyOn(MockAiProvider.prototype, 'generate');

    const provider = new GeminiProvider();
    await expect(provider.generate('hello')).rejects.toThrow(/Gemini API call failed/);
    expect(mockSpy).not.toHaveBeenCalled();
  });

  test('throws when Gemini returns invalid JSON (no mock fallback)', async () => {
    axios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: 'not-json-at-all' }] } }] }
    });
    const mockSpy = jest.spyOn(MockAiProvider.prototype, 'generate');

    const provider = new GeminiProvider();
    await expect(provider.generate('hello')).rejects.toThrow(/invalid JSON|Gemini API call failed/);
    expect(mockSpy).not.toHaveBeenCalled();
  });

  test('returns parsed JSON on success', async () => {
    axios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: '{"caption":"hi"}' }] } }] }
    });

    const provider = new GeminiProvider();
    await expect(provider.generate('hello')).resolves.toEqual({ caption: 'hi' });
  });

  test('throws when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiProvider();
    await expect(provider.generate('hello')).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
