/**
 * Registers Babel's JSX transform ONLY for files under src/emails/ — the
 * rest of the backend runs as plain Node/CommonJS with no build step, and
 * this keeps it that way. Required once, lazily, by email.service.js right
 * before it needs to require() an email component; not loaded at server
 * startup so it has zero effect on boot time or any other require() call.
 */
require('@babel/register')({
  presets: ['@babel/preset-react'],
  extensions: ['.jsx'],
  only: [__dirname],
  // Isolated from the project's babel.config.cjs (used only by Jest for
  // ESM transform in tests, unrelated to this) so the two configs never
  // conflict or merge unexpectedly.
  configFile: false,
  babelrc: false
});
