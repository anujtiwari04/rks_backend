// src/controllers/payment.controller.js
const razorpay = require('../config/razorpay.config.js');
const crypto = require('crypto');

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
const verifyPayment = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest('hex');

  if (digest === razorpay_signature) {
    console.log('Payment verification successful');
    res.json({ status: 'success', orderId: razorpay_order_id });
  } else {
    console.log('Payment verification failed');
    res.status(400).json({ status: 'failure' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};