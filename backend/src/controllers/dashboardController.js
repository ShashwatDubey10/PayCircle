const Group               = require('../models/Group');
const Expense             = require('../models/Expense');
const PersonalTransaction = require('../models/PersonalTransaction');
const { calculateGroupBalances } = require('../services/balanceService');
const asyncHandler        = require('../utils/asyncHandler');
const logger              = require('../utils/logger');

// GET /api/users/me/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now    = new Date();
  const start  = new Date(now.getFullYear(), now.getMonth(), 1);
  const end    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  logger.debug('DASH', `Building dashboard for user`, { userId, month: `${now.getFullYear()}-${now.getMonth() + 1}` });

  // User's groups
  const groups   = await Group.find({ members: userId });
  const groupIds = groups.map(g => g._id);

  // Group expense shares this month
  const groupExpenses = await Expense.find({ groupId: { $in: groupIds }, date: { $gte: start, $lte: end } });
  let groupSpend = 0;
  const catMap = {};

  for (const exp of groupExpenses) {
    const split = exp.splits.find(s => s.userId.toString() === userId.toString());
    if (split) {
      groupSpend += split.amount;
      catMap[exp.category] = (catMap[exp.category] || 0) + split.amount;
    }
  }

  // Personal transactions this month
  const [personalExp, personalInc] = await Promise.all([
    PersonalTransaction.find({ userId, type: 'expense', date: { $gte: start, $lte: end } }),
    PersonalTransaction.find({ userId, type: 'income',  date: { $gte: start, $lte: end } }),
  ]);

  let personalSpend = 0;
  for (const t of personalExp) {
    personalSpend += t.amount;
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  }
  const personalIncome = personalInc.reduce((s, t) => s + t.amount, 0);

  // Category breakdown — top 4 + Others
  const totalSpend = groupSpend + personalSpend;
  let breakdown = Object.entries(catMap)
    .map(([category, amount]) => ({
      category,
      amount:     parseFloat(amount.toFixed(2)),
      percentage: totalSpend > 0 ? parseFloat(((amount / totalSpend) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (breakdown.length > 4) {
    const othersAmt = breakdown.slice(4).reduce((s, c) => s + c.amount, 0);
    breakdown = [
      ...breakdown.slice(0, 4),
      {
        category: 'Others',
        amount: parseFloat(othersAmt.toFixed(2)),
        percentage: totalSpend > 0 ? parseFloat(((othersAmt / totalSpend) * 100).toFixed(1)) : 0,
      },
    ];
  }

  // Group balance summary
  let totalOwed = 0, totalToReceive = 0;
  await Promise.all(groups.map(async (g) => {
    const { members } = await calculateGroupBalances(g._id);
    const mine = members.find(m => m.user.id === userId.toString());
    if (!mine) return;
    if (mine.netBalance < 0) totalOwed        += Math.abs(mine.netBalance);
    if (mine.netBalance > 0) totalToReceive   += mine.netBalance;
  }));

  logger.debug('DASH', `Dashboard computed`, {
    userId,
    totalSpend: totalSpend.toFixed(2),
    groupCount: groups.length,
  });

  res.json({
    success: true,
    data: {
      totalSpent: {
        group:    parseFloat(groupSpend.toFixed(2)),
        personal: parseFloat(personalSpend.toFixed(2)),
        combined: parseFloat(totalSpend.toFixed(2)),
      },
      personalIncome:  parseFloat(personalIncome.toFixed(2)),
      netCashflow:     parseFloat((personalIncome - personalSpend).toFixed(2)),
      totalOwed:       parseFloat(totalOwed.toFixed(2)),
      totalToReceive:  parseFloat(totalToReceive.toFixed(2)),
      categoryBreakdown: breakdown,
    },
  });
});

module.exports = { getDashboard };
