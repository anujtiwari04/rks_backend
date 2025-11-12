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
    required: function() { return this.provider === 'email'; },
    minlength: 6,
    select: false, 
  },
  provider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email',
  },
  googleId: {
    type: String,
    sparse: true, 
    unique: true, 
    // default: null,
  },
  // --- NEW FIELDS FOR OTP ---
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    select: false, // Don't return OTP hash in general queries
  },
  otpExpiry: {
    type: Date,
    select: false, // Don't return expiry in general queries
  },
  // -------------------------
  mobile: { type: String, default: '' },
  dob: { type: String, default: '' },
  address: { type: String, default: '' },
  state: { type: String, default: '' },
  pinCode: { type: String, default: '' },
}, {
  timestamps: true 
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);