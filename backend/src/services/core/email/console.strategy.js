const EmailStrategy = require('./email.strategy');

class ConsoleStrategy extends EmailStrategy {
  async send(to, subject, text, html = null, attachments = []) {
    console.log('\n==================================================');
    console.log('✉️  [EmailService/Sandbox] NEW OUTGOING EMAIL DETECTED');
    console.log('==================================================');
    console.log(`To:          ${to}`);
    console.log(`Subject:     ${subject}`);
    console.log('--------------------------------------------------');
    console.log(`Text Content:\n${text}`);
    if (html) {
      console.log('--------------------------------------------------');
      console.log(`HTML Body Preview (First 200 chars):\n${html.substring(0, 200)}...`);
    }
    if (attachments && attachments.length > 0) {
      console.log('--------------------------------------------------');
      console.log('Attachments:');
      attachments.forEach((att, idx) => {
        const sizeInKb = att.content ? Math.round(att.content.length / 1024) : 0;
        console.log(`  [${idx + 1}] Filename: ${att.filename} | Type: ${att.contentType} | Size: ${sizeInKb} KB`);
      });
    }
    console.log('==================================================\n');
  }
}

module.exports = ConsoleStrategy;
