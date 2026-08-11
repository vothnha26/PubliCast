const NodemailerStrategy = require('./email/nodemailer.strategy');
const ResendStrategy = require('./email/resend.strategy');
const ConsoleStrategy = require('./email/console.strategy');
const appConfig = require('../../config/app.config');
const logger = require('../../utils/logger');

/**
 * Named React Email templates a caller can select via
 * notificationService.create()'s emailOptions.template (see
 * social.service.js#_notifyPlatformDisconnected for the first consumer).
 * Add a new dedicated template by: creating the component under
 * src/emails/, adding a key here, and a branch in _buildNotificationHtml.
 */
const EMAIL_TEMPLATES = {
  CHANNEL_DISCONNECTED: 'channelDisconnected'
};

class EmailService {
  constructor() {
    this.strategy = null;
  }

  getStrategy() {
    if (!this.strategy) {
      if (appConfig.sandbox.email) {
        logger.debug('✉️  [EmailService] Active Sandbox mode: Redirecting outgoing emails to Terminal Console.');
        this.strategy = new ConsoleStrategy();
      } else if (process.env.RESEND_API_KEY) {
        logger.debug('✉️  [EmailService] Using Resend HTTP API Strategy (Port 443)');
        this.strategy = new ResendStrategy();
      } else {
        logger.debug('✉️  [EmailService] Using Nodemailer SMTP Strategy');
        this.strategy = new NodemailerStrategy();
      }
    }
    return this.strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  /**
   * Renders a React Email component (see src/emails/) to an HTML string.
   * require('../../emails/register') triggers Babel's JSX transform,
   * scoped only to src/emails/ — see that file's comment.
   *
   * Uses react-dom/server's renderToStaticMarkup directly rather than
   * @react-email/render — that package's render() internally does
   * `await import('react-dom/server')`, which throws
   * "A dynamic import callback was invoked without --experimental-vm-modules"
   * under Jest's CJS test environment (works fine under plain Node/prod).
   * renderToStaticMarkup is synchronous and is what @react-email/render
   * calls under the hood anyway, so output is equivalent — just prepend the
   * doctype it adds on top for email-client compatibility.
   */
  _renderEmail(Component, props) {
    require('../../emails/register');
    const React = require('react');
    const ReactDOMServer = require('react-dom/server');
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component, props));
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">${markup}`;
  }

  async sendOTP(email, otp) {
    const strategy = this.getStrategy();
    await strategy.send(
      email,
      'Mã OTP kích hoạt tài khoản PubliCast',
      `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`
    );
  }

  async sendForgotPasswordOTP(email, otp) {
    const strategy = this.getStrategy();
    await strategy.send(
      email,
      'Mã OTP đặt lại mật khẩu PubliCast',
      `Mã OTP đặt lại mật khẩu của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`
    );
  }

  async sendResetPasswordLink(email, link) {
    const strategy = this.getStrategy();
    await strategy.send(
      email,
      'Đặt lại mật khẩu tài khoản PubliCast',
      `Chào bạn,\n\nBạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu cho tài khoản PubliCast của mình.\n\nVui lòng nhấn vào đường dẫn sau để đặt lại mật khẩu mới:\n${link}\n\nĐường dẫn này có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.`
    );
  }

  async sendTeamInvitation(email, inviterName, brandName, inviteUrl, isResend = false) {
    const strategy = this.getStrategy();
    const subject = isResend
      ? `[Nhắc lại] Lời mời gia nhập đội ngũ ${brandName} trên PubliCast`
      : `Lời mời gia nhập đội ngũ ${brandName} trên PubliCast`;

    const text = `Chào bạn,\n\n${inviterName} đã mời bạn tham gia thương hiệu "${brandName}" với tư cách thành viên.\n\nVui lòng truy cập liên kết sau để chấp nhận lời mời:\n${inviteUrl}\n\nLiên kết này sẽ hết hạn sau 7 ngày.`;

    require('../../emails/register');
    const { TeamInvitationEmail } = require('../../emails/TeamInvitationEmail');
    const html = await this._renderEmail(TeamInvitationEmail, { inviterName, brandName, inviteUrl, isResend });

    await strategy.send(email, subject, text, html);
  }

  /**
   * Sends a notification-driven email. `template` (one of EMAIL_TEMPLATES)
   * selects a dedicated React Email component from src/emails/; when
   * omitted or unrecognized, falls back to GenericNotificationEmail using
   * just title/message/actionUrl — the original behavior before dedicated
   * templates existed.
   */
  async sendNotificationEmail(email, title, message, actionUrl, template, templateData) {
    const strategy = this.getStrategy();
    const text = actionUrl ? `${message}\n\n${actionUrl}` : message;
    const html = await this._buildNotificationHtml(title, message, actionUrl, template, templateData);
    await strategy.send(email, title, text, html);
  }

  async _buildNotificationHtml(title, message, actionUrl, template, templateData) {
    // Must run before requiring any .jsx file below — this is what teaches
    // require() how to resolve/transform the .jsx extension in the first
    // place (see src/emails/register.js).
    require('../../emails/register');

    if (template === EMAIL_TEMPLATES.CHANNEL_DISCONNECTED && templateData) {
      const { ChannelDisconnectedEmail } = require('../../emails/ChannelDisconnectedEmail');
      return this._renderEmail(ChannelDisconnectedEmail, { ...templateData, reconnectUrl: actionUrl });
    }

    const { GenericNotificationEmail } = require('../../emails/GenericNotificationEmail');
    return this._renderEmail(GenericNotificationEmail, { title, message, actionUrl });
  }

  async sendReport(emails, subject, text, buffer, filename, contentType) {
    const strategy = this.getStrategy();
    const attachments = [{
      filename,
      content: buffer,
      contentType
    }];
    for (const email of emails) {
      await strategy.send(email, subject, text, null, attachments);
    }
  }
}

module.exports = new EmailService();
module.exports.EMAIL_TEMPLATES = EMAIL_TEMPLATES;
