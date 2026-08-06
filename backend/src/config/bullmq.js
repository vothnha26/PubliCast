const { URL } = require('url');
const IORedis = require('ioredis');

let redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

if (process.env.REDIS_URL) {
  try {
    const parsed = new URL(process.env.REDIS_URL);
    redisConfig = {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };

    if (parsed.username) {
      redisConfig.username = decodeURIComponent(parsed.username);
    }

    if (parsed.protocol === 'rediss:') {
      redisConfig.tls = {};
    }
  } catch (err) {
    console.error('Failed to parse REDIS_URL for BullMQ connection:', err.message);
  }
}

// A plain config object passed to `new Queue()`/`new Worker()` makes BullMQ
// open its OWN IORedis connection per instance. With 4 queues + 4 workers
// that was 8 independent clients, each running its own idle maintenance
// loop (delayed-job promotion, stalled-check, etc.) against Upstash 24/7 —
// on command-metered billing that idle polling alone burned through the
// 500k/month cap in ~2 days, before any real job traffic. Sharing a single
// IORedis instance across every Queue/Worker in this process collapses that
// to one connection's worth of maintenance polling.
// maxRetriesPerRequest: null is required by BullMQ Workers (blocking
// commands must retry indefinitely); safe to share onto Queues too.
// Lazy — every queues/*.js file requires this module at top-level even in
// tests (where they immediately branch into a mock and never touch
// `connection`), so eagerly opening a socket here would dial Redis during
// `jest` runs. Only the first real `new Queue()/new Worker()` construction
// triggers the connection.
let _sharedConnection = null;
const getSharedConnection = () => {
  if (!_sharedConnection) {
    _sharedConnection = new IORedis({
      ...redisConfig,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return _sharedConnection;
};

const defaultConnection = {
  get connection() {
    return getSharedConnection();
  },
  // BullMQ's default (30s) has every worker poll Redis for stalled jobs
  // every 30s even when the queue is empty. With 4 workers running 24/7
  // in one process, that alone is ~11k Redis commands/day before any
  // real job traffic — enough to blow through Upstash's free-tier request
  // cap. 5 minutes still catches a crashed worker promptly relative to
  // job durations (video trims, publishes) while cutting that idle cost ~10x.
  stalledInterval: 300000,
};

module.exports = {
  redisConfig,
  defaultConnection
};
