const clientReportingService = require('../../services/client-reporting.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

/**
 * Get managed clients list with pagination, search, and filters.
 * GET /api/super-admin/clients/manage
 */
const getManageClients = asyncHandler(async (req, res, next) => {
  const { search, status, tier, residencyStatus, page = 1, limit = 10 } = req.query;

  const { clients, total } = await clientReportingService.getManageClientsData({
    search,
    status,
    tier,
    residencyStatus,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    message: 'Clients retrieved successfully',
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: {
      clients,
    },
  });
});

/**
 * Export managed clients as CSV file.
 * GET /api/super-admin/clients/manage/export
 */
const exportClientsCSV = asyncHandler(async (req, res, next) => {
  const { search, status, tier, residencyStatus } = req.query;

  const { clients } = await clientReportingService.getManageClientsData({
    search,
    status,
    tier,
    residencyStatus,
    bypassPagination: true,
  });

  // Format dates and percentages for export presentation
  const formattedData = clients.map(client => ({
    ...client,
    joinDate: client.joinDate ? new Date(client.joinDate).toISOString().split('T')[0] : '',
    contractEndDate: client.contractEndDate ? new Date(client.contractEndDate).toISOString().split('T')[0] : '',
    totalInvestment: client.totalInvestment.toFixed(2),
    roiPercentage: `${client.roiPercentage}%`,
    monthlyRoi: `${client.monthlyRoi}%`,
  }));

  const headers = [
    { label: 'Client ID', key: 'clientId' },
    { label: 'Join Date', key: 'joinDate' },
    { label: 'Contract End Date', key: 'contractEndDate' },
    { label: 'Client Name', key: 'clientName' },
    { label: 'Email', key: 'email' },
    { label: 'Total Investment', key: 'totalInvestment' },
    { label: 'ROI %', key: 'roiPercentage' },
    { label: 'Monthly ROI % Allocated', key: 'monthlyRoi' },
    { label: 'Tier', key: 'tier' },
    { label: 'Assigned Agent', key: 'assignedAgent' },
    { label: 'Agent Commission', key: 'agentCommission' },
    { label: 'Risk Profile', key: 'riskProfile' },
    { label: 'Status', key: 'status' },
  ];

  // Manual escaping logic for RFC 4180 compatibility
  const escapeField = (val) => {
    if (val === null || val === undefined) return '';
    let stringVal = String(val);
    stringVal = stringVal.replace(/"/g, '""');
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
      return `"${stringVal}"`;
    }
    return stringVal;
  };

  const csvRows = [];
  csvRows.push(headers.map(h => escapeField(h.label)).join(','));

  for (const row of formattedData) {
    const rowValues = headers.map(h => row[h.key]);
    csvRows.push(rowValues.map(escapeField).join(','));
  }

  const csvContent = csvRows.join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=clients-export.csv');
  return res.status(200).send(csvContent);
});

module.exports = {
  getManageClients,
  exportClientsCSV,
};
