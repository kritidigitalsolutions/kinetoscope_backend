/**
 * Wraps async functions to catch errors and forward them to the global error handler
 * @param {Function} fn - Async express route/middleware function
 * @returns {Function} Express middleware function
 */
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
