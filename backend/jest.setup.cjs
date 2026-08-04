// @atproto/api (Bluesky) and @twurple/* (Twitch) ship ESM-only builds whose
// dependency trees include packages with no CommonJS entry point at all
// (multiformats, await-lock, etc). Jest's CJS resolver/transform can't load
// them, so any test that transitively requires bluesky/twitch gateway code
// — even through jest.mock('../social-platform.factory') on a higher-level
// module, since Jest still executes the real module once to build the
// automock shape — crashes with "Cannot use import statement outside a
// module". Stub the SDKs globally so no test path ever touches the real
// packages.
jest.mock('@atproto/api', () => ({ BskyAgent: jest.fn(), RichText: jest.fn() }));

jest.mock('@twurple/api', () => ({ ApiClient: jest.fn() }));
jest.mock('@twurple/auth', () => ({ RefreshingAuthProvider: jest.fn() }));
