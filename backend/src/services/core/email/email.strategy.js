class EmailStrategy {
  async send(to, subject, text, html = null, attachments = []) {
    throw new Error('Method not implemented');
  }
}

module.exports = EmailStrategy;
