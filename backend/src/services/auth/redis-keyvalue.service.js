class RedisKeyValueService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  key(prefix, identifier) {
    return `${prefix}:${identifier}`;
  }

  async set(prefix, identifier, value, ttlSeconds) {
    await this.redisClient.setEx(this.key(prefix, identifier), ttlSeconds, String(value));
  }

  async get(prefix, identifier) {
    return this.redisClient.get(this.key(prefix, identifier));
  }

  async delete(prefix, identifier) {
    await this.redisClient.del(this.key(prefix, identifier));
  }
}

module.exports = RedisKeyValueService;
