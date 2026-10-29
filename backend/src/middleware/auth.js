const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('AUTH', `No token — ${req.method} ${req.path}`, { ip: req.ip });
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    logger.warn('AUTH', `Token invalid — ${err.message}`, { path: req.path, ip: req.ip });
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }

  req.user = await User.findById(decoded.id).select('-password');

  if (!req.user) {
    logger.warn('AUTH', `Token valid but user not found`, { userId: decoded.id });
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  // Tokens live for 7 days, so a deleted account would otherwise keep working
  // for a week after deletion. The row survives for other members' balances,
  // but it must stop authenticating immediately.
  if (req.user.deletedAt) {
    logger.warn('AUTH', `Token for deleted account`, { userId: decoded.id });
    return res.status(401).json({ success: false, message: 'This account has been deleted' });
  }

  logger.debug('AUTH', `Authenticated: ${req.user.email}`, { userId: req.user._id, path: req.path });
  next();
};

module.exports = { protect };
