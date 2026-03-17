const mongoose     = require('mongoose');
const DirectSplit  = require('../models/DirectSplit');
const DirectSettle = require('../models/DirectSettle');
const Group        = require('../models/Group');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { areFriends }            = require('./friendController');
const { calculateGroupBalances } = require('../services/balanceService');

// POST /api/users/me/direct/:friendId
const addDirectSplit = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const meId = req.user._id;
  const { amount, description, paidByMe, myShare } = req.body;

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

  let payerShare = null;
  if (myShare !== undefined && myShare !== null) {
    const ps = parseFloat(myShare);
    if (!isNaN(ps) && ps > 0 && ps < amt) {
      payerShare = isPaidByMe ? ps : amt - ps;
    }
  }

  const split = await DirectSplit.create({
    payerId:     payer,
    otherUserId: other,
    amount:      amt,
    description: (description || '').trim(),
    payerShare,
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
    const theirShare = s.amount - (s.payerShare ?? s.amount / 2);
    if (payerIdStr === meId.toString()) {
      balance += theirShare;
    } else {
      balance -= theirShare;
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

  // Validate friendId format before any DB call
  if (!mongoose.Types.ObjectId.isValid(friendId))
    return res.status(400).json({ success: false, message: 'Invalid friendId' });

  if (!(await areFriends(meId, friendId)))
    return res.status(403).json({ success: false, message: 'Must be friends' });

  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0)
    return res.status(400).json({ success: false, message: 'Valid amount required' });

  // Atomically ensure only one pending record exists per pair.
  // findOneAndUpdate with upsert will insert only if no matching doc exists;
  // if a pending doc already exists it returns the existing doc without inserting.
  const result = await DirectSettle.findOneAndUpdate(
    {
      status: 'pending',
      $or: [
        { fromUserId: meId,     toUserId: friendId },
        { fromUserId: friendId, toUserId: meId     },
      ],
    },
    {
      $setOnInsert: {
        fromUserId: meId,
        toUserId:   friendId,
        amount:     amt,
        status:     'pending',
      },
    },
    { upsert: true, new: false } // new:false → returns original (null if inserted)
  );

  // If result is non-null a pre-existing pending doc was found — conflict.
  if (result !== null)
    return res.status(409).json({ success: false, message: 'A settle request is already pending' });

  // Fetch the newly inserted doc to populate and return it
  const settle = await DirectSettle.findOne({
    fromUserId: meId,
    toUserId:   friendId,
    status:     'pending',
  })
    .populate('fromUserId', 'name username')
    .populate('toUserId',   'name username');

  logger.info('DIRECT', `Settle request ₹${amt}`, { from: meId, to: friendId });
  res.status(201).json({ success: true, pendingSettle: settle });
});

// PUT /api/users/me/direct/:friendId/settle/:requestId/confirm
const confirmSettle = asyncHandler(async (req, res) => {
  const { requestId, friendId } = req.params;
  const meId = req.user._id;

  // Validate both IDs before hitting the DB
  if (!mongoose.Types.ObjectId.isValid(requestId))
    return res.status(400).json({ success: false, message: 'Invalid requestId' });
  if (!mongoose.Types.ObjectId.isValid(friendId))
    return res.status(400).json({ success: false, message: 'Invalid friendId' });

  // Fetch the settle doc first so we can validate ownership
  const settle = await DirectSettle.findById(requestId);
  if (!settle)
    return res.status(404).json({ success: false, message: 'Settle request not found' });

  // Ensure the document belongs to this friend pair and that the authenticated
  // user is the creditor (toUserId) — prevents cross-pair auth bypass.
  if (
    !settle.toUserId.equals(meId) ||
    !settle.fromUserId.equals(friendId)
  ) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Atomically flip status to 'confirmed' only if it is still 'pending'.
  // This prevents two concurrent requests from both succeeding.
  const confirmed = await DirectSettle.findOneAndUpdate(
    { _id: settle._id, status: 'pending' },
    { $set: { status: 'confirmed', confirmedAt: new Date() } },
    { new: true }
  );

  if (!confirmed)
    return res.status(400).json({ success: false, message: 'Already confirmed' });

  logger.info('DIRECT', `Settle confirmed ₹${confirmed.amount}`, { requestId, by: meId });
  res.json({ success: true, settle: confirmed });
});

// GET /api/users/me/direct/settlements
const getAllDirectSettlements = asyncHandler(async (req, res) => {
  const meId = req.user._id;

  const settles = await DirectSettle.find({
    $or: [{ fromUserId: meId }, { toUserId: meId }],
  })
    .sort({ createdAt: -1 })
    .populate('fromUserId', 'name username')
    .populate('toUserId',   'name username');

  res.json({ success: true, settlements: settles });
});

// GET /api/users/me/direct/balances
const getAllDirectBalances = asyncHandler(async (req, res) => {
  const meId  = req.user._id;
  const meStr = meId.toString();

  const [splits, confirms, pendings] = await Promise.all([
    DirectSplit.find({ $or: [{ payerId: meId }, { otherUserId: meId }] })
      .populate('payerId',     'name username _id')
      .populate('otherUserId', 'name username _id'),
    DirectSettle.find({ status: 'confirmed', $or: [{ fromUserId: meId }, { toUserId: meId }] }),
    DirectSettle.find({ status: 'pending',   $or: [{ fromUserId: meId }, { toUserId: meId }] })
      .populate('fromUserId', 'name username _id')
      .populate('toUserId',   'name username _id'),
  ]);

  const map = {}; // friendIdStr → { balance, friend }
  for (const s of splits) {
    if (!s.payerId || !s.otherUserId) continue; // skip if either user was deleted
    const payerStr  = s.payerId?._id?.toString() ?? s.payerId.toString();
    const isPayer   = payerStr === meStr;
    const friendDoc = isPayer ? s.otherUserId : s.payerId;
    const friendId  = isPayer
      ? (s.otherUserId?._id?.toString() ?? s.otherUserId.toString())
      : payerStr;
    if (!friendId || !friendDoc) continue;
    if (!map[friendId]) map[friendId] = { balance: 0, friend: friendDoc };
    const theirShare = s.amount - (s.payerShare ?? s.amount / 2);
    map[friendId].balance += isPayer ? theirShare : -theirShare;
  }
  for (const st of confirms) {
    const fromStr  = st.fromUserId.toString();
    const friendId = fromStr === meStr ? st.toUserId.toString() : fromStr;
    if (!map[friendId]) continue;
    map[friendId].balance += fromStr === meStr ? st.amount : -st.amount;
  }

  const pendingFriendIds = new Set(pendings.map(p => {
    const fromStr = p.fromUserId._id?.toString() ?? p.fromUserId.toString();
    return fromStr === meStr
      ? (p.toUserId._id?.toString() ?? p.toUserId.toString())
      : fromStr;
  }));

  const balances = Object.entries(map)
    .filter(([, v]) => Math.abs(v.balance) >= 0.01)
    .map(([friendId, v]) => ({
      friendId,
      friend:           v.friend,
      balance:          Math.round(v.balance * 100) / 100,
      hasPendingSettle: pendingFriendIds.has(friendId),
    }));

  logger.debug('DIRECT', `Balances for ${balances.length} friends`, { meId });
  res.json({ success: true, balances });
});

// DELETE /api/users/me/direct/:friendId/settle/:requestId
const cancelOrRejectSettle = asyncHandler(async (req, res) => {
  const { friendId, requestId } = req.params;
  const meId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(requestId))
    return res.status(400).json({ success: false, message: 'Invalid requestId' });
  if (!mongoose.Types.ObjectId.isValid(friendId))
    return res.status(400).json({ success: false, message: 'Invalid friendId' });

  const settle = await DirectSettle.findById(requestId);
  if (!settle)
    return res.status(404).json({ success: false, message: 'Settle request not found' });
  if (settle.status !== 'pending')
    return res.status(400).json({ success: false, message: 'Only pending requests can be cancelled' });

  const isDebtor   = settle.fromUserId.equals(meId);
  const isCreditor = settle.toUserId.equals(meId);
  if (!isDebtor && !isCreditor)
    return res.status(403).json({ success: false, message: 'Forbidden' });

  await settle.deleteOne();
  const action = isDebtor ? 'cancelled' : 'rejected';
  logger.info('DIRECT', `Settle ${action}`, { requestId, by: meId });
  res.json({ success: true });
});

// GET /api/users/me/direct/:friendId/group-balances
const getGroupDebtsWithFriend = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const meId  = req.user._id;
  const meStr = meId.toString();

  if (!mongoose.Types.ObjectId.isValid(friendId))
    return res.status(400).json({ success: false, message: 'Invalid friendId' });

  const friendObjId = new mongoose.Types.ObjectId(friendId);

  // Groups where both users are members
  const groups = await Group.find({ members: { $all: [meId, friendObjId] } });

  const groupDebts = [];
  for (const group of groups) {
    const { debts } = await calculateGroupBalances(group._id);
    const debt = debts.find(d =>
      (d.from.id === meStr && d.to.id === friendId) ||
      (d.from.id === friendId && d.to.id === meStr)
    );
    if (debt) {
      groupDebts.push({
        groupId:   group._id.toString(),
        groupName: group.name,
        amount:    debt.amount,
        iOwe:      debt.from.id === meStr,
      });
    }
  }

  res.json({ success: true, groupDebts });
});

module.exports = { addDirectSplit, getDirectSplits, getAllDirectSplits, requestSettle, confirmSettle, getAllDirectSettlements, getAllDirectBalances, cancelOrRejectSettle, getGroupDebtsWithFriend };
