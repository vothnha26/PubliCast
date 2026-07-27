const crypto = require('crypto');
const redisClient = require('../../config/redis');

class OTPService {
  async generateOTP() {
    // crypto.randomInt is a CSPRNG; Math.random() is not suitable for
    // security-sensitive values like an account-activation code (#58).
    return crypto.randomInt(100000, 1000000).toString();
  }

  async saveOTP(email, otp, expirySeconds = 600) {
    await redisClient.set(`otp:${email}`, otp, {
      EX: expirySeconds
    });
  }

  async getOTP(email) {
    return await redisClient.get(`otp:${email}`);
  }

  async deleteOTP(email) {
    await redisClient.del(`otp:${email}`);
  }
}

module.exports = new OTPService();
