const mongoose = require('mongoose');

const directSettleSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // debtor (who requested)
  toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // creditor (who confirms)
  amount:     { type: Number, required: true, min: 0.01 },
  status:     { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
  confirmedAt: { type: Date, default: null },
}, { timestamps: true });

directSettleSchema.index({ fromUserId: 1, toUserId: 1 });

module.exports = mongoose.model('DirectSettle', directSettleSchema);
