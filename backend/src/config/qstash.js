const { Client, Receiver } = require('@upstash/qstash');

// devMode spins up a local QStash CLI dev server (no public tunnel, no real
// account needed) — see fundamentals/local-development.md in the qstash skill.
// Toggle explicitly via QSTASH_DEV so production never accidentally uses it.
const devMode = process.env.QSTASH_DEV === 'true';

const qstashClient = devMode
  ? new Client({ devMode: true })
  : new Client({ token: process.env.QSTASH_TOKEN });

const qstashReceiver = devMode
  ? new Receiver({ devMode: true })
  : new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY
    });

module.exports = { qstashClient, qstashReceiver, devMode };
