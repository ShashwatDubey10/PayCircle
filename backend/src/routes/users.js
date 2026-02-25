const express = require('express');
const router  = express.Router();

const { protect } = require('../middleware/auth');

const { getUserSummary }                       = require('../controllers/balanceController');
const { getDashboard }                         = require('../controllers/dashboardController');
const { setBudget, getBudget }                 = require('../controllers/budgetController');
const { addTransaction, getTransactions, deleteTransaction } = require('../controllers/personalTransactionController');

router.use(protect);

router.get('/me/summary',               getUserSummary);
router.get('/me/dashboard',             getDashboard);
router.post('/me/budget',               setBudget);
router.get ('/me/budget',               getBudget);
router.post('/me/transactions',         addTransaction);
router.get ('/me/transactions',         getTransactions);
router.delete('/me/transactions/:id',   deleteTransaction);

module.exports = router;
