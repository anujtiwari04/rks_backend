// src/models/membershipPlan.model.js
const mongoose = require('mongoose');

// A sub-schema for your pricing structure
// { _id: false } prevents Mongoose from creating an ObjectId for the pricing object
const pricingSchema = new mongoose.Schema({
  monthly: { 
    type: Number, 
    default: null // Use null if a plan doesn't offer this duration
  }, 
  quarterly: { 
    type: Number, 
    default: null 
  },
  halfYearly: { 
    type: Number, 
    default: null 
  },
  yearly: { 
    type: Number, 
    default: null 
  },
}, { _id: false });

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Plan description is required'],
    },
    // Embed the pricing schema
    pricing: {
      type: pricingSchema,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);