const React = require('react');
const { Heading, Text, Button, Section } = require('@react-email/components');
const { EmailLayout } = require('./components/EmailLayout');

function TeamInvitationEmail({ inviterName, brandName, inviteUrl, isResend = false }) {
  const initials = brandName.charAt(0).toUpperCase();

  return React.createElement(
    EmailLayout,
    { title: 'Lời mời PubliCast', badge: isResend ? 'Nhắc lại lời mời' : null },
    React.createElement(
      'div',
      { style: { textAlign: 'center', marginBottom: 28 } },
      React.createElement(
        'div',
        { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: '#0A0A0A', borderRadius: 16 } },
        React.createElement('span', { style: { fontSize: 28, fontWeight: 800, color: '#fff' } }, initials)
      )
    ),
    React.createElement(
      Heading,
      { as: 'h1', style: { margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#0A0A0A', textAlign: 'center', letterSpacing: '-0.5px' } },
      'Bạn được mời vào',
      React.createElement('br'),
      React.createElement('span', { style: { color: '#7C3AED' } }, brandName)
    ),
    React.createElement(
      Text,
      { style: { margin: '0 0 32px', fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 } },
      React.createElement('strong', { style: { color: '#374151' } }, inviterName),
      ' đã mời bạn tham gia với tư cách thành viên cộng tác trên nền tảng PubliCast.'
    ),
    React.createElement(
      Section,
      { style: { textAlign: 'center', marginBottom: 32 } },
      React.createElement(
        Button,
        {
          href: inviteUrl,
          style: { display: 'inline-block', background: '#0A0A0A', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '14px 36px', borderRadius: 12, letterSpacing: '-0.2px' }
        },
        '✅ Chấp nhận lời mời →'
      )
    ),
    React.createElement(
      'div',
      { style: { background: '#F8F8F7', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', marginBottom: 28 } },
      React.createElement(
        Text,
        { style: { margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.7 } },
        'Nếu nút không hoạt động, hãy sao chép và dán liên kết sau vào trình duyệt:',
        React.createElement('br'),
        React.createElement('a', { href: inviteUrl, style: { color: '#7C3AED', wordBreak: 'break-all', fontSize: 11 } }, inviteUrl)
      )
    ),
    React.createElement(
      Text,
      { style: { margin: 0, fontSize: 11, color: '#9CA3AF', textAlign: 'center' } },
      'Liên kết này sẽ hết hạn sau ',
      React.createElement('strong', null, '7 ngày'),
      '. Nếu bạn không mong đợi email này, hãy bỏ qua.'
    )
  );
}

module.exports = { TeamInvitationEmail };
