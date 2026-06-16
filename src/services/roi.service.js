/**
 * ROI calculations and scheduler services
 * Will contain logic to compute compound or standard returns, post ledger entries, and cron task executors
 */

/**
 * Calculate standard interest return
 * @param {number} principal - Base investment amount
 * @param {number} rate - Annual interest rate (percentage)
 * @param {number} periodDays - Duration in days
 * @returns {number} Calculated returns
 */
const calculateStandardROI = (principal, rate, periodDays) => {
  // Return placeholder calculations
  const dailyRate = (rate / 100) / 365;
  return Number((principal * dailyRate * periodDays).toFixed(2));
};

module.exports = {
  calculateStandardROI,
};
