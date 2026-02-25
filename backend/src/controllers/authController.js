const jwt        = require('jsonwebtoken');
const User       = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const isValidEmail    = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidPassword = (p) => /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(p);

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  if (name.trim().length < 2 || name.trim().length > 50)
    return res.status(400).json({ success: false, message: 'Name must be 2–50 characters' });
  if (!isValidEmail(email))
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  if (!isValidPassword(password))
    return res.status(400).json({ success: false, message: 'Password must be 8+ characters and contain both letters and numbers' });

  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ success: false, message: 'Email already registered' });

  const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, walletBalance: user.walletBalance },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  res.json({
    success: true,
    token: generateToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, walletBalance: user.walletBalance },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, getMe };
