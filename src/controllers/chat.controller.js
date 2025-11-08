// rks-backend/src/controllers/chat.controller.js
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
    
    // Populate the author details immediately after creation
    const populatedMessage = await ChatMessage.findById(message._id).populate(
      'author',
      'name',
    );

    res.status(201).json(populatedMessage); // Send back the populated message
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Admin deletes a message (SOFT DELETE)
// @route   DELETE /api/chat/delete/:messageId
// @access  Admin
const deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // --- UPDATED: Soft Delete Logic ---
    // Only allow admin to delete their own message (optional, but good practice)
    // if (message.author.toString() !== req.user._id) {
    //   return res.status(403).json({ message: 'Not authorized to delete this message' });
    // }
    
    message.content = "This message was deleted.";
    message.isDeleted = true;
    message.isEdited = false; // A deleted message is no longer "edited"
    
    const updatedMessage = await message.save();
    // --- END UPDATED ---

    res.status(200).json(updatedMessage); // Return the updated message
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- NEW FUNCTION: Edit a message ---
// @desc    Admin edits a message
// @route   PUT /api/chat/edit/:messageId
// @access  Admin
const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Don't allow editing a message that's already deleted
    if (message.isDeleted) {
        return res.status(400).json({ message: 'Cannot edit a deleted message' });
    }

    // Only allow admin to edit their own message (optional, but good practice)
    // if (message.author.toString() !== req.user._id) {
    //   return res.status(403).json({ message: 'Not authorized to edit this message' });
    // }

    message.content = content;
    message.isEdited = true;

    await message.save();
    
    // Populate author name before sending back
    const populatedMessage = await ChatMessage.findById(message._id).populate(
      'author',
      'name',
    );

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// --- END NEW FUNCTION ---


// @desc    User/Admin gets messages for a plan
// @route   GET /api/chat/get/:planName
// @access  Private (Subscribed Users or Admins)
const getMessagesForPlan = async (req, res) => {
  const { planName } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role; // from 'protect' middleware

  try {
    let isAuthorized = false;

    if (userRole === 'admin') {
      isAuthorized = true;
    } else {
      const activeSubscription = await Membership.findOne({
        user: userId,
        planName: planName,
        status: 'active',
        expiryDate: { $gt: new Date() }, 
      });
      if (activeSubscription) {
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this plan.' });
    }

    const messages = await ChatMessage.find({ planName: planName })
      .sort({ createdAt: 'asc' }) 
      .populate('author', 'name'); 

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createMessage,
  deleteMessage, // This is now a "soft delete"
  editMessage,   // Export new function
  getMessagesForPlan,
};