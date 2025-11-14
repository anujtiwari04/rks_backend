// src/controllers/payment.controller.js
const razorpay = require('../config/razorpay.config.js');
const crypto = require('crypto');
const Membership = require('../models/membership.modal.js');

// --- 1. Import new helpers ---
const { generateInvoicePDF } = require('../utils/invoiceGenerator.js');
const { sendEmail } = require('../config/mailer.config.js');

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

// 2. Verify Payment Logic (UPDATED)
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
    
    // Send success response *immediately*
    res.status(201).json({
      status: 'success',
      message: 'Membership activated successfully',
      orderId: razorpay_order_id,
    });

    // --- Start background tasks (PDF & Email) ---
    try {
      const userId = req.user._id; 

      // --- ** MODIFICATION START ** ---
      // 5. Calculate expiry date
      const startDate = new Date(); // Define startDate
      const expiryDate = new Date(startDate); // Base expiry on startDate
      
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
        startDate: startDate, // Save startDate
        expiryDate: expiryDate,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        amountPaid: amountPaid, 
        status: 'active',
      });

      // 2. Gather data for invoice
      const invoiceData = {
        user: {
          name: req.user.name,
          email: req.user.email,
        },
        order: {
          planName: planName,
          duration: duration,
          amountPaid: amountPaid,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          startDate: startDate,  // <-- ADDED
          expiryDate: expiryDate, // <-- ADDED
        }
      };
      // --- ** MODIFICATION END ** ---


      // 3. Generate PDF Buffer
      const pdfBuffer = await generateInvoicePDF(invoiceData);
      
      // 4. Convert to Base64 for SendGrid
      const pdfBase64 = pdfBuffer.toString('base64');

      // 5. Define attachments
      const attachments = [
        {
          content: pdfBase64,
          filename: `invoice-${razorpay_order_id}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ];

      // 6. Send the email
      await sendEmail({
        to: req.user.email,
        subject: `Your Invoice for ${planName} Membership`,
        text: `Thank you for your purchase of the ${planName} (${duration}) plan. Your invoice is attached.`,
        html: `
          <p>Hi ${req.user.name},</p>
          <p>Thank you for your purchase of the <strong>${planName} (${duration})</strong> plan. Your membership is now active.</p>
          <p>Your invoice is attached for your records.</p>
          <p>Best regards,<br>Rajesh Kumar Sodhani</p>
        `,
        attachments: attachments,
      });

      console.log(`Invoice email sent to ${req.user.email}`);

    } catch (err) {
      console.error('Error in post-payment tasks (PDF/Email):', err);
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