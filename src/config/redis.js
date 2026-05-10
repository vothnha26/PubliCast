const { createClient } = require('redis');

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
