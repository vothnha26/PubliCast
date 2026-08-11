const React = require('react');
const { Heading, Text, Button, Section } = require('@react-email/components');
const { EmailLayout } = require('./components/EmailLayout');

/**
 * Fallback template for notification types that don't have a dedicated
 * component (see ChannelDisconnectedEmail.jsx for an example of a
 * dedicated one). Used by email.service.js's sendNotificationEmail for
 * any notification type not yet migrated to its own template.
 */
function GenericNotificationEmail({ title, message, actionUrl }) {
  return React.createElement(
    EmailLayout,
    { title },
    React.createElement(
      Heading,
      { as: 'h1', style: { margin: '0 0 16px', fontSize: 20, fontWeight: 800, color: '#0A0A0A', textAlign: 'center', letterSpacing: '-0.5px' } },
      title
    ),
    React.createElement(
      Text,
      { style: { margin: '0 0 32px', fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 } },
      message
    ),
    actionUrl
      ? React.createElement(
          Section,
          { style: { textAlign: 'center', marginBottom: 8 } },
          React.createElement(
            Button,
            {
              href: actionUrl,
              style: { display: 'inline-block', background: '#0A0A0A', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '14px 36px', borderRadius: 12, letterSpacing: '-0.2px' }
            },
            'Xem chi tiết →'
          )
        )
      : null
  );
}

module.exports = { GenericNotificationEmail };
