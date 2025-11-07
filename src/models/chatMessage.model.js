// rks-backend/src/models/chatMessage.model.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    // Link to the plan by its name
    planName: {
      type: String,
      required: true,
      trim: true,
      index: true, // Add index for faster queries
    },
    // The content of the message
    content: {
      type: String,
      required: true,
    },
    // Reference to the Admin User who posted it
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    // Automatically adds createdAt and updatedAt
    timestamps: true,
  }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);