const nodemailer = require('nodemailer');

/**
 * Mailer transport configuration.
 * Uses Gmail credentials (EMAIL_USER / EMAIL_PASS) when SMTP host is not configured.
 */
const isGmail = !process.env.SMTP_HOST && process.env.EMAIL_USER;

const transporter = isGmail
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

// Verify mailer configuration (async checking, does not block server bootstrap)
transporter.verify((error, success) => {
  if (error) {
    console.warn(`SMTP Mailer verification failed: ${error.message}. Mails may not send successfully.`);
  } else {
    console.log('SMTP Mailer configuration verified successfully.');
  }
});

module.exports = transporter;
