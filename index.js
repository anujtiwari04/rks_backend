require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Endpoint to create an order
app.post('/create-order', async (req, res) => {
  const { amount, currency } = req.body;

  // Razorpay expects amount in the smallest currency unit (e.g., paise)
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
});

// 2. Endpoint to verify the payment
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest('hex');

  if (digest === razorpay_signature) {
    // Payment is legit
    console.log('Payment verification successful');
    res.json({ status: 'success', orderId: razorpay_order_id });
  } else {
    // Payment is not legit
    console.log('Payment verification failed');
    res.status(400).json({ status: 'failure' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});