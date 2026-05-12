const nodemailer = require('nodemailer');
const EmailStrategy = require('./email.strategy');

class NodemailerStrategy extends EmailStrategy {
  constructor() {
    super();
    // Cấu hình linh hoạt: ưu tiên biến môi trường, mặc định dùng ethereal để dev
    const isSecure = process.env.EMAIL_PORT == 465; // true cho port 465, false cho các port khác
    
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

    // Check if using placeholder or missing credentials
    const isPlaceholder = (user === 'your_email@gmail.com' || pass === 'your_app_password_16_chars');
    const isMissing = !user || !pass;

    // Use console email if in dev and missing/placeholder, OR if explicitly requested
    this.useConsoleEmail = (process.env.NODE_ENV !== 'production' && (isMissing || isPlaceholder));

    if (this.useConsoleEmail) {
      console.warn('⚠️ Email credentials are not configured or using placeholders. OTP emails will be printed to console.');
      return;
    }

    if (isMissing) {
      console.error('❌ Error: Email credentials (EMAIL_USER/EMAIL_PASS) are missing.');
      // Fallback to console instead of crashing with "Missing credentials for PLAIN"
      this.useConsoleEmail = true;
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
