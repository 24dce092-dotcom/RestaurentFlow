import nodemailer from 'nodemailer';
import express from 'express';
const router = express.Router();

// POST /api/email-receipt
router.post('/email-receipt', async (req, res) => {
  const { to, subject, pdfBase64, pdfFileName } = req.body;
  if (!to || !subject || !pdfBase64 || !pdfFileName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'dweb3038@gmail.com',
        pass: 'ifbnqbvkebdnogrg'
      }
    });

    const mailOptions = {
      from: 'dweb3038@gmail.com',
      to,
      subject,
      text: 'Please find your bill attached as a PDF.',
      attachments: [
        {
          filename: pdfFileName,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
