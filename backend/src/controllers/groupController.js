const Group      = require('../models/Group');
const User       = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

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

  res.status(201).json({ success: true, group });
});

// GET /api/groups
const getUserGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id })
    .populate('adminId', 'name email')
    .populate('members', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: groups.length, groups });
});

// GET /api/groups/:id
const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('members', 'name email')
    .populate('adminId', 'name email');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
  if (!isMember) return res.status(403).json({ success: false, message: 'Not a group member' });

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

  res.json({ success: true, members });
});

// POST /api/groups/:id/members
const addMember = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const group = req.group;
  if (group.adminId.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Only the admin can add members' });

  const userToAdd = await User.findOne({ email: email.toLowerCase() });
  if (!userToAdd) return res.status(404).json({ success: false, message: 'No registered user found with that email' });

  if (group.members.some(m => m.toString() === userToAdd._id.toString()))
    return res.status(409).json({ success: false, message: 'User is already a member' });

  group.members.push(userToAdd._id);
  await group.save();

  res.json({
    success: true,
    message: `${userToAdd.name} added to group`,
    member: { id: userToAdd._id, name: userToAdd.name, email: userToAdd.email, role: 'Member' },
  });
});

// DELETE /api/groups/:id/members/:userId
const removeMember = asyncHandler(async (req, res) => {
  const group = req.group;
  if (group.adminId.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Only the admin can remove members' });

  const { userId } = req.params;
  if (userId === group.adminId.toString())
    return res.status(400).json({ success: false, message: 'Cannot remove the group admin' });

  const idx = group.members.findIndex(m => m.toString() === userId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Member not found in group' });

  group.members.splice(idx, 1);
  await group.save();

  res.json({ success: true, message: 'Member removed' });
});

module.exports = { createGroup, getUserGroups, getGroup, getMembers, addMember, removeMember };
