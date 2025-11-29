// rks_backend/src/utils/invoiceGenerator.js
const PDFDocument = require('pdfkit');

/**
 * Generates an invoice PDF in memory.
 * @param {object} data - The data for the invoice.
 * @param {object} data.user - { name, email, address, state, pinCode, gstNumber }
 * @param {object} data.order - { planName, duration, amountPaid, razorpayOrderId, razorpayPaymentId, startDate, expiryDate }
 * @returns {Promise<Buffer>} A promise that resolves with the PDF buffer.
 */
function generateInvoicePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const { user, order } = data;
      const { 
        planName, duration, amountPaid, razorpayOrderId, 
        razorpayPaymentId, startDate, expiryDate 
      } = order;

      // Format dates
      const formattedInvoiceDate = new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy
      const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB');
      const formattedExpiryDate = new Date(expiryDate).toLocaleDateString('en-GB');

      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      // Buffer to store the PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // --- Start PDF Content ---

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('INVOICE', 50, 50, { align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Rajesh Kumar Sodhani', 50, 70, { align: 'left' })
        .text('SEBI Registered Research Analyst', 50, 85, { align: 'left' })
        .text('raj.sodhani2609@gmail.com', 50, 100, { align: 'left' });

      // Invoice Details (top right)
      const invoiceDetailsTop = 70;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Invoice #:', 350, invoiceDetailsTop)
        .font('Helvetica')
        .text(razorpayOrderId, 410, invoiceDetailsTop)

        .font('Helvetica-Bold')
        .text('Invoice Date:', 350, invoiceDetailsTop + 15)
        .font('Helvetica')
        .text(formattedInvoiceDate, 410, invoiceDetailsTop + 15)

        .font('Helvetica-Bold')
        .text('Start Date:', 350, invoiceDetailsTop + 30)
        .font('Helvetica')
        .text(formattedStartDate, 410, invoiceDetailsTop + 30)

        .font('Helvetica-Bold')
        .text('Expiry Date:', 350, invoiceDetailsTop + 45)
        .font('Helvetica')
        .text(formattedExpiryDate, 410, invoiceDetailsTop + 45);

      // --- Bill To Section (Updated for Address & GST) ---
      doc.rect(50, 150, 500, 1).fill('#333');
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, 165);
      
      let currentY = 180;

      // 1. Name / Company Name
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(user.name, 50, currentY);
      currentY += 15;

      // 2. Address (if available)
      if (user.address) {
        doc.text(user.address, 50, currentY);
        currentY += 15;
      }

      // 3. State & Pin (if available)
      if (user.state && user.pinCode) {
        doc.text(`${user.state} - ${user.pinCode}`, 50, currentY);
        currentY += 15;
      }

      // 4. GST Number (if available)
      if (user.gstNumber) {
        doc
          .font('Helvetica-Bold')
          .text(`GSTIN: ${user.gstNumber}`, 50, currentY);
        doc.font('Helvetica'); // Reset font back to normal
        currentY += 15;
      }

      // 5. Email
      doc.text(user.email, 50, currentY);
      
      // --------------------------------------------------

      // Table Header
      const tableHeaderY = 280; // Pushed down slightly to accommodate address lines
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Item', 50, tableHeaderY)
        .text('Duration', 200, tableHeaderY, { width: 150, align: 'right' })
        .text('Amount (INR)', 350, tableHeaderY, { width: 200, align: 'right' });
      
      doc.rect(50, tableHeaderY + 20, 500, 1).fill('#333');

      // Table Row
      const tableRowY = tableHeaderY + 35;
      const amountInRupees = (amountPaid / 100).toFixed(2);
      
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(planName, 50, tableRowY) // Item

        // Duration block
        .font('Helvetica-Bold')
        .text(duration, 200, tableRowY, { width: 150, align: 'right' }) 
        
        // Dates below duration
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text(`Start: ${formattedStartDate}`, 200, tableRowY + 15, { width: 150, align: 'right' }) 
        .text(`End: ${formattedExpiryDate}`, 200, tableRowY + 25, { width: 150, align: 'right' }) 
        
        // Amount
        .font('Helvetica')
        .fontSize(10)
        .text(amountInRupees, 350, tableRowY, { width: 200, align: 'right' });

      // Total Paid
      const totalY = tableRowY + 50;
      doc.rect(50, totalY, 500, 1).fill('#333');
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total Paid:', 350, totalY + 20)
        .text(`INR ${amountInRupees}`, 450, totalY + 20);

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .text(
          `Payment ID: ${razorpayPaymentId}`, 
          50, 
          doc.page.height - 100, 
          { align: 'center' }
        )
        .text(
          'This is a computer-generated invoice and does not require a signature.',
          50,
          doc.page.height - 85,
          { align: 'center' }
        );

      // --- End PDF Content ---
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateInvoicePDF };