const PersonalTransaction = require('../models/PersonalTransaction');
const asyncHandler        = require('../utils/asyncHandler');
const logger              = require('../utils/logger');

const VALID_TYPES = ['income', 'expense'];
const VALID_CATS  = ['Food', 'Travel', 'Utilities', 'Entertainment', 'Health',
                     'Shopping', 'Salary', 'Freelance', 'Investment', 'Miscellaneous'];

// POST /api/users/me/transactions
const addTransaction = asyncHandler(async (req, res) => {
  const { type, amount, category, date, notes } = req.body;

  if (!type || !amount || !category || !date)
    return res.status(400).json({ success: false, message: 'type, amount, category, and date are required' });
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ success: false, message: 'type must be "income" or "expense"' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 0.01)
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
  if (!VALID_CATS.includes(category))
    return res.status(400).json({ success: false, message: `Invalid category. Valid: ${VALID_CATS.join(', ')}` });

  const txn = await PersonalTransaction.create({
    userId: req.user._id, type, amount: amt,
    category, date: new Date(date), notes: notes || '',
  });

  logger.info('TXN', `Personal transaction added: ${type} ₹${amt} (${category})`, {
    userId: req.user._id,
    txnId: txn._id,
  });

  res.status(201).json({ success: true, transaction: txn });
});

// GET /api/users/me/transactions
const getTransactions = asyncHandler(async (req, res) => {
  const { type, date, category } = req.query;
  const filter = { userId: req.user._id };

  if (type     && type     !== 'all') filter.type     = type;
  if (category && category !== 'All') filter.category = category;

  if (date && date !== 'all') {
    const from = new Date();
    if      (date === '7d')  from.setDate(from.getDate() - 7);
    else if (date === '30d') from.setDate(from.getDate() - 30);
    else if (date === '3m')  from.setMonth(from.getMonth() - 3);
    filter.date = { $gte: from };
  }

  const transactions = await PersonalTransaction.find(filter).sort({ date: -1 });

  logger.debug('TXN', `Fetched ${transactions.length} personal transactions`, {
    userId: req.user._id,
    filters: { type, date, category },
  });

  res.json({ success: true, count: transactions.length, transactions });
});

// DELETE /api/users/me/transactions/:id
const deleteTransaction = asyncHandler(async (req, res) => {
  const txn = await PersonalTransaction.findById(req.params.id);
  if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
  if (txn.userId.toString() !== req.user._id.toString()) {
    logger.warn('TXN', `Delete denied — not owner`, { txnId: req.params.id, userId: req.user._id });
    return res.status(403).json({ success: false, message: 'Not authorized to delete this transaction' });
  }

  await txn.deleteOne();
  logger.info('TXN', `Personal transaction deleted`, { txnId: req.params.id, userId: req.user._id });
  res.json({ success: true, message: 'Transaction deleted' });
});

module.exports = { addTransaction, getTransactions, deleteTransaction };
