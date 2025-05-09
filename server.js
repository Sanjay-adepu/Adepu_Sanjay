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
    let currentChart = "";
    let inChart = false;

    lines.slice(1).forEach(line => {
      const shapeMatch = line.match(/Use a (\w+) shape/);
      if (shapeMatch) {
        shapes.push(shapeMatch[1]);
        return;
      }

      // Handle markdown table
      if (line.startsWith("|")) {
        currentTable.push(line);
      } 
      // Start of chart block
      else if (line.startsWith("```chart")) {
        inChart = true;
        currentChart = "";
      } 
      // End of chart block
      else if (line.startsWith("```") && inChart) {
        charts.push(parseChart(currentChart.trim()));
        inChart = false;
      } 
      // Inside chart block
      else if (inChart) {
        currentChart += line + "\n";
      } 
      // Bullet point
      else if (line.trim().startsWith("-")) {
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
      charts,
      shapes
    });
  });

  return slides;
}

// Helper function to parse chart content into structured object
function parseChart(chartText) {
  const chart = {};
  const lines = chartText.split("\n");
  const data = [];

  lines.forEach(line => {
    if (line.startsWith("Type:")) {
      chart.type = line.replace("Type:", "").trim();
    } else if (line.startsWith("Title:")) {
      chart.title = line.replace("Title:", "").trim();
    } else if (line.startsWith("X-Axis:")) {
      chart.xAxis = line.replace("X-Axis:", "").trim();
    } else if (line.startsWith("Y-Axis:")) {
      chart.yAxis = line.replace("Y-Axis:", "").trim();
    } else if (line.startsWith("//")) {
      chart.note = line.replace("//", "").trim();
    } else if (line.includes(":")) {
      // e.g. - Framework: React, Usage: 60
      const item = {};
      const parts = line.split(",");
      parts.forEach(part => {
        const [key, value] = part.split(":").map(s => s.trim());
        if (key && value) item[key] = isNaN(value) ? value : parseFloat(value);
      });
      if (Object.keys(item).length > 0) data.push(item);
    }
  });

  chart.data = data;
  return chart;
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