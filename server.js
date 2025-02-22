const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const ProjectRoutes = require("./routes/projectRoutes.js");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173"
}));

// Routes
app.use("/data", ProjectRoutes);

// Contact form API endpoint
app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: "All fields are required" });
    }

    try {
        // Configure Nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "23k91a6702@tkrcet.com", // Replace with your email
                pass: "tkrcet2023", // Replace with your email password or App Password
            },
        });

        // Email options
        const mailOptions = {
            from: "your-email@gmail.com",
            to: "23k91a6702@tkrcet.com", // Replace with your receiving email
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

// Connect to MongoDB
mongoose.connect("mongodb+srv://adepusanjay812:abc1234@cluster0.st7vt.mongodb.net/port")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
