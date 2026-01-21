const logger = require('../config/logger');

/**
 * Global Error Handling Middleware
 * Catch all errors and return a clean JSON response
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error(`❌ Error: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Determine status code
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Log to winston if it exists
  if (logger && typeof logger.error === 'function') {
    logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
      stack: err.stack,
      statusCode: statusCode
    });
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

module.exports = errorHandler;
