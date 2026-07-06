const User = require('../../models/User.model');
const { sendEmail } = require('../../services/email.service');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Send direct emails to one or more clients, agents, or admin-specified addresses
 * POST /api/super-admin/notifications/send-email
 */
const sendDirectEmail = asyncHandler(async (req, res, next) => {
  const { recipientEmails, recipientIds, roles, subject, body } = req.body;

  if (!subject || !body) {
    return next(new AppError('Subject and body are required.', 400));
  }

  const emailsSet = new Set();

  // 1. Process explicit email addresses (string or array, supports comma-separation)
  const addEmail = (emailStr) => {
    if (emailStr && typeof emailStr === 'string') {
      emailStr.split(',').forEach((email) => {
        const cleaned = email.trim().toLowerCase();
        if (cleaned) {
          emailsSet.add(cleaned);
        }
      });
    }
  };

  if (Array.isArray(recipientEmails)) {
    recipientEmails.forEach(addEmail);
  } else if (typeof recipientEmails === 'string' && recipientEmails) {
    addEmail(recipientEmails);
  }

  // 2. Process user IDs (string or array)
  if (Array.isArray(recipientIds) && recipientIds.length > 0) {
    const users = await User.find({ _id: { $in: recipientIds } }, { email: 1 });
    users.forEach((user) => {
      if (user.email) {
        emailsSet.add(user.email.trim().toLowerCase());
      }
    });
  } else if (typeof recipientIds === 'string' && recipientIds) {
    try {
      const user = await User.findById(recipientIds, { email: 1 });
      if (user && user.email) {
        emailsSet.add(user.email.trim().toLowerCase());
      }
    } catch (err) {
      // Ignore cast errors for invalid MongoDB IDs
    }
  }

  // 3. Process roles (e.g. 'client', 'agent')
  if (Array.isArray(roles) && roles.length > 0) {
    const users = await User.find({ role: { $in: roles }, isActive: true }, { email: 1 });
    users.forEach((user) => {
      if (user.email) {
        emailsSet.add(user.email.trim().toLowerCase());
      }
    });
  } else if (typeof roles === 'string' && roles) {
    const users = await User.find({ role: roles, isActive: true }, { email: 1 });
    users.forEach((user) => {
      if (user.email) {
        emailsSet.add(user.email.trim().toLowerCase());
      }
    });
  }

  const targetEmails = Array.from(emailsSet);

  if (targetEmails.length === 0) {
    return next(
      new AppError(
        'No valid recipient emails found. Please provide emails, valid user IDs, or roles.',
        400
      )
    );
  }

  // Premium formatted email body layout
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; font-size: 20px; font-weight: bold;">
        Important Announcement
      </h2>
      <div style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
        ${body}
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.4;">
        This is an authorized administrative notification from the Kinetoscope Super Admin Panel.<br/>
        Kross Film Productions Ltd. (KFPL)
      </p>
    </div>
  `;

  // Dispatch emails concurrently
  const results = await Promise.allSettled(
    targetEmails.map((email) => sendEmail({ to: email, subject, text: body, html }))
  );

  const successfulSends = results.filter((r) => r.status === 'fulfilled').length;
  const failedSends = results.length - successfulSends;

  res.status(200).json({
    success: true,
    message: `Broadcasting completed. ${successfulSends} emails sent successfully.`,
    data: {
      totalRecipientsCount: targetEmails.length,
      successfulSends,
      failedSends,
      recipients: targetEmails,
    },
  });
});

module.exports = {
  sendDirectEmail,
};
