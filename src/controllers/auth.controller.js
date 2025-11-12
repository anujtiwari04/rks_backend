const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const { sendEmail } = require('../config/mailer.config.js');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

exports.signup = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ message: 'Email, password and name required' });

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.provider === 'google') {
        return res.status(409).json({ message: 'This email is registered with Google. Please use "Sign in with Google".' });
      }
      if (existingUser.isVerified) {
        return res.status(409).json({ message: 'Email already registered and verified.' });
      }
      await User.deleteOne({ _id: existingUser._id });
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      provider: 'email',
      isVerified: false,
      otp: hashedOtp,
      otpExpiry: otpExpiry,
    });

    await sendEmail({
      to: email,
      subject: 'Your Verification Code - Rajesh Kumar Sodhani',
      text: `Your OTP for Rajesh Kumar Sodhani is: ${otp}\nThis code will expire in 10 minutes.`,
      html: `<p>Your OTP for Rajesh Kumar Sodhani is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });

    res.status(201).json({
      message: 'Signup successful. Please check your email for an OTP.',
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    const user = await User.findOne({ email, isVerified: false }).select('+otp +otpExpiry');

    if (!user) {
      return res.status(404).json({ message: 'User not found or already verified.' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired. Please sign up again to get a new one.' });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
    });

  } catch (err) {
    console.error('OTP Verification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return res.status(401).json({ message: 'No email found' });

    if (user.provider === 'google') {
      return res.status(403).json({ message: 'This email is registered with Google. Please use "Sign in with Google".' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified. Please complete the OTP verification.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Wrong password' });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.googleLogin = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Google token is required' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (user) {
      if (user.provider === 'email') {
        return res.status(409).json({ message: 'Email already registered with password. Please log in using email and password.' });
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        provider: 'google',
        isVerified: true,
      });
    }

    const appToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      token: appToken,
    });

  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
};

// --- NEW: Forgot Password Controller ---
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });

    // Important: Don't tell the user if the email exists or not.
    // And only send OTP if they are an 'email' provider.
    if (user && user.provider === 'email') {
      const otp = generateOTP();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.otp = hashedOtp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP email
      await sendEmail({
        to: email,
        subject: 'Your Password Reset Code - Rajesh Kumar Sodhani',
        text: `Your OTP to reset your password is: ${otp}\nThis code will expire in 10 minutes.`,
        html: `<p>Your OTP to reset your password is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
      });
    }
    
    // Send a generic success message
    res.status(200).json({ message: 'If an account with this email exists, a password reset OTP has been sent.' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- NEW: Reset Password Controller ---
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
  }

  try {
    const user = await User.findOne({ email, provider: 'email' }).select('+otp +otpExpiry');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    if (!user.otp || !user.otpExpiry) {
        return res.status(400).json({ message: 'No password reset requested. Please try again.' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // All checks passed. Reset password.
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined; // Clear OTP fields
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please log in.' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};