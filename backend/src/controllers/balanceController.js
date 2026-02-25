const Group                             = require('../models/Group');
const { calculateGroupBalances }        = require('../services/balanceService');
const asyncHandler                      = require('../utils/asyncHandler');

// GET /api/groups/:id/balances
const getGroupBalances = asyncHandler(async (req, res) => {
  const result = await calculateGroupBalances(req.params.id);
  res.json({ success: true, ...result });
});

// GET /api/users/me/summary
const getUserSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const groups = await Group.find({ members: req.user._id });

  let totalOwed = 0, totalToReceive = 0;
  const breakdown = [];

  for (const group of groups) {
    const { members } = await calculateGroupBalances(group._id);
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

  res.json({
    success: true,
    totalOwed:       parseFloat(totalOwed.toFixed(2)),
    totalToReceive:  parseFloat(totalToReceive.toFixed(2)),
    groups: breakdown,
  });
});

module.exports = { getGroupBalances, getUserSummary };
