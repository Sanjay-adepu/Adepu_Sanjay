const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: ["https://www.falconai.space", "http://localhost:5173","https://adepu-sanjay.vercel.app"],
  methods: ["GET", "POST"]
}));
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
You are an expert presentation designer and educator. Generate a compelling, visually-structured presentation on the topic: "${topic}", consisting of ${slidesCount} slides. This presentation must be suitable for professional, academic, or general audiences, depending on the topic.

## Slide Structure Rules:

- Alternate every 2 slides:  
  - One slide must use either **multi-column text boxes** (for structured content)  
    OR  
  - A **diagram with shapes and lines** (e.g., flowchart, decision tree, hierarchy).

- **Do not** include charts or graphs of any kind.

- If a slide contains shapes and lines, do not use bullet points or tables — only describe the visual layout and the shape structure clearly.

- Slides with multi-column text boxes should not use shapes or flow elements — only well-structured text in columns.

## Slide Content Guidelines:

- Title: Begin with "Slide X: [Title]" — short, relevant, and clear.

- Bullet Points: Only on text-based slides without shapes. Use 4–5 clear, informative bullet points.

- Multi-Column Text Boxes (Markdown):  
  Use for comparisons, steps, categories, or key concepts. Indicate how many columns and what goes in each.

- Shapes and Lines (Markdown):  
  Describe layout using clear instructions like:
  \`\`\`shapes
  Rectangle: Start
  Arrow to
  Diamond: Decision?
  Arrow Yes to
  Rectangle: Action A
  Arrow No to
  Rectangle: Action B
  \`\`\`

- Add short examples, analogies, or metaphors to support understanding if relevant.

- Avoid filler content; each slide should add value and be clearly visualized.

- Keep tone appropriate to the topic’s domain.

## Example Slides:

Slide 1: Introduction to Data Privacy

- Data privacy is about protecting personal information.
- Common threats include hacking and surveillance.
- Laws like GDPR and HIPAA enforce privacy standards.
- Individuals must understand their rights and risks.

Use a lock icon to symbolize security.

Slide 2: Components of Data Privacy Policy

\`\`\`columns
Column 1: Legal Aspects  
- GDPR  
- HIPAA  
- Consent & Compliance

Column 2: Technical Measures  
- Encryption  
- Access Control  
- Anonymization
\`\`\`

Use a document shape for each column header.

Slide 3: Data Breach Response Process

\`\`\`shapes
Ellipse: Detect Breach  
Arrow to  
Rectangle: Notify Stakeholders  
Arrow to  
Diamond: Severity Assessment  
Arrow Yes to  
Rectangle: Report to Authorities  
Arrow No to  
Rectangle: Internal Resolution  
\`\`\`

Use a flowchart layout with decision point.
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
    const shapes = [];
    const columns = [];
    let currentShapeBlock = "";
    let currentColumnBlock = "";
    let inShape = false;
    let inColumns = false;

    lines.slice(1).forEach(line => {
      // Start of shapes block
      if (line.trim() === "```shapes") {
        inShape = true;
        currentShapeBlock = "";
        return;
      }

      // End of shapes block
      if (line.trim() === "```" && inShape) {
        shapes.push(currentShapeBlock.trim());
        inShape = false;
        return;
      }

      // Inside shapes block
      if (inShape) {
        currentShapeBlock += line + "\n";
        return;
      }

      // Start of columns block
      if (line.trim() === "```columns") {
        inColumns = true;
        currentColumnBlock = "";
        return;
      }

      // End of columns block
      if (line.trim() === "```" && inColumns) {
        columns.push(currentColumnBlock.trim());
        inColumns = false;
        return;
      }

      // Inside columns block
      if (inColumns) {
        currentColumnBlock += line + "\n";
        return;
      }

      // Bullet point
      if (line.trim().startsWith("-")) {
        bullets.push(line.replace(/^-/, "").trim());
      }

      // Additional formats like tables can go here if needed
    });

    slides.push({
      title,
      bullets,
      columns,
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