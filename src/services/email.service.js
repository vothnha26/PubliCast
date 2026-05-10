const NodemailerStrategy = require('./email/nodemailer.strategy');

class EmailService {
  constructor(strategy = new NodemailerStrategy()) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  async sendOTP(email, otp) {
    await this.strategy.send(
      email,
      'Mã OTP kích hoạt tài khoản PubliCast',
      `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`
    );
  }
}

module.exports = new EmailService();
