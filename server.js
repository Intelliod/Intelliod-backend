const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SibApiV3Sdk = require('sib-api-v3-sdk');

// Setup Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/apply', upload.single('resume'), async (req, res) => {
  const {
    name,
    email,
    qualification,
    specialization,
    experience,
    jobTitle,
    linkedin,
    githubRepos
  } = req.body;

  const resume = req.file;

  try {
    console.log("📤 Preparing admin email...");

    // Extract GitHub links
    const githubLinks = githubRepos
      ? githubRepos.split('\n').filter(link => link.trim())
      : [];

    // Admin notification email
    const adminEmail = {
      to: [{ email: 'contact@intelliod.com', name: 'Intelliod Careers' }],
      sender: { email: 'contact@intelliod.com', name: 'Intelliod Careers' },
      subject: `New Application: ${jobTitle} - ${name}`,
      htmlContent: `
        <h3>New Job Application for <strong>${jobTitle}</strong></h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Qualification:</strong> ${qualification}</p>
        <p><strong>Specialization:</strong> ${specialization}</p>
        <p><strong>Experience:</strong> ${experience}</p>
        <p><strong>LinkedIn:</strong> <a href="${linkedin}" target="_blank">${linkedin}</a></p>
        ${githubLinks.length ? `<p><strong>GitHub Repos:</strong><ul>${githubLinks.map(link => `<li><a href="${link}">${link}</a></li>`).join('')}</ul></p>` : ''}
      `,
      attachment: resume
        ? [{
            name: resume.originalname,
            content: fs.readFileSync(resume.path).toString('base64'),
          }]
        : [],
    };

    await emailApi.sendTransacEmail(adminEmail);
    console.log("✅ Admin email sent");

    // Confirmation to applicant
    const userEmail = {
      to: [{ email, name }],
      sender: { email: 'contact@intelliod.com', name: 'Intelliod Careers' },
      subject: `Application Received for ${jobTitle} at Intelliod`,
      htmlContent: `
        <p>Hello ${name},</p>
        <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at Intelliod Private Limited.</p>
        <p>We have received your application and our team will review it shortly.</p>
        <p>Best regards,<br/>The Intelliod Team</p>
      `,
    };

    await emailApi.sendTransacEmail(userEmail);
    console.log("✅ User confirmation email sent");

    // Delete uploaded resume
    if (resume && fs.existsSync(resume.path)) {
      fs.unlinkSync(resume.path);
      console.log("🧹 Resume file deleted");
    }

    res.status(200).json({ success: true, message: 'Application sent successfully' });
  } catch (err) {
    console.error("❌ Send error:", JSON.stringify(err.response?.body || err.message, null, 2));
    if (resume && fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
    res.status(500).json({ success: false, message: 'Error sending email' });
  }
});
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
