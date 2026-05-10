const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const otpService = require('./otp.service');
const emailService = require('./email.service');

const { USER_STATUS, AUTH_PROVIDERS, ERROR_MESSAGES } = require('../utils/constants');

class AuthService {
  async register(name, email, password) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user with status INACTIVE (pending)
    const user = await userRepository.createUser(
      { fullName: name, email, status: USER_STATUS.INACTIVE },
      { provider: AUTH_PROVIDERS.LOCAL, passwordHash }
    );

    const otp = await otpService.generateOTP();
    await otpService.saveOTP(email, otp);
    await emailService.sendOTP(email, otp);

    return user;
  }

  async verifyOTP(email, otp) {
    const savedOTP = await otpService.getOTP(email);
    
    if (!savedOTP) {
      const error = new Error(ERROR_MESSAGES.OTP_EXPIRED);
      error.status = 400;
      throw error;
    }

    if (savedOTP !== otp) {
      const error = new Error(ERROR_MESSAGES.INVALID_OTP);
      error.status = 400;
      throw error;
    }

    await userRepository.updateStatus(email, USER_STATUS.ACTIVE, new Date());
    await otpService.deleteOTP(email);

    return { message: ERROR_MESSAGES.ACTIVATION_SUCCESS };
  }
}

module.exports = new AuthService();
