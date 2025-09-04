const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: ["https://sparcx-next.vercel.app", "http://localhost:5173", "https://adepu-sanjay.vercel.app"],
  methods: ["GET", "POST"]
}));
app.use(express.json());

// --------- Mailer (Gmail App Password) ---------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "adepusanjay444@gmail.com", 
    pass: "lrnesuqvssiognej"
    
  }
});

// --------- Contact Route ---------
app.post("/api/contact", async (req, res) => {
  try {
    const { firstName, lastName, email, company, project, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const mailOptions = {
      from: `"${firstName} ${lastName}" <${email}>`,
      to: process.env.MAIL_USER, // Your inbox
      subject: `📩 New Contact Form Submission - ${project}`,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || "N/A"}</p>
        <p><strong>Project:</strong> ${project}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("❌ Mail error:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
});

// --------- Server ---------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
