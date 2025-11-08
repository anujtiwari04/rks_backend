// src/controllers/plan.controller.js
const MembershipPlan = require('../models/membershipPlan.model.js');

// @desc    Create a new membership plan
// @route   POST /api/plans/createPlan
// @access  Admin (Handled by router)
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
// @route   GET /api/plans/getAllPlans
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

// --- NEW FUNCTION: Get a single plan by its name ---
// @desc    Get a single plan by name
// @route   GET /api/plans/by-name/:planName
// @access  Admin (Handled by router)
const getPlanByName = async (req, res) => {
  try {
    const planName = req.params.planName;
    const plan = await MembershipPlan.findOne({ name: planName });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    res.status(200).json(plan);
  } catch (error) {
    console.error('Error fetching plan by name:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- NEW FUNCTION: Update a plan by its ID ---
// @desc    Update an existing membership plan
// @route   PUT /api/plans/update/:planId
// @access  Admin (Handled by router)
const updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { name, description, pricing } = req.body;

    if (!name || !description || !pricing) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const plan = await MembershipPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if new name already exists (and it's not the current plan)
    const existingPlan = await MembershipPlan.findOne({ name: name, _id: { $ne: planId } });
    if (existingPlan) {
      return res.status(400).json({ message: 'Another plan with this name already exists' });
    }

    // Update fields
    plan.name = name;
    plan.description = description;
    plan.pricing = pricing;

    const updatedPlan = await plan.save();
    res.status(200).json(updatedPlan);

  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Server error while updating plan' });
  }
};


module.exports = {
  createPlan,
  getAllPlans,
  getPlanByName, // Export new function
  updatePlan,    // Export new function
};