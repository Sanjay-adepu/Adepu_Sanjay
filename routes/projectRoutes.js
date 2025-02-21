const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudnaryConfig.js");
const projectController = require("../Controllers/projectController.js");

// Set up Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "projects", // Store in 'projects' folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"], // Allowed image formats
  },
});

// Configure Multer to use Cloudinary storage for multiple images
const upload = multer({ storage });

// Routes 
router.post("/create", upload.array("images", 5), projectController.createProject); // Allow multiple images
router.get("/fetch", projectController.getAllProjects); // Get all projects
router.get("/:id", projectController.getProjectById); // Get project by ID
router.delete("/:id", projectController.deleteProject); // Delete project

module.exports = router;