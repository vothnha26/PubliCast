const axios = require('axios');
const GeminiProvider = require('../../src/services/workspace/ai/providers/gemini.provider');
const MockAiProvider = require('../../src/services/workspace/ai/providers/mock.provider');

jest.mock('axios');

describe('GeminiProvider Unit Tests & Fallback Mechanism', () => {
  let geminiProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'mock-api-key';
    geminiProvider = new GeminiProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error if GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(geminiProvider.generate('Test prompt')).rejects.toThrow(
      'GEMINI_API_KEY is not configured'
    );
  });

  it('should call Gemini API and return parsed JSON on success', async () => {
    const mockApiResponse = {
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    caption: 'Successful Gemini caption',
                    suggestedHashtags: ['#gemini', '#api'],
                    platformSpecificAdjustments: {}
                  })
                }
              ]
            }
          }
        ]
      }
    };

    axios.post.mockResolvedValue(mockApiResponse);

    const result = await geminiProvider.generate('Test prompt', {
      tone: 'PROFESSIONAL',
      platform: 'facebook'
    });

    expect(result.caption).toBe('Successful Gemini caption');
    expect(result.suggestedHashtags).toContain('#gemini');
    expect(axios.post).toHaveBeenCalled();
  });

  it('should throw error when Gemini API fails (no runtime fallback to MockAiProvider)', async () => {
    const apiError = new Error('Request failed with status code 404');
    apiError.response = {
      data: {
        error: {
          message: 'Model gemini-3.5-flash not found'
        }
      }
    };
    axios.post.mockRejectedValue(apiError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      geminiProvider.generate('Giới thiệu sản phẩm mới', {
        tone: 'FUNNY',
        platform: 'tiktok'
      })
    ).rejects.toThrow('Gemini API call failed: Model gemini-3.5-flash not found');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
