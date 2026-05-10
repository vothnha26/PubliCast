const nodemailer = require('nodemailer');
const EmailStrategy = require('./email.strategy');

class NodemailerStrategy extends EmailStrategy {
  constructor() {
    super();
    // Cấu hình linh hoạt: ưu tiên biến môi trường, mặc định dùng ethereal để dev
    const isSecure = process.env.EMAIL_PORT == 465; // true cho port 465, false cho các port khác
    
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

    if (!user || !pass) {
      console.error('CRITICAL: Email credentials (EMAIL_USER/GMAIL_USER) are missing in .env');
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
    await this.transporter.sendMail({
      from: '"PubliCast" <noreply@publicast.com>',
      to,
      subject,
      text
    });
  }
}

module.exports = NodemailerStrategy;
