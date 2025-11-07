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
    required: true,
    minlength: 6,
    // Add select: false so it doesn't return the password by default
    select: false, 
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

// Middleware to hash password before saving
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// Method to compare password (this is what auth.controller.js needs)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Use module.exports
module.exports = mongoose.model('User', userSchema);