const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // --- NEW: For generating random password
const { OAuth2Client } = require('google-auth-library'); // --- NEW: Google Auth
const User = require('../models/user.model');

// --- NEW: Initialize Google client ---
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.signup = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ message: 'Email, password and name required' });

  try {
    
    const exists = await User.findOne({ email }).select('+password');
    if (exists)
      return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,              
      email,
      password: hashed,
      provider: 'email', // Explicitly set provider
    });


    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      id: user._id,
      email: user.email,
      name: user.name,
      token,
      message: 'Signup successful'
    });


  } catch (err) {
    console.error('Signup error:', err);
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

    // --- NEW: Check if user signed up with Google ---
    if (user.provider === 'google') {
      return res.status(403).json({ message: 'This email is registered with Google. Please use "Sign in with Google".' });
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

// --- NEW: Google Login/Signup Handler ---
exports.googleLogin = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Google token is required' });
  }

  try {
    // 1. Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, sub: googleId } = ticket.getPayload();

    // 2. Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // 3. User exists - Check provider
      if (user.provider === 'email') {
        // User exists but with password.
        return res.status(409).json({ message: 'Email already registered with password. Please log in using email and password.' });
      }
      // If user.provider is 'google', we just log them in (Step 5)

    } else {
      // 4. User does not exist - Create new Google user
      // We create a random password for them to satisfy the DB schema,
      // but they will never use it.
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        googleId,
        provider: 'google',
      });
    }

    // 5. Create and send our app's JWT token
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