const mongoose = require('mongoose');

const categoryBudgetSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true, maxlength: 50 },
    amount:   { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month:      { type: String, required: true }, // 'YYYY-MM'
    amount:     { type: Number, default: 0, min: 0 },
    categories: { type: [categoryBudgetSchema], default: [] },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
