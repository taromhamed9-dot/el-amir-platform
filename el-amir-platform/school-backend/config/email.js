const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured, skipping send to:', to);
    return { skipped: true };
  }
  const info = await transporter.sendMail({
    from: `"منصة المدرسة" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
  return info;
}

module.exports = { transporter, sendEmail };
