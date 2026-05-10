class EmailStrategy {
  async send(to, subject, text) {
    throw new Error('Method not implemented');
  }
}

module.exports = EmailStrategy;
