const mongoose   = require('mongoose');
const SplitTag   = require('../models/SplitTag');
const Budget     = require('../models/Budget');
const asyncHandler = require('../utils/asyncHandler');
const logger     = require('../utils/logger');

const getMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// POST /api/users/me/split-tags
const upsertSplitTag = asyncHandler(async (req, res) => {
  const { refId, refType, category } = req.body;
  const userId = req.user._id;

  // Validate
  if (!refId || !mongoose.Types.ObjectId.isValid(refId))
    return res.status(400).json({ success: false, message: 'Invalid refId' });
  if (!['direct', 'group'].includes(refType))
    return res.status(400).json({ success: false, message: 'refType must be "direct" or "group"' });
  const trimmedCat = typeof category === 'string' ? category.trim() : '';
  if (!trimmedCat)
    return res.status(400).json({ success: false, message: 'category is required' });

  // Upsert the tag
  const tag = await SplitTag.findOneAndUpdate(
    { userId, refId, refType },
    { category: trimmedCat },
    { upsert: true, new: true }
  );

  // Auto-create tracking category in current month budget if not already present
  const month = getMonthStr();
  const budget = await Budget.findOneAndUpdate(
    { userId, month },
    { $setOnInsert: { amount: 0 } },
    { upsert: true, new: true }
  );

  const catLower = trimmedCat.toLowerCase();
  const alreadyExists = (budget.categories || []).some(
    c => c.category.toLowerCase() === catLower
  );
  if (!alreadyExists) {
    await Budget.updateOne(
      { userId, month },
      { $push: { categories: { category: trimmedCat, amount: 0 } } }
    );
  }

  logger.info('TAG', `SplitTag upserted: ${refType}/${refId} → ${trimmedCat}`, { userId });
  res.json({ success: true, tag });
});

// GET /api/users/me/split-tags
const getSplitTags = asyncHandler(async (req, res) => {
  const tags = await SplitTag.find({ userId: req.user._id }).lean();
  res.json({ success: true, tags });
});

module.exports = { upsertSplitTag, getSplitTags };
