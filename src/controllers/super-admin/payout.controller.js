const User = require('../../models/User.model');
const RoiPayout = require('../../models/RoiPayout.model');
const AgentCommission = require('../../models/AgentCommission.model');
const ClientProfile = require('../../models/ClientProfile.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Seed mock client return & agent commission payout logs to match screen designs
 */
const seedMockPayouts = async (creatorId) => {
  const roiCount = await RoiPayout.countDocuments();
  const commCount = await AgentCommission.countDocuments();

  if (roiCount === 0 && commCount === 0) {
    // 1. Find or create clients
    let c1 = await User.findOne({ name: 'Rajesh Kumar', role: 'client' });
    let c2 = await User.findOne({ name: 'Priya Sharma', role: 'client' });
    let c3 = await User.findOne({ name: 'Anita Desai', role: 'client' });

    // 2. Find or create agents
    let a1 = await User.findOne({ name: 'Vikram Patel', role: 'agent' });
    let a2 = await User.findOne({ name: 'Neha Gupta', role: 'agent' });
    let a3 = await User.findOne({ name: 'Arjun Singh', role: 'agent' });

    // Fallbacks if not found
    if (!c1) c1 = await User.create({ name: 'Rajesh Kumar', email: 'rajesh@example.com', role: 'client', clientCode: 'KFPL-1001', password: 'password123', isActive: true });
    if (!c2) c2 = await User.create({ name: 'Priya Sharma', email: 'priya@example.com', role: 'client', clientCode: 'KFPL-1002', password: 'password123', isActive: true });
    if (!c3) c3 = await User.create({ name: 'Anita Desai', email: 'anita@example.com', role: 'client', clientCode: 'KFPL-1003', password: 'password123', isActive: true });

    if (!a1) a1 = await User.create({ name: 'Vikram Patel', email: 'vikram.agent@example.com', role: 'agent', clientCode: 'AGT-001', password: 'password123', isActive: true });
    if (!a2) a2 = await User.create({ name: 'Neha Gupta', email: 'neha.agent@example.com', role: 'agent', clientCode: 'AGT-002', password: 'password123', isActive: true });
    if (!a3) a3 = await User.create({ name: 'Arjun Singh', email: 'arjun.agent@example.com', role: 'agent', clientCode: 'AGT-003', password: 'password123', isActive: true });

    // 3. Create ROI payouts (Client returns)
    await RoiPayout.create([
      {
        clientId: c1._id,
        payoutMonth: 'Jan 2025',
        amount: 30000,
        status: 'PAID',
        processedDate: new Date('2025-01-31'),
        paymentMode: 'Bank Transfer',
        transactionRefId: 'TXN-ROI-101'
      },
      {
        clientId: c2._id,
        payoutMonth: 'Jan 2025',
        amount: 24000,
        status: 'PENDING',
        paymentMode: '',
        transactionRefId: ''
      },
      {
        clientId: c3._id,
        payoutMonth: 'Jan 2025',
        amount: 18000,
        status: 'PENDING',
        paymentMode: '',
        transactionRefId: ''
      }
    ]);

    // 4. Create Agent commissions
    await AgentCommission.create([
      {
        agentId: a3._id,
        period: 'Feb 2025',
        date: new Date('2025-02-28'),
        type: 'MONTHLY',
        amount: 33750,
        status: 'PAID',
        paymentMode: 'Bank Transfer',
        transactionRefId: 'TXN-COMM-302',
        remarks: 'Monthly commission'
      },
      {
        agentId: a2._id,
        period: 'Jan 2025',
        date: new Date('2025-01-31'),
        type: 'MONTHLY',
        amount: 33750,
        status: 'PAID',
        paymentMode: 'Bank Transfer',
        transactionRefId: 'TXN-COMM-301',
        remarks: 'Monthly commission'
      },
      {
        agentId: a1._id,
        period: 'Feb 2025',
        date: new Date('2025-02-28'),
        type: 'MONTHLY',
        amount: 33750,
        status: 'PAID',
        paymentMode: 'Bank Transfer',
        transactionRefId: 'TXN-COMM-303',
        remarks: 'Monthly commission'
      }
    ]);

    console.log('[Payout Seeder] Seeded mock client return & agent commission payout logs.');
  }
};

/**
 * Record Payout Details (ROI or Commission)
 * POST /api/super-admin/roi/payouts
 */
const recordPayout = asyncHandler(async (req, res, next) => {
  const { recipientType, recipientId, amount, payoutDate, paymentMode, transactionRefId, commissionType, clientId, period } = req.body;

  if (!recipientType || !recipientId || !amount || !paymentMode || !transactionRefId) {
    return next(new AppError('Please provide recipientType, recipientId, amount, paymentMode, and transactionRefId.', 400));
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return next(new AppError('Amount must be a positive number.', 400));
  }

  // Parse recipient type: 'Client Return (ROI)' / 'client' vs 'Agent Commission' / 'agent'
  const isClient = recipientType.toLowerCase().includes('client') || recipientType.toLowerCase().includes('roi');

  const user = await User.findById(recipientId);
  if (!user) {
    return next(new AppError('Recipient user account not found.', 404));
  }

  const dateObj = payoutDate ? new Date(payoutDate) : new Date();
  // Formatted Month-Year (e.g. "Jul 2026")
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
  const monthStr = formatter.format(dateObj); // "Jul 2026"

  let record;

  if (isClient) {
    if (user.role !== 'client') {
      return next(new AppError('User is not a client.', 400));
    }

    record = await RoiPayout.create({
      clientId: user._id,
      payoutMonth: period || monthStr,
      amount: numericAmount,
      status: 'PAID',
      processedDate: dateObj,
      paymentMode,
      transactionRefId,
    });
  } else {
    if (user.role !== 'agent') {
      return next(new AppError('User is not an agent.', 400));
    }

    // Map Commission Type:
    // 'Monthly Recurring' -> 'MONTHLY'
    // 'One-Time Onboarding' -> 'ONE TIME'
    // 'Special Override' -> 'SPECIAL'
    let dbCommType = 'MONTHLY';
    if (commissionType) {
      const typeLower = commissionType.toLowerCase();
      if (typeLower.includes('one') || typeLower.includes('onboard')) {
        dbCommType = 'ONE TIME';
      } else if (typeLower.includes('special') || typeLower.includes('override')) {
        dbCommType = 'SPECIAL';
      }
    }

    // Determine Period: if ONE TIME and no period passed, default to 'Onboarding'
    let finalPeriod = period || monthStr;
    if (dbCommType === 'ONE TIME' && !period) {
      finalPeriod = 'Onboarding';
    }

    record = await AgentCommission.create({
      agentId: user._id,
      clientId: clientId || undefined,
      period: finalPeriod,
      date: dateObj,
      type: dbCommType,
      amount: numericAmount,
      status: 'PAID',
      paymentMode,
      transactionRefId,
      remarks: 'Commission paid manually',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Payout recorded successfully.',
    data: record,
  });
});

/**
 * Get unified list of payouts (ROI & Commission)
 * GET /api/super-admin/roi/payouts
 */
const getPayouts = asyncHandler(async (req, res, next) => {
  await seedMockPayouts(req.user.id);

  const { status, recipientType, search } = req.query;

  // Fetch client profiles to map their ROI rate
  const profiles = await ClientProfile.find({}, { userId: 1, monthlyRoi: 1 }).lean();
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.userId.toString()] = p.monthlyRoi;
  });

  // 1. Fetch ROI payouts
  const roiQuery = {};
  if (status && status !== 'All') {
    roiQuery.status = status.toUpperCase();
  }
  const roiPayouts = await RoiPayout.find(roiQuery)
    .populate('clientId', 'name email clientCode')
    .lean();

  // 2. Fetch Agent commissions
  const commQuery = {};
  if (status && status !== 'All') {
    commQuery.status = status.toUpperCase();
  }
  const agentCommissions = await AgentCommission.find(commQuery)
    .populate('agentId', 'name email clientCode')
    .populate('clientId', 'name email clientCode')
    .lean();

  // 3. Format & unify lists
  const unified = [];

  // Add ROIs
  roiPayouts.forEach(p => {
    const client = p.clientId || {};
    const roiRate = profileMap[client._id ? client._id.toString() : ''] || 12;
    unified.push({
      _id: p._id,
      recipientId: client._id || null,
      recipientName: client.name || 'Unknown Client',
      recipientCode: client.clientCode || '—',
      recipientType: 'CLIENT',
      type: `ROI (${roiRate}%)`,
      period: p.payoutMonth,
      amount: p.amount,
      paymentMode: p.paymentMode || '—',
      transactionRefId: p.transactionRefId || '—',
      status: p.status,
      paidAt: p.processedDate ? p.processedDate.toISOString().split('T')[0] : '—',
      rawDate: p.processedDate || p.createdAt,
    });
  });

  // Add Commissions
  agentCommissions.forEach(c => {
    const agent = c.agentId || {};
    const client = c.clientId || {};
    const mappedType = c.type === 'MONTHLY' ? 'Comm (monthly)' :
                       c.type === 'ONE TIME' ? 'Comm (one-time)' : 'Comm (override)';
    unified.push({
      _id: c._id,
      recipientId: agent._id || null,
      recipientName: agent.name || 'Unknown Agent',
      recipientCode: agent.clientCode || '—',
      recipientType: 'AGENT',
      type: mappedType,
      period: c.period,
      amount: c.amount,
      paymentMode: c.paymentMode || '—',
      transactionRefId: c.transactionRefId || '—',
      status: c.status,
      paidAt: c.status === 'PAID' ? (c.date || c.createdAt).toISOString().split('T')[0] : '—',
      rawDate: c.date || c.createdAt,
      relatedClientName: client.name || '—',
      relatedClientCode: client.clientCode || '—',
    });
  });

  // Sort unified list by rawDate descending
  unified.sort((a, b) => b.rawDate - a.rawDate);

  // Apply filters
  let filtered = unified;

  if (recipientType && recipientType !== 'All') {
    filtered = filtered.filter(item => item.recipientType.toLowerCase() === recipientType.toLowerCase());
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(item => 
      item.recipientName.toLowerCase().includes(searchLower) ||
      item.recipientCode.toLowerCase().includes(searchLower) ||
      item.transactionRefId.toLowerCase().includes(searchLower) ||
      item.period.toLowerCase().includes(searchLower)
    );
  }

  res.status(200).json({
    success: true,
    count: filtered.length,
    data: filtered,
  });
});

/**
 * Mark a pending payout as PAID
 * PATCH /api/super-admin/roi/payouts/:id/pay
 */
const markPayoutPaid = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { paymentMode, transactionRefId } = req.body;

  if (!paymentMode || !transactionRefId) {
    return next(new AppError('Payment mode and transaction reference ID are required.', 400));
  }

  // 1. Try to find in RoiPayout
  let payout = await RoiPayout.findById(id);
  if (payout) {
    if (payout.status === 'PAID') {
      return next(new AppError('This payout is already marked as PAID.', 400));
    }
    payout.status = 'PAID';
    payout.processedDate = new Date();
    payout.paymentMode = paymentMode;
    payout.transactionRefId = transactionRefId;
    await payout.save();

    return res.status(200).json({
      success: true,
      message: 'Client ROI payout marked as PAID successfully.',
      data: payout,
    });
  }

  // 2. Try to find in AgentCommission
  let commission = await AgentCommission.findById(id);
  if (commission) {
    if (commission.status === 'PAID') {
      return next(new AppError('This commission is already marked as PAID.', 400));
    }
    commission.status = 'PAID';
    commission.date = new Date();
    commission.paymentMode = paymentMode;
    commission.transactionRefId = transactionRefId;
    await commission.save();

    return res.status(200).json({
      success: true,
      message: 'Agent Commission payout marked as PAID successfully.',
      data: commission,
    });
  }

  return next(new AppError('Payout record not found in either ROI payouts or Agent Commissions.', 404));
});

/**
 * Bulk CSV Payout Upload
 * POST /api/super-admin/roi/payouts/bulk
 */
const bulkUploadPayouts = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a CSV file.', 400));
  }

  const csvData = req.file.buffer.toString('utf-8');
  const lines = csvData.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1) {
    return next(new AppError('CSV file is empty or contains no records.', 400));
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  // Find column indices
  const getIndex = (names) => headers.findIndex(h => names.some(name => h.toLowerCase() === name.toLowerCase()));

  const recipientTypeIdx = getIndex(['recipientType', 'type', 'payoutType']);
  const recipientCodeIdx = getIndex(['recipientCode', 'code', 'codeId']);
  const amountIdx = getIndex(['amount', 'amountPaid', 'value']);
  const payoutDateIdx = getIndex(['payoutDate', 'date', 'paidAt']);
  const paymentModeIdx = getIndex(['paymentMode', 'mode']);
  const transactionRefIdIdx = getIndex(['transactionRefId', 'refId', 'referenceId', 'ref']);
  const commissionTypeIdx = getIndex(['commissionType', 'commType']);
  const relatedClientCodeIdx = getIndex(['relatedClientCode', 'clientCode']);
  const periodIdx = getIndex(['period', 'month', 'payoutMonth']);

  if (recipientTypeIdx === -1 || recipientCodeIdx === -1 || amountIdx === -1) {
    return next(new AppError('CSV must contain recipientType, recipientCode (or code), and amount columns.', 400));
  }

  const results = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
    if (row.length < 3) continue;

    const recipientType = row[recipientTypeIdx];
    const recipientCode = row[recipientCodeIdx];
    const amountVal = Number(row[amountIdx]);
    
    if (!recipientType || !recipientCode || isNaN(amountVal) || amountVal <= 0) {
      errors.push(`Row ${i + 1}: Invalid recipient type, code or amount.`);
      continue;
    }

    const payoutDate = payoutDateIdx !== -1 && row[payoutDateIdx] ? new Date(row[payoutDateIdx]) : new Date();
    const paymentMode = paymentModeIdx !== -1 ? row[paymentModeIdx] : 'Bank Transfer';
    const transactionRefId = transactionRefIdIdx !== -1 ? row[transactionRefIdIdx] : 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const commissionType = commissionTypeIdx !== -1 ? row[commissionTypeIdx] : '';
    const relatedClientCode = relatedClientCodeIdx !== -1 ? row[relatedClientCodeIdx] : '';
    const period = periodIdx !== -1 ? row[periodIdx] : '';

    // Find the recipient user
    const user = await User.findOne({ clientCode: recipientCode.toUpperCase() });
    if (!user) {
      errors.push(`Row ${i + 1}: Recipient code ${recipientCode} not found in database.`);
      continue;
    }

    const isClient = recipientType.toLowerCase().includes('client') || recipientType.toLowerCase().includes('roi');

    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
    const monthStr = formatter.format(payoutDate);

    if (isClient) {
      if (user.role !== 'client') {
        errors.push(`Row ${i + 1}: User with code ${recipientCode} is not a client.`);
        continue;
      }

      const pRecord = await RoiPayout.create({
        clientId: user._id,
        payoutMonth: period || monthStr,
        amount: amountVal,
        status: 'PAID',
        processedDate: payoutDate,
        paymentMode,
        transactionRefId,
      });
      results.push(pRecord);
    } else {
      if (user.role !== 'agent') {
        errors.push(`Row ${i + 1}: User with code ${recipientCode} is not an agent.`);
        continue;
      }

      let dbCommType = 'MONTHLY';
      if (commissionType) {
        const typeLower = commissionType.toLowerCase();
        if (typeLower.includes('one') || typeLower.includes('onboard')) {
          dbCommType = 'ONE TIME';
        } else if (typeLower.includes('special') || typeLower.includes('override')) {
          dbCommType = 'SPECIAL';
        }
      }

      let finalPeriod = period || monthStr;
      if (dbCommType === 'ONE TIME' && !period) {
        finalPeriod = 'Onboarding';
      }

      let relatedClientUser = null;
      if (relatedClientCode) {
        relatedClientUser = await User.findOne({ clientCode: relatedClientCode.toUpperCase(), role: 'client' });
      }

      const cRecord = await AgentCommission.create({
        agentId: user._id,
        clientId: relatedClientUser ? relatedClientUser._id : undefined,
        period: finalPeriod,
        date: payoutDate,
        type: dbCommType,
        amount: amountVal,
        status: 'PAID',
        paymentMode,
        transactionRefId,
        remarks: 'Bulk uploaded payout',
      });
      results.push(cRecord);
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk processing complete. Successfully recorded ${results.length} payouts.`,
    processedCount: results.length,
    skippedCount: errors.length,
    errors,
  });
});

module.exports = {
  recordPayout,
  getPayouts,
  markPayoutPaid,
  bulkUploadPayouts,
};
