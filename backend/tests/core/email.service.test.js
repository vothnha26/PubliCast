// email.service.js renders React Email components (src/emails/) instead of
// building HTML strings inline — these tests exercise the real render
// pipeline (Babel/@react-email transform through a mocked send strategy)
// rather than mocking react-email itself, since the render step is the
// part most likely to break silently (wrong require order, sync/async
// mismatch — see src/emails/register.js and email.service.js's history).

const emailService = require('../../src/services/core/email.service');

function mockStrategy() {
  return { send: jest.fn().mockResolvedValue(undefined) };
}

describe('EmailService template rendering', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('EMAIL_TEMPLATES.CHANNEL_DISCONNECTED is exported for callers to reference instead of a magic string', () => {
    expect(emailService.EMAIL_TEMPLATES).toEqual({ CHANNEL_DISCONNECTED: 'channelDisconnected' });
  });

  describe('sendNotificationEmail', () => {
    it('renders the dedicated ChannelDisconnectedEmail template when template=CHANNEL_DISCONNECTED, embedding the channel/brand name', async () => {
      const strategy = mockStrategy();
      emailService.setStrategy(strategy);

      await emailService.sendNotificationEmail(
        'user@example.com',
        'FACEBOOK disconnected',
        'FACEBOOK has been disconnected.',
        'https://app.publicast.test/manage/connections',
        emailService.EMAIL_TEMPLATES.CHANNEL_DISCONNECTED,
        { platform: 'FACEBOOK', channelName: 'My Page', brandName: 'Acme Co' }
      );

      expect(strategy.send).toHaveBeenCalledTimes(1);
      const [to, subject, text, html] = strategy.send.mock.calls[0];
      expect(to).toBe('user@example.com');
      expect(subject).toBe('FACEBOOK disconnected');
      expect(text).toContain('https://app.publicast.test/manage/connections');
      expect(typeof html).toBe('string');
      expect(html).toContain('My Page');
      expect(html).toContain('Acme Co');
      expect(html).toContain('Kết nối lại');
    });

    it('falls back to GenericNotificationEmail when no template is given', async () => {
      const strategy = mockStrategy();
      emailService.setStrategy(strategy);

      await emailService.sendNotificationEmail('user@example.com', 'Generic Title', 'Generic message', null);

      const [, , , html] = strategy.send.mock.calls[0];
      expect(typeof html).toBe('string');
      expect(html).toContain('Generic Title');
      expect(html).toContain('Generic message');
    });

    it('falls back to GenericNotificationEmail when template is unrecognized', async () => {
      const strategy = mockStrategy();
      emailService.setStrategy(strategy);

      await emailService.sendNotificationEmail('user@example.com', 'Title', 'msg', null, 'someUnknownTemplate', { foo: 'bar' });

      const [, , , html] = strategy.send.mock.calls[0];
      expect(html).toContain('Title');
    });

    it('falls back to GenericNotificationEmail when template is CHANNEL_DISCONNECTED but templateData is missing', async () => {
      const strategy = mockStrategy();
      emailService.setStrategy(strategy);

      await emailService.sendNotificationEmail('user@example.com', 'Title', 'msg', null, emailService.EMAIL_TEMPLATES.CHANNEL_DISCONNECTED, undefined);

      const [, , , html] = strategy.send.mock.calls[0];
      expect(html).toContain('Title');
    });
  });

  describe('sendTeamInvitation', () => {
    it('renders TeamInvitationEmail with the invite link', async () => {
      const strategy = mockStrategy();
      emailService.setStrategy(strategy);

      await emailService.sendTeamInvitation('user@example.com', 'Bob', 'Acme', 'https://app.publicast.test/invite/abc', false);

      const [, subject, , html] = strategy.send.mock.calls[0];
      expect(subject).toBe('Lời mời gia nhập đội ngũ Acme trên PubliCast');
      expect(html).toContain('Bob');
      expect(html).toContain('Acme');
      expect(html).toContain('https://app.publicast.test/invite/abc');
    });

    it('prefixes the subject with a resend marker when isResend is true', async () => {
      const strategy = mockStrategy();
      emailService.setStrategy(strategy);

      await emailService.sendTeamInvitation('user@example.com', 'Bob', 'Acme', 'https://x.com/invite', true);

      const [, subject] = strategy.send.mock.calls[0];
      expect(subject).toContain('[Nhắc lại]');
    });
  });
});
