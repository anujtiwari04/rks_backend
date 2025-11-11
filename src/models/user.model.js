const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    // Make password required only if the provider is 'email'
    required: function() { return this.provider === 'email'; },
    minlength: 6,
    select: false, 
  },
  // --- NEW: Track auth provider ---
  provider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email',
  },
  // --- NEW: Store Google's unique ID ---
  googleId: {
    type: String,
    sparse: true, // Allows multiple null values
    unique: true, // Ensures googleId is unique if it exists
    default: null,
  },
  // Add the fields from your subscription form
  mobile: { type: String, default: '' },
  dob: { type: String, default: '' },
  address: { type: String, default: '' },
  state: { type: String, default: '' },
  pinCode: { type: String, default: '' },
  // panNumber: { type: String, default: '' },
  // aadharNumber: { type: String, default: '' },
}, {
  timestamps: true // Use timestamps instead of manual createdAt
});

// Method to compare password (this is what auth.controller.js needs)
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Only compare if user has a password (is 'email' provider)
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Use module.exports
module.exports = mongoose.model('User', userSchema);