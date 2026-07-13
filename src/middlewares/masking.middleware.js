const { maskResponseData } = require('../utils/fieldMasking');

/**
 * Express middleware that intercepts API responses and applies role-based field masking/hiding rules.
 */
const maskingMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    // Only mask success responses. Do not alter error logs or error response messages.
    if (body && body.success !== false) {
      try {
        // Perform a deep copy to avoid mutating mongoose document cache
        const clonedBody = JSON.parse(JSON.stringify(body));
        
        // Sanitize using fieldMasking utility
        const sanitizedBody = maskResponseData(clonedBody, req.user);
        
        return originalJson.call(this, sanitizedBody);
      } catch (err) {
        console.error('[Response Masking Middleware Error]:', err.message);
      }
    }
    return originalJson.call(this, body);
  };

  next();
};

module.exports = maskingMiddleware;
