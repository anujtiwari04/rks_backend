const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const { sendEmail } = require('../config/mailer.config.js'); // --- NEW ---

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- NEW: Helper function to generate OTP ---
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// --- UPDATED: Signup now sends OTP and creates an unverified user ---
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
      // If user exists but is not verified, delete them to restart process
      await User.deleteOne({ _id: existingUser._id });
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create unverified user
    await User.create({
      name,
      email,
      password: hashedPassword,
      provider: 'email',
      isVerified: false,
      otp: hashedOtp,
      otpExpiry: otpExpiry,
    });

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'Your Verification Code - RKS Advisor',
      text: `Your OTP for RKS Advisor is: ${otp}\nThis code will expire in 10 minutes.`,
      html: `<p>Your OTP for RKS Advisor is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });

    // --- DO NOT SEND JWT ---
    // Send a success message prompting for OTP
    res.status(201).json({
      message: 'Signup successful. Please check your email for an OTP.',
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- NEW: Verify OTP and Login ---
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

    // Verification successful
    user.isVerified = true;
    user.otp = undefined; // Clear OTP fields
    user.otpExpiry = undefined;
    await user.save();

    // Now, log them in by creating a JWT
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


// --- UPDATED: Login now checks for verification ---
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

    // --- NEW: Verification Check ---
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

// --- UPDATED: Google Login now sets isVerified to true ---
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
      // Create a *verified* Google user
      user = await User.create({
        name,
        email,
        googleId,
        provider: 'google',
        isVerified: true, // --- Google users are verified by default ---
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












// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto'); // --- NEW: For generating random password
// const { OAuth2Client } = require('google-auth-library'); // --- NEW: Google Auth
// const User = require('../models/user.model');

// // --- NEW: Initialize Google client ---
// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// exports.signup = async (req, res) => {
//   const { email, password, name } = req.body;
//   if (!email || !password || !name)
//     return res.status(400).json({ message: 'Email, password and name required' });

//   try {
    
//     const exists = await User.findOne({ email }).select('+password');
//     if (exists)
//       return res.status(409).json({ message: 'Email already registered' });

//     const hashed = await bcrypt.hash(password, 10);
//     const user = await User.create({
//       name,              
//       email,
//       password: hashed,
//       provider: 'email', // Explicitly set provider
//     });


//     const token = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.status(201).json({
//       id: user._id,
//       email: user.email,
//       name: user.name,
//       token,
//       message: 'Signup successful'
//     });


//   } catch (err) {
//     console.error('Signup error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.login = async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ message: 'Email and password required' });

//   try {
//     const user = await User.findOne({ email }).select('+password');
//     if (!user)
//       return res.status(401).json({ message: 'No email found' });

//     // --- NEW: Check if user signed up with Google ---
//     if (user.provider === 'google') {
//       return res.status(403).json({ message: 'This email is registered with Google. Please use "Sign in with Google".' });
//     }

//     const match = await bcrypt.compare(password, user.password);
//     if (!match)
//       return res.status(401).json({ message: 'Wrong password' });

//     const token = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.json({
//       id: user._id,
//       email: user.email,
//       name: user.name,
//       role: user.role,
//       token
//     });
//   } catch (err) {
//     console.error('Login error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // --- NEW: Google Login/Signup Handler ---
// exports.googleLogin = async (req, res) => {
//   const { token } = req.body;
//   if (!token) {
//     return res.status(400).json({ message: 'Google token is required' });
//   }

//   try {
//     // 1. Verify Google Token
//     const ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });
//     const { email, name, sub: googleId } = ticket.getPayload();

//     // 2. Check if user already exists
//     let user = await User.findOne({ email });

//     if (user) {
//       // 3. User exists - Check provider
//       if (user.provider === 'email') {
//         // User exists but with password.
//         return res.status(409).json({ message: 'Email already registered with password. Please log in using email and password.' });
//       }
//       // If user.provider is 'google', we just log them in (Step 5)

//     } else {
//       // 4. User does not exist - Create new Google user
//       // We create a random password for them to satisfy the DB schema,
//       // but they will never use it.
//       const randomPassword = crypto.randomBytes(32).toString('hex');
//       const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
//       user = await User.create({
//         name,
//         email,
//         password: hashedPassword,
//         googleId,
//         provider: 'google',
//       });
//     }

//     // 5. Create and send our app's JWT token
//     const appToken = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.json({
//       id: user._id,
//       email: user.email,
//       name: user.name,
//       role: user.role,
//       token: appToken,
//     });

//   } catch (err) {
//     console.error('Google login error:', err);
//     res.status(500).json({ message: 'Google authentication failed' });
//   }
// };