const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
title: String,
description: String,
images: [String], // Array of image URLs
techStack: [String], // e.g., ["React", "Node.js", "MongoDB"]
liveDemo: String,
githubLink: String,
createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Project", ProjectSchema);