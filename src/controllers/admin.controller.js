const Membership = require('../models/membership.modal.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');

/**
 * @desc    Admin gets aggregated membership records (Unique per user+plan)
 * @route   GET /api/admin/all-memberships
 * @access  Admin
 */
exports.getAllUserMemberships = async (req, res) => {
  try {
    // We use aggregation to group history by user and plan
    const memberships = await Membership.aggregate([
      // 1. Sort by date descending so the first item in the group is the latest
      { $sort: { startDate: -1 } },

      // 2. Group by User and Plan Name
      {
        $group: {
          _id: { 
            user: "$user", 
            planName: "$planName" 
          },
          // Keep the details of the LATEST subscription document
          latestDoc: { $first: "$$ROOT" },
          // Count how many times they have subscribed/renewed
          renewalCount: { $sum: 1 },
          // Sum up the total money they have spent on this plan
          totalAmountPaid: { $sum: "$amountPaid" }
        }
      },

      // 3. Lookup User Details (Join with User collection)
      {
        $lookup: {
          from: "users", // The collection name in MongoDB (usually lowercase plural)
          localField: "_id.user",
          foreignField: "_id",
          as: "userDetails"
        }
      },

      // 4. Unwind user details (lookup returns an array, we want an object)
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // 5. Project (Shape) the final output to match what frontend expects
      {
        $project: {
          _id: "$latestDoc._id", // Use the ID of the latest subscription
          user: {
            _id: "$userDetails._id",
            name: "$userDetails.name",
            email: "$userDetails.email"
          },
          planName: "$_id.planName",
          // Use status/dates from the LATEST document
          status: "$latestDoc.status", 
          duration: "$latestDoc.duration",
          startDate: "$latestDoc.startDate",
          expiryDate: "$latestDoc.expiryDate",
          // Use our calculated fields
          amountPaid: "$totalAmountPaid", // We show TOTAL revenue from this user for this plan
          renewalCount: "$renewalCount"
        }
      },
      
      // 6. Final sort by latest start date
      { $sort: { startDate: -1 } }
    ]);

    // Filter out results where user might have been deleted (userDetails is null)
    const validMemberships = memberships.filter(m => m.user && m.user._id);

    res.status(200).json(validMemberships);

  } catch (error) {
    console.error('Error fetching all user memberships:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
