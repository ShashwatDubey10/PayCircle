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

    // Who actually recorded this. `payerId` is a claim about who paid, taken
    // straight from the request body, so the two are not the same thing and
    // only this one is evidence. Null on rows written before the field existed.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // A deleted expense is kept rather than removed. Balances have to be able
    // to explain themselves afterwards, and a charge somebody disputed is
    // exactly the thing they will want to look back at.
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ groupId: 1, deletedAt: 1, date: -1 });

// Deleted expenses drop out of every query by default.
//
// Filtering at each call site would mean getting it right in eight places, one
// of which is the balance service — and a single miss there is money counted
// that nobody owes. `{ deletedAt: null }` also matches documents written before
// the field existed, which is every row currently in the database.
//
// `withDeleted: true` in a query's options opts out, for the rare caller that
// needs the whole history.
expenseSchema.pre(/^find/, function () {
  const opts = typeof this.getOptions === 'function' ? this.getOptions() : {};
  if (!opts.withDeleted) this.where({ deletedAt: null });
});

module.exports = mongoose.model('Expense', expenseSchema);
