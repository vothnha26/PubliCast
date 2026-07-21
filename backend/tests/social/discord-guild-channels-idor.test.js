// Regression test for the GET /discord/channels IDOR: getGuildChannels only
// validated `guildId` was present and then hit Discord's API directly with
// this app's bot token — any authenticated user supplying an arbitrary
// guildId could enumerate that guild's channels, including guilds already
// tied to another brand in the DB (discordCallback writes the SocialAccount
// row before the user ever reaches this endpoint).

jest.mock('../../src/services/social/discord/discord.gateway', () => ({
  getGuildChannels: jest.fn()
}));

jest.mock('../../src/services/social/discord/discord.service', () => ({}));

jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findByPlatformAccountIdAndPlatform: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

const discordGateway = require('../../src/services/social/discord/discord.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const discordOAuthController = require('../../src/controllers/social/discord-oauth.controller');

function mockReqRes(query, userId = 'user-1') {
  const req = { query, user: { id: userId } };
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; resolveDone(); return this; }
  };
  return { req, res, done };
}

// asyncHandler doesn't await its wrapped fn — it fires Promise.resolve(fn(...))
// and returns immediately, catching errors via .catch(next) in the background.
// Call the controller and wait for res.json to actually be invoked instead of
// awaiting the controller call itself.
async function invoke(controllerMethod, req, res, done) {
  controllerMethod(req, res, () => {});
  await done;
}

describe('GET /discord/channels IDOR fix', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return channels when the guild is tied to a brand the caller belongs to', async () => {
    socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue({ id: 'sa-1', brandId: 'brand-abc' });
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);
    discordGateway.getGuildChannels.mockResolvedValue([{ id: 'ch-1', name: 'general' }]);

    const { req, res, done } = mockReqRes({ guildId: 'guild-123' });
    await invoke(discordOAuthController.getGuildChannels, req, res, done);

    expect(res.body).toEqual({ channels: [{ id: 'ch-1', name: 'general' }] });
  });

  it('should reject with 403 when the caller does not belong to the guild\'s brand', async () => {
    socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue({ id: 'sa-1', brandId: 'brand-victim' });
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const { req, res, done } = mockReqRes({ guildId: 'guild-123' }, 'attacker-user');
    await invoke(discordOAuthController.getGuildChannels, req, res, done);

    expect(res.statusCode).toBe(403);
    expect(discordGateway.getGuildChannels).not.toHaveBeenCalled();
  });

  it('should reject with 404 when the guild is not yet connected to any brand', async () => {
    socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(null);

    const { req, res, done } = mockReqRes({ guildId: 'unknown-guild' });
    await invoke(discordOAuthController.getGuildChannels, req, res, done);

    expect(res.statusCode).toBe(404);
    expect(discordGateway.getGuildChannels).not.toHaveBeenCalled();
  });
});
