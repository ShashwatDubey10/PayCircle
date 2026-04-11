const Budget              = require('../models/Budget');
const Expense             = require('../models/Expense');
const PersonalTransaction = require('../models/PersonalTransaction');
const DirectSplit         = require('../models/DirectSplit');
const Group               = require('../models/Group');
const SplitTag            = require('../models/SplitTag');
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
    { $set: { amount: amt } },
    { upsert: true, new: true }
  );

  logger.info('BUDGET', `Overall budget set: ₹${amt} for ${getMonthStr()}`, { userId: req.user._id });
  res.json({ success: true, budget });
});

// POST /api/users/me/budget/categories
const setCategoryBudgets = asyncHandler(async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories))
    return res.status(400).json({ success: false, message: 'categories must be an array' });

  // Validate: non-empty name (≤50 chars), amount ≥ 1. Deduplicate by lowercase name — last entry wins.
  const catMap = {};
  for (const item of categories) {
    const name = typeof item.category === 'string' ? item.category.trim() : '';
    const amt  = parseFloat(item.amount);
    if (!name || name.length > 50) continue;
    if (isNaN(amt) || amt < 0) continue;
    catMap[name.toLowerCase()] = { category: name, amount: amt };
  }
  const cleanCategories = Object.values(catMap);

  // Validate: sum of category budgets must not exceed the overall monthly budget
  const currentBudget = await Budget.findOne({ userId: req.user._id, month: getMonthStr() });
  if (currentBudget?.amount) {
    const catTotal = parseFloat(cleanCategories.reduce((s, c) => s + c.amount, 0).toFixed(2));
    if (catTotal > currentBudget.amount) {
      return res.status(400).json({
        success: false,
        message: `Category total (₹${catTotal.toFixed(2)}) cannot exceed your monthly budget of ₹${currentBudget.amount.toFixed(2)}`,
      });
    }
  }

  await Budget.findOneAndUpdate(
    { userId: req.user._id, month: getMonthStr() },
    { $set: { categories: cleanCategories } },
    { upsert: true, new: true }
  );

  logger.info('BUDGET', `Category budgets set for ${getMonthStr()}`, {
    userId: req.user._id,
    count: cleanCategories.length,
  });
  res.json({ success: true, categories: cleanCategories });
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

  const [groupExpenses, personalExpenses, userTags] = await Promise.all([
    Expense.find({ groupId: { $in: groupIds }, date: { $gte: start, $lte: end } }),
    PersonalTransaction.find({ userId, type: 'expense', date: { $gte: start, $lte: end } }),
    SplitTag.find({ userId }),
  ]);

  // Build tag map: refId.toString() → category (lowercase)
  const tagMap = {};
  userTags.forEach(t => { tagMap[t.refId.toString()] = t.category.toLowerCase(); });

  // Accumulate total and per-category spend (case-insensitive keys)
  let groupSpend    = 0;
  let personalSpend = 0;
  const catSpend    = {}; // lowercase key → amount

  for (const exp of groupExpenses) {
    const split = exp.splits.find(s => s.userId.toString() === userId.toString());
    if (split) {
      groupSpend += split.amount;
      const cat = tagMap[exp._id.toString()] ?? (exp.category || '').toLowerCase();
      catSpend[cat] = (catSpend[cat] || 0) + split.amount;
    }
  }

  for (const tx of personalExpenses) {
    personalSpend += tx.amount;
    const key = (tx.category || '').toLowerCase();
    catSpend[key] = (catSpend[key] || 0) + tx.amount;
  }

  // Direct splits — include user's share regardless of who paid
  const directSplits = await DirectSplit.find({
    $or: [{ payerId: userId }, { otherUserId: userId }],
    date: { $gte: start, $lte: end },
  });
  let directSpend = 0;
  for (const s of directSplits) {
    const isPayer = s.payerId.toString() === userId.toString();
    const myShare = isPayer
      ? (s.payerShare ?? s.amount / 2)
      : s.amount - (s.payerShare ?? s.amount / 2);
    directSpend += myShare;
    const cat = tagMap[s._id.toString()] ?? 'miscellaneous';
    catSpend[cat] = (catSpend[cat] || 0) + myShare;
  }

  const spent        = parseFloat((groupSpend + personalSpend + directSpend).toFixed(2));
  const budgetAmount = budget?.amount || 0;
  const remaining    = parseFloat((budgetAmount - spent).toFixed(2));
  const usagePct     = budgetAmount > 0 ? parseFloat(((spent / budgetAmount) * 100).toFixed(1)) : 0;
  const status       = budgetAmount > 0
    ? (usagePct >= 100 ? 'over' : usagePct >= 90 ? 'critical' : usagePct >= 70 ? 'warning' : 'healthy')
    : null;

  // Build per-category breakdown — only user-defined categories
  const categories = (budget?.categories || []).map(({ category, amount: limit }) => {
    const catSpentAmt = parseFloat((catSpend[category.toLowerCase()] || 0).toFixed(2));
    if (limit === 0) {
      // Tracking-only: no limit set
      return { category, spent: catSpentAmt, limit: 0, status: null };
    }
    const catRemaining = parseFloat((limit - catSpentAmt).toFixed(2));
    const catUsagePct  = parseFloat(((catSpentAmt / limit) * 100).toFixed(1));
    const catStatus    = catUsagePct >= 100 ? 'over' : catUsagePct >= 90 ? 'critical' : catUsagePct >= 70 ? 'warning' : 'healthy';
    return { category, spent: catSpentAmt, limit, remaining: catRemaining, usagePercentage: catUsagePct, status: catStatus };
  });

  logger.debug('BUDGET', `Budget fetched: overall ${status || 'unset'} (${usagePct}% used)`, {
    userId, month, budget: budgetAmount, spent,
  });

  res.json({
    success: true, month,
    budget: budgetAmount, spent, remaining, usagePercentage: usagePct, status,
    categories,
  });
});

module.exports = { setBudget, setCategoryBudgets, getBudget };
