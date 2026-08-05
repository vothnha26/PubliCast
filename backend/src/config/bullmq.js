const { URL } = require('url');

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

const defaultConnection = {
  connection: redisConfig,
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
