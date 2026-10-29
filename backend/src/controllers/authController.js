const crypto       = require('crypto');
const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const Group        = require('../models/Group');
const Expense      = require('../models/Expense');
const Settlement   = require('../models/Settlement');
const DirectSplit  = require('../models/DirectSplit');
const DirectSettle = require('../models/DirectSettle');
const Friendship   = require('../models/Friendship');
const Budget       = require('../models/Budget');
const SplitTag     = require('../models/SplitTag');
const PersonalTransaction = require('../models/PersonalTransaction');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const isValidEmail    = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidPassword = (p) => /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(p);

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// Shape the user exactly like GET /me does. Previously login/register returned
// `{ id }` while /me returned the full document with `_id`, so `user._id` was
// undefined for the whole session after a fresh login — breaking isAdmin, the
// group balance card, expense bubble alignment and the direct-split filters.
const toAuthUser = (doc) => {
  const u = doc.toObject({ versionKey: false });
  delete u.password;
  u.id = u._id; // keep `id` too so any existing consumer keeps working
  return u;
};

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
      const isUsername = !!err.keyPattern?.username;
      const msg = isUsername ? 'Username already taken' : 'Email already registered';
      logger.warn('AUTH', `Register race — duplicate ${isUsername ? 'username' : 'email'}: ${email}`);
      return res.status(409).json({ success: false, message: msg });
    }
    throw err;
  }
  logger.info('AUTH', `User registered: ${user.email}`, { userId: user._id });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: toAuthUser(user),
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  logger.info('AUTH', `Login attempt: ${email}`, { ip: req.ip });

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  const user = await User.findOne({ email: email.toLowerCase() });

  // A deleted account keeps its row so other members' balances still add up, but
  // it must never be usable again. Its password is randomised on deletion too,
  // so this is belt-and-braces rather than the only guard.
  if (!user || user.isVirtual || user.deletedAt) {
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
    user: toAuthUser(user),
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  logger.debug('AUTH', `getMe: ${req.user.email}`, { userId: req.user._id });
  res.json({ success: true, user: req.user });
});

// PATCH /api/auth/me
const updateMe = asyncHandler(async (req, res) => {
  const { upiId } = req.body;
  const updates = {};
  if (upiId !== undefined) updates.upiId = upiId.trim();

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, select: '-password' }
  );

  logger.info('AUTH', `Profile updated: ${user.email}`, { userId: user._id });
  res.json({ success: true, user });
});


// DELETE /api/auth/me
// Google Play requires every app offering account creation to offer account
// deletion as well. This tombstones the account rather than erasing the row:
// balanceService sums over `Group.members`, so dropping a member id silently
// rewrites what everybody else in that group owes. Anything private to this
// user is deleted outright; anything co-owned is kept with the identity
// stripped out of it.
const deleteMe = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const meId = req.user._id;

  if (!password)
    return res.status(400).json({ success: false, message: 'Password is required to delete your account' });

  // `protect` strips the password, so re-read the document to compare against it.
  const user = await User.findById(meId);
  if (!user)
    return res.status(404).json({ success: false, message: 'User not found' });

  if (!(await user.matchPassword(password))) {
    logger.warn('AUTH', 'Account deletion rejected — wrong password', { userId: meId });
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  // ── Private data: nobody else can see any of this, so it goes ─────────────
  await Promise.all([
    PersonalTransaction.deleteMany({ userId: meId }),
    Budget.deleteMany({ userId: meId }),
    SplitTag.deleteMany({ userId: meId }),
    Friendship.deleteMany({ $or: [{ requester: meId }, { recipient: meId }] }),
  ]);

  // ── Personal contacts ─────────────────────────────────────────────────────
  // Visible only to their creator, but they can be members of groups that
  // survive this deletion, so they are tombstoned rather than removed. Hard
  // deletion would orphan Group.members / Expense references and drop them out
  // of the balance map, destroying the money they owed.
  const contacts   = await User.find({ isVirtual: true, createdBy: meId }).select('_id');
  const contactIds = contacts.map(c => c._id);

  if (contactIds.length) {
    await Promise.all([
      // Splits between this user and their own contacts were never visible to
      // anyone else, so there is nobody left to keep them for.
      DirectSplit.deleteMany({
        $or: [
          { payerId: meId,               otherUserId: { $in: contactIds } },
          { payerId: { $in: contactIds }, otherUserId: meId               },
        ],
      }),
      DirectSettle.deleteMany({
        $or: [
          { fromUserId: meId,               toUserId: { $in: contactIds } },
          { fromUserId: { $in: contactIds }, toUserId: meId               },
        ],
      }),
      User.updateMany(
        { _id: { $in: contactIds } },
        { $set: { name: 'Deleted contact', upiId: '', deletedAt: new Date() } }
      ),
    ]);
  }

  // ── Groups this user administers ──────────────────────────────────────────
  // Admin-only actions would otherwise be unreachable forever. Contacts are not
  // eligible successors — they have just been tombstoned and nobody can sign in
  // as one.
  const goneIds = new Set([meId.toString(), ...contactIds.map(c => c.toString())]);
  const adminGroups = await Group.find({ adminId: meId });

  for (const g of adminGroups) {
    const successor = g.members.find(m => !goneIds.has(m.toString()));
    if (successor) {
      g.adminId = successor;
      await g.save();
      logger.info('GROUP', `Admin reassigned after account deletion`, { groupId: g._id, successor });
    } else {
      // No real members left — the group and its ledger were private to this
      // user, so nothing of anyone else's is lost by removing them.
      await Promise.all([
        Expense.deleteMany({ groupId: g._id }),
        Settlement.deleteMany({ groupId: g._id }),
      ]);
      await g.deleteOne();
      logger.info('GROUP', `Group removed with its sole member's account`, { groupId: g._id });
    }
  }

  // ── Tombstone the account ─────────────────────────────────────────────────
  // `email` is uniquely indexed and `username` is sparse-unique. Both real
  // values are released so they can be registered again; the email is replaced
  // with a per-id sentinel rather than unset, because the field is required.
  user.name          = 'Deleted user';
  user.email         = `deleted-${meId}@deleted.invalid`;
  user.password      = crypto.randomBytes(32).toString('hex'); // re-hashed by the pre-save hook
  user.username      = undefined;
  user.phone         = '';
  user.avatar        = '';
  user.upiId         = '';
  user.expoPushToken = null;
  user.deletedAt     = new Date();
  await user.save();

  logger.info('AUTH', 'Account deleted', { userId: meId });
  res.json({ success: true, message: 'Account deleted' });
});

module.exports = { register, login, getMe, updateMe, deleteMe };
