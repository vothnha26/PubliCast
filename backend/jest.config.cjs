module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  clearMocks: true,
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
  transformIgnorePatterns: ['node_modules/(?!.*(?:@scure/base|@noble/hashes)/)']
};
