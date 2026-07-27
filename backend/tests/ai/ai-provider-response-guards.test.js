/**
 * Regression tests for #108 I5: indexing straight into
 * candidates[0].content.parts[0].text / choices[0].message.content without a
 * null-guard threw an uncaught TypeError when the model returned a blocked/
 * safety finish reason instead of real content.
 */
const axios = require('axios');
jest.mock('axios');

const GeminiProvider = require('../../src/services/workspace/ai/providers/gemini.provider');
const OpenAiProvider = require('../../src/services/workspace/ai/providers/openai.provider');

describe('GeminiProvider missing-content guard (#108 I5)', () => {
  let provider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'mock-key' };
    provider = new GeminiProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws a clear error instead of a TypeError when candidate has no content.parts (SAFETY block)', async () => {
    axios.post.mockResolvedValue({
      data: { candidates: [{ finishReason: 'SAFETY' }] }
    });

    await expect(provider.generate('prompt')).rejects.toThrow(/no usable content/);
  });

  it('throws a clear error when there are no candidates at all', async () => {
    axios.post.mockResolvedValue({ data: { candidates: [] } });
    await expect(provider.generate('prompt')).rejects.toThrow(/no usable content/);
  });

  it('sends the API key via header, not the URL query string', async () => {
    axios.post.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: '{}' }] } }] }
    });
    await provider.generate('prompt');

    const [url, , config] = axios.post.mock.calls[0];
    expect(url).not.toContain('key=');
    expect(config.headers['x-goog-api-key']).toBe('mock-key');
  });
});

describe('OpenAiProvider missing-content guard (#108 I5)', () => {
  let provider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'mock-key' };
    provider = new OpenAiProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws a clear error instead of a TypeError when choices[0].message.content is missing', async () => {
    axios.post.mockResolvedValue({
      data: { choices: [{ finish_reason: 'content_filter' }] }
    });

    await expect(provider.generate('prompt')).rejects.toThrow(/no usable content/);
  });

  it('throws a clear error when the content is not valid JSON', async () => {
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: 'not json' } }] }
    });

    await expect(provider.generate('prompt')).rejects.toThrow(/invalid JSON/);
  });
});
