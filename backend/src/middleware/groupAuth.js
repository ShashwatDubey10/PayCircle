const Group = require('../models/Group');

const isMember = async (req, res, next) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const member = group.members.some(m => m.toString() === req.user._id.toString());
  if (!member) return res.status(403).json({ success: false, message: 'You are not a member of this group' });

  req.group = group;
  next();
};

const isAdmin = (req, res, next) => {
  const group = req.group;
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
  if (group.adminId.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

module.exports = { isMember, isAdmin };
