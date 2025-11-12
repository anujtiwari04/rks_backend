// src/controllers/payment.controller.js
const razorpay = require('../config/razorpay.config.js');
const crypto = require('crypto');
const Membership = require('../models/membership.modal.js');

// 1. Create Order Logic
const createOrder = async (req, res) => {
  const { amount, currency } = req.body;
  const options = {
    amount: Number(amount * 100),
    currency,
    receipt: `receipt_order_${Math.floor(Date.now() / 1000)}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send('Error creating order');
  }
};

// 2. Verify Payment Logic
const verifyPayment = async(req, res) => {
    const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planName, 
    duration, 
    amountPaid, 
  } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest('hex');

  if (digest === razorpay_signature) {
    console.log('Payment verification successful');

    try {
      // 4. Get the user ID from the 'protect' middleware
      const userId = req.user._id; 

      // 5. Calculate expiry date
      const expiryDate = new Date();
      if (duration === 'quarterly') {
        expiryDate.setMonth(expiryDate.getMonth() + 3);
      } else if (duration === 'halfYearly') {
        expiryDate.setMonth(expiryDate.getMonth() + 6);
      } else if (duration === 'yearly') {
        expiryDate.setMonth(expiryDate.getMonth() + 12);
      } else {
        // Fallback for any other duration (e.g., monthly)
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      // 6. Create the Membership "link" in the database
      await Membership.create({
        user: userId,
        planName: planName,
        duration: duration,
        expiryDate: expiryDate,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        amountPaid: amountPaid, // Amount in *paise* (e.g., 500000 for 5000 Rs)
        status: 'active',
      });

      // 7. Send a success response
      res.status(201).json({
        status: 'success',
        message: 'Membership activated successfully',
        orderId: razorpay_order_id,
      });
    } catch (dbError) {
      console.error('Error creating membership in DB:', dbError);
      res.status(500).json({ status: 'failure', message: 'Payment verified but failed to update membership.' });
    }
  }
   else {
    console.log('Payment verification failed');
    res.status(400).json({ status: 'failure' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};