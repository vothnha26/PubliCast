const NodemailerStrategy = require('./email/nodemailer.strategy');
const ResendStrategy = require('./email/resend.strategy');
const ConsoleStrategy = require('./email/console.strategy');
const appConfig = require('../../config/app.config');

class EmailService {
  constructor() {
    this.strategy = null;
  }

  getStrategy() {
    if (!this.strategy) {
      if (appConfig.sandbox.email) {
        console.log('✉️  [EmailService] Active Sandbox mode: Redirecting outgoing emails to Terminal Console.');
        this.strategy = new ConsoleStrategy();
      } else if (process.env.RESEND_API_KEY) {
        console.log('✉️  [EmailService] Using Resend HTTP API Strategy (Port 443)');
        this.strategy = new ResendStrategy();
      } else {
        console.log('✉️  [EmailService] Using Nodemailer SMTP Strategy');
        this.strategy = new NodemailerStrategy();
      }
    }
    return this.strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
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

  async sendTeamInvitation(email, inviterName, brandName, inviteUrl, isResend = false) {
    const strategy = this.getStrategy();
    const subject = isResend
      ? `[Nhắc lại] Lời mời gia nhập đội ngũ ${brandName} trên PubliCast`
      : `Lời mời gia nhập đội ngũ ${brandName} trên PubliCast`;

    const text = `Chào bạn,\n\n${inviterName} đã mời bạn tham gia thương hiệu "${brandName}" với tư cách thành viên.\n\nVui lòng truy cập liên kết sau để chấp nhận lời mời:\n${inviteUrl}\n\nLiên kết này sẽ hết hạn sau 7 ngày.`;

    const html = this._buildInvitationHtml(inviterName, brandName, inviteUrl, isResend);

    await strategy.send(email, subject, text, html);
  }

  _buildInvitationHtml(inviterName, brandName, inviteUrl, isResend = false) {
    const initials = brandName.charAt(0).toUpperCase();
    return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Lời mời PubliCast</title></head>
<body style="margin:0;padding:0;background:#F8F8F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F7;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#2D1D35;padding:32px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M11 11h2"/><rect width="18" height="11" x="3" y="11" rx="2"/></svg>
            <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;">PubliCast</span>
          </div>
          ${isResend ? '<div style="margin-top:10px;display:inline-block;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:10px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:1px;text-transform:uppercase;">Nhắc lại lời mời</div>' : ''}
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">
          <!-- Brand avatar -->
          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#0A0A0A;border-radius:16px;">
              <span style="font-size:28px;font-weight:800;color:#fff;">${initials}</span>
            </div>
          </div>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0A0A0A;text-align:center;letter-spacing:-0.5px;">Bạn được mời vào<br><span style="color:#7C3AED;">${brandName}</span></h1>
          <p style="margin:0 0 32px;font-size:14px;color:#6B7280;text-align:center;line-height:1.6;">
            <strong style="color:#374151;">${inviterName}</strong> đã mời bạn tham gia với tư cách thành viên cộng tác trên nền tảng PubliCast.
          </p>
          <!-- CTA Button -->
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${inviteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:-0.2px;">
              ✅ Chấp nhận lời mời →
            </a>
          </div>
          <!-- Info box -->
          <div style="background:#F8F8F7;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.7;">
              Nếu nút không hoạt động, hãy sao chép và dán liên kết sau vào trình duyệt:<br>
              <a href="${inviteUrl}" style="color:#7C3AED;word-break:break-all;font-size:11px;">${inviteUrl}</a>
            </p>
          </div>
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">Liên kết này sẽ hết hạn sau <strong>7 ngày</strong>. Nếu bạn không mong đợi email này, hãy bỏ qua.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F8F8F7;padding:20px 40px;text-align:center;border-top:1px solid #F3F4F6;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">© 2026 PubliCast · Nền tảng quản lý mạng xã hội đa kênh</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
