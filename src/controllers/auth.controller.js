const authService = require('../services/auth.service');
const { ERROR_MESSAGES } = require('../utils/constants');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      const user = await authService.register(name, email, password);
      res.status(201).json({
        message: ERROR_MESSAGES.REGISTRATION_SUCCESS,
        userId: user.id
      });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOTP(email, otp);
      res.status(200).json(result);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }
}

module.exports = new AuthController();
