const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

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
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
