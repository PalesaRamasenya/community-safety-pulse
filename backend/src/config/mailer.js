const nodemailer = require('nodemailer');
require('dotenv').config();

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

let transporter = null;

function warnIfNotGmailAddress(user) {
  if (!/@(gmail|googlemail)\.com$/i.test(user)) {
    console.warn(
      `[mailer] GMAIL_USER ("${user}") does not look like a gmail.com/googlemail.com address - ` +
      'double check for typos, Gmail SMTP will reject logins for the wrong domain.'
    );
  }
}

function warnIfNotAppPassword(pass) {
  // Gmail has required a 16-character App Password (not the account password) for SMTP
  // since Google disabled "less secure app access" in May 2022. App Passwords are 16
  // lowercase letters, sometimes displayed with spaces every 4 characters.
  const stripped = pass.replace(/\s+/g, '');
  if (!/^[a-z]{16}$/i.test(stripped)) {
    console.warn(
      '[mailer] GMAIL_PASS does not look like a 16-character Gmail App Password. ' +
      'Gmail no longer accepts a normal account password for SMTP login - generate one at ' +
      'https://myaccount.google.com/apppasswords (requires 2-Step Verification to be enabled) ' +
      'and put that value in GMAIL_PASS instead.'
    );
  }
}

if (GMAIL_USER && GMAIL_PASS) {
  warnIfNotGmailAddress(GMAIL_USER);
  warnIfNotAppPassword(GMAIL_PASS);

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS
    },
    // Bound every stage of the SMTP handshake so a network/credential problem
    // surfaces as a fast, logged error instead of a connection that hangs.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  // Verify credentials/connectivity once at startup so misconfiguration is visible
  // in the logs immediately, rather than only on the first incident submission.
  // This never blocks server startup - it just reports the result asynchronously.
  transporter.verify().then(
    () => console.log('[mailer] SMTP connection verified - email alerts enabled.'),
    (err) => {
      console.error(
        '[mailer] SMTP verification failed - email alerts will not be delivered. ' +
        `code=${err.code || 'unknown'} responseCode=${err.responseCode || 'n/a'} message=${err.message}`
      );
    }
  );
} else {
  console.warn('[mailer] GMAIL_USER or GMAIL_PASS missing from .env - email alerts disabled.');
}

module.exports = transporter;
