const Expense    = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');

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
  if (expDate > now)        return res.status(400).json({ success: false, message: 'Date cannot be in the future' });
  if (expDate < oneYearAgo) return res.status(400).json({ success: false, message: 'Date cannot be more than 1 year in the past' });

  if (!VALID_CATS.includes(category))
    return res.status(400).json({ success: false, message: `Category must be one of: ${VALID_CATS.join(', ')}` });

  const memberIds = group.members.map(m => m.toString());
  if (!memberIds.includes(payerId.toString()))
    return res.status(400).json({ success: false, message: 'Payer must be a group member' });

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
    }
    finalSplits = splits.map(s => ({ userId: s.userId, amount: parseFloat(parseFloat(s.amount).toFixed(2)) }));
  } else {
    return res.status(400).json({ success: false, message: 'splitType must be "equal" or "exact"' });
  }

  const expense = await Expense.create({
    groupId: group._id, amount: amt, payerId,
    date: expDate, category, notes: notes || '',
    splitType, splits: finalSplits,
  });

  await expense.populate([
    { path: 'payerId',        select: 'name email' },
    { path: 'splits.userId',  select: 'name email' },
  ]);

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

  res.json({ success: true, count: expenses.length, expenses });
});

module.exports = { addExpense, getExpenses };
