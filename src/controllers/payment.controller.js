// rks_backend/src/controllers/payment.controller.js
const razorpay = require('../config/razorpay.config.js');
const crypto = require('crypto');
const Membership = require('../models/membership.modal.js');
const UnlockedCall = require('../models/unlockedCall.model.js'); // --- NEW IMPORT ---
const DailyCall = require('../models/dailyCall.model.js');       // --- NEW IMPORT ---

const { generateInvoicePDF } = require('../utils/invoiceGenerator.js');
const { sendEmail } = require('../config/mailer.config.js');

// 1. Create Order Logic (Common for both)
const createOrder = async (req, res) => {
  const { amount, currency } = req.body;
  
  // Basic validation
  if (!amount) {
    return res.status(400).send('Amount is required');
  }

  const options = {
    amount: Number(amount * 100), // Convert to paise
    currency: currency || "INR",
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

// 2. Verify Payment Logic (Dual Handler)
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    
    // --- Context Fields (One set will be present) ---
    // A. For Memberships
    planName, 
    duration, 
    
    // B. For Daily Calls (NEW)
    callId,

    // Common
    amountPaid,
    isBusiness,
    companyName,
    gstNumber,
    email,
    address,
    state,
    pinCode
  } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET;

  // 1. Verify Signature
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest('hex');

  if (digest !== razorpay_signature) {
    console.log('Payment verification failed');
    return res.status(400).json({ status: 'failure', message: 'Invalid signature' });
  }

  // If signature is valid, proceed based on type
  console.log('Payment verification successful');
  
  // Return success to client immediately to prevent UI lag
  res.status(201).json({
    status: 'success',
    message: callId ? 'Call unlocked successfully' : 'Membership activated successfully',
    orderId: razorpay_order_id,
  });

  // --- Start Background Tasks (DB Update, PDF, Email) ---
  try {
    const userId = req.user._id;
    const recipientEmail = email || req.user.email;
    const recipientName = isBusiness ? companyName : req.user.name;
    const dateNow = new Date();

    // Prepare User Data for Invoice (Common)
    const invoiceUserData = {
      name: recipientName,
      email: recipientEmail,
      address: address,
      state: state,
      pinCode: pinCode,
      gstNumber: isBusiness ? gstNumber : null,
      isBusiness: !!isBusiness
    };

    let invoiceOrderData = {};
    let emailSubject = '';
    let emailBodyText = '';
    let emailBodyHtml = '';

    // ====================================================
    // PATH A: DAILY CALL UNLOCK
    // ====================================================
    if (callId) {
      // 1. Fetch Call Details for accurate record
      const call = await DailyCall.findById(callId);
      const title = call ? call.title : 'Daily Market Call';

      // 2. Check Idempotency (Did they already process this?)
      const existingUnlock = await UnlockedCall.findOne({ 
        user: userId, 
        call: callId 
      });

      if (!existingUnlock) {
        // 3. Create UnlockedCall Record
        await UnlockedCall.create({
          user: userId,
          call: callId,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          amountPaid: amountPaid,
          purchasedAt: dateNow
        });
      }

      // 4. Prepare Invoice Data
      invoiceOrderData = {
        planName: `Unlock: ${title}`, // "Item" on invoice
        duration: "One-Time Unlock",
        amountPaid: amountPaid,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        startDate: dateNow,
        expiryDate: dateNow // Doesn't expire, but needed for PDF format
      };

      // 5. Prepare Email Content
      emailSubject = `Unlocked: ${title}`;
      emailBodyText = `You have successfully unlocked the call: ${title}. Login to view the details.`;
      emailBodyHtml = `
        <p>Hi ${recipientName},</p>
        <p>You have successfully unlocked the trading idea: <strong>${title}</strong>.</p>
        <p>You can now view the entry, target, and stop-loss levels on your dashboard.</p>
        <p>Your invoice is attached.</p>
        <p>Best regards,<br>Rajesh Kumar Sodhani</p>
      `;

    } 
    // ====================================================
    // PATH B: MEMBERSHIP SUBSCRIPTION
    // ====================================================
    else {
      // 1. Calculate Expiry
      const expiryDate = new Date(dateNow);
      if (duration === 'quarterly') expiryDate.setMonth(expiryDate.getMonth() + 3);
      else if (duration === 'halfYearly') expiryDate.setMonth(expiryDate.getMonth() + 6);
      else if (duration === 'yearly') expiryDate.setMonth(expiryDate.getMonth() + 12);
      else expiryDate.setMonth(expiryDate.getMonth() + 1); // Default monthly

      // 2. Create Membership Record
      await Membership.create({
        user: userId,
        planName: planName,
        duration: duration,
        startDate: dateNow,
        expiryDate: expiryDate,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        amountPaid: amountPaid,
        status: 'active',
      });

      // 3. Prepare Invoice Data
      invoiceOrderData = {
        planName: planName,
        duration: duration,
        amountPaid: amountPaid,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        startDate: dateNow,
        expiryDate: expiryDate,
      };

      // 4. Prepare Email Content
      emailSubject = `Membership Activated: ${planName}`;
      emailBodyText = `Thank you for subscribing to ${planName}. Your access is active until ${expiryDate.toLocaleDateString()}.`;
      emailBodyHtml = `
        <p>Hi ${recipientName},</p>
        <p>Thank you for subscribing to the <strong>${planName} (${duration})</strong> plan.</p>
        <p>Your membership is active from <strong>${dateNow.toLocaleDateString()}</strong> to <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
        <p>Your invoice is attached.</p>
        <p>Best regards,<br>Rajesh Kumar Sodhani</p>
      `;
    }

    // ====================================================
    // COMMON: GENERATE PDF & SEND EMAIL
    // ====================================================
    
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      user: invoiceUserData,
      order: invoiceOrderData
    });
    
    const pdfBase64 = pdfBuffer.toString('base64');

    // Send Email via SendGrid
    await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      text: emailBodyText,
      html: emailBodyHtml,
      attachments: [
        {
          content: pdfBase64,
          filename: `invoice-${razorpay_order_id}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    });

    console.log(`Invoice email sent to ${recipientEmail} for order ${razorpay_order_id}`);

  } catch (err) {
    console.error('Error in post-payment background tasks:', err);
    // Note: We don't send an error response here because we already sent 201 Success to the client.
    // This logic happens asynchronously.
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};