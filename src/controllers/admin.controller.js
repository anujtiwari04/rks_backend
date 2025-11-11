// rks_backend/src/controllers/admin.controller.js
const Membership = require('../models/membership.modal.js');
const User = require('../models/user.model.js');

/**
 * @desc    Admin gets all membership records from all users
 * @route   GET /api/admin/all-memberships
 * @access  Admin
 */
exports.getAllUserMemberships = async (req, res) => {
  try {
    // 1. Fetch all memberships, populate the user's name/email, and sort by start date
    const memberships = await Membership.find({})
      .populate('user', 'name email _id') // Select only name, email, and _id from the User model
      .sort({ startDate: 'asc' });

    // 2. Calculate renewalCount on-the-fly
    const renewalMap = new Map();
    
    const processedMemberships = memberships
      .map(mem => {
        // If a user was deleted, mem.user might be null. We'll skip these.
        if (!mem.user) {
          return null;
        }

        // Create a unique key for each user + plan combination
        const key = mem.user._id.toString() + '_' + mem.planName;
        
        // Get the current count for this key, add 1, and update the map
        const count = (renewalMap.get(key) || 0) + 1;
        renewalMap.set(key, count);

        // We must convert the Mongoose document to a plain JS object
        // to be able to add the new 'renewalCount' property.
        const memObject = mem.toObject();
        memObject.renewalCount = count;
        
        return memObject;
      })
      .filter(Boolean); // Filter out any null (deleted user) records

    // 3. Send the processed list
    res.status(200).json(processedMemberships);

  } catch (error) {
    console.error('Error fetching all user memberships:', error);
    res.status(500).json({ message: 'Server error' });
  }
};