// rks_backend/src/controllers/membership.controller.js
const Membership = require('../models/membership.modal.js');
const mongoose = require('mongoose'); // Import mongoose

const getMyMemberships = async (req, res) => {
  try {
    // 1. Update status of any memberships that just expired
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

    // 2. Use an aggregation pipeline to get only the LATEST membership for each plan
    const memberships = await Membership.aggregate([
      {
        // Find all memberships for this user
        $match: {
          user: req.user._id
        }
      },
      {
        // Sort them by expiry date, so the newest one is first
        $sort: {
          expiryDate: -1 
        }
      },
      {
        // Group them by planName and pick only the *first* document (the latest one)
        $group: {
          _id: "$planName",
          latestDoc: { $first: "$$ROOT" }
        }
      },
      {
        // Make the "latestDoc" the new root of the document
        $replaceRoot: {
          newRoot: "$latestDoc"
        }
      },
      {
        // Sort the final list by creation date
        $sort: {
          createdAt: -1
        }
      },
      {
        // Project to remove sensitive fields (same as your old .select())
        $project: {
          user: 0,
          razorpayPaymentId: 0,
          razorpayOrderId: 0,
          __v: 0
        }
      }
    ]);

    // The aggregation returns a clean, de-duplicated array
    res.status(200).json(memberships);

  } catch (error) {
    console.error('Error in getMyMemberships:', error);
    res.status(500).json({ message: 'Server error while fetching memberships.' });
  }
};

module.exports = {
  getMyMemberships,
};