/**
 * Redis Health Service
 *
 * Monitors Redis connection status and alerts on failures.
 * Critical for detecting quota/lock failures caused by Redis unavailability.
 *
 * Failure scenarios:
 * - Redis connection lost: Locks can't be acquired/released
 * - Cache unavailable: YouTube API called more frequently
 * - Quota tracking fails: Risk of quota exhaustion
 *
 * Alert keyword: [CRITICAL_REDIS_DOWN]
 * Monitoring systems should page on-call engineer immediately.
 */

const logger = require('../../utils/logger');

class RedisHealthService {
  /**
   * @param {RedisClient} redisClient - Redis client instance
   */
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.lastHealthStatus = true;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  /**
   * Check if Redis connection is healthy
   *
   * @returns {Promise<boolean>} - true if healthy, false if down
   *
   * Method:
   * 1. Send PING command to Redis
   * 2. Expect PONG response
   * 3. Log [CRITICAL_REDIS_DOWN] if fails
   * 4. Track consecutive failures to detect intermittent issues
   */
  async isRedisHealthy() {
    try {
      const response = await this.redisClient.ping();

      if (response === 'PONG') {
        // Redis is healthy
        if (!this.lastHealthStatus) {
          logger.info('[REDIS] Connection restored');
          this.lastHealthStatus = true;
        }
        this.consecutiveFailures = 0;
        return true;
      } else {
        this.handleHealthFailure('Unexpected ping response');
        return false;
      }
    } catch (err) {
      this.handleHealthFailure(err.message);
      return false;
    }
  }

  /**
   * Get detailed Redis info
   *
   * @returns {Promise<object|null>} - Redis INFO command output or null if failed
   */
  async getRedisInfo() {
    try {
      const info = await this.redisClient.info();
      return info;
    } catch (err) {
      logger.error('[REDIS] Error getting info:', { error: err.message });
      return null;
    }
  }

  /**
   * Get Redis memory usage
   *
   * @returns {Promise<object|null>} - Memory stats or null if failed
   */
  async getMemoryStats() {
    try {
      const info = await this.redisClient.info('memory');
      // Parse memory info if needed
      return info;
    } catch (err) {
      logger.error('[REDIS] Error getting memory stats:', { error: err.message });
      return null;
    }
  }

  /**
   * Get current number of Redis connections
   *
   * @returns {Promise<number|null>} - Connection count or null if failed
   */
  async getConnectionCount() {
    try {
      const info = await this.redisClient.info('clients');
      // Parse connected_clients from info
      const match = info?.match(/connected_clients:(\d+)/);
      return match ? parseInt(match[1]) : null;
    } catch (err) {
      logger.error('[REDIS] Error getting connection count:', { error: err.message });
      return null;
    }
  }

  /**
   * Get Redis server statistics
   *
   * @returns {Promise<object|null>} - Statistics or null if failed
   */
  async getServerStats() {
    try {
      const info = await this.redisClient.info('server');
      return info;
    } catch (err) {
      logger.error('[REDIS] Error getting server stats:', { error: err.message });
      return null;
    }
  }

  /**
   * Check if Redis is running out of memory
   *
   * @returns {Promise<boolean>} - true if memory usage is high
   */
  async isMemoryLow() {
    try {
      const info = await this.getMemoryStats();
      if (!info) return false;

      // Parse used_memory_human and maxmemory
      const usedMatch = info.match(/used_memory:(\d+)/);
      const maxMatch = info.match(/maxmemory:(\d+)/);

      if (!usedMatch || !maxMatch) return false;

      const used = parseInt(usedMatch[1]);
      const max = parseInt(maxMatch[1]);

      if (max === 0) return false; // No limit set

      const percentage = (used / max) * 100;
      const isLow = percentage > 90; // Flag if > 90%

      if (isLow) {
        logger.warn('[REDIS] Memory usage high:', {
          used: `${(used / 1024 / 1024).toFixed(2)}MB`,
          max: `${(max / 1024 / 1024).toFixed(2)}MB`,
          percentage: percentage.toFixed(2) + '%'
        });
      }

      return isLow;
    } catch (err) {
      logger.error('[REDIS] Error checking memory:', { error: err.message });
      return false;
    }
  }

  /**
   * Perform comprehensive health check
   *
   * @returns {Promise<object>} - Health report
   */
  async getHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      connectionHealthy: false,
      memoryHealthy: true,
      consecutiveFailures: this.consecutiveFailures,
      details: {}
    };

    try {
      // Check connection
      report.connectionHealthy = await this.isRedisHealthy();

      if (report.connectionHealthy) {
        // Only check details if connected
        report.memoryHealthy = !(await this.isMemoryLow());

        report.details = {
          connections: await this.getConnectionCount(),
          memoryStats: await this.getMemoryStats()
        };
      }

      return report;
    } catch (err) {
      logger.error('[REDIS] Health report error:', { error: err.message });
      report.error = err.message;
      return report;
    }
  }

  /**
   * Setup periodic health monitoring
   *
   * @param {number} intervalSec - Check interval in seconds (default: 30)
   * @returns {function} - Stop monitoring function
   */
  setupMonitoring(intervalSec = 30) {
    const intervalId = setInterval(async () => {
      try {
        const healthy = await this.isRedisHealthy();
        if (!healthy) {
          logger.error('[CRITICAL_REDIS_DOWN] Redis connection failed during health check');
        }
      } catch (err) {
        logger.error('[CRITICAL_REDIS_DOWN] Health check error:', { error: err.message });
      }
    }, intervalSec * 1000);

    logger.info('[REDIS] Health monitoring started', { intervalSec });

    // Return stop function
    return () => {
      clearInterval(intervalId);
      logger.info('[REDIS] Health monitoring stopped');
    };
  }

  /**
   * Fail-open strategy: Continue working even if Redis is down
   *
   * In production, if Redis is down:
   * 1. Locks can't be acquired → bypass lock, accept Thundering Herd risk
   * 2. Cache unavailable → fetch from API directly
   * 3. Quota tracking fails → log warning, continue anyway
   *
   * This ensures service availability over quota safety.
   * Better to use extra quota than have service down.
   *
   * @returns {Promise<boolean>} - true if should fail-open
   */
  async shouldFailOpen() {
    const healthy = await this.isRedisHealthy();
    if (healthy) return false;

    logger.warn('[REDIS] Failing open - Redis unavailable, bypassing lock and cache');
    return true;
  }

  /**
   * Handle health check failure
   *
   * @private
   * @param {string} reason - Failure reason
   */
  handleHealthFailure(reason) {
    this.consecutiveFailures++;

    const message = `[CRITICAL_REDIS_DOWN] Connection failed (#${this.consecutiveFailures}): ${reason}`;

    if (this.consecutiveFailures === 1) {
      // First failure
      logger.error(message);
    } else if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      // Multiple failures - escalate
      logger.error(`${message} - CRITICAL: Service degradation possible`);
    } else {
      // Intermediate failures
      logger.warn(message);
    }

    // Update status on first failure
    if (this.lastHealthStatus && this.consecutiveFailures === 1) {
      this.lastHealthStatus = false;
      logger.error('[CRITICAL_REDIS_DOWN] Redis connection lost - immediate attention required');
    }
  }
}

module.exports = RedisHealthService;
