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
You are an expert presentation designer and educator. Generate a compelling, visually-structured presentation on the topic: **"${topic}"**, consisting of **${slidesCount} slides**. This presentation must be suitable for professional, academic, or general audiences, depending on the topic.  

### Format Rules:
- **Every 2 slides**: One of them must include either a **table** or a **chart**.
- If a slide contains a **table or chart**, it should **not include bullet points** — focus on the visual content only.
- Alternate between visual (table/chart) and bullet-style slides for variety and clarity.

### Slide Content Guidelines:
- **Title**: Begin with "Slide X: [Title]" — short, relevant, and clear.  
- **Bullet Points**: 4–5 well-structured bullets (only if the slide has no chart or table).  
- **Tables (Markdown)**: Use for comparisons, classifications, or breakdowns.  
- **Charts (Markdown)**: Choose the most appropriate type from the list below and represent the data using markdown code blocks.

### Allowed Chart Types (use one where relevant):
- **Bar Chart**  
- **Pie Chart**  
- **Line Chart**  
- **Doughnut Chart**  
- **Stacked Bar Chart**  
- **Area Chart**

### Additional:
- **Shapes/Icons**: Suggest a visual element (e.g., triangle, decision tree, star, circle, etc.) to symbolize the slide’s concept.
- Add short examples, analogies, or metaphors if it helps understanding.
- Keep tone and complexity appropriate to the topic’s domain.
- Avoid empty or filler content; every slide must meaningfully add to the topic.

### Example Slide Output:

**Slide 1: Key Concepts of Artificial Intelligence**  
- AI is the simulation of human intelligence in machines.  
- Includes learning, reasoning, and self-correction.  
- Found in industries like healthcare, finance, and education.  
- Divided into Narrow AI and General AI.  
- Use a **lightbulb shape** to represent innovation.  

**Slide 2: AI Industry Adoption Rates**  

\`\`\`chart  
Type: pie  
Data:  
  - Healthcare: 40%  
  - Finance: 25%  
  - Education: 20%  
  - Other: 15%  
\`\`\`  

- Use a **pie chart icon** to represent proportional adoption.  

Make the output ready for rendering in Reveal.js, Gamma, or other slide platforms.`;
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