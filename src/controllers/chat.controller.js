// rks_backend/src/controllers/chat.controller.js
const ChatMessage = require('../models/chatMessage.model.js');
const MembershipPlan = require('../models/membershipPlan.model.js');
const Membership = require('../models/membership.modal.js');

// @desc    Admin creates a new message for a plan
// @route   POST /api/chat/create
// @access  Admin
const createMessage = async (req, res) => {
  const { planName, content } = req.body;
  const adminUserId = req.user._id; // from 'protect' middleware

  if (!planName || !content) {
    return res.status(400).json({ message: 'planName and content are required' });
  }

  try {
    // Check if plan exists
    const planExists = await MembershipPlan.findOne({ name: planName });
    if (!planExists) {
      return res.status(404).json({ message: 'Membership plan not found' });
    }

    const message = await ChatMessage.create({
      planName,
      content,
      author: adminUserId,
    });
    
    // --- POPULATE AUTHOR NAME ON CREATE ---
    // Populate the author details immediately after creation
    const populatedMessage = await ChatMessage.findById(message._id).populate(
      'author',
      'name',
    );
    // --- END NEW LOGIC ---

    res.status(201).json(populatedMessage); // Send back the populated message
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Admin deletes a message
// @route   DELETE /api/chat/:messageId
// @access  Admin
const deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Optional: You could also check if the author matches req.user._id
    // if (message.author.toString() !== req.user._id) {
    //   return res.status(403).json({ message: 'Not authorized to delete this message' });
    // }

    await message.deleteOne(); // Use deleteOne() on the document

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    User/Admin gets messages for a plan
// @route   GET /api/chat/:planName
// @access  Private (Subscribed Users or Admins)
const getMessagesForPlan = async (req, res) => {
  const { planName } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role; // from 'protect' middleware

  try {
    // --- UPDATED LOGIC: Allow admin access ---
    let isAuthorized = false;

    if (userRole === 'admin') {
      isAuthorized = true;
    } else {
      // 1. Check if user has an active subscription to this plan
      const activeSubscription = await Membership.findOne({
        user: userId,
        planName: planName,
        status: 'active',
        expiryDate: { $gt: new Date() }, // Ensure expiry date is in the future
      });
      if (activeSubscription) {
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this plan.' });
    }
    // --- END UPDATED LOGIC ---


    // 2. If authorized, fetch all messages for that plan
    const messages = await ChatMessage.find({ planName: planName })
      .sort({ createdAt: 'asc' }) // Show oldest first, like a chat
      .populate('author', 'name'); // Show admin's name

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createMessage,
  deleteMessage,
  getMessagesForPlan,
};