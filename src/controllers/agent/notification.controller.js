const User = require('../../models/User.model');
const { sendEmail } = require('../../services/email.service');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { ROLES } = require('../../constants/roles');

/**
 * Agent sends a notification email to their assigned Client(s) or Super Admin
 * POST /api/agent/notifications/send-email
 */
const sendAgentNotificationEmail = asyncHandler(async (req, res, next) => {
  const { recipientEmails, recipientIds, allClients, toAdmin, subject, body } = req.body;

  if (!subject || !body) {
    return next(new AppError('Subject and body are required.', 400));
  }

  const emailsSet = new Set();
  let targetLabel = '';

  if (toAdmin === true) {
    // 1. Send to all active Super Admins
    const admins = await User.find({ role: ROLES.SUPER_ADMIN, isActive: true }, { email: 1 });
    admins.forEach((admin) => {
      if (admin.email) {
        emailsSet.add(admin.email.trim().toLowerCase());
      }
    });
    targetLabel = 'Super Admins';
  } else {
    // 2. Target assigned clients
    if (allClients === true) {
      // Find all active clients assigned to this agent
      const clients = await User.find(
        { role: ROLES.CLIENT, assignedAgent: req.user._id, isActive: true },
        { email: 1 }
      );
      clients.forEach((c) => {
        if (c.email) {
          emailsSet.add(c.email.trim().toLowerCase());
        }
      });
      targetLabel = 'All Assigned Clients';
    } else {
      // Resolve client emails from provided emails or IDs, enforcing that they are assigned to this agent
      const clientQuery = {
        role: ROLES.CLIENT,
        assignedAgent: req.user._id,
        isActive: true,
      };

      const filterIds = [];
      const filterEmails = [];

      // Collect IDs
      if (Array.isArray(recipientIds)) {
        recipientIds.forEach((id) => {
          if (id && typeof id === 'string') filterIds.push(id);
        });
      } else if (typeof recipientIds === 'string' && recipientIds) {
        filterIds.push(recipientIds);
      }

      // Collect emails (support comma-separation)
      const parseEmail = (emailStr) => {
        if (emailStr && typeof emailStr === 'string') {
          emailStr.split(',').forEach((email) => {
            const cleaned = email.trim().toLowerCase();
            if (cleaned) {
              filterEmails.push(cleaned);
            }
          });
        }
      };

      if (Array.isArray(recipientEmails)) {
        recipientEmails.forEach(parseEmail);
      } else if (typeof recipientEmails === 'string' && recipientEmails) {
        parseEmail(recipientEmails);
      }

      // Construct query matching either the emails or user IDs
      const matches = [];
      if (filterIds.length > 0) {
        matches.push({ _id: { $in: filterIds } });
      }
      if (filterEmails.length > 0) {
        matches.push({ email: { $in: filterEmails } });
      }

      if (matches.length > 0) {
        clientQuery.$or = matches;
        const clients = await User.find(clientQuery, { email: 1 });
        clients.forEach((c) => {
          if (c.email) {
            emailsSet.add(c.email.trim().toLowerCase());
          }
        });
      }
      targetLabel = 'Selected Clients';
    }
  }

  const targetEmails = Array.from(emailsSet);

  if (targetEmails.length === 0) {
    return next(
      new AppError(
        'No valid assigned client recipients found. Ensure the clients are assigned to you and active.',
        400
      )
    );
  }

  // Premium formatted email layout for agent messages
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; font-size: 18px; font-weight: bold;">
        Message from Agent: ${req.user.name}
      </h2>
      <div style="background: #f8fafc; border-radius: 6px; padding: 12px 16px; border-left: 4px solid #10b981; margin-bottom: 20px;">
        <span style="font-size: 13px; color: #64748b; font-weight: bold;">Sender Agent:</span><br/>
        <strong style="color: #1e293b;">${req.user.name}</strong> (${req.user.email})
      </div>
      <div style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
        ${body}
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">
        Sent via Kinetoscope Agent Portal
      </p>
    </div>
  `;

  // Send emails
  const results = await Promise.allSettled(
    targetEmails.map((email) =>
      sendEmail({
        to: email,
        subject: `[Agent Portal Message] ${subject}`,
        text: body,
        html,
      })
    )
  );

  const successfulSends = results.filter((r) => r.status === 'fulfilled').length;
  const failedSends = results.length - successfulSends;

  res.status(200).json({
    success: true,
    message: `Message sent successfully to ${targetLabel}.`,
    data: {
      totalRecipientsCount: targetEmails.length,
      successfulSends,
      failedSends,
      recipients: targetEmails,
    },
  });
});

module.exports = {
  sendAgentNotificationEmail,
};
