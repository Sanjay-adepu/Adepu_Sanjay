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
You are an expert presentation designer and educator. Create a compelling, visually-structured presentation on the topic: "${topic}", consisting of ${slidesCount} slides. The presentation should be suitable for professional, academic, or general audiences depending on the topic.

## Slide Format Rules:

- Do **NOT** use charts of any kind.
- Use a combination of:
  1. **Multi-column text box layouts** (for steps, feature breakdowns, comparisons, etc.).
  2. **Structured shapes and lines** (e.g., flowcharts, pyramids, decision trees, timelines).
- Do **NOT** combine both in the same slide — keep shape-based diagrams and multi-column text on separate slides.
- **Every 3 slides**, include **1 table** (use Markdown).
- Slides must meaningfully alternate between:
  - Bullet points
  - Tables (every 3 slides)
  - Multi-column layouts
  - Shape-based diagrams

## Slide Content Guidelines:

- Title: Start with "Slide X: [Title]" — concise and clear.
- Bullet Points: Use only if slide has no table, shape, or multi-column structure.
- Multi-column Layouts: Show as side-by-side columns (e.g., Features vs Benefits).
- Tables (Markdown): Use for comparisons, breakdowns, categories.
- Shapes: Suggest appropriate shape/diagram (e.g., triangle for hierarchy, decision tree for logic, circle for cycles).

## Visuals:

- Use diagrams only when appropriate and with clarity.
- Example shapes: flowchart, timeline, Venn diagram, cycle, matrix, pyramid, etc.
- Suggest where to place lines/arrows if applicable.

## Tone and Examples:

- Include examples, analogies, or metaphors for better clarity.
- Keep explanations precise and relevant.
- Avoid filler; every slide must add meaningful content.

## Output Format:

**Example Slide Output**

Slide 1: Understanding Cloud Computing  
- Cloud computing delivers computing services over the internet.  
- Offers flexibility, scalability, and cost-efficiency.  
- Common types include IaaS, PaaS, and SaaS.  
- Used in storage, networking, databases, and analytics.  
Use a cloud shape to represent the concept.

Slide 2: Cloud Service Models Comparison  
\`\`\`table
| Model | Description | Example |
|-------|-------------|---------|
| IaaS  | Infrastructure as a Service | AWS EC2 |
| PaaS  | Platform as a Service | Google App Engine |
| SaaS  | Software as a Service | Gmail |
\`\`\`

Slide 3: Benefits vs Challenges of Cloud  
**Multi-Column Layout**

**Benefits:**  
- Scalability  
- Flexibility  
- Cost-effective  

**Challenges:**  
- Security risks  
- Downtime  
- Compliance  

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
    const tableLines = [];
    const columns = {};
    const shapes = [];
    let currentColumn = null;
    let inColumnBlock = false;

    lines.slice(1).forEach(line => {
      const shapeMatch = line.match(/Use a (.+?) (shape|diagram)/i);
      if (shapeMatch) {
        shapes.push(shapeMatch[1].trim());
        return;
      }

      // Markdown table
      if (line.startsWith("|")) {
        tableLines.push(line);
        return;
      }

      // Column layout: start of column block
      const colHeaderMatch = line.match(/^(\*\*.+?\*\*):$/);
      if (colHeaderMatch) {
        currentColumn = colHeaderMatch[1].replace(/\*\*/g, "").trim();
        columns[currentColumn] = [];
        inColumnBlock = true;
        return;
      }

      // Column items
      if (inColumnBlock && line.trim().startsWith("-")) {
        columns[currentColumn].push(line.replace(/^-/, "").trim());
        return;
      }

      // Bullet points
      if (line.trim().startsWith("-")) {
        bullets.push(line.replace(/^-/, "").trim());
        return;
      }
    });

    slides.push({
      title,
      bullets: bullets.length > 0 ? bullets : [],
      table: tableLines.length > 0 ? tableLines.join("\n") : null,
      columns: Object.keys(columns).length > 0 ? columns : null,
      shape: shapes.length > 0 ? shapes[0] : null
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