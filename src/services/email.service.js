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

/**
 * Dispatch a welcome email with credentials to onboarding clients
 * @param {string} toEmail - Recipient client email
 * @param {string} clientName - Client's full name
 * @param {string} clientCode - Sequential unique client ID (e.g. KFPL-1001)
 * @param {string} tempPassword - System auto-generated temporary password
 * @param {string} loginUrl - URL route to client portal login page
 * @returns {Promise<object>} SMTP delivery receipts info
 */
const sendWelcomeEmail = async (toEmail, clientName, clientCode, tempPassword, loginUrl) => {
  const subject = 'Welcome to Kinetoscope – Your Client Account Details';

  const text = `
Hello ${clientName},

Welcome to Kinetoscope. An account has been created for you.

Here are your credential details to log in to the Client Portal:
Client Code: ${clientCode}
Email Address: ${toEmail}
Temporary Password: ${tempPassword}

Please log in using the portal link below and update your password immediately:
${loginUrl}

Best regards,
Kinetoscope Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #1a1a2e; margin-bottom: 16px;">Welcome to Kinetoscope</h2>
      <p style="color: #4b5563; font-size: 14px;">Hello <strong>${clientName}</strong>,</p>
      <p style="color: #4b5563; font-size: 14px;">Your client portal account has been configured successfully. Use the credentials below to access your dashboard:</p>
      
      <div style="background: #f8fafc; border-radius: 6px; padding: 20px; border: 1px solid #e2e8f0; margin: 20px 0;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 140px;">Client Code:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: bold;">${clientCode}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Email:</td>
            <td style="padding: 6px 0; color: #0f172a;">${toEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Temporary Password:</td>
            <td style="padding: 6px 0; color: #e11d48; font-family: monospace; font-size: 15px; font-weight: bold;">${tempPassword}</td>
          </tr>
        </table>
      </div>

      <p style="color: #4b5563; font-size: 14px; margin-top: 16px;">Click the button below to sign in:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="background-color: #1e293b; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Login to Client Portal</a>
      </div>

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">For security, we recommend that you change this temporary password immediately after logging in for the first time.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">Kross Film Productions Ltd. (KFPL)</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};

/**
 * Send credentials email for password reset or resend credentials scenarios.
 * @param {string} toEmail - Recipient client email
 * @param {string} clientName - Client's full name
 * @param {string} clientCode - Sequential unique client ID (e.g. KFPL-1001)
 * @param {string} tempPassword - System auto-generated temporary password
 * @param {string} loginUrl - URL route to client portal login page
 * @returns {Promise<object>} SMTP delivery receipts info
 */
const sendCredentialsEmail = async (toEmail, clientName, clientCode, tempPassword, loginUrl) => {
  const subject = 'Kinetoscope – Your Updated Login Credentials';

  const text = `
Hello ${clientName},

Your login credentials for the Kinetoscope Client Portal have been updated by the administrator.

Here are your new login details:
Client Code: ${clientCode}
Email Address: ${toEmail}
New Password: ${tempPassword}

Please log in using the portal link below and change your password immediately:
${loginUrl}

If you did not request this change, please contact your account administrator immediately.

Best regards,
Kinetoscope Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #1a1a2e; margin-bottom: 16px;">Updated Login Credentials</h2>
      <p style="color: #4b5563; font-size: 14px;">Hello <strong>${clientName}</strong>,</p>
      <p style="color: #4b5563; font-size: 14px;">Your login credentials for the Kinetoscope Client Portal have been updated by the administrator. Please use the details below to access your dashboard:</p>
      
      <div style="background: #f8fafc; border-radius: 6px; padding: 20px; border: 1px solid #e2e8f0; margin: 20px 0;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 140px;">Client Code:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: bold;">${clientCode}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Email:</td>
            <td style="padding: 6px 0; color: #0f172a;">${toEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">New Password:</td>
            <td style="padding: 6px 0; color: #e11d48; font-family: monospace; font-size: 15px; font-weight: bold;">${tempPassword}</td>
          </tr>
        </table>
      </div>

      <p style="color: #4b5563; font-size: 14px; margin-top: 16px;">Click the button below to sign in:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="background-color: #1e293b; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Login to Client Portal</a>
      </div>

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">For security, we recommend that you change this password immediately after logging in.</p>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">If you did not request this change, please contact your account administrator immediately.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">Kross Film Productions Ltd. (KFPL)</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};

module.exports = {
  sendEmail,
  sendChangeEmailOtp,
  sendChangePasswordOtp,
  sendWelcomeEmail,
  sendCredentialsEmail,
};
