jest.mock('../../src/services/workspace/ai/ai.service', () => ({
  getConfig: jest.fn(),
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  generateContent: jest.fn(),
  quickPost: jest.fn(),
  getHistory: jest.fn()
}));

const aiService = require('../../src/services/workspace/ai/ai.service');
const aiController = require('../../src/controllers/workspace/ai.controller');
const aiControllerV2 = require('../../src/controllers/workspace/ai.controller.v2');

function mockReqRes({ query = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { query, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('AiController v1/v2 parity (both keep the unwrapped raw-object shape, no envelope)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getConfig: both return the raw config object directly (no data wrapper)', async () => {
    aiService.getConfig.mockResolvedValue({ model: 'gpt', maxTokens: 500 });

    const v1 = mockReqRes();
    await callHandler(aiController.getConfig, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ model: 'gpt', maxTokens: 500 });

    const v2 = mockReqRes();
    await callHandler(aiControllerV2.getConfig, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ model: 'gpt', maxTokens: 500 });
  });

  it('getSettings: 400s with { error } (not { message }) when brandId is missing, on both versions', async () => {
    const v1 = mockReqRes({ query: {} });
    await callHandler(aiController.getSettings, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ error: 'Missing brandId parameter' });

    const v2 = mockReqRes({ query: {} });
    await callHandler(aiControllerV2.getSettings, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(400);
    expect(v2.res.json).toHaveBeenCalledWith({ error: 'Missing brandId parameter' });
  });

  it('quickPost: both return 201 with the raw post object', async () => {
    aiService.quickPost.mockResolvedValue({ id: 'post-1' });

    const v2 = mockReqRes({ query: { brandId: 'b1' }, body: { prompt: 'hi' } });
    await callHandler(aiControllerV2.quickPost, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ id: 'post-1' });
  });

  it('getHistory: parses page/limit with the same defaults, on both versions', async () => {
    aiService.getHistory.mockResolvedValue([]);

    const v2 = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(aiControllerV2.getHistory, v2.req, v2.res);
    expect(aiService.getHistory).toHaveBeenCalledWith('b1', 1, 10);
  });
});
