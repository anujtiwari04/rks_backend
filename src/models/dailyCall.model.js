const mongoose = require('mongoose');

const dailyCallSchema = new mongoose.Schema(
  {
    // --- Public Teaser Data (Visible to everyone) ---
    title: {
      type: String,
      required: true,
      trim: true,
      // e.g., "High Conviction Bank Nifty Call"
    },
    price: {
      type: Number,
      required: true,
      // The cost to unlock this specific call (e.g., 99, 199)
    },
    // status: {
    //   type: String,
    //   enum: ['active', 'closed', 'expired'],
    //   default: 'active',
    //   // 'active': Show in list, buyable
    //   // 'closed': Target hit or SL hit (still visible in history)
    //   // 'expired': No longer valid
    // },

    // --- Premium Data (Unlocked only after payment) ---
    scrip: {
      type: String,
      required: true,
      trim: true,
      // e.g., "BANKNIFTY 44500 CE" or "RELIANCE"
    },
    action: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    entry: {
      type: String,
      required: true,
      // e.g., "320-330" (String to allow ranges)
    },
    buyMore: {
      type: String,
      default: '',
      // e.g., "280" (Optional averaging level)
    },
    target: {
      type: String,
      required: true,
      // e.g., "450 / 500"
    },
    stopLoss: {
      type: String,
      required: true,
      // e.g., "250"
    },
    rationale: {
      type: String,
      // e.g., "Strong breakout above resistance with high volume."
    },

    // --- Admin/System Fields ---
    isDeleted: {
      type: Boolean,
      default: false,
      // Soft delete flag. If true, hide from Admin List and User List,
      // but keep in DB so 'UnlockedCall' references don't break.
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

module.exports = mongoose.model('DailyCall', dailyCallSchema);