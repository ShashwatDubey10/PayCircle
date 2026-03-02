const Budget              = require('../models/Budget');
const Expense             = require('../models/Expense');
const PersonalTransaction = require('../models/PersonalTransaction');
const Group               = require('../models/Group');
const asyncHandler        = require('../utils/asyncHandler');
const logger              = require('../utils/logger');

const getMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// POST /api/users/me/budget
const setBudget = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (!amount || isNaN(amt) || amt < 1)
    return res.status(400).json({ success: false, message: 'Budget amount must be at least ₹1' });

  const budget = await Budget.findOneAndUpdate(
    { userId: req.user._id, month: getMonthStr() },
    { amount: amt },
    { upsert: true, new: true }
  );

  logger.info('BUDGET', `Budget set: ₹${amt} for ${getMonthStr()}`, { userId: req.user._id });
  res.json({ success: true, budget });
});

// GET /api/users/me/budget
const getBudget = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const month  = getMonthStr();
  const now    = new Date();
  const start  = new Date(now.getFullYear(), now.getMonth(), 1);
  const end    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const budget = await Budget.findOne({ userId, month });

  const groups   = await Group.find({ members: userId });
  const groupIds = groups.map(g => g._id);

  const groupExpenses = await Expense.find({ groupId: { $in: groupIds }, date: { $gte: start, $lte: end } });
  let groupSpend = 0;
  for (const exp of groupExpenses) {
    const split = exp.splits.find(s => s.userId.toString() === userId.toString());
    if (split) groupSpend += split.amount;
  }

  const personalExpenses = await PersonalTransaction.find({ userId, type: 'expense', date: { $gte: start, $lte: end } });
  const personalSpend = personalExpenses.reduce((s, t) => s + t.amount, 0);

  const spent         = parseFloat((groupSpend + personalSpend).toFixed(2));
  const budgetAmount  = budget?.amount || 0;
  const remaining     = parseFloat((budgetAmount - spent).toFixed(2));
  const usagePct      = budgetAmount > 0 ? parseFloat(((spent / budgetAmount) * 100).toFixed(1)) : 0;
  const status        = usagePct >= 100 ? 'over' : usagePct >= 90 ? 'critical' : usagePct >= 70 ? 'warning' : 'healthy';

  logger.debug('BUDGET', `Budget fetched: ${status} (${usagePct}% used)`, {
    userId,
    month,
    budget: budgetAmount,
    spent,
  });

  res.json({ success: true, month, budget: budgetAmount, spent, remaining, usagePercentage: usagePct, status });
});

module.exports = { setBudget, getBudget };
