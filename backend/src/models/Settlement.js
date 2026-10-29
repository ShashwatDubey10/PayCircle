const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    groupId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date:   { type: Date, required: true, default: Date.now },
    notes:  { type: String, trim: true, maxlength: 200, default: '' },

    // A reversal is an ordinary settlement row that points at the one it
    // undoes, and counts against the balance instead of towards it. Nothing is
    // deleted: the original claim and its withdrawal both stay in the history,
    // which is the same way a wrong expense is corrected elsewhere in the app.
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement', default: null },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',       default: null },
  },
  { timestamps: true }
);

settlementSchema.index({ groupId: 1, createdAt: -1 });
// Looked up to refuse reversing the same settlement twice.
settlementSchema.index({ reversalOf: 1 });

module.exports = mongoose.model('Settlement', settlementSchema);
