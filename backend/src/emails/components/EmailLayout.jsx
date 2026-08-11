const React = require('react');
const {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Row,
  Column
} = require('@react-email/components');

const BRAND_LOGO_SVG = React.createElement(
  'svg',
  { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' },
  React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
  React.createElement('path', { d: 'M11 11h2' }),
  React.createElement('rect', { width: 18, height: 11, x: 3, y: 11, rx: 2 })
);

/**
 * Shared chrome (header + footer) for every transactional email — mirrors
 * the header/footer markup previously duplicated inline across
 * _buildInvitationHtml and _buildNotificationHtml in email.service.js.
 */
function EmailLayout({ title, badge, children }) {
  return React.createElement(
    Html,
    { lang: 'vi' },
    React.createElement(Head, null, React.createElement('title', null, title)),
    React.createElement(
      Body,
      { style: { margin: 0, padding: 0, background: '#F8F8F7', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" } },
      React.createElement(
        Container,
        { style: { background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 480, margin: '40px auto' } },
        React.createElement(
          Section,
          { style: { background: '#2D1D35', padding: 32, textAlign: 'center' } },
          React.createElement(
            Row,
            null,
            React.createElement(
              Column,
              { align: 'center' },
              React.createElement(
                'div',
                { style: { display: 'inline-flex', alignItems: 'center', gap: 10 } },
                BRAND_LOGO_SVG,
                React.createElement('span', { style: { fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' } }, 'PubliCast')
              )
            )
          ),
          badge
            ? React.createElement(
                'div',
                { style: { marginTop: 10, display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 999, letterSpacing: 1, textTransform: 'uppercase' } },
                badge
              )
            : null
        ),
        React.createElement(Section, { style: { padding: '40px 40px 32px' } }, children),
        React.createElement(
          Section,
          { style: { background: '#F8F8F7', padding: '20px 40px', textAlign: 'center', borderTop: '1px solid #F3F4F6' } },
          React.createElement(Text, { style: { margin: 0, fontSize: 11, color: '#9CA3AF' } }, '© 2026 PubliCast · Nền tảng quản lý mạng xã hội đa kênh')
        )
      )
    )
  );
}

module.exports = { EmailLayout };
