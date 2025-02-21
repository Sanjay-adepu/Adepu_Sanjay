const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dppiuypop", // Replace with your Cloudinary cloud name
  api_key: "412712715735329",       // Replace with your Cloudinary API key
  api_secret: "m04IUY0-awwtr4YoS-1xvxOOIzU", // Replace with your Cloudinary API secret
});

module.exports = cloudinary;