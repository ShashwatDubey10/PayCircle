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

  const currentIds = group.members.map(m => m.toString());

  const expenses    = await Expense.find({ groupId });
  const settlements = await Settlement.find({ groupId });

  // Keyed on everyone who appears in this group's ledger, not just its current
  // members. Keying on members alone silently dropped a removed person's
  // expenses and settlements, so the remaining balances stopped summing to
  // zero: with A, B and C, B paying 300 split equally and B then removed, A and
  // C were each left owing 100 to nobody, with no creditor for the debt list to
  // pair them with and no way to settle it.
  const ledgerIds = new Set(currentIds);
  for (const exp of expenses) {
    ledgerIds.add(exp.payerId.toString());
    for (const split of exp.splits) ledgerIds.add(split.userId.toString());
  }
  for (const s of settlements) {
    ledgerIds.add(s.fromUserId.toString());
    ledgerIds.add(s.toUserId.toString());
  }

  const memberIds = [...ledgerIds];
  const credit = {}, debit = {};
  memberIds.forEach(id => { credit[id] = 0; debit[id] = 0; });

  // Process expenses
  for (const exp of expenses) {
    credit[exp.payerId.toString()] += exp.amount;
    for (const split of exp.splits) debit[split.userId.toString()] += split.amount;
  }

  // Process settlements — sender credits, receiver debits (they got paid)
  for (const s of settlements) {
    credit[s.fromUserId.toString()] += s.amount;
    debit[s.toUserId.toString()]    += s.amount;
  }

  // Fetch user details
  const users = await User.find({ _id: { $in: memberIds } }).select('name email');
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  // Build member balance list
  const currentSet = new Set(currentIds);
  const members = memberIds.map(id => {
    const net = parseFloat(((credit[id] || 0) - (debit[id] || 0)).toFixed(2));
    return {
      user: { id, name: userMap[id]?.name || 'Unknown', email: userMap[id]?.email || '' },
      totalPaid: parseFloat((credit[id] || 0).toFixed(2)),
      totalOwed: parseFloat((debit[id]  || 0).toFixed(2)),
      netBalance: net,
      isFormerMember: !currentSet.has(id),
    };
  // A former member is only reported while they still carry money. Once they
  // are square they drop out, so the usual case shows exactly the current
  // members and a group corrupted by an earlier removal still shows who the
  // outstanding amount belongs to.
  }).filter(m => !m.isFormerMember || Math.abs(m.netBalance) > 0.005);

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
