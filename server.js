const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: [
    "https://sparcx-next.vercel.app",
    "http://localhost:5173",
    "https://adepu-sanjay.vercel.app"
  ],
  methods: ["GET", "POST"]
}));
app.use(express.json());

// ---- Env checks ----
const MAIL_USER = process.env.MAIL_USER || "adepusanjay444@gmail.com"; // your inbox
const MAIL_PASS = process.env.MAIL_PASS || "lrnesuqvssiognej";         // app password
const MAIL_TO   = process.env.MAIL_TO || MAIL_USER;                    // recipient

if (!MAIL_USER || !MAIL_PASS) {
  console.error("❌ MAIL_USER or MAIL_PASS missing. Set them in .env / Vercel env.");
  process.exit(1);
}

// ---- Transporter ----
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: MAIL_USER, pass: MAIL_PASS }
});

// ---- Helpers ----
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

// ---- Route ----
app.post("/api/contact", async (req, res) => {
  try {
    const { firstName, lastName, email, company, project, message } = req.body || {};

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Use your authenticated address as "from" (Gmail-friendly)
    // Put the user's address in replyTo so you can reply from your inbox
    const mailOptions = {
      from: `"Sparcx Contact Bot" <${MAIL_USER}>`,
      to: MAIL_TO, // guaranteed recipient
      replyTo: `"${firstName} ${lastName}" <${email}>`,
      subject: `📩 New Contact — ${project || "General Inquiry"}`,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || "N/A"}</p>
        <p><strong>Project:</strong> ${project || "N/A"}</p>
        <p><strong>Message:</strong></p>
        <p>${(message || "").replace(/\n/g, "<br/>")}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
});

// ---- Server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
