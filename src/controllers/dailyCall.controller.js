const DailyCall = require('../models/dailyCall.model.js');
const UnlockedCall = require('../models/unlockedCall.model.js');

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

// @desc    Create a new Daily Call
// @route   POST /api/daily-calls
// @access  Admin
const createCall = async (req, res) => {
  try {
    const { 
      title, scrip, action, entry, buyMore, 
      target, stopLoss, price, rationale 
    } = req.body;

    // Basic validation
    if (!title || !scrip || !action || !entry || !target || !stopLoss || !price) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const newCall = await DailyCall.create({
      title,
      scrip,
      action,
      entry,
      buyMore,
      target,
      stopLoss,
      price,
      rationale,
      status: 'active'
    });

    res.status(201).json(newCall);
  } catch (error) {
    console.error('Error creating daily call:', error);
    res.status(500).json({ message: 'Server error while creating call.' });
  }
};

// @desc    Get ALL calls for Admin Dashboard (includes closed/expired/deleted)
// @route   GET /api/admin/daily-calls
// @access  Admin
const getCallsForAdmin = async (req, res) => {
  try {
    // Admin sees everything, sorted by newest first
    const calls = await DailyCall.find().sort({ createdAt: -1 });
    res.status(200).json(calls);
  } catch (error) {
    console.error('Error fetching admin calls:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update a call (e.g. fix typo or change status)
// @route   PUT /api/admin/daily-calls/:id
// @access  Admin
const updateCall = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const call = await DailyCall.findByIdAndUpdate(id, updates, { new: true });

    if (!call) {
      return res.status(404).json({ message: 'Call not found.' });
    }

    res.status(200).json(call);
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Soft Delete a call
// @route   DELETE /api/admin/daily-calls/:id
// @access  Admin
const deleteCall = async (req, res) => {
  try {
    const { id } = req.params;

    // We use SOFT DELETE so users who bought this call still have a record of it via UnlockedCall
    const call = await DailyCall.findByIdAndUpdate(
      id, 
      { isDeleted: true }, 
      { new: true }
    );

    if (!call) {
      return res.status(404).json({ message: 'Call not found.' });
    }

    res.status(200).json({ message: 'Call deleted successfully (soft delete).' });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ==========================================
// USER CONTROLLERS
// ==========================================

// @desc    Get Active Calls (Freemium Logic)
// @route   GET /api/daily-calls
// @access  Public (Logic changes if Auth token is present)
const getCallsForUser = async (req, res) => {
  try {
    // 1. Fetch all active, non-deleted calls
    // Sort by publishedAt descending so newest are top
    const activeCalls = await DailyCall.find({ 
      status: { $ne: 'expired' }, // Show 'active' and 'closed' (results), but maybe not 'expired'
      isDeleted: false 
    }).sort({ publishedAt: -1 });

    // 2. Identify the User (req.user is set by 'protect' middleware if token is valid)
    // NOTE: This route needs a "soft" protect. If no token, req.user is undefined.
    const userId = req.user ? req.user._id : null;

    let unlockedCallIds = new Set();

    // 3. If User is logged in, fetch their purchased calls
    if (userId) {
      const userPurchases = await UnlockedCall.find({ user: userId }).select('call');
      // Create a Set of IDs for O(1) lookup
      userPurchases.forEach(p => unlockedCallIds.add(p.call.toString()));
    }

    // 4. Transform Data based on Unlock Status
    const responseData = activeCalls.map(call => {
      const isUnlocked = unlockedCallIds.has(call._id.toString());
      
      // Convert mongoose doc to plain object
      const callObj = call.toObject();

      if (isUnlocked) {
        // --- SCENARIO A: UNLOCKED ---
        // Return everything, plus a flag
        return {
          ...callObj,
          id: callObj._id, // Frontend expects 'id'
          isUnlocked: true,
          isPurchased: true // Alias for frontend compatibility
        };
      } else {
        // --- SCENARIO B: LOCKED (Teaser) ---
        // Return only safe fields. Mask the valuable data.
        return {
          id: callObj._id,
          title: callObj.title, // Teaser Title
          price: callObj.price,
          status: callObj.status,
          publishedAt: callObj.publishedAt,
          scrip: "PREMIUM SCRIP", // Hide real name if needed, or keep it if that's the teaser
          action: callObj.action, // "BUY" or "SELL" might be okay to show, or mask it
          
          // MASKED FIELDS
          entry: "Locked",
          buyMore: "Locked",
          target: "Locked",
          stopLoss: "Locked",
          rationale: "Unlock to view the detailed analysis and rationale.",
          
          isUnlocked: false,
          isPurchased: false
        };
      }
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error fetching calls for user:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  createCall,
  getCallsForAdmin,
  updateCall,
  deleteCall,
  getCallsForUser
};