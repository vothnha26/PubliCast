const redisClient = require('../config/redis');

class OTPService {
  async generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
