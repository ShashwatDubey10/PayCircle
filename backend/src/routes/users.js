const express = require('express');
const router  = express.Router();

const { protect } = require('../middleware/auth');

const { getUserSummary }                       = require('../controllers/balanceController');
const { getDashboard, getSpendingHistory }      = require('../controllers/dashboardController');
const { setBudget, setCategoryBudgets, getBudget } = require('../controllers/budgetController');
const { addTransaction, getTransactions, deleteTransaction } = require('../controllers/personalTransactionController');
const {
  searchUsers, sendRequest, getRequests, respondRequest,
  getFriends, setUsername, setPushToken,
} = require('../controllers/friendController');
const { addDirectSplit, getDirectSplits, getAllDirectSplits, requestSettle, confirmSettle, getAllDirectSettlements, getAllDirectBalances, cancelOrRejectSettle, getGroupDebtsWithFriend } = require('../controllers/directSplitController');

router.use(protect);

router.get('/me/summary',               getUserSummary);
router.get('/me/dashboard',             getDashboard);
router.get('/me/spending-history',      getSpendingHistory);
router.post('/me/budget',               setBudget);
router.post('/me/budget/categories',    setCategoryBudgets);
router.get ('/me/budget',               getBudget);
router.post('/me/transactions',         addTransaction);
router.get ('/me/transactions',         getTransactions);
router.delete('/me/transactions/:id',   deleteTransaction);

// Friends
router.get  ('/search',                      searchUsers);
router.put  ('/me/username',                 setUsername);
router.put  ('/me/push-token',               setPushToken);
router.post ('/me/friends/requests',         sendRequest);
router.get  ('/me/friends/requests',         getRequests);
router.put  ('/me/friends/requests/:id',     respondRequest);
router.get  ('/me/friends',                  getFriends);

// Direct (1-on-1) splits
router.get   ('/me/direct',                                          getAllDirectSplits);
router.get   ('/me/direct/settlements',                              getAllDirectSettlements);
router.get   ('/me/direct/balances',                                 getAllDirectBalances);
router.get   ('/me/direct/:friendId/group-balances',                 getGroupDebtsWithFriend);
router.post  ('/me/direct/:friendId',                                addDirectSplit);
router.get   ('/me/direct/:friendId',                                getDirectSplits);
router.post  ('/me/direct/:friendId/settle',                         requestSettle);
router.put   ('/me/direct/:friendId/settle/:requestId/confirm',      confirmSettle);
router.delete('/me/direct/:friendId/settle/:requestId',              cancelOrRejectSettle);

module.exports = router;
