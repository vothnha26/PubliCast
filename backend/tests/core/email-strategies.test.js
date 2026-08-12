const EmailStrategy = require('../../src/services/core/email/email.strategy');
const ConsoleStrategy = require('../../src/services/core/email/console.strategy');

describe('EmailStrategy (base)', () => {
  it('send() rejects as not implemented', async () => {
    const strategy = new EmailStrategy();
    await expect(strategy.send('a@b.com', 'subj', 'text')).rejects.toThrow('Method not implemented');
  });
});

describe('ConsoleStrategy', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs the recipient and subject', async () => {
    const strategy = new ConsoleStrategy();
    await strategy.send('a@b.com', 'Hello', 'Body text');
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('a@b.com');
    expect(logged).toContain('Hello');
    expect(logged).toContain('Body text');
  });

  it('logs a truncated HTML preview when html is provided', async () => {
    const strategy = new ConsoleStrategy();
    const html = '<p>' + 'x'.repeat(300) + '</p>';
    await strategy.send('a@b.com', 'Hello', 'text', html);
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('HTML Body Preview');
  });

  it('logs attachment metadata when attachments are provided', async () => {
    const strategy = new ConsoleStrategy();
    await strategy.send('a@b.com', 'Hello', 'text', null, [
      { filename: 'file.pdf', contentType: 'application/pdf', content: Buffer.from('x'.repeat(2048)) }
    ]);
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('file.pdf');
    expect(logged).toContain('2 KB');
  });

  it('does not log an attachments section when there are none', async () => {
    const strategy = new ConsoleStrategy();
    await strategy.send('a@b.com', 'Hello', 'text');
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).not.toContain('Attachments:');
  });
});

describe('ResendStrategy', () => {
  const OLD_ENV = process.env;
  let axios;
  let logSpy, warnSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('axios', () => ({ post: jest.fn() }));
    axios = require('axios');
    process.env = { ...OLD_ENV };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    jest.dontMock('axios');
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('falls back to console output when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const ResendStrategy = require('../../src/services/core/email/resend.strategy');
    const strategy = new ResendStrategy();

    await strategy.send('a@b.com', 'Subject', 'Body');

    expect(axios.post).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('posts to the Resend API with the configured sender when the key is present', async () => {
    process.env.RESEND_API_KEY = 'key-123';
    process.env.RESEND_SENDER = 'noreply@publicast.app';
    axios.post.mockResolvedValue({ data: { id: 'email-1' } });

    const ResendStrategy = require('../../src/services/core/email/resend.strategy');
    const strategy = new ResendStrategy();
    await strategy.send('a@b.com', 'Subject', 'Body', '<p>Body</p>');

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        from: 'PubliCast <noreply@publicast.app>',
        to: ['a@b.com'],
        subject: 'Subject',
        html: '<p>Body</p>'
      }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer key-123' }) })
    );
  });

  it('base64-encodes attachment content before sending', async () => {
    process.env.RESEND_API_KEY = 'key-123';
    axios.post.mockResolvedValue({ data: { id: 'email-1' } });

    const ResendStrategy = require('../../src/services/core/email/resend.strategy');
    const strategy = new ResendStrategy();
    await strategy.send('a@b.com', 'Subject', 'Body', null, [
      { filename: 'file.pdf', content: Buffer.from('hello'), contentType: 'application/pdf' }
    ]);

    const [, body] = axios.post.mock.calls[0];
    expect(body.attachments[0]).toEqual({
      filename: 'file.pdf',
      content: Buffer.from('hello').toString('base64'),
      contentType: 'application/pdf'
    });
  });

  it('rethrows with the API error message when the request fails', async () => {
    process.env.RESEND_API_KEY = 'key-123';
    axios.post.mockRejectedValue({ response: { data: { message: 'Invalid recipient' } } });

    const ResendStrategy = require('../../src/services/core/email/resend.strategy');
    const strategy = new ResendStrategy();

    await expect(strategy.send('bad@b.com', 'Subject', 'Body')).rejects.toEqual(
      expect.objectContaining({ response: expect.objectContaining({ data: { message: 'Invalid recipient' } }) })
    );
  });
});

describe('NodemailerStrategy', () => {
  const OLD_ENV = process.env;
  let nodemailer;
  let warnSpy, logSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('nodemailer', () => ({
      createTransport: jest.fn()
    }));
    nodemailer = require('nodemailer');
    process.env = { ...OLD_ENV, NODE_ENV: 'test' };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    jest.dontMock('nodemailer');
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('falls back to console mode when credentials are missing', async () => {
    delete process.env.EMAIL_USER;
    delete process.env.GMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.GMAIL_PASS;

    const NodemailerStrategy = require('../../src/services/core/email/nodemailer.strategy');
    const strategy = new NodemailerStrategy();

    expect(strategy.useConsoleEmail).toBe(true);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();

    await strategy.send('a@b.com', 'Subject', 'Body');
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('DEV EMAIL');
  });

  it('falls back to console mode when credentials are placeholder values', () => {
    process.env.EMAIL_USER = 'your_email@gmail.com';
    process.env.EMAIL_PASS = 'your_app_password_16_chars';

    const NodemailerStrategy = require('../../src/services/core/email/nodemailer.strategy');
    const strategy = new NodemailerStrategy();

    expect(strategy.useConsoleEmail).toBe(true);
  });

  it('creates a real transporter when credentials are configured', () => {
    process.env.EMAIL_USER = 'real@publicast.app';
    process.env.EMAIL_PASS = 'realpassword';
    nodemailer.createTransport.mockReturnValue({ verify: jest.fn(), sendMail: jest.fn() });

    const NodemailerStrategy = require('../../src/services/core/email/nodemailer.strategy');
    const strategy = new NodemailerStrategy();

    expect(strategy.useConsoleEmail).toBe(false);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      auth: { user: 'real@publicast.app', pass: 'realpassword' }
    }));
  });

  it('uses port 465 as secure by default and skips SMTP verify in test env', () => {
    process.env.EMAIL_USER = 'real@publicast.app';
    process.env.EMAIL_PASS = 'realpassword';
    const transport = { verify: jest.fn(), sendMail: jest.fn() };
    nodemailer.createTransport.mockReturnValue(transport);

    const NodemailerStrategy = require('../../src/services/core/email/nodemailer.strategy');
    new NodemailerStrategy();

    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 465, secure: true }));
    expect(transport.verify).not.toHaveBeenCalled();
  });

  it('sends mail through the transporter when configured for real delivery', async () => {
    process.env.EMAIL_USER = 'real@publicast.app';
    process.env.EMAIL_PASS = 'realpassword';
    const sendMail = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ verify: jest.fn(), sendMail });

    const NodemailerStrategy = require('../../src/services/core/email/nodemailer.strategy');
    const strategy = new NodemailerStrategy();
    await strategy.send('a@b.com', 'Subject', 'Body', '<p>Body</p>', [{ filename: 'f.pdf' }]);

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'a@b.com',
      subject: 'Subject',
      html: '<p>Body</p>',
      attachments: [{ filename: 'f.pdf' }]
    }));
  });

  it('rethrows when sendMail fails', async () => {
    process.env.EMAIL_USER = 'real@publicast.app';
    process.env.EMAIL_PASS = 'realpassword';
    const sendMail = jest.fn().mockRejectedValue(new Error('SMTP down'));
    nodemailer.createTransport.mockReturnValue({ verify: jest.fn(), sendMail });

    const NodemailerStrategy = require('../../src/services/core/email/nodemailer.strategy');
    const strategy = new NodemailerStrategy();

    await expect(strategy.send('a@b.com', 'Subject', 'Body')).rejects.toThrow('SMTP down');
  });
});
