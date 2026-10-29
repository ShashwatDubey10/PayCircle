const express = require('express');
const router  = express.Router();

const { protect }  = require('../middleware/auth');
const { isMember } = require('../middleware/groupAuth');

const { createGroup, getUserGroups, getGroup, getMembers, addMember, removeMember } = require('../controllers/groupController');
const { addExpense, getExpenses, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { getGroupBalances }            = require('../controllers/balanceController');
const { recordSettlement, getSettlements, reverseSettlement } = require('../controllers/settlementController');

router.use(protect);

// Group CRUD
router.post('/',   createGroup);
router.get('/',    getUserGroups);
router.get('/:id', getGroup);

// Members
router.get   ('/:id/members',           isMember, getMembers);
router.post  ('/:id/members',           isMember, addMember);
router.delete('/:id/members/:userId',   isMember, removeMember);

// Expenses
router.post ('/:id/expenses',              isMember, addExpense);
router.get  ('/:id/expenses',              isMember, getExpenses);
router.patch('/:id/expenses/:expenseId',   isMember, updateExpense);
router.delete('/:id/expenses/:expenseId',  isMember, deleteExpense);

// Balances
router.get('/:id/balances', isMember, getGroupBalances);

// Settlements
router.post('/:id/settlements', isMember, recordSettlement);
router.get ('/:id/settlements', isMember, getSettlements);
router.post('/:id/settlements/:settlementId/reverse', isMember, reverseSettlement);

module.exports = router;
