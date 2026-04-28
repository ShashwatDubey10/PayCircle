const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema(
  { userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 } },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    groupId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    amount:    { type: Number, required: true, min: 0.01, max: 100000 },
    payerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    date:      { type: Date, required: true, default: Date.now },
    category:  { type: String, enum: ['Food', 'Travel', 'Utilities', 'Miscellaneous'], required: true },
    notes:     { type: String, trim: true, maxlength: 200, default: '' },
    splitType: { type: String, enum: ['equal', 'exact'], required: true },
    splits:    [splitSchema],
  },
  { timestamps: true }
);

expenseSchema.index({ groupId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
