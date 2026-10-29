const logger = require('../utils/logger');

// Mongoose writes its validation messages for a developer reading a stack
// trace: "Path `notes` (`xxxx…`, length 201) is longer than the maximum
// allowed length (200)." Shown to someone who just typed a long note, that
// reads as a crash — and it quotes their own text back at them. These say the
// same thing in the words the person would use.
const label = (path) => {
  const words = String(path || 'value').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const readable = (e) => {
  const field = label(e.path);
  const p     = e.properties || {};
  switch (e.kind) {
    case 'maxlength': return `${field} must be ${p.maxlength} characters or fewer.`;
    case 'minlength': return `${field} must be at least ${p.minlength} characters.`;
    case 'required':  return `${field} is required.`;
    case 'enum':      return `${field} is not one of the allowed options.`;
    case 'min':       return `${field} must be at least ${p.min}.`;
    case 'max':       return `${field} must be at most ${p.max}.`;
    default:          return `${field} is not valid.`;
  }
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Internal Server Error';

  // A model constraint the controller did not pre-check is the client sending
  // something invalid, not the server breaking. Untranslated, Mongoose's own
  // ValidationError carried no statusCode, so it fell through to 500 and put a
  // raw schema message on screen — a note of 201 characters read as a crash.
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors).map(readable).join(' ');
  }

  // A duplicate key is likewise the client's, not ours.
  if (err.code === 11000) {
    statusCode = 409;
    message = 'That value is already taken.';
  }

  // A malformed id reaching a query is a bad request, not a server fault.
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  // Log 5xx as errors, 4xx as warnings (client errors are expected)
  if (statusCode >= 500) {
    logger.error('ERR', `${statusCode} ${req.method} ${req.originalUrl} — ${message}`, err.stack);
  } else {
    logger.warn('ERR', `${statusCode} ${req.method} ${req.originalUrl} — ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
