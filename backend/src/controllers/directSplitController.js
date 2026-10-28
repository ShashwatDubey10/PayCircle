const mongoose     = require('mongoose');
const DirectSplit  = require('../models/DirectSplit');
const DirectSettle = require('../models/DirectSettle');
const Group        = require('../models/Group');
const User         = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { areFriends }            = require('./friendController');
const { calculateGroupBalances } = require('../services/balanceService');

// Returns true if otherId is a personal contact created by meId.
// Archived contacts still pass so their history stays readable and settleable;
// creating NEW debt with one is blocked in addDirectSplit instead.
async function isMyVirtualContact(meId, otherId) {
  const u = await User.findOne({ _id: otherId, isVirtual: true, createdBy: meId });
  return !!u;
}

// Stricter variant: must be an active (non-archived) contact.
async function isMyActiveVirtualContact(meId, otherId) {
  const u = await User.findOne({ _id: otherId, isVirtual: true, createdBy: meId, deletedAt: null });
  return !!u;
}

// Returns true if meId is authorised to transact with otherId
async function canTransact(meId, otherId) {
  return (await areFriends(meId, otherId)) || (await isMyVirtualContact(meId, otherId));
}

// Net balance between two users, from meId's point of view, derived from their
// splits plus confirmed settles. Positive = the other user owes me, negative =
// I owe them. The arithmetic lives here so the balance reported by
// getDirectSplits and the cap enforced by requestSettle can never drift apart.
function netDirectBalance(meIdStr, splits, settles) {
  let balance = 0;
  for (const s of splits) {
    const payerIdStr = s.payerId?._id?.toString() ?? s.payerId?.toString();
    if (!payerIdStr) continue; // skip if payer was deleted
    const theirShare = s.amount - (s.payerShare ?? s.amount / 2);
    if (payerIdStr === meIdStr) balance += theirShare;
    else                        balance -= theirShare;
  }
  for (const st of settles) {
    const fromStr = st.fromUserId?._id?.toString() ?? st.fromUserId?.toString();
    if (fromStr === meIdStr) balance += st.amount; // I paid the debt -> I owe less
    else                     balance -= st.amount; // They paid me    -> I'm owed less
  }
  return balance;
}

// Loads the splits and confirmed settles for a pair and reduces them to one
// net balance. Used where only the number is needed, not the history.
async function fetchDirectBalance(meId, friendId) {
  const [splits, settles] = await Promise.all([
    DirectSplit.find({
      $or: [
        { payerId: meId,     otherUserId: friendId },
        { payerId: friendId, otherUserId: meId     },
      ],
    }).lean(),
    DirectSettle.find({
      status: 'confirmed',
      $or: [
        { fromUserId: meId,     toUserId: friendId },
        { fromUserId: friendId, toUserId: meId     },
      ],
    }).lean(),
  ]);
  return netDirectBalance(meId.toString(), splits, settles);
}

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

  const canAdd = (await areFriends(meId, friendId)) || (await isMyActiveVirtualContact(meId, friendId));
  if (!canAdd)
    return res.status(403).json({ success: false, message: 'User must be a friend or personal contact to track splits' });

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

  if (!(await canTransact(meId, friendId)))
    return res.status(403).json({ success: false, message: 'User must be a friend or personal contact' });

  const splits = await DirectSplit.find({
    $or: [
      { payerId: meId,      otherUserId: friendId },
      { payerId: friendId,  otherUserId: meId     },
    ],
  })
    .sort({ date: 1 })
    .populate('payerId',     'name username')
    .populate('otherUserId', 'name username');

  const settles = await DirectSettle.find({
    status: 'confirmed',
    $or: [
      { fromUserId: meId,     toUserId: friendId },
      { fromUserId: friendId, toUserId: meId     },
    ],
  });

  // Positive = friend owes me; negative = I owe friend
  const balance = netDirectBalance(meId.toString(), splits, settles);

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

  const isFriend  = await areFriends(meId, friendId);
  const isContact = !isFriend && await isMyVirtualContact(meId, friendId);
  if (!isFriend && !isContact)
    return res.status(403).json({ success: false, message: 'Must be friends or personal contacts' });

  const { amount, fromContact } = req.body;
  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0)
    return res.status(400).json({ success: false, message: 'Valid amount required' });

  // Cap the settle at what the payer actually owes. Paying more than the
  // outstanding balance does not just overshoot — it carries the balance past
  // zero and invents a debt in the opposite direction. The group settlement
  // path has guarded this from the start (see settlementController); this one
  // only checked that the amount was positive.
  //
  // Direction matters: for a friend the requester is always the payer, while
  // for a personal contact `fromContact` flips it so the creditor can record
  // that the contact paid them. `!!fromContact` mirrors the truthiness the
  // insert below already uses, so the two can't disagree about who is paying.
  const contactIsPaying = isContact && !!fromContact;
  const balance     = await fetchDirectBalance(meId, friendId);
  const outstanding = contactIsPaying ? balance : -balance;

  if (outstanding < 0.01)
    return res.status(400).json({
      success: false,
      message: contactIsPaying
        ? 'They have no outstanding balance to settle'
        : 'You have no outstanding balance to settle',
    });
  if (amt > outstanding + 0.01)
    return res.status(400).json({
      success: false,
      message: `Settle amount (₹${amt.toFixed(2)}) exceeds the outstanding balance of ₹${outstanding.toFixed(2)}`,
    });

  // Personal contacts settle immediately — no pending/confirm flow needed
  if (isContact) {
    // fromContact=true → the contact is paying me (I am the creditor)
    const fromId = fromContact ? friendId : meId;
    const toId   = fromContact ? meId    : friendId;
    const settle = await DirectSettle.create({
      fromUserId:  fromId,
      toUserId:    toId,
      amount:      amt,
      status:      'confirmed',
      confirmedAt: new Date(),
    });
    logger.info('DIRECT', `Settle auto-confirmed ₹${amt} (personal contact)`, { from: fromId, to: toId });
    return res.status(201).json({ success: true, pendingSettle: null, settle });
  }

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

  const map = {}; // friendIdStr → { balance, friend, lastActivity }
  for (const s of splits) {
    if (!s.payerId || !s.otherUserId) continue; // skip if either user was deleted
    const payerStr  = s.payerId?._id?.toString() ?? s.payerId.toString();
    const isPayer   = payerStr === meStr;
    const friendDoc = isPayer ? s.otherUserId : s.payerId;
    const friendId  = isPayer
      ? (s.otherUserId?._id?.toString() ?? s.otherUserId.toString())
      : payerStr;
    if (!friendId || !friendDoc) continue;
    if (!map[friendId]) map[friendId] = { balance: 0, friend: friendDoc, lastActivity: null };
    const theirShare = s.amount - (s.payerShare ?? s.amount / 2);
    map[friendId].balance += isPayer ? theirShare : -theirShare;
    // Track most recent split date
    if (!map[friendId].lastActivity || s.date > map[friendId].lastActivity) {
      map[friendId].lastActivity = s.date;
    }
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
    .map(([friendId, v]) => ({
      friendId,
      friend:           v.friend,
      balance:          Math.round(v.balance * 100) / 100,
      lastActivity:     v.lastActivity ?? null,
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
    // Driven by the two net positions, not by the simplified `debts` plan. That
    // plan is one minimal set of transfers, so the pair of us can be missing
    // from it while still genuinely owing each other — which dropped real group
    // debts out of this list, and so out of the Settle All total. This is the
    // same rule recordSettlement validates against.
    const { members } = await calculateGroupBalances(group._id);
    const netOf = (id) => members.find(m => m.user.id === id)?.netBalance ?? 0;
    const myNet     = netOf(meStr);
    const friendNet = netOf(friendId);

    // Only one direction can be owed: an obligation exists when we sit on
    // opposite sides of zero, and the settleable figure is the smaller of the
    // two positions — past that, a payment would carry one of us through zero.
    let amount = 0;
    let iOwe   = false;
    if (myNet < -0.005 && friendNet > 0.005) {
      amount = Math.min(-myNet, friendNet);
      iOwe   = true;
    } else if (myNet > 0.005 && friendNet < -0.005) {
      amount = Math.min(myNet, -friendNet);
      iOwe   = false;
    }

    if (amount >= 0.01) {
      groupDebts.push({
        groupId:   group._id.toString(),
        groupName: group.name,
        amount:    Math.round(amount * 100) / 100,
        iOwe,
      });
    }
  }

  res.json({ success: true, groupDebts });
});

// PATCH /api/users/me/direct/:friendId/splits/:splitId
const updateDirectSplit = asyncHandler(async (req, res) => {
  const { splitId } = req.params;
  const meId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(splitId))
    return res.status(400).json({ success: false, message: 'Invalid splitId' });

  const split = await DirectSplit.findById(splitId);
  if (!split) return res.status(404).json({ success: false, message: 'Split not found' });

  if (split.payerId.toString() !== meId.toString())
    return res.status(403).json({ success: false, message: 'Only the payer can edit this split' });

  const { amount, description, payerShare } = req.body;

  if (amount !== undefined) {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0)
      return res.status(400).json({ success: false, message: 'Amount must be positive' });

    // Rescale any custom split proportionally. Leaving payerShare untouched let
    // it exceed the new amount, making the other party's share negative and
    // silently corrupting every balance derived from this split.
    if (split.payerShare != null && split.amount > 0) {
      const ratio = split.payerShare / split.amount;
      split.payerShare = Math.round(amt * ratio * 100) / 100;
    }
    split.amount = amt;
  }
  if (description !== undefined) split.description = String(description).trim();
  if (payerShare !== undefined) {
    const ps = parseFloat(payerShare);
    split.payerShare = (!isNaN(ps) && ps >= 0 && ps <= split.amount) ? ps : null;
  }

  await split.save();
  logger.info('TXN', `DirectSplit updated: ${splitId}`, { userId: meId });
  res.json({ success: true, split });
});

module.exports = { addDirectSplit, getDirectSplits, getAllDirectSplits, requestSettle, confirmSettle, getAllDirectSettlements, getAllDirectBalances, cancelOrRejectSettle, getGroupDebtsWithFriend, updateDirectSplit };
