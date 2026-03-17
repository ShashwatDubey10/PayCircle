const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status:    { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true }
);

friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

friendshipSchema.pre('validate', function () {
  if (this.requester && this.recipient && this.requester.equals(this.recipient)) {
    throw new Error('Requester and recipient cannot be the same user');
  }
});

module.exports = mongoose.model('Friendship', friendshipSchema);
