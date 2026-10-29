const mongoose     = require('mongoose');
const Expense      = require('../models/Expense');
const Group        = require('../models/Group');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');

const VALID_CATS = ['Food', 'Travel', 'Utilities', 'Miscellaneous'];

// POST /api/groups/:id/expenses
const addExpense = asyncHandler(async (req, res) => {
  const { amount, payerId, date, category, notes, splitType, splits } = req.body;
  const group = req.group;

  if (!amount || !payerId || !date || !category || !splitType)
    return res.status(400).json({ success: false, message: 'amount, payerId, date, category, and splitType are required' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 0.01 || amt > 100000)
    return res.status(400).json({ success: false, message: 'Amount must be between ₹0.01 and ₹1,00,000' });

  const expDate = new Date(date);
  const now = new Date();
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  // A day of slack, not zero. The client sends its own clock, so this compared
  // a phone's time against the server's: in IST (UTC+5:30) every expense added
  // between midnight and 05:30 carried a date the server still read as
  // tomorrow, and was refused. Ordinary clock skew did the same. A 24h window
  // accepts any timezone's today while still refusing a genuinely future date.
  const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (expDate > maxDate)    return res.status(400).json({ success: false, message: 'Date cannot be in the future' });
  if (expDate < oneYearAgo) return res.status(400).json({ success: false, message: 'Date cannot be more than 1 year in the past' });

  if (!VALID_CATS.includes(category))
    return res.status(400).json({ success: false, message: `Category must be one of: ${VALID_CATS.join(', ')}` });

  const memberIds = group.members.map(m => m.toString());
  if (!memberIds.includes(payerId.toString()))
    return res.status(400).json({ success: false, message: 'Payer must be a group member' });

  if (group.members.length < 2)
    return res.status(400).json({ success: false, message: 'A group needs at least 2 members before you can add expenses' });

  let finalSplits = [];

  if (splitType === 'equal') {
    const count = group.members.length;
    const share = parseFloat((amt / count).toFixed(2));
    const distributed = share * (count - 1);
    finalSplits = group.members.map((mId, i) => ({
      userId: mId,
      amount: i === count - 1 ? parseFloat((amt - distributed).toFixed(2)) : share,
    }));
  } else if (splitType === 'exact') {
    if (!Array.isArray(splits) || splits.length === 0)
      return res.status(400).json({ success: false, message: 'splits[] is required for exact split' });

    const splitTotal = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    if (Math.abs(splitTotal - amt) > 0.02)
      return res.status(400).json({ success: false, message: `Split total (₹${splitTotal.toFixed(2)}) must equal expense amount (₹${amt})` });

    for (const s of splits) {
      if (!memberIds.includes(s.userId.toString()))
        return res.status(400).json({ success: false, message: 'All split users must be group members' });
      const splitAmt = parseFloat(s.amount);
      if (isNaN(splitAmt) || splitAmt < 0.01)
        return res.status(400).json({ success: false, message: 'Each split amount must be at least ₹0.01' });
    }
    finalSplits = splits.map(s => ({ userId: s.userId, amount: parseFloat(parseFloat(s.amount).toFixed(2)) }));
  } else {
    return res.status(400).json({ success: false, message: 'splitType must be "equal" or "exact"' });
  }

  const expense = await Expense.create({
    groupId: group._id, amount: amt, payerId,
    date: expDate, category, notes: notes || '',
    splitType, splits: finalSplits,
    // Recorded separately from payerId, which is only a claim about who paid.
    createdBy: req.user._id,
  });

  await expense.populate([
    { path: 'payerId',        select: 'name email' },
    { path: 'splits.userId',  select: 'name email' },
  ]);

  // Touch group updatedAt so group card shows "unseen" activity
  await Group.findByIdAndUpdate(group._id, { updatedAt: new Date() });

  logger.info('EXPENSE', `Expense added: ₹${amt} (${category}, ${splitType})`, {
    groupId: group._id,
    expenseId: expense._id,
    payerId,
    addedBy: req.user._id,
  });

  res.status(201).json({ success: true, expense });
});

// GET /api/groups/:id/expenses
const getExpenses = asyncHandler(async (req, res) => {
  const { date, category } = req.query;
  const filter = { groupId: req.params.id };

  if (category && category !== 'All') filter.category = category;

  if (date && date !== 'all') {
    const from = new Date();
    if      (date === '7d')  from.setDate(from.getDate() - 7);
    else if (date === '30d') from.setDate(from.getDate() - 30);
    else if (date === '3m')  from.setMonth(from.getMonth() - 3);
    filter.date = { $gte: from };
  }

  const expenses = await Expense.find(filter)
    .populate('payerId',       'name email')
    .populate('splits.userId', 'name email')
    .sort({ date: -1 });

  logger.debug('EXPENSE', `Fetched ${expenses.length} expenses for group`, {
    groupId: req.params.id,
    filters: { date, category },
  });

  res.json({ success: true, count: expenses.length, expenses });
});

// PATCH /api/groups/:id/expenses/:expenseId
const updateExpense = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;
  const expense = await Expense.findOne({ _id: expenseId, groupId: req.group._id });

  if (!expense)
    return res.status(404).json({ success: false, message: 'Expense not found' });

  if (expense.payerId.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Only the payer can edit this expense' });

  const { amount, notes, category } = req.body;

  if (category !== undefined && !VALID_CATS.includes(category))
    return res.status(400).json({ success: false, message: `Category must be one of: ${VALID_CATS.join(', ')}` });

  if (amount !== undefined) {
    if (expense.splitType === 'exact')
      return res.status(400).json({ success: false, message: 'Cannot change amount for exact splits — re-add the expense instead' });

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0.01 || amt > 100000)
      return res.status(400).json({ success: false, message: 'Amount must be between ₹0.01 and ₹1,00,000' });

    expense.amount = amt;
    const count = expense.splits.length;
    const share = parseFloat((amt / count).toFixed(2));
    const distributed = share * (count - 1);
    expense.splits = expense.splits.map((s, i) => ({
      userId: s.userId,
      amount: i === count - 1 ? parseFloat((amt - distributed).toFixed(2)) : share,
    }));
  }

  if (notes !== undefined) expense.notes = notes;
  if (category !== undefined) expense.category = category;

  await expense.save();

  await expense.populate([
    { path: 'payerId',       select: 'name email' },
    { path: 'splits.userId', select: 'name email' },
  ]);

  logger.info('EXPENSE', `Expense updated: ₹${expense.amount}`, {
    groupId: req.group._id,
    expenseId: expense._id,
    updatedBy: req.user._id,
  });

  res.json({ success: true, expense });
});

// DELETE /api/groups/:id/expenses/:expenseId
// An expense is self-attested: whoever records it states that it happened and
// who owes what for it. There was no way to take one back — no delete route at
// all, and updateExpense refuses an amount change on an exact split — so a
// member charged almost the entire amount by someone else was simply stuck
// with it, unable to remove or edit the charge.
//
// The payer can withdraw their own claim, whoever recorded it can undo their
// own entry, and the group admin can remove one as the fallback for everybody
// else. The row is kept and flagged rather than destroyed, and drops out of the
// balances with it.
const deleteExpense = asyncHandler(async (req, res) => {
  const group = req.group;
  const { expenseId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(expenseId))
    return res.status(400).json({ success: false, message: 'Invalid expenseId' });

  const expense = await Expense.findOne({ _id: expenseId, groupId: group._id });
  if (!expense)
    return res.status(404).json({ success: false, message: 'Expense not found in this group' });

  const me       = req.user._id.toString();
  const isPayer  = expense.payerId.toString() === me;
  const isAuthor = expense.createdBy?.toString() === me;
  const isAdmin  = group.adminId.toString() === me;
  if (!isPayer && !isAuthor && !isAdmin)
    return res.status(403).json({
      success: false,
      message: 'Only the payer, whoever recorded it, or the group admin can delete this expense',
    });

  expense.deletedAt = new Date();
  expense.deletedBy = req.user._id;
  await expense.save();

  logger.info('EXPENSE', `Expense deleted: ₹${expense.amount}`, {
    groupId: group._id,
    expenseId: expense._id,
    deletedBy: req.user._id,
  });

  res.json({ success: true, expenseId: expense._id });
});

module.exports = { addExpense, getExpenses, updateExpense, deleteExpense };
