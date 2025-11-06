// src/controllers/plan.controller.js
const MembershipPlan = require('../models/membershipPlan.model.js');

// @desc    Create a new membership plan
// @route   POST /api/plans
// @access  Public (for now)
const createPlan = async (req, res) => {
  const { name, description, pricing } = req.body;

  // Basic validation
  if (!name || !description || !pricing) {
    return res.status(400).json({ message: 'Please provide name, description, and pricing' });
  }

  try {
    const planExists = await MembershipPlan.findOne({ name });
    if (planExists) {
      return res.status(400).json({ message: 'A plan with this name already exists' });
    }

    const plan = await MembershipPlan.create({
      name,
      description,
      pricing,
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ message: 'Server error while creating plan' });
  }
};

// @desc    Get all available membership plans
// @route   GET /api/plans
// @access  Public
const getAllPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find(); // Find all plans
    res.status(200).json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Server error while fetching plans' });
  }
};

module.exports = {
  createPlan,
  getAllPlans,
};