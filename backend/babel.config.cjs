// Only used by Jest to transform ESM-only packages under node_modules (see
// jest.config.cjs's transformIgnorePatterns) — the app itself runs on plain
// Node CommonJS and does not go through Babel outside of tests.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
};
