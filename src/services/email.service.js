const transporter = require('../config/mailer');

/**
 * Dispatch templates or custom messages using mailer configuration
 * @param {object} options - Mail options config
 * @param {string} options.to - Recipient email addresses
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Raw text body content
 * @param {string} [options.html] - HTML body payload
 * @returns {Promise<object>} SMTP delivery receipts info
 */
const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || process.env.SMTP_FROM || 'noreply@krossfilmproductions.com',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email dispatched successfully to ${options.to}. MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Email dispatch error to ${options.to}:`, error.message);
    throw error;
  }
};

/**
 * Send a formatted OTP email for email change verification.
 * @param {string} toEmail - Recipient email (current admin email)
 * @param {string} otp - Plain-text 6-digit OTP to include in mail
 * @param {string} newEmail - The new email the admin wants to switch to
 * @returns {Promise<object>} SMTP delivery info
 */
const sendChangeEmailOtp = async (toEmail, otp, newEmail) => {
  const subject = 'Kinetoscope – Email Change OTP Verification';

  const text = `
Your OTP for email address change is: ${otp}

You requested to change your admin email to: ${newEmail}

This OTP is valid for 5 minutes. Do not share it with anyone.

If you did not make this request, please secure your account immediately.

— Kinetoscope Super Admin Panel
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1a1a2e; margin-bottom: 8px;">Email Change Verification</h2>
      <p style="color: #4b5563; font-size: 14px;">You requested to change your admin email address to:</p>
      <p style="font-weight: bold; color: #1a1a2e;">${newEmail}</p>
      <p style="color: #4b5563; font-size: 14px; margin-top: 16px;">Use the OTP below to confirm this change:</p>
      <div style="background: #f3f4f6; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1a1a2e;">${otp}</span>
      </div>
      <p style="color: #9ca3af; font-size: 12px;">This OTP expires in <strong>5 minutes</strong> and can only be used once.</p>
      <p style="color: #9ca3af; font-size: 12px;">If you did not request this change, please secure your account immediately.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">Kinetoscope Super Admin Panel</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};

/**
 * Send OTP email for password change verification.
 * @param {string} toEmail - Current admin email
 * @param {string} otp - Plain-text 6-digit OTP
 * @returns {Promise<object>} SMTP delivery info
 */
const sendChangePasswordOtp = async (toEmail, otp) => {
  const subject = 'Kinetoscope – Password Change OTP Verification';

  const text = `
Your OTP for password change is: ${otp}

This OTP is valid for 5 minutes. Do not share it with anyone.

If you did not request this change, please secure your account immediately.

— Kinetoscope Super Admin Panel
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1a1a2e; margin-bottom: 8px;">Password Change Verification</h2>
      <p style="color: #4b5563; font-size: 14px;">You requested to change your admin account password. Use the OTP below to confirm:</p>
      <div style="background: #f3f4f6; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1a1a2e;">${otp}</span>
      </div>
      <p style="color: #9ca3af; font-size: 12px;">This OTP expires in <strong>5 minutes</strong> and can only be used once.</p>
      <p style="color: #9ca3af; font-size: 12px;">If you did not request this change, please secure your account immediately.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">Kinetoscope Super Admin Panel</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};

module.exports = {
  sendEmail,
  sendChangeEmailOtp,
  sendChangePasswordOtp,
};
