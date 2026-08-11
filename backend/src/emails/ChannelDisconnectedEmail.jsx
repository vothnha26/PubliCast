const React = require('react');
const { Heading, Text, Button, Section } = require('@react-email/components');
const { EmailLayout } = require('./components/EmailLayout');

const PLATFORM_COLORS = {
  YOUTUBE: '#FF0000',
  FACEBOOK: '#1877F2',
  INSTAGRAM: '#E4405F',
  TIKTOK: '#000000',
  THREADS: '#000000',
  BLUESKY: '#0085FF',
  REDDIT: '#FF4500',
  TWITCH: '#9146FF',
  GOOGLE_DRIVE: '#0066DA'
};

function ChannelDisconnectedEmail({ platform, channelName, brandName, reconnectUrl }) {
  const initials = (channelName || platform || '?').charAt(0).toUpperCase();
  const accentColor = PLATFORM_COLORS[platform] || '#0A0A0A';

  return React.createElement(
    EmailLayout,
    { title: `${channelName || platform} đã bị ngắt kết nối`, badge: 'Cần chú ý' },
    React.createElement(
      'div',
      { style: { textAlign: 'center', marginBottom: 28 } },
      React.createElement(
        'div',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            background: accentColor,
            borderRadius: 16
          }
        },
        React.createElement('span', { style: { fontSize: 28, fontWeight: 800, color: '#fff' } }, initials)
      )
    ),
    React.createElement(
      Heading,
      { as: 'h1', style: { margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#0A0A0A', textAlign: 'center', letterSpacing: '-0.5px' } },
      'Kênh của bạn đã ',
      React.createElement('span', { style: { color: '#EF4444' } }, 'bị ngắt kết nối')
    ),
    React.createElement(
      Text,
      { style: { margin: '0 0 32px', fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 } },
      React.createElement('strong', { style: { color: '#374151' } }, channelName || platform),
      brandName ? ` trong thương hiệu "${brandName}"` : '',
      ' vừa bị ngắt kết nối khỏi PubliCast. Các bài đăng đã lên lịch cho kênh này sẽ không được xuất bản cho đến khi bạn kết nối lại.'
    ),
    reconnectUrl
      ? React.createElement(
          Section,
          { style: { textAlign: 'center', marginBottom: 32 } },
          React.createElement(
            Button,
            {
              href: reconnectUrl,
              style: {
                display: 'inline-block',
                background: '#0A0A0A',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 700,
                padding: '14px 36px',
                borderRadius: 12,
                letterSpacing: '-0.2px'
              }
            },
            'Kết nối lại →'
          )
        )
      : null,
    React.createElement(
      'div',
      { style: { background: '#F8F8F7', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' } },
      React.createElement(
        Text,
        { style: { margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.7 } },
        'Nếu bạn chủ động ngắt kết nối kênh này, có thể bỏ qua email này. Nếu không phải bạn, hãy kiểm tra lại quyền truy cập thương hiệu và kết nối lại kênh sớm nhất có thể.'
      )
    )
  );
}

module.exports = { ChannelDisconnectedEmail };
