const Group               = require('../models/Group');
const Expense             = require('../models/Expense');
const PersonalTransaction = require('../models/PersonalTransaction');
const DirectSplit         = require('../models/DirectSplit');
const DirectSettle        = require('../models/DirectSettle');
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
  const [personalExp, personalInc, monthlyDirectSplits] = await Promise.all([
    PersonalTransaction.find({ userId, type: 'expense', date: { $gte: start, $lte: end } }),
    PersonalTransaction.find({ userId, type: 'income',  date: { $gte: start, $lte: end } }),
    DirectSplit.find({
      $or: [{ payerId: userId }, { otherUserId: userId }],
      date: { $gte: start, $lte: end },
    }),
  ]);

  let personalSpend = 0;
  for (const t of personalExp) {
    personalSpend += t.amount;
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  }
  const personalIncome = personalInc.reduce((s, t) => s + t.amount, 0);

  // Direct split shares this month
  let directSpend = 0;
  for (const s of monthlyDirectSplits) {
    const isPayer = s.payerId.toString() === userId.toString();
    const myShare = isPayer
      ? (s.payerShare ?? s.amount / 2)
      : s.amount - (s.payerShare ?? s.amount / 2);
    directSpend += myShare;
    catMap['Miscellaneous'] = (catMap['Miscellaneous'] || 0) + myShare;
  }

  // Category breakdown — top 4 + Others
  const totalSpend = groupSpend + personalSpend + directSpend;
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

  // Direct split balance summary — net per friend
  const [allDirectSplits, confirmedSettles] = await Promise.all([
    DirectSplit.find({ $or: [{ payerId: userId }, { otherUserId: userId }] }),
    DirectSettle.find({ status: 'confirmed', $or: [{ fromUserId: userId }, { toUserId: userId }] }),
  ]);
  const directBalMap = {}; // friendIdStr → netBalance (positive = owed to me)
  for (const s of allDirectSplits) {
    const isPayer    = s.payerId.toString() === userId.toString();
    const friendStr  = isPayer ? s.otherUserId.toString() : s.payerId.toString();
    const myShare    = isPayer ? (s.payerShare ?? s.amount / 2) : s.amount - (s.payerShare ?? s.amount / 2);
    const theirShare = s.amount - myShare;
    directBalMap[friendStr] = (directBalMap[friendStr] || 0) + (isPayer ? theirShare : -myShare);
  }
  for (const settle of confirmedSettles) {
    const fromStr = settle.fromUserId.toString(); // debtor (who requested)
    const toStr   = settle.toUserId.toString();   // creditor (who confirmed)
    const meStr   = userId.toString();
    if (fromStr === meStr) {
      // I'm the debtor — I paid the creditor, reducing my debt to them
      directBalMap[toStr]   = (directBalMap[toStr]   || 0) + settle.amount;
    } else {
      // Friend is the debtor — they paid me, reducing their debt to me
      directBalMap[fromStr] = (directBalMap[fromStr] || 0) - settle.amount;
    }
  }
  for (const net of Object.values(directBalMap)) {
    if (net > 0.005)  totalToReceive += net;
    if (net < -0.005) totalOwed      += Math.abs(net);
  }

  totalOwed      = parseFloat(totalOwed.toFixed(2));
  totalToReceive = parseFloat(totalToReceive.toFixed(2));

  // Recent activity — last 5 across all types
  const [recentTx, recentGroupExp, recentDirect] = await Promise.all([
    PersonalTransaction.find({ userId }).sort({ date: -1 }).limit(10),
    Expense.find({ groupId: { $in: groupIds }, 'splits.userId': userId })
           .sort({ date: -1 }).limit(10)
           .populate('payerId', 'name'),
    DirectSplit.find({ $or: [{ payerId: userId }, { otherUserId: userId }] })
               .sort({ date: -1 }).limit(10)
               .populate('payerId', 'name')
               .populate('otherUserId', 'name'),
  ]);

  const activities = [
    ...recentTx.map(t => ({
      _id: t._id, type: 'personal', date: t.date,
      amount: t.amount, description: t.notes || t.category,
      sign: t.type === 'income' ? 1 : -1,
    })),
    ...recentGroupExp.map(e => {
      const split = e.splits.find(s => s.userId.toString() === userId.toString());
      return { _id: e._id, type: 'group_expense', date: e.date,
               amount: split?.amount ?? e.amount, description: e.notes || e.category, sign: -1 };
    }),
    ...recentDirect.map(s => {
      const payerIdStr = s.payerId._id?.toString() ?? s.payerId.toString();
      const iAmPayer   = payerIdStr === userId.toString();
      // Report MY share, not the full bill, and always as an expense — matching
      // how group_expense is reported above. Previously this sent the full amount
      // with sign +1, so paying for a shared meal showed up as green income.
      const payerShare = s.payerShare ?? s.amount / 2;
      const myShare    = iAmPayer ? payerShare : s.amount - payerShare;
      return { _id: s._id, type: 'direct_split', date: s.date,
               amount: parseFloat(myShare.toFixed(2)),
               description: s.description || 'Direct split', sign: -1 };
    }),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

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
        direct:   parseFloat(directSpend.toFixed(2)),
        combined: parseFloat(totalSpend.toFixed(2)),
      },
      personalIncome:  parseFloat(personalIncome.toFixed(2)),
      netCashflow:     parseFloat((personalIncome - personalSpend).toFixed(2)),
      totalOwed:        parseFloat(totalOwed.toFixed(2)),
      totalToReceive:   parseFloat(totalToReceive.toFixed(2)),
      categoryBreakdown: breakdown,
      recentActivities: activities,
    },
  });
});

// GET /api/users/me/spending-history — last 6 months combined spend + income
const getSpendingHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now    = new Date();

  // Build month windows for last 6 months
  const windows = Array.from({ length: 6 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, start, end };
  });

  const groups   = await Group.find({ members: userId });
  const groupIds = groups.map(g => g._id);

  const results = await Promise.all(windows.map(async ({ key, start, end }) => {
    const [groupExps, personalExps, personalIncs, directSplits] = await Promise.all([
      Expense.find({ groupId: { $in: groupIds }, date: { $gte: start, $lte: end } }),
      PersonalTransaction.find({ userId, type: 'expense', date: { $gte: start, $lte: end } }),
      PersonalTransaction.find({ userId, type: 'income',  date: { $gte: start, $lte: end } }),
      DirectSplit.find({ $or: [{ payerId: userId }, { otherUserId: userId }], date: { $gte: start, $lte: end } }),
    ]);

    let groupSpend = 0;
    for (const exp of groupExps) {
      const split = exp.splits.find(s => s.userId.toString() === userId.toString());
      if (split) groupSpend += split.amount;
    }

    const personalSpend  = personalExps.reduce((s, t) => s + t.amount, 0);
    const personalIncome = personalIncs.reduce((s, t) => s + t.amount, 0);

    let directSpend = 0;
    for (const sp of directSplits) {
      const isPayer = sp.payerId.toString() === userId.toString();
      const myShare = isPayer ? (sp.payerShare ?? sp.amount / 2) : sp.amount - (sp.payerShare ?? sp.amount / 2);
      directSpend += myShare;
    }

    return {
      month:   key,
      expense: parseFloat((groupSpend + personalSpend + directSpend).toFixed(2)),
      income:  parseFloat(personalIncome.toFixed(2)),
    };
  }));

  res.json({ success: true, data: results });
});

module.exports = { getDashboard, getSpendingHistory };
