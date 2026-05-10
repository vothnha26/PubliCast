const nodemailer = require('nodemailer');
const EmailStrategy = require('./email.strategy');

class NodemailerStrategy extends EmailStrategy {
  constructor() {
    super();
    // Cấu hình linh hoạt: ưu tiên biến môi trường, mặc định dùng ethereal để dev
    const isSecure = process.env.EMAIL_PORT == 465; // true cho port 465, false cho các port khác
    
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
    this.useConsoleEmail = process.env.NODE_ENV !== 'production' && (
      !user ||
      !pass ||
      user === 'your_email@gmail.com' ||
      pass === 'your_app_password_16_chars'
    );

    if (this.useConsoleEmail) {
      console.warn('Email credentials are not configured. OTP emails will be printed to console.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 465,
      secure: isSecure || (process.env.EMAIL_PORT == 465), 
      auth: {
        user: user,
        pass: pass
      }
    });
  }

  async send(to, subject, text) {
    if (this.useConsoleEmail) {
      console.log('----- DEV EMAIL -----');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(text);
      console.log('---------------------');
      return;
    }

    await this.transporter.sendMail({
      from: '"PubliCast" <noreply@publicast.com>',
      to,
      subject,
      text
    });
  }
}

module.exports = NodemailerStrategy;
