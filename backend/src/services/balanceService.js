const Group      = require('../models/Group');
const Expense    = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User       = require('../models/User');

/**
 * Calculate net balances for all members of a group.
 * credit[id] = money the user paid out (expenses paid + settlements sent)
 * debit[id]  = money the user received/owed (expense shares + settlements received)
 * netBalance = credit - debit
 */
const calculateGroupBalances = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error('Group not found');

  const memberIds = group.members.map(m => m.toString());
  const credit = {}, debit = {};
  memberIds.forEach(id => { credit[id] = 0; debit[id] = 0; });

  // Process expenses
  const expenses = await Expense.find({ groupId });
  for (const exp of expenses) {
    const pid = exp.payerId.toString();
    if (credit[pid] !== undefined) credit[pid] += exp.amount;
    for (const split of exp.splits) {
      const uid = split.userId.toString();
      if (debit[uid] !== undefined) debit[uid] += split.amount;
    }
  }

  // Process settlements — sender credits, receiver debits (they got paid)
  const settlements = await Settlement.find({ groupId });
  for (const s of settlements) {
    const from = s.fromUserId.toString();
    const to   = s.toUserId.toString();
    if (credit[from] !== undefined) credit[from] += s.amount;
    if (debit[to]   !== undefined) debit[to]   += s.amount;
  }

  // Fetch user details
  const users = await User.find({ _id: { $in: group.members } }).select('name email');
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  // Build member balance list
  const members = memberIds.map(id => {
    const net = parseFloat(((credit[id] || 0) - (debit[id] || 0)).toFixed(2));
    return {
      user: { id, name: userMap[id]?.name || 'Unknown', email: userMap[id]?.email || '' },
      totalPaid: parseFloat((credit[id] || 0).toFixed(2)),
      totalOwed: parseFloat((debit[id]  || 0).toFixed(2)),
      netBalance: net,
    };
  });

  // Simplified debt list — greedy matching of debtors to creditors
  const creditors = members.filter(m => m.netBalance > 0.005).map(m => ({ ...m }));
  const debtors   = members.filter(m => m.netBalance < -0.005).map(m => ({ ...m }));
  creditors.sort((a, b) => b.netBalance - a.netBalance);
  debtors.sort((a, b)   => a.netBalance - b.netBalance);

  const debts = [];
  for (const debtor of debtors) {
    let remaining = parseFloat(Math.abs(debtor.netBalance).toFixed(2));
    for (const creditor of creditors) {
      if (remaining < 0.01) break;
      if (creditor.netBalance < 0.01) continue;
      const payment = parseFloat(Math.min(remaining, creditor.netBalance).toFixed(2));
      debts.push({ from: debtor.user, to: creditor.user, amount: payment });
      remaining          = parseFloat((remaining - payment).toFixed(2));
      creditor.netBalance = parseFloat((creditor.netBalance - payment).toFixed(2));
    }
  }

  return { members, debts };
};

module.exports = { calculateGroupBalances };
