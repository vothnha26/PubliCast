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
  connection: redisConfig
};

module.exports = {
  redisConfig,
  defaultConnection
};
