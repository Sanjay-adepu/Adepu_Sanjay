const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!GOOGLE_GEMINI_API_KEY) {
  console.error("❌ GOOGLE_GEMINI_API_KEY missing in .env");
  process.exit(1);
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

// Generate Prompt for Gemini
function generatePrompt(topic, slidesCount) {
  return `
Generate a presentation on "${topic}" with ${slidesCount} slides.

Each slide must include:
- A title: "Slide X: Title"
- 4–5 bullet points
- Add tables if relevant (use markdown table format)
- Add simple charts if applicable (bar or pie in markdown code block)
- Use basic shape ideas (like: "Use triangle for this concept")

Example:

Slide 1: Overview of AI
- Definition of Artificial Intelligence.
- Types: Narrow AI, General AI.
- Applications in daily life.
- Key industries using AI.

| Type | Description |
|------|-------------|
| Narrow AI | Specialized in one task |
| General AI | Human-level thinking |

\`\`\`chart
Type: pie
Data:
  - AI in Healthcare: 35%
  - AI in Finance: 25%
  - AI in Retail: 20%
  - Others: 20%
\`\`\`
`;
}

// Parse Gemini response into structured slides
function parseGeminiResponse(text) {
  const slides = [];
  const sections = text.split(/Slide \d+:/).filter(Boolean);

  sections.forEach((section, i) => {
    const lines = section.trim().split("\n");
    const title = lines[0]?.trim() || `Slide ${i + 1}`;
    const bullets = [];
    const tables = [];
    const charts = [];
    let currentTable = [];
    let currentChart = null;
    let inChart = false;

    lines.slice(1).forEach(line => {
      if (line.startsWith("|")) {
        currentTable.push(line);
      } else if (line.startsWith("```chart")) {
        inChart = true;
        currentChart = "";
      } else if (line.startsWith("```") && inChart) {
        charts.push(currentChart.trim());
        inChart = false;
      } else if (inChart) {
        currentChart += line + "\n";
      } else if (line.startsWith("-")) {
        bullets.push(line.replace(/^-/, "").trim());
      }
    });

    if (currentTable.length > 0) {
      tables.push(currentTable.join("\n"));
    }

    slides.push({
      title,
      bullets,
      tables,
      charts
    });
  });

  return slides;
}

// API to generate slides
app.post("/generate-slides", async (req, res) => {
  const { topic, slidesCount } = req.body;

  if (!topic || !slidesCount) {
    return res.status(400).json({ error: "Topic and slidesCount are required." });
  }

  const prompt = generatePrompt(topic, slidesCount);

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GOOGLE_GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );

    const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const structuredSlides = parseGeminiResponse(rawText);

    res.json({ success: true, slides: structuredSlides });
  } catch (error) {
    console.error("Gemini API error:", error.message);
    res.status(500).json({ error: "Failed to generate slides from Gemini." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));