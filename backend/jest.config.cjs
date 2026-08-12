module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: '<rootDir>/coverage',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  // otplib's plugins (@otplib/plugin-base32-scure, @otplib/plugin-crypto-noble)
  // ship CommonJS dist/index.cjs builds, but those builds themselves
  // require('@scure/base') / require('@noble/hashes') — both ESM-only
  // packages ("type": "module", no .cjs anywhere, including the nested
  // copy under @otplib/plugin-crypto-noble/node_modules/@noble/hashes).
  // Jest's default transformIgnorePatterns skips all of node_modules, so
  // their `export`/`import` syntax hits Node's CommonJS parser as-is and
  // throws "Unexpected token 'export'" / "Cannot use import statement
  // outside a module" — breaking every test suite that transitively
  // requires otplib (auth.service.js -> verification.strategy.js)
  // regardless of whether the test itself touches OTP/2FA. Carve out just
  // these packages, at any nesting depth, so Babel (see babel.config.cjs)
  // transforms them to CommonJS for tests.
  //
  // NOTE: @atproto/api (Bluesky SDK) is NOT included here on purpose — its
  // dependency tree (multiformats, await-lock, and more) ships
  // exports-map-only-"import" packages several levels deep, so patching
  // transformIgnorePatterns/moduleNameMapper turns into an open-ended chase.
  // Tests that touch Bluesky should jest.mock('@atproto/api') instead of
  // requiring the real SDK.
  transformIgnorePatterns: ['node_modules/(?!.*(?:@scure/base|@noble/hashes)/)']
};
