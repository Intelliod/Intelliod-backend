const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(cors());
const upload = multer({ dest: 'uploads/' });

app.post('/apply', upload.single('resume'), async (req, res) => {
  const {
    name,
    email,
    qualification,
    specialization,
    experience,
    jobTitle,
  } = req.body;

  const resume = req.file;

  const adminMsg = {
    to: 'yaswanth.intelliod@gmail.com', // Admin Email
    from: 'yaswanth.intelliod@gmail.com', // Must be verified in SendGrid
    subject: `New Application: ${jobTitle} - ${name}`,
    text: `
      Job Title: ${jobTitle}
      Name: ${name}
      Email: ${email}
      Qualification: ${qualification}
      Specialization: ${specialization}
      Experience: ${experience}
    `,
    attachments: resume
      ? [
          {
            content: fs.readFileSync(resume.path).toString('base64'),
            filename: resume.originalname,
            type: resume.mimetype,
            disposition: 'attachment',
          },
        ]
      : [],
  };

  const userMsg = {
    to: email,
    from: 'Intelliod Careers <yaswanth.intelliod@gmail.com>',
    subject: `Application Received for ${jobTitle} at Intelliod`,
    text: `Hello ${name},

Thank you for applying for the position of "${jobTitle}" at Intelliod Private Limited.

We have received your application and our team will review it shortly.

Best regards,
The Intelliod Private Limited Team
    `,
  };

  try {
    await sgMail.send(adminMsg);
    await sgMail.send(userMsg);

    fs.unlinkSync(resume.path); // Delete uploaded file after sending

    res.status(200).json({ success: true, message: 'Application sent successfully' });
  } catch (err) {
    console.error(err.response?.body || err.message);
    res.status(500).json({ success: false, message: 'Error sending email' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
