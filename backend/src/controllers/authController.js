const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const isValidEmail    = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidPassword = (p) => /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(p);

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, username } = req.body;

  logger.info('AUTH', `Register attempt: ${email}`);

  if (!name || !email || !password || !username)
    return res.status(400).json({ success: false, message: 'Name, username, email, and password are required' });
  if (name.trim().length < 2 || name.trim().length > 50)
    return res.status(400).json({ success: false, message: 'Name must be 2–50 characters' });
  if (!isValidEmail(email))
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  if (!isValidPassword(password))
    return res.status(400).json({ success: false, message: 'Password must be 8+ characters and contain both letters and numbers' });

  const cleanUsername = username.trim().toLowerCase();
  if (!USERNAME_RE.test(cleanUsername))
    return res.status(400).json({ success: false, message: 'Username must be 3–20 chars, letters/numbers/underscore only' });

  if (await User.findOne({ email: email.toLowerCase() })) {
    logger.warn('AUTH', `Register rejected — email already exists: ${email}`);
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  if (await User.findOne({ username: cleanUsername })) {
    logger.warn('AUTH', `Register rejected — username taken: ${cleanUsername}`);
    return res.status(409).json({ success: false, message: 'Username already taken' });
  }

  let user;
  try {
    user = await User.create({ name: name.trim(), email: email.toLowerCase(), password, username: cleanUsername });
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern?.username ? 'Username' : 'Email';
      logger.warn('AUTH', `Register race — duplicate ${field.toLowerCase()}: ${email}`);
      return res.status(409).json({ success: false, message: `${field} already registered` });
    }
    throw err;
  }
  logger.info('AUTH', `User registered: ${user.email}`, { userId: user._id });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, username: user.username || '', walletBalance: user.walletBalance },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  logger.info('AUTH', `Login attempt: ${email}`, { ip: req.ip });

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    logger.warn('AUTH', `Login failed — email not found: ${email}`, { ip: req.ip });
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const passwordMatch = await user.matchPassword(password);
  if (!passwordMatch) {
    logger.warn('AUTH', `Login failed — wrong password: ${email}`, { ip: req.ip });
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  logger.info('AUTH', `Login success: ${user.email}`, { userId: user._id });

  res.json({
    success: true,
    token: generateToken(user._id),
    // username may be absent for legacy users who registered before the field was added
    user: { id: user._id, name: user.name, email: user.email, username: user.username || '', walletBalance: user.walletBalance },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  logger.debug('AUTH', `getMe: ${req.user.email}`, { userId: req.user._id });
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, getMe };
