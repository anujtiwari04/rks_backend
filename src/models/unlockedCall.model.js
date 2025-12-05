const mongoose = require('mongoose');

const unlockedCallSchema = new mongoose.Schema(
  {
    // --- Link to the User ---
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // For fast lookups of a user's unlocked calls
    },

    // --- Link to the Call ---
    call: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyCall',
      required: true,
    },

    // --- Payment Details ---
    // Critical for audit trails and dispute resolution
    razorpayPaymentId: {
      type: String,
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      // Store the exact amount paid (in paise) at that time
    },

    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Ensure a user cannot accidentally buy the same call twice
unlockedCallSchema.index({ user: 1, call: 1 }, { unique: true });

module.exports = mongoose.model('UnlockedCall', unlockedCallSchema);