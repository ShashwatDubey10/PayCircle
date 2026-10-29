const Group                      = require('../models/Group');
const { calculateGroupBalances, calculateBalancesForGroups } = require('../services/balanceService');
const asyncHandler               = require('../utils/asyncHandler');
const logger                     = require('../utils/logger');

// GET /api/groups/:id/balances
const getGroupBalances = asyncHandler(async (req, res) => {
  logger.debug('BALANCE', `Computing balances for group`, { groupId: req.params.id, userId: req.user._id });
  // isMember already loaded and authorised the group; pass the document.
  const result = await calculateGroupBalances(req.group ?? req.params.id);
  res.json({ success: true, ...result });
});

// GET /api/users/me/summary
const getUserSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const groups = await Group.find({ members: req.user._id });

  let totalOwed = 0, totalToReceive = 0;
  const breakdown = [];

  const summaryBalances = await calculateBalancesForGroups(groups);
  for (const group of groups) {
    const members = summaryBalances.get(group._id.toString())?.members ?? [];
    const mine = members.find(m => m.user.id === userId);
    if (!mine) continue;

    if (mine.netBalance < 0) totalOwed       += Math.abs(mine.netBalance);
    if (mine.netBalance > 0) totalToReceive  += mine.netBalance;

    breakdown.push({
      groupId:    group._id,
      groupName:  group.name,
      netBalance: mine.netBalance,
    });
  }

  logger.debug('BALANCE', `User summary computed`, {
    userId,
    totalOwed: totalOwed.toFixed(2),
    totalToReceive: totalToReceive.toFixed(2),
    groupCount: groups.length,
  });

  res.json({
    success: true,
    totalOwed:       parseFloat(totalOwed.toFixed(2)),
    totalToReceive:  parseFloat(totalToReceive.toFixed(2)),
    groups: breakdown,
  });
});

module.exports = { getGroupBalances, getUserSummary };
