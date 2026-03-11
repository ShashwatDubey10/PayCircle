const mongoose     = require('mongoose');
const DirectSplit  = require('../models/DirectSplit');
const DirectSettle = require('../models/DirectSettle');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { areFriends } = require('./friendController');

// POST /api/users/me/direct/:friendId
const addDirectSplit = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const meId = req.user._id;
  const { amount, description, paidByMe } = req.body;

  if (!mongoose.Types.ObjectId.isValid(friendId))
    return res.status(400).json({ success: false, message: 'Invalid friendId' });

  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0)
    return res.status(400).json({ success: false, message: 'Enter a valid amount' });

  if (!Object.prototype.hasOwnProperty.call(req.body, 'paidByMe') || typeof paidByMe !== 'boolean' && paidByMe !== 'true' && paidByMe !== 'false')
    return res.status(400).json({ success: false, message: 'paidByMe (boolean) is required' });

  if (!(await areFriends(meId, friendId)))
    return res.status(403).json({ success: false, message: 'User must be a friend to track splits' });

  // Normalize to boolean — body values arrive as JSON but can be string "false" from some clients
  const isPaidByMe = paidByMe === true || paidByMe === 'true';
  const payer = isPaidByMe ? meId : friendId;
  const other = isPaidByMe ? friendId : meId;

  const split = await DirectSplit.create({
    payerId:     payer,
    otherUserId: other,
    amount:      amt,
    description: (description || '').trim(),
    date:        new Date(),
  });

  await split.populate([
    { path: 'payerId',     select: 'name username' },
    { path: 'otherUserId', select: 'name username' },
  ]);

  logger.info('DIRECT', `Split ₹${amt}`, { splitId: split._id, payer, other });
  res.status(201).json({ success: true, split });
});

// GET /api/users/me/direct/:friendId
const getDirectSplits = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const meId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(friendId))
    return res.status(400).json({ success: false, message: 'Invalid friendId' });

  if (!(await areFriends(meId, friendId)))
    return res.status(403).json({ success: false, message: 'User must be a friend' });

  const splits = await DirectSplit.find({
    $or: [
      { payerId: meId,      otherUserId: friendId },
      { payerId: friendId,  otherUserId: meId     },
    ],
  })
    .sort({ date: 1 })
    .populate('payerId',     'name username')
    .populate('otherUserId', 'name username');

  // Positive = friend owes me; negative = I owe friend
  let balance = 0;
  for (const s of splits) {
    const payerIdStr = s.payerId?._id?.toString() ?? s.payerId?.toString();
    if (!payerIdStr) continue; // skip if payer was deleted
    if (payerIdStr === meId.toString()) {
      balance += s.amount / 2;
    } else {
      balance -= s.amount / 2;
    }
  }

  // Add confirmed direct settlements to balance
  const settles = await DirectSettle.find({
    status: 'confirmed',
    $or: [
      { fromUserId: meId,     toUserId: friendId },
      { fromUserId: friendId, toUserId: meId     },
    ],
  });
  for (const st of settles) {
    const fromStr = st.fromUserId?.toString();
    if (fromStr === meId.toString()) {
      balance += st.amount;   // I paid the debt → I owe less
    } else {
      balance -= st.amount;   // Friend paid me → I'm owed less
    }
  }

  // Fetch pending settle for this pair
  const pendingSettle = await DirectSettle.findOne({
    status: 'pending',
    $or: [
      { fromUserId: meId,     toUserId: friendId },
      { fromUserId: friendId, toUserId: meId     },
    ],
  }).populate('fromUserId', 'name username')
    .populate('toUserId',   'name username');

  logger.debug('DIRECT', `Fetched ${splits.length} splits`, { meId, friendId });
  res.json({
    success: true,
    splits,
    balance: Math.round(balance * 100) / 100,
    pendingSettle: pendingSettle || null,
  });
});

// GET /api/users/me/direct
const getAllDirectSplits = asyncHandler(async (req, res) => {
  const meId = req.user._id;

  const splits = await DirectSplit.find({
    $or: [
      { payerId:     meId },
      { otherUserId: meId },
    ],
  })
    .sort({ date: -1 })
    .populate('payerId',     'name username')
    .populate('otherUserId', 'name username');

  logger.debug('DIRECT', `Fetched all ${splits.length} direct splits`, { meId });
  res.json({ success: true, splits });
});

// POST /api/users/me/direct/:friendId/settle
const requestSettle = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const meId = req.user._id;

  if (!(await areFriends(meId, friendId)))
    return res.status(403).json({ success: false, message: 'Must be friends' });

  // Check no pending request already exists between this pair
  const existing = await DirectSettle.findOne({
    status: 'pending',
    $or: [
      { fromUserId: meId,     toUserId: friendId },
      { fromUserId: friendId, toUserId: meId     },
    ],
  });
  if (existing)
    return res.status(409).json({ success: false, message: 'A settle request is already pending' });

  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0)
    return res.status(400).json({ success: false, message: 'Valid amount required' });

  const settle = await DirectSettle.create({
    fromUserId: meId,
    toUserId:   friendId,
    amount:     amt,
  });
  await settle.populate([
    { path: 'fromUserId', select: 'name username' },
    { path: 'toUserId',   select: 'name username' },
  ]);

  logger.info('DIRECT', `Settle request ₹${amt}`, { from: meId, to: friendId });
  res.status(201).json({ success: true, pendingSettle: settle });
});

// PUT /api/users/me/direct/:friendId/settle/:requestId/confirm
const confirmSettle = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const meId = req.user._id;

  const settle = await DirectSettle.findById(requestId);
  if (!settle)
    return res.status(404).json({ success: false, message: 'Settle request not found' });

  // Only the creditor (toUserId) can confirm
  if (settle.toUserId.toString() !== meId.toString())
    return res.status(403).json({ success: false, message: 'Only the recipient can confirm' });

  if (settle.status === 'confirmed')
    return res.status(400).json({ success: false, message: 'Already confirmed' });

  settle.status      = 'confirmed';
  settle.confirmedAt = new Date();
  await settle.save();

  logger.info('DIRECT', `Settle confirmed ₹${settle.amount}`, { requestId, by: meId });
  res.json({ success: true, settle });
});

module.exports = { addDirectSplit, getDirectSplits, getAllDirectSplits, requestSettle, confirmSettle };
