const nodemailer = require('nodemailer');
const EmailStrategy = require('./email.strategy');
const logger = require('../../../utils/logger');

class NodemailerStrategy extends EmailStrategy {
  constructor() {
    super();
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
    this.senderEmail = user;

    const isPlaceholder = (user === 'your_email@gmail.com' || pass === 'your_app_password_16_chars');
    const isMissing = !user || !pass;

    // Chỉ fallback sang console khi THỰC SỰ không có credentials
    if (isMissing || isPlaceholder) {
      this.useConsoleEmail = true;
      console.warn('⚠️ [EmailService] Credentials missing/placeholder → emails printed to console.');
      return;
    }

    this.useConsoleEmail = false;

    const port = parseInt(process.env.EMAIL_PORT) || 465;
    const secure = port === 465;

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000, // 10 seconds timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
      family: 4 // Force IPv4 to avoid IPv6 ENETUNREACH on Render
    });

    // Verify connection on startup (skip in test environment to avoid console leaks)
    if (process.env.NODE_ENV !== 'test') {
      this.transporter.verify((err) => {
        if (err) {
          logger.error('[EmailService] SMTP connection failed', err);
        } else {
          logger.debug('✅ [EmailService] SMTP server ready');
        }
      });
    }
  }

  async send(to, subject, text, html = null, attachments = []) {
    if (this.useConsoleEmail) {
      console.log('\n----- DEV EMAIL -----');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(text);
      if (attachments && attachments.length > 0) {
        console.log(`Attachments: ${attachments.map(a => a.filename).join(', ')}`);
      }
      console.log('---------------------\n');
      return;
    }

    logger.debug(`📧 [EmailService] Sending email to: ${to} | Subject: ${subject}`);
    try {
      const mailOptions = {
        from: `"PubliCast" <${this.senderEmail}>`,
        to,
        subject,
        text
      };
      if (html) mailOptions.html = html;
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      await this.transporter.sendMail(mailOptions);
      logger.debug(`✅ [EmailService] Email sent successfully to: ${to}`);
    } catch (error) {
      logger.error(`[EmailService] Failed to send email to: ${to}`, error);
      throw error;
    }
  }
}

module.exports = NodemailerStrategy;
