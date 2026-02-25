const mongoose = require('mongoose');

const personalTransactionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, enum: ['income', 'expense'], required: true },
    amount:   { type: Number, required: true, min: 0.01 },
    category: {
      type: String,
      enum: ['Food', 'Travel', 'Utilities', 'Entertainment', 'Health',
             'Shopping', 'Salary', 'Freelance', 'Investment', 'Miscellaneous'],
      required: true,
    },
    date:  { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

personalTransactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('PersonalTransaction', personalTransactionSchema);
