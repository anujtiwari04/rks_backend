// rks_backend/src/config/mailer.config.js
const sgMail = require('@sendgrid/mail');

// Set the API key from your .env file
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends an email using the configured SendGrid client
 * @param {string} to - Recipient's email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
const sendEmail = async ({ to, subject, text, html, attachments }) => {
  const msg = {
    to: to,
    from: `"Rajesh Kumar Sodhani" <${process.env.SENDER_EMAIL}>`, // Must be a verified sender
    subject: subject,
    text: text,
    html: html,
    attachments: attachments || [],
  };

  try {
    await sgMail.send(msg);
    console.log('SendGrid email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending SendGrid email:', error);
    if (error.response) {
      console.error(error.response.body)
    }
    throw new Error('Email sending failed.');
  }
};

module.exports = { sendEmail };