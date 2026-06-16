const morgan = require('morgan');

// Custom logging token for response times or custom info if needed
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    // Redact sensitive credentials in logs
    const bodyCopy = { ...req.body };
    if (bodyCopy.password) bodyCopy.password = '***REDACTED***';
    return JSON.stringify(bodyCopy);
  }
  return '';
});

// Configure different log formats based on environment
const devFormat = ':method :url :status :response-time ms - :res[content-length] :body';
const prodFormat = ':remote-addr - :method :url :status :response-time ms - :res[content-length]';

const loggerMiddleware = (env = 'development') => {
  const format = env === 'development' ? devFormat : prodFormat;
  return morgan(format);
};

module.exports = loggerMiddleware;
