const { createClient } = require('redis');
const logger = require('../utils/logger');

const createMemoryRedisClient = () => {
  const store = new Map();

  const getRecord = (key) => {
    const record = store.get(key);
    if (!record) return null;
    if (record.expiresAt && record.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return record;
  };

  return {
    isOpen: true,
    on: () => {},
    connect: async () => {},
    get: async (key) => {
      const record = getRecord(key);
      return record ? record.value : null;
    },
    set: async (key, value, options = {}) => {
      if (options.NX) {
        const record = getRecord(key);
        if (record) {
          return null;
        }
      }
      const ttl = options.EX ? options.EX * 1000 : null;
      store.set(key, {
        value: String(value),
        expiresAt: ttl ? Date.now() + ttl : null
      });
      return 'OK';
    },
    setEx: async (key, seconds, value) => {
      store.set(key, {
        value: String(value),
        expiresAt: Date.now() + seconds * 1000
      });
      return 'OK';
    },
    incr: async (key) => {
      const record = getRecord(key);
      const nextValue = (parseInt(record?.value, 10) || 0) + 1;
      store.set(key, {
        value: String(nextValue),
        expiresAt: record?.expiresAt || null
      });
      return nextValue;
    },
    expire: async (key, seconds) => {
      const record = getRecord(key);
      if (!record) return 0;
      record.expiresAt = Date.now() + seconds * 1000;
      store.set(key, record);
      return 1;
    },
    ttl: async (key) => {
      const record = getRecord(key);
      if (!record) return -2;
      if (!record.expiresAt) return -1;
      return Math.max(0, Math.ceil((record.expiresAt - Date.now()) / 1000));
    },
    del: async (...keys) => {
      let deleted = 0;
      keys.forEach((key) => {
        if (store.delete(key)) deleted += 1;
      });
      return deleted;
    },
    flushDb: async () => {
      store.clear();
      return 'OK';
    }
  };
};

if (process.env.USE_MEMORY_REDIS === 'true') {
  logger.warn('Using in-memory Redis fallback. Do not use this in production.');
  module.exports = createMemoryRedisClient();
} else {
  const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
  const isTls = redisUrl.startsWith('rediss:');
  // rejectUnauthorized defaults to true (verify the server cert) — disabling
  // it unconditionally on every rediss:// connection allowed a MITM to
  // intercept traffic to a Redis instance that holds login-attempt counters
  // and cache data (#118 M3). REDIS_TLS_ALLOW_SELF_SIGNED is an explicit,
  // documented opt-out for providers using a self-signed cert, not a default.
  const allowSelfSigned = process.env.REDIS_TLS_ALLOW_SELF_SIGNED === 'true';
  const redisClient = createClient({
    url: redisUrl,
    socket: {
      ...(isTls ? {
        tls: true,
        rejectUnauthorized: !allowSelfSigned
      } : {}),
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis max reconnection retries reached');
          return new Error('Redis max reconnection retries reached');
        }
        return Math.min(retries * 50, 1000);
      },
      connectTimeout: 20000
    }
  });

  redisClient.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Redis Client Error', { error: err.message });
    }
  });

  const connectRedis = async () => {
    if (process.env.NODE_ENV !== 'test' && !redisClient.isOpen) {
      try {
        await redisClient.connect();
        logger.info('Connected to Redis');
      } catch (err) {
        logger.error('Could not connect to Redis', err);
      }
    }
  };

  connectRedis();

  module.exports = redisClient;
}
