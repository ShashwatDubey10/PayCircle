const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: [true, 'Group name is required'],
      trim: true, minlength: 3, maxlength: 50,
    },
    type: {
      type: String,
      enum: ['Roommates', 'Trip', 'Mess', 'Miscellaneous'],
      default: 'Miscellaneous',
    },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Group.find({ members: userId }) is the app's hottest query — the dashboard,
// the groups list, the budget and analytics screens, the direct-chat screen and
// the batched settlements endpoint all run it. Without this it is a full
// collection scan every time.
groupSchema.index({ members: 1 });

module.exports = mongoose.model('Group', groupSchema);
