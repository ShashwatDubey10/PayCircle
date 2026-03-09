const DirectSplit  = require('../models/DirectSplit');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { areFriends } = require('./friendController');

// POST /api/users/me/direct/:friendId
const addDirectSplit = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const meId = req.user._id;
  const { amount, description, paidByMe } = req.body;

  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0)
    return res.status(400).json({ success: false, message: 'Enter a valid amount' });

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
    if (s.payerId._id.toString() === meId.toString()) {
      balance += s.amount / 2;
    } else {
      balance -= s.amount / 2;
    }
  }

  logger.debug('DIRECT', `Fetched ${splits.length} splits`, { meId, friendId });
  res.json({ success: true, splits, balance: Math.round(balance * 100) / 100 });
});

module.exports = { addDirectSplit, getDirectSplits };
