const Project = require("../models/Project");
const path = require("path");

// Create a new project

exports.createProject = async (req, res) => {
  try {
    const { title, description, techStack, liveDemo, githubLink } = req.body;

    if (!req.files || req.files.length < 3) {
      return res.status(400).json({ message: "At least 3 images are required." });
    }

    // Get Cloudinary image URLs from uploaded files
    const imageUrls = req.files.map(file => file.path);  

    const project = new Project({
      title,
      description,
      images: imageUrls,
      techStack: techStack.split(",").map(tech => tech.trim()),
      liveDemo,
      githubLink,
    });

    await project.save();
    res.status(201).json({ message: "Project created successfully", project });

  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }); // Sort by latest projects
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get a single project by ID
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Delete a project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await project.deleteOne();
    res.status(200).json({ message: "Project deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};