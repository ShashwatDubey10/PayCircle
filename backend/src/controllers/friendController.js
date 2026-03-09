const mongoose    = require('mongoose');
const User        = require('../models/User');
const Friendship  = require('../models/Friendship');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
const { sendPushNotification } = require('../utils/pushNotification');

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// ─── Helper: check if two users are accepted friends ──────────────────────────

async function areFriends(userAId, userBId) {
  const friendship = await Friendship.findOne({
    status: 'accepted',
    $or: [
      { requester: userAId, recipient: userBId },
      { requester: userBId, recipient: userAId },
    ],
  });
  return !!friendship;
}

// ─── GET /api/users/search?username=xxx ───────────────────────────────────────

const searchUsers = asyncHandler(async (req, res) => {
  const { username } = req.query;
  if (!username || username.trim().length < 2)
    return res.status(400).json({ success: false, message: 'Provide at least 2 characters to search' });

  const meId = req.user._id;

  // Find accepted friendships so we can exclude them
  const existingFriendships = await Friendship.find({
    $or: [{ requester: meId }, { recipient: meId }],
  });
  const relatedIds = existingFriendships.map(f =>
    f.requester.toString() === meId.toString() ? f.recipient : f.requester
  );

  // Escape regex metacharacters to prevent ReDoS
  const escaped = username.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const users = await User.find({
    _id:      { $ne: meId, $nin: relatedIds },
    username: { $regex: escaped, $options: 'i' },
  })
    .select('name username avatar')
    .limit(20);

  logger.debug('FRIEND', `Search "${username}" → ${users.length} results`, { userId: meId });
  res.json({ success: true, users });
});

// ─── POST /api/users/me/friends/requests ──────────────────────────────────────

const sendRequest = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;
  const meId = req.user._id;

  if (!recipientId)
    return res.status(400).json({ success: false, message: 'recipientId is required' });
  if (recipientId === meId.toString())
    return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });

  const recipient = await User.findById(recipientId);
  if (!recipient)
    return res.status(404).json({ success: false, message: 'User not found' });

  // Check for existing relationship
  const existing = await Friendship.findOne({
    $or: [
      { requester: meId, recipient: recipientId },
      { requester: recipientId, recipient: meId },
    ],
  });
  if (existing) {
    const msg = existing.status === 'accepted'
      ? 'You are already friends'
      : 'A friend request already exists between you two';
    return res.status(409).json({ success: false, message: msg });
  }

  const friendship = await Friendship.create({ requester: meId, recipient: recipientId });

  logger.info('FRIEND', `Request sent: ${req.user.name} → ${recipient.name}`, {
    friendshipId: friendship._id,
  });

  // Push notification — fire-and-forget
  sendPushNotification(
    recipient.expoPushToken,
    'New Friend Request',
    `${req.user.name} sent you a friend request`,
    { type: 'friend_request', friendshipId: friendship._id.toString() }
  );

  res.status(201).json({ success: true, message: 'Friend request sent', friendship });
});

// ─── GET /api/users/me/friends/requests ───────────────────────────────────────

const getRequests = asyncHandler(async (req, res) => {
  const requests = await Friendship.find({
    recipient: req.user._id,
    status:    'pending',
  }).populate('requester', 'name username avatar');

  logger.debug('FRIEND', `Pending requests: ${requests.length}`, { userId: req.user._id });
  res.json({ success: true, requests });
});

// ─── PUT /api/users/me/friends/requests/:id ───────────────────────────────────

const respondRequest = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'reject'].includes(action))
    return res.status(400).json({ success: false, message: 'action must be "accept" or "reject"' });

  const friendship = await Friendship.findOne({
    _id:       req.params.id,
    recipient: req.user._id,
    status:    'pending',
  });

  if (!friendship)
    return res.status(404).json({ success: false, message: 'Friend request not found' });

  if (action === 'accept') {
    friendship.status = 'accepted';
    await friendship.save();
    logger.info('FRIEND', `Request accepted`, { friendshipId: friendship._id, userId: req.user._id });
    return res.json({ success: true, message: 'Friend request accepted', friendship });
  }

  // reject → delete
  await friendship.deleteOne();
  logger.info('FRIEND', `Request rejected and deleted`, { friendshipId: friendship._id, userId: req.user._id });
  res.json({ success: true, message: 'Friend request rejected' });
});

// ─── GET /api/users/me/friends ────────────────────────────────────────────────

const getFriends = asyncHandler(async (req, res) => {
  const meId = req.user._id;

  const friendships = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: meId }, { recipient: meId }],
  })
    .populate('requester', 'name username avatar')
    .populate('recipient', 'name username avatar');

  const friends = friendships.map(f => {
    const other = f.requester._id.toString() === meId.toString() ? f.recipient : f.requester;
    return { id: other._id, name: other.name, username: other.username, avatar: other.avatar };
  });

  logger.debug('FRIEND', `Friends list: ${friends.length}`, { userId: meId });
  res.json({ success: true, friends });
});

// ─── PUT /api/users/me/username ───────────────────────────────────────────────

const setUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username)
    return res.status(400).json({ success: false, message: 'username is required' });

  const cleaned = username.trim().toLowerCase();
  if (!USERNAME_RE.test(cleaned))
    return res.status(400).json({ success: false, message: 'Username must be 3–20 chars, letters/numbers/underscore only' });

  const conflict = await User.findOne({ username: cleaned, _id: { $ne: req.user._id } });
  if (conflict)
    return res.status(409).json({ success: false, message: 'Username is already taken' });

  let user;
  try {
    user = await User.findByIdAndUpdate(
      req.user._id,
      { username: cleaned },
      { new: true, select: 'id name email username walletBalance' }
    );
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Username is already taken' });
    }
    throw err;
  }

  logger.info('FRIEND', `Username set: ${cleaned}`, { userId: req.user._id });
  res.json({ success: true, user });
});

// ─── PUT /api/users/me/push-token ────────────────────────────────────────────

const setPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await User.findByIdAndUpdate(req.user._id, { expoPushToken: token ?? null });
  logger.debug('FRIEND', `Push token updated`, { userId: req.user._id });
  res.json({ success: true });
});

module.exports = {
  searchUsers,
  sendRequest,
  getRequests,
  respondRequest,
  getFriends,
  setUsername,
  setPushToken,
  areFriends,
};
