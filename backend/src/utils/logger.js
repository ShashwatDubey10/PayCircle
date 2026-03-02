/**
 * Lightweight structured logger — no external dependencies.
 * Outputs colorized, timestamped lines to stdout / stderr.
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info ('SERVER', 'Started on port 5000');
 *   logger.warn ('AUTH',   'Invalid token', { ip: '...' });
 *   logger.error('DB',     'Connection failed', err.message);
 *   logger.debug('CTRL',   'request body', req.body);   // silenced in production
 *   logger.http ('HTTP',   '→ POST /api/auth/login');
 */

const IS_PROD = process.env.NODE_ENV === 'production';

// ANSI escape helpers
const C = {
  reset:   '\x1b[0m',
  dim:     '\x1b[2m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  gray:    '\x1b[90m',
};

function pad(str, len) {
  return String(str).padEnd(len);
}

function timestamp() {
  // "2026-03-02 14:35:22.417"
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function serializeMeta(meta) {
  if (meta === undefined) return '';
  if (meta instanceof Error) return meta.stack || meta.message;
  if (typeof meta === 'object') return JSON.stringify(meta);
  return String(meta);
}

function write(stream, levelColor, levelLabel, tag, message, meta) {
  const ts   = `${C.dim}${timestamp()}${C.reset}`;
  const lvl  = `${levelColor}${pad(levelLabel, 5)}${C.reset}`;
  const mod  = `${C.gray}[${pad(tag, 7)}]${C.reset}`;
  const msg  = message;
  const extra = meta !== undefined
    ? `  ${C.dim}${serializeMeta(meta)}${C.reset}`
    : '';

  stream.write(`${ts} ${lvl} ${mod} ${msg}${extra}\n`);
}

const logger = {
  /** General informational events */
  info(tag, message, meta) {
    write(process.stdout, C.cyan, 'INFO', tag, message, meta);
  },

  /** Warnings — unexpected but non-fatal */
  warn(tag, message, meta) {
    write(process.stdout, C.yellow, 'WARN', tag, message, meta);
  },

  /** Errors — something failed */
  error(tag, message, meta) {
    write(process.stderr, C.red, 'ERROR', tag, message, meta);
  },

  /** Debug — verbose, dev-only (silenced in production) */
  debug(tag, message, meta) {
    if (!IS_PROD) write(process.stdout, C.gray, 'DEBUG', tag, message, meta);
  },

  /** HTTP request/response lines */
  http(tag, message, meta) {
    write(process.stdout, C.green, 'HTTP', tag, message, meta);
  },
};

module.exports = logger;
