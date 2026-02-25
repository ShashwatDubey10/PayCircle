const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    groupId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date:   { type: Date, required: true, default: Date.now },
    notes:  { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

settlementSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
