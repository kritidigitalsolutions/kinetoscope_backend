const User = require('../../models/User.model');
const { sendEmail } = require('../../services/email.service');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { ROLES } = require('../../constants/roles');

/**
 * Client sends a notification email to their assigned Agent or Super Admin
 * POST /api/client/notifications/send-email
 */
const sendClientNotificationEmail = asyncHandler(async (req, res, next) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return next(new AppError('Recipient target (to), subject, and body are required.', 400));
  }

  if (!['agent', 'admin'].includes(to)) {
    return next(new AppError("Recipient target (to) must be either 'agent' or 'admin'.", 400));
  }

  let recipientEmails = [];
  let targetLabel = '';

  if (to === 'agent') {
    if (!req.user.assignedAgent) {
      return next(new AppError('You do not have an assigned agent to contact.', 400));
    }

    const agent = await User.findById(req.user.assignedAgent);
    if (!agent || !agent.email || !agent.isActive) {
      return next(new AppError('Your assigned agent is currently unavailable.', 404));
    }

    recipientEmails.push(agent.email);
    targetLabel = `Assigned Agent (${agent.name})`;
  } else if (to === 'admin') {
    const admins = await User.find({ role: ROLES.SUPER_ADMIN, isActive: true }, { email: 1 });
    recipientEmails = admins.map((admin) => admin.email).filter(Boolean);

    if (recipientEmails.length === 0) {
      return next(new AppError('Super Admin contact details are not available.', 404));
    }
    targetLabel = 'Super Admins';
  }

  // premium formatted email layout for client messages
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; font-size: 18px; font-weight: bold;">
        Message from Client: ${req.user.name} (${req.user.clientCode || 'No Code'})
      </h2>
      <div style="background: #f8fafc; border-radius: 6px; padding: 12px 16px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
        <span style="font-size: 13px; color: #64748b; font-weight: bold;">From Client:</span><br/>
        <strong style="color: #1e293b;">${req.user.name}</strong> (${req.user.email})
      </div>
      <div style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
        ${body}
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">
        Sent via Kinetoscope Client Portal
      </p>
    </div>
  `;

  // Dispatch email
  await Promise.allSettled(
    recipientEmails.map((email) =>
      sendEmail({
        to: email,
        subject: `[Client Portal Message] ${subject}`,
        text: body,
        html,
      })
    )
  );

  res.status(200).json({
    success: true,
    message: `Message sent successfully to ${targetLabel}.`,
  });
});

module.exports = {
  sendClientNotificationEmail,
};
