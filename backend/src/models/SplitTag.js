const mongoose = require('mongoose');

const splitTagSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refId:    { type: mongoose.Schema.Types.ObjectId, required: true }, // DirectSplit._id or Expense._id
  refType:  { type: String, enum: ['direct', 'group'], required: true },
  category: { type: String, required: true, trim: true, maxlength: 50 },
}, { timestamps: true });

splitTagSchema.index({ userId: 1, refId: 1, refType: 1 }, { unique: true });

module.exports = mongoose.model('SplitTag', splitTagSchema);
