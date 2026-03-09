const mongoose   = require('mongoose');
const Group      = require('../models/Group');
const User       = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { calculateGroupBalances } = require('../services/balanceService');
const { areFriends } = require('./friendController');

const VALID_TYPES = ['Roommates', 'Trip', 'Mess', 'Miscellaneous'];

// POST /api/groups
const createGroup = asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, message: 'Name and type are required' });
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
    .sort({ createdAt: -1 });

  logger.debug('GROUP', `Fetched ${groups.length} groups for user`, { userId: req.user._id });

  if (req.query.includeBalances === 'true') {
    const userId = req.user._id.toString();
    const enriched = await Promise.all(
      groups.map(async (g) => {
        try {
          const { members } = await calculateGroupBalances(g._id);
          const mine = members.find(m => m.user.id === userId);
          return { ...g.toObject(), myBalance: mine?.netBalance ?? 0 };
        } catch {
          return { ...g.toObject(), myBalance: 0 };
        }
      })
    );
    return res.json({ success: true, count: enriched.length, groups: enriched });
  }

  res.json({ success: true, count: groups.length, groups });
});

// GET /api/groups/:id
const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('members', 'name email')
    .populate('adminId', 'name email');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
  if (!isMember) {
    logger.warn('GROUP', `Access denied — user not a member`, { groupId: req.params.id, userId: req.user._id });
    return res.status(403).json({ success: false, message: 'Not a group member' });
  }

  logger.debug('GROUP', `Group fetched: "${group.name}"`, { groupId: group._id, userId: req.user._id });
  res.json({ success: true, group });
});

// GET /api/groups/:id/members
const getMembers = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id).populate('members', 'name email');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const members = group.members.map(m => ({
    id:    m._id,
    name:  m.name,
    email: m.email,
    role:  m._id.toString() === group.adminId.toString() ? 'Admin' : 'Member',
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
  if (!friends) {
    logger.warn('GROUP', `Add member denied — not friends`, { groupId: group._id, targetUserId: userToAdd._id });
    return res.status(403).json({ success: false, message: 'User must be your friend to be added to a group' });
  }

  group.members.push(userToAdd._id);
  await group.save();

  logger.info('GROUP', `Member added: ${userToAdd.email} → group "${group.name}"`, {
    groupId: group._id,
    addedUserId: userToAdd._id,
  });

  res.json({
    success: true,
    message: `${userToAdd.name} added to group`,
    member: { id: userToAdd._id, name: userToAdd.name, email: userToAdd.email, role: 'Member' },
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

  group.members.splice(idx, 1);
  await group.save();

  logger.info('GROUP', `Member removed from group "${group.name}"`, { groupId: group._id, removedUserId: userId });
  res.json({ success: true, message: 'Member removed' });
});

module.exports = { createGroup, getUserGroups, getGroup, getMembers, addMember, removeMember };
