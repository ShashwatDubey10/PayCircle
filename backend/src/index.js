const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const dotenv   = require('dotenv');

const connectDB    = require('./config/db');
const logger       = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes   = require('./routes/auth');
const groupRoutes  = require('./routes/groups');
const userRoutes   = require('./routes/users');

dotenv.config();
connectDB();

const app = express();

// ─── Security + parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// ─── HTTP request/response logger ─────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();

  // Redact sensitive fields before logging the request body
  const bodyLog = (() => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return '';
    if (!req.body || !Object.keys(req.body).length)     return '';
    const safe = { ...req.body };
    ['password', 'currentPassword', 'newPassword', 'confirmPassword'].forEach(
      (k) => { if (safe[k]) safe[k] = '[REDACTED]'; }
    );
    return JSON.stringify(safe);
  })();

  logger.http('HTTP', `→ ${req.method} ${req.originalUrl}${bodyLog ? `  body=${bodyLog}` : ''}`, {
    ip: req.ip || req.socket?.remoteAddress,
  });

  // Intercept res.json to log the response status + timing
  const origJson = res.json.bind(res);
  res.json = function (payload) {
    const ms = Date.now() - start;
    const ok = res.statusCode < 400;
    const tag = ok ? 'HTTP' : 'HTTP';
    if (ok) {
      logger.http(tag, `← ${res.statusCode} ${req.method} ${req.originalUrl}  ${ms}ms`);
    } else {
      logger.warn(tag, `← ${res.statusCode} ${req.method} ${req.originalUrl}  ${ms}ms`, {
        message: payload?.message,
      });
    }
    return origJson(payload);
  };

  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ success: true, status: 'PayCircle API is running', version: '1.0.0' })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users',  userRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn('HTTP', `404 — route not found: ${req.originalUrl}`);
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info('SERVER', `PayCircle API started`);
  logger.info('SERVER', `Mode: ${process.env.NODE_ENV || 'development'}  |  Port: ${PORT}`);
  logger.info('SERVER', `Health: http://localhost:${PORT}/health`);
});
