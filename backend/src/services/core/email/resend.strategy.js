const axios = require('axios');
const EmailStrategy = require('./email.strategy');

class ResendStrategy extends EmailStrategy {
  constructor() {
    super();
    this.apiKey = process.env.RESEND_API_KEY;
    this.sender = process.env.RESEND_SENDER || 'onboarding@resend.dev';
  }

  async send(to, subject, text, html = null, attachments = []) {
    if (!this.apiKey) {
      console.warn('⚠️ [EmailService] RESEND_API_KEY is missing. Falling back to console print.');
      console.log('\n----- RESEND FALLBACK -----');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(text);
      console.log('---------------------------\n');
      return;
    }

    console.log(`📧 [EmailService/Resend] Sending email to: ${to} | Subject: ${subject}`);

    try {
      const data = {
        from: `PubliCast <${this.sender}>`,
        to: [to],
        subject,
        text
      };

      if (html) {
        data.html = html;
      }

      // Convert attachments if present
      if (attachments && attachments.length > 0) {
        data.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content.toString('base64'),
          contentType: att.contentType
        }));
      }

      const response = await axios.post('https://api.resend.com/emails', data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ [EmailService/Resend] Email sent successfully. ID: ${response.data.id}`);
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error(`❌ [EmailService/Resend] Failed to send email to: ${to} | Error: ${errMsg}`);
      throw error;
    }
  }
}

module.exports = ResendStrategy;
