const express = require("express");

const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ["https://adepu-sanjay.vercel.app", "http://localhost:5173"]
}));



// Contact form API endpoint
app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: "All fields are required" });
    }

    try {
        // Nodemailer transporter with Gmail credentials
        const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "adepusanjay444@gmail.com",
        pass: "lrnesuqvssiognej", // Use the generated App Password here
    },
});

        // Email options (sent to your email)
        const mailOptions = {
            from: email, // Customer's email
            to: "adepusanjay444@gmail.com", // Your email (receiving messages)
            subject: "New Contact Form Submission",
            text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, error: "Failed to send message" });
    }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
