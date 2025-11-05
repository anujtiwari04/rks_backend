import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    // --- Link to the User ---
    // This is the most important link. It connects this subscription
    // record to a specific user in your 'User' collection.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // This tells Mongoose to link to the 'User' model
    },

    // --- Plan Details ---
    // Stores which plan was purchased. We use a string to match the
    // plan names from your frontend (e.g., "CASH PREMIUM").
    planName: {
      type: String,
      required: true,
    },
    // Stores which duration was selected (e.g., "Quarterly", "Half Yearly").
    duration: {
      type: String,
      required: true,
    },

    // --- Subscription Status & Timing ---
    // The date the subscription payment was verified and started.
    // It defaults to the moment the record is created.
    startDate: {
      type: Date,
      default: Date.now,
    },
    // The date the subscription expires. This will be calculated
    // in your controller (e.g., startDate + 3 months).
    expiryDate: {
      type: Date,
      required: true,
    },
    // The current status of this subscription.
    // 'active': The user can access content.
    // 'expired': The subscription has passed its expiryDate.
    // 'cancelled': If you add a feature to let users cancel.
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },

    // --- Payment & Auditing ---
    // Storing the payment IDs is critical for record-keeping
    // and handling any customer disputes.
    razorpayPaymentId: {
      type: String,
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    // The amount (in smallest currency unit, e.g., paise)
    // that was paid for this specific subscription.
    amountPaid: {
      type: Number,
      required: true,
    },
  },
  {
    // --- Timestamps ---
    // Automatically adds `createdAt` and `updatedAt` fields.
    // 'createdAt' will be identical to 'startDate' by default,
    // which is perfect.
    timestamps: true,
  }
);

const Membership = mongoose.model('Membership', membershipSchema);

export default Membership;