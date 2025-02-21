const express = require("express");
const mongoose = require("mongoose");
const ProjectRoutes = require("./routes/projectRoutes.js");
 const cors =require("cors");
 

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173/"
}));

// Routes
app.use("/data",ProjectRoutes);

// Connect to MongoDB
mongoose.connect("mongodb+srv://adepusanjay812:abc1234@cluster0.st7vt.mongodb.net/port")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
