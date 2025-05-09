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
You are an expert presentation designer and educator. Generate a compelling, visually-structured presentation on the topic: **"${topic}"**, consisting of **${slidesCount} slides**. This presentation must be suitable for professional, academic, or general audiences, depending on the topic.

### Format for Each Slide:
- **Title**: Begin with "Slide X: [Title]" — clear, short, and topic-relevant.
- **Bullet Points**: 4–5 concise, informative bullets that explain or expand on the topic. Use precise, well-organized language.
- **Tables (Markdown)**: If data comparison, classification, or breakdown enhances understanding, include a properly formatted markdown table.
- **Charts (Markdown)**: Where relevant, insert a simple bar or pie chart in a markdown code block to illustrate key stats or trends.
- **Shapes or Icons (Conceptual)**: Suggest a shape (triangle, decision tree, star, circle, square) or visual element that best represents the main idea on that slide.

### Important Instructions:
- Use markdown where applicable. Avoid filler text.
- Ensure **no slide is empty** — every slide must contribute meaningfully to understanding the topic.
- Maintain logical flow across slides (intro, core, comparison, application, conclusion).
- When appropriate, add brief examples, metaphors, or analogies.
- Tailor tone and depth to match the topic’s domain (e.g., technical for AI, accessible for lifestyle, insightful for history).
- Keep content **globally relevant and bias-free**.

### Example Slide Output:

**Slide 1: Understanding Artificial Intelligence**
- AI simulates human-like intelligence in machines.
- Includes learning, problem-solving, language understanding.
- Used in areas like healthcare, finance, robotics.
- Two main types: Narrow AI and General AI.
- Use a **lightbulb shape** to symbolize innovation in AI.

**Example Table**:
| AI Type     | Description                  |
|-------------|------------------------------|
| Narrow AI   | Performs specific tasks only  |
| General AI  | Capable of general reasoning  |

**Example Chart**:
\`\`\`chart
Type: bar
Data:
  - AI in Healthcare: 35%
  - AI in Finance: 30%
  - AI in Education: 20%
  - Other: 15%
\`\`\`

Ensure slide content is engaging, structured, and ready to be transformed into visual slides by a frontend like Reveal.js or a platform like Gamma.
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
    const shapes = [];
    let currentTable = [];
    let currentChart = null;
    let inChart = false;

    lines.slice(1).forEach(line => {
      // Capture shapes/icons mentioned in the bullet points
      const shapeMatch = line.match(/Use a (\w+) shape/);
      if (shapeMatch) {
        shapes.push(shapeMatch[1]);
        return;
      }

      // Handling markdown tables
      if (line.startsWith("|")) {
        currentTable.push(line);
      } 
      // Handling chart code blocks
      else if (line.startsWith("```chart")) {
        inChart = true;
        currentChart = "";
      } 
      // End of chart block
      else if (line.startsWith("```") && inChart) {
        charts.push(currentChart.trim());
        inChart = false;
      } 
      // Collect chart content inside the block
      else if (inChart) {
        currentChart += line + "\n";
      } 
      // Collect bullet points
      else if (line.startsWith("-")) {
        bullets.push(line.replace(/^-/, "").trim());
      }
    });

    // If a table exists, push it into the tables array
    if (currentTable.length > 0) {
      tables.push(currentTable.join("\n"));
    }

    // Push structured slide information into the slides array
    slides.push({
      title,
      bullets,
      tables,
      charts,
      shapes
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});