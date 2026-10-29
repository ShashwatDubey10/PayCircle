const Group      = require('../models/Group');
const Expense    = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User       = require('../models/User');

/**
 * Calculate net balances for the members of a group.
 * credit[id] = money the user paid out (expenses paid + settlements sent)
 * debit[id]  = money the user received/owed (expense shares + settlements received)
 * netBalance = credit - debit
 *
 * Fetching is batched. This used to issue four queries per group — findById,
 * expenses, settlements, users — and six controllers called it once per group
 * in a loop, so a user in ten groups paid about fifty round trips for one
 * dashboard paint. `calculateBalancesForGroups` does the whole set in three.
 *
 * The arithmetic below is untouched by that change: `computeBalances` is pure,
 * and both entry points run exactly the same code over it.
 */

// ─── Pure computation — no I/O ────────────────────────────────────────────────
function computeBalances(group, expenses, settlements, userMap) {
  const currentIds = group.members.map(m => m.toString());

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

  // Process settlements — sender credits, receiver debits (they got paid).
  // A reversal carries the same pair and amount but applies the opposite sign,
  // so the original row stays in the ledger and the two cancel out.
  for (const s of settlements) {
    const sign = s.reversalOf ? -1 : 1;
    credit[s.fromUserId.toString()] += sign * s.amount;
    debit[s.toUserId.toString()]    += sign * s.amount;
  }

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
}

// ─── Batched entry point ──────────────────────────────────────────────────────
/**
 * Balances for many groups in three queries total.
 * Accepts loaded Group documents, or ids (one extra query to load them).
 * Returns Map<groupId string, { members, debts }>.
 */
const calculateBalancesForGroups = async (groupsOrIds) => {
  const out = new Map();
  if (!groupsOrIds?.length) return out;

  const first = groupsOrIds[0];
  const groups = (first && first.members)
    ? groupsOrIds
    : await Group.find({ _id: { $in: groupsOrIds } });
  if (!groups.length) return out;

  const ids = groups.map(g => g._id);
  const [expenses, settlements] = await Promise.all([
    Expense.find({ groupId: { $in: ids } }),
    Settlement.find({ groupId: { $in: ids } }),
  ]);

  const byGroup = (rows) => {
    const m = new Map();
    for (const row of rows) {
      const k = row.groupId.toString();
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(row);
    }
    return m;
  };
  const expByGroup = byGroup(expenses);
  const setByGroup = byGroup(settlements);

  // One name lookup for every person appearing anywhere in the set.
  const everyone = new Set();
  for (const g of groups) for (const m of g.members) everyone.add(m.toString());
  for (const e of expenses) {
    everyone.add(e.payerId.toString());
    for (const s of e.splits) everyone.add(s.userId.toString());
  }
  for (const s of settlements) {
    everyone.add(s.fromUserId.toString());
    everyone.add(s.toUserId.toString());
  }

  const users = await User.find({ _id: { $in: [...everyone] } }).select('name email');
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  for (const g of groups) {
    const k = g._id.toString();
    out.set(k, computeBalances(g, expByGroup.get(k) ?? [], setByGroup.get(k) ?? [], userMap));
  }
  return out;
};

// ─── Single-group entry point ────────────────────────────────────────────────
/**
 * Accepts a group id or an already-loaded Group document. Callers that hold
 * the document (anything behind `isMember`, which puts it on `req.group`)
 * should pass it and save the lookup.
 */
const calculateGroupBalances = async (groupOrId) => {
  const group = (groupOrId && groupOrId.members)
    ? groupOrId
    : await Group.findById(groupOrId);
  if (!group) throw new Error('Group not found');

  const byId = await calculateBalancesForGroups([group]);
  return byId.get(group._id.toString());
};

module.exports = { calculateGroupBalances, calculateBalancesForGroups };
