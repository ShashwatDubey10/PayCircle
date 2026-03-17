const mongoose = require('mongoose');

const directSplitSchema = new mongoose.Schema(
  {
    payerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    otherUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:      { type: Number, required: true, min: 0.01 },
    description: { type: String, trim: true, default: '' },
    payerShare:  { type: Number, min: 0, default: null },
    date:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

directSplitSchema.pre('validate', function () {
  if (this.payerId && this.otherUserId && this.payerId.toString() === this.otherUserId.toString()) {
    this.invalidate('otherUserId', 'payerId and otherUserId must be different users');
  }
});

directSplitSchema.index({ payerId: 1, otherUserId: 1 });
directSplitSchema.index({ otherUserId: 1, payerId: 1 });

module.exports = mongoose.model('DirectSplit', directSplitSchema);
