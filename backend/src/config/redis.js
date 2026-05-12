const { createClient } = require('redis');

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
  console.warn('Using in-memory Redis fallback. Do not use this in production.');
  module.exports = createMemoryRedisClient();
  return;
}

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Redis Client Error', err);
  }
});

const connectRedis = async () => {
  if (process.env.NODE_ENV !== 'test' && !redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('Connected to Redis');
    } catch (err) {
      console.error('Could not connect to Redis', err);
    }
  }
};

connectRedis();

module.exports = redisClient;
