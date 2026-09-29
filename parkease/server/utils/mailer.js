const nodemailer = require('nodemailer');

// If SMTP is not configured, the email is printed in the console (good for demo).
exports.sendMail = async (to, subject, html) => {
  if (!process.env.SMTP_HOST) {
    console.log(`[EMAIL to ${to}] ${subject}`);
    return;
  }
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await t.sendMail({ from: '"ParkEase" <' + process.env.SMTP_USER + '>', to, subject, html });
};
