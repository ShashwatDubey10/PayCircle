const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log 5xx as errors, 4xx as warnings (client errors are expected)
  if (statusCode >= 500) {
    logger.error('ERR', `${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`, err.stack);
  } else {
    logger.warn('ERR', `${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
