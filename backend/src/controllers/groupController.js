const mongoose   = require('mongoose');
const Group      = require('../models/Group');
const User       = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { calculateGroupBalances, calculateBalancesForGroups } = require('../services/balanceService');
const { areFriends } = require('./friendController');

const VALID_TYPES = ['Roommates', 'Trip', 'Mess', 'Miscellaneous'];

// POST /api/groups
const createGroup = asyncHandler(async (req, res) => {
  const { name } = req.body;
  // `type` is optional — fall back to the schema default rather than rejecting.
  const type = req.body.type ?? 'Miscellaneous';

  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
  if (name.trim().length < 3 || name.trim().length > 50)
    return res.status(400).json({ success: false, message: 'Group name must be 3–50 characters' });
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ success: false, message: `Type must be one of: ${VALID_TYPES.join(', ')}` });

  const group = await Group.create({
    name: name.trim(), type,
    adminId: req.user._id,
    members: [req.user._id],
  });

  logger.info('GROUP', `Group created: "${group.name}" (${type})`, {
    groupId: group._id,
    adminId: req.user._id,
  });

  res.status(201).json({ success: true, group });
});

// GET /api/groups
const getUserGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id })
    .populate('adminId', 'name email')
    .populate('members', 'name email')
    .sort({ updatedAt: -1 });

  logger.debug('GROUP', `Fetched ${groups.length} groups for user`, { userId: req.user._id });

  if (req.query.includeBalances === 'true') {
    const userId    = req.user._id.toString();
    // calculateGroupBalances already produces each group's simplified debt list,
    // so returning it on request saves the client one follow-up call per group.
    const withDebts = req.query.includeDebts === 'true';
    // Every group's balances in one pass. The documents are already loaded, so
    // this costs three queries for the whole list rather than four per group.
    let balancesByGroup;
    try {
      balancesByGroup = await calculateBalancesForGroups(groups);
    } catch {
      balancesByGroup = new Map();
    }
    const enriched = groups.map((g) => {
      const b = balancesByGroup.get(g._id.toString());
      const mine = b?.members.find(m => m.user.id === userId);
      return {
        ...g.toObject(),
        myBalance: mine?.netBalance ?? 0,
        ...(withDebts ? { debts: b?.debts ?? [] } : {}),
      };
    });
    return res.json({ success: true, count: enriched.length, groups: enriched });
  }

  res.json({ success: true, count: groups.length, groups });
});

// GET /api/groups/:id
const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('members', 'name email upiId isVirtual')
    .populate('adminId', 'name email');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const isMember = group.members.some(m => m?._id?.toString() === req.user._id.toString());
  if (!isMember) {
    logger.warn('GROUP', `Access denied — user not a member`, { groupId: req.params.id, userId: req.user._id });
    return res.status(403).json({ success: false, message: 'Not a group member' });
  }

  logger.debug('GROUP', `Group fetched: "${group.name}"`, { groupId: group._id, userId: req.user._id });
  res.json({ success: true, group });
});

// GET /api/groups/:id/members
const getMembers = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id).populate('members', 'name email isVirtual');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  // Filter nulls: populate() yields null for ids whose User was hard-deleted by
  // the pre-soft-delete contact flow. Without this, m._id throws a 500.
  const members = group.members.filter(Boolean).map(m => ({
    id:        m._id,
    name:      m.name,
    email:     m.email,
    isVirtual: m.isVirtual || false,
    role:      m._id.toString() === group.adminId.toString() ? 'Admin' : 'Member',
  }));

  logger.debug('GROUP', `Members fetched for group "${group.name}"`, { count: members.length });
  res.json({ success: true, members });
});

// POST /api/groups/:id/members
const addMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
  if (!mongoose.Types.ObjectId.isValid(userId))
    return res.status(400).json({ success: false, message: 'Invalid userId format' });

  const group = req.group;
  if (group.adminId.toString() !== req.user._id.toString()) {
    logger.warn('GROUP', `Add member denied — not admin`, { groupId: group._id, userId: req.user._id });
    return res.status(403).json({ success: false, message: 'Only the admin can add members' });
  }

  const userToAdd = await User.findById(userId);
  if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found' });

  if (group.members.some(m => m.toString() === userToAdd._id.toString()))
    return res.status(409).json({ success: false, message: 'User is already a member' });

  const friends = await areFriends(req.user._id, userToAdd._id);
  const isOwnContact = userToAdd.isVirtual &&
    !userToAdd.deletedAt &&
    userToAdd.createdBy?.toString() === req.user._id.toString();
  if (!friends && !isOwnContact) {
    logger.warn('GROUP', `Add member denied — not friends or own contact`, { groupId: group._id, targetUserId: userToAdd._id });
    return res.status(403).json({ success: false, message: 'User must be your friend or personal contact to be added to a group' });
  }

  group.members.push(userToAdd._id);
  await group.save();

  logger.info('GROUP', `Member added: ${userToAdd.name} → group "${group.name}"`, {
    groupId: group._id,
    addedUserId: userToAdd._id,
  });

  res.json({
    success: true,
    message: `${userToAdd.name} added to group`,
    member: { id: userToAdd._id, name: userToAdd.name, email: userToAdd.email, upiId: userToAdd.upiId || '', isVirtual: userToAdd.isVirtual || false, role: 'Member' },
  });
});

// DELETE /api/groups/:id/members/:userId
const removeMember = asyncHandler(async (req, res) => {
  const group = req.group;
  if (group.adminId.toString() !== req.user._id.toString()) {
    logger.warn('GROUP', `Remove member denied — not admin`, { groupId: group._id, userId: req.user._id });
    return res.status(403).json({ success: false, message: 'Only the admin can remove members' });
  }

  const { userId } = req.params;
  if (userId === group.adminId.toString())
    return res.status(400).json({ success: false, message: 'Cannot remove the group admin' });

  const idx = group.members.findIndex(m => m.toString() === userId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Member not found in group' });

  // Their expenses and settlements stay in the ledger after they leave, so
  // removing someone mid-balance strands money: recordSettlement refuses a
  // non-member, which makes the amount unpayable. They have to be square first.
  const { members: balances } = await calculateGroupBalances(group);
  const leaving = balances.find(m => m.user.id === userId);
  const net = leaving?.netBalance ?? 0;
  if (Math.abs(net) > 0.01) {
    return res.status(400).json({
      success: false,
      message: net < 0
        ? `${leaving.user.name} still owes \u20b9${Math.abs(net).toFixed(2)} in this group. Settle up before removing them.`
        : `${leaving.user.name} is still owed \u20b9${net.toFixed(2)} in this group. Settle up before removing them.`,
    });
  }

  group.members.splice(idx, 1);
  await group.save();

  logger.info('GROUP', `Member removed from group "${group.name}"`, { groupId: group._id, removedUserId: userId });
  res.json({ success: true, message: 'Member removed' });
});

module.exports = { createGroup, getUserGroups, getGroup, getMembers, addMember, removeMember };
