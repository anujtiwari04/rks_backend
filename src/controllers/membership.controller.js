const Membership = require('../models/membership.modal.js');


const getMyMemberships = async (req, res) => {
  try {
    await Membership.updateMany(
      { 
        user: req.user._id, 
        status: 'active', 
        expiryDate: { $lte: new Date() } // Find plans where expiry date is in the past
      },
      { 
        $set: { status: 'expired' } // Set their status to 'expired'
      }
    );
    // req.user._id is attached by the 'protect' middleware
    // This finds all membership documents that match the logged-in user's ID
    const memberships = await Membership.find({ user: req.user._id })
      .sort({ createdAt: -1 }) // Show newest first
      .select('-user -razorpayPaymentId -razorpayOrderId'); // Don't send sensitive data to frontend

    if (!memberships) {
      return res.status(404).json({ message: 'No memberships found for this user.' });
    }

    res.status(200).json(memberships);
  } catch (error) {
    console.error('Error in getMyMemberships:', error);
    res.status(500).json({ message: 'Server error while fetching memberships.' });
  }
};

module.exports = {
  getMyMemberships,
};