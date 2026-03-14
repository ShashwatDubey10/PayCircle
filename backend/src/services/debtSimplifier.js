/**
 * Standalone debt simplification module.
 * Takes an array of { name, balance } objects and returns a minimal list of
 * transfers that settles all debts.
 *
 * @param {Array<{ name: string, balance: number }>} balances
 * @returns {Array<{ from: string, to: string, amount: number }>}
 */
const calculateOptimalSettlements = (balances) => {
  // Shallow-copy into creditors / debtors to avoid mutating caller's data
  const creditors = balances
    .filter(b => b.balance > 0.005)
    .map(b => ({ ...b, balance: parseFloat(b.balance.toFixed(2)) }));
  const debtors = balances
    .filter(b => b.balance < -0.005)
    .map(b => ({ ...b, balance: parseFloat(b.balance.toFixed(2)) }));

  // Largest credit first; most-negative debt first
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);

  const results = [];
  let c = 0;
  let d = 0;

  while (c < creditors.length && d < debtors.length) {
    const creditor = creditors[c];
    const debtor   = debtors[d];

    const amount = parseFloat(
      Math.min(Math.abs(debtor.balance), creditor.balance).toFixed(2)
    );

    if (amount >= 0.01) {
      results.push({ from: debtor.name, to: creditor.name, amount });
    }

    creditor.balance = parseFloat((creditor.balance - amount).toFixed(2));
    debtor.balance   = parseFloat((debtor.balance   + amount).toFixed(2));

    // Advance whichever pointer just reached ~0
    if (Math.abs(debtor.balance) < 0.005)   d++;
    if (Math.abs(creditor.balance) < 0.005) c++;
  }

  return results;
};

module.exports = { calculateOptimalSettlements };

// ---------------------------------------------------------------------------
// Self-test — run with:  node backend/src/services/debtSimplifier.js
// ---------------------------------------------------------------------------
if (require.main === module) {
  console.log('=== Example 1: single creditor ===');
  // A paid for everything; B, C, D each owe their share
  const ex1 = [
    { name: 'A', balance:  1000 },
    { name: 'B', balance:  -400 },
    { name: 'C', balance:  -300 },
    { name: 'D', balance:  -300 },
  ];
  calculateOptimalSettlements(ex1).forEach(t => console.log(t));
  // Expected:
  //   { from: 'B', to: 'A', amount: 400 }
  //   { from: 'C', to: 'A', amount: 300 }
  //   { from: 'D', to: 'A', amount: 300 }

  console.log('\n=== Example 2: multiple creditors ===');
  // A and E both paid; B and C both owe — optimal is 3 transactions
  const ex2 = [
    { name: 'A', balance:  500 },
    { name: 'E', balance:  500 },
    { name: 'B', balance: -600 },
    { name: 'C', balance: -400 },
  ];
  calculateOptimalSettlements(ex2).forEach(t => console.log(t));
  // Expected:
  //   { from: 'B', to: 'A', amount: 500 }
  //   { from: 'B', to: 'E', amount: 100 }
  //   { from: 'C', to: 'E', amount: 400 }
}
