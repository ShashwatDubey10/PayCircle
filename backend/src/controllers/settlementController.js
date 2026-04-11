const Settlement   = require('../models/Settlement');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { calculateGroupBalances } = require('../services/balanceService');

// POST /api/groups/:id/settlements
const recordSettlement = asyncHandler(async (req, res) => {
  const { fromUserId, toUserId, amount, date, notes } = req.body;
  const group = req.group;

  if (!fromUserId || !toUserId || !amount || !date)
    return res.status(400).json({ success: false, message: 'fromUserId, toUserId, amount, and date are required' });

  const memberIds = group.members.map(m => m.toString());
  if (!memberIds.includes(fromUserId.toString()))
    return res.status(400).json({ success: false, message: 'Payer must be a group member' });
  if (!memberIds.includes(toUserId.toString()))
    return res.status(400).json({ success: false, message: 'Receiver must be a group member' });
  if (fromUserId.toString() === toUserId.toString())
    return res.status(400).json({ success: false, message: 'Payer and receiver cannot be the same person' });

  const settleDate = new Date(date);
  if (isNaN(settleDate.getTime()))
    return res.status(400).json({ success: false, message: 'Invalid date' });
  if (settleDate > new Date())
    return res.status(400).json({ success: false, message: 'Settlement date cannot be in the future' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 0.01)
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });

  // Validate amount against actual outstanding debt
  const { debts } = await calculateGroupBalances(group._id);
  const debt = debts.find(
    d => d.from.id === fromUserId.toString() && d.to.id === toUserId.toString()
  );
  if (!debt)
    return res.status(400).json({ success: false, message: 'No outstanding debt exists from this person to the receiver' });
  if (amt > debt.amount + 0.01)
    return res.status(400).json({
      success: false,
      message: `Settlement amount (₹${amt.toFixed(2)}) exceeds the outstanding debt of ₹${debt.amount.toFixed(2)}`,
    });

  const settlement = await Settlement.create({
    groupId: group._id, fromUserId, toUserId,
    amount: amt, date: settleDate, notes: notes || '',
  });

  await settlement.populate([
    { path: 'fromUserId', select: 'name email' },
    { path: 'toUserId',   select: 'name email' },
  ]);

  logger.info('SETTLE', `Settlement recorded: ₹${amt} in group "${group.name}"`, {
    groupId: group._id,
    settlementId: settlement._id,
    fromUserId,
    toUserId,
  });

  res.status(201).json({ success: true, settlement });
});

// GET /api/groups/:id/settlements
const getSettlements = asyncHandler(async (req, res) => {
  const settlements = await Settlement.find({ groupId: req.params.id })
    .populate('fromUserId', 'name email')
    .populate('toUserId',   'name email')
    .sort({ date: -1 });

  logger.debug('SETTLE', `Fetched ${settlements.length} settlements`, { groupId: req.params.id });
  res.json({ success: true, count: settlements.length, settlements });
});

module.exports = { recordSettlement, getSettlements };
