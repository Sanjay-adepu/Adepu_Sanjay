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
function generatePrompt(topic, slidesCount, presenterName = "Your Name") {
  return `
You are an expert educator and presentation designer. Create a clear, structured, engaging presentation on the topic: "${topic}" with exactly ${slidesCount} slides.

**Target Audience:** Professionals, students, or the general public depending on topic complexity. Keep it informative yet visually appealing.

---

### FORMAT REQUIREMENTS

- **Slide Count:** ${slidesCount}
- **Title Format:** Start each slide with "Slide X: [Title]" (replace X with slide number).
- **Slide Type:** Alternate between **textual (bulleted)** slides and **visual** slides (tables/charts).
- **Every 2 slides:** Ensure **at least one** visual slide (table or chart).

---

### SLIDE STRUCTURE

**Slide 1 (Intro):**  
Slide 1: ${topic}  
- *Presented by:* ${presenterName}  
- 2–3 line introduction to the topic.  
- Suggest a **symbolic icon** for the topic (e.g., lightbulb, globe, circuit).  

---

**Text Slides (with bullets):**  
- 4 to 6 informative bullet points.  
- Each bullet must be clear, concise, and informative.  
- Use **bolding**, inline \`code\`, or analogies to simplify complex ideas.  
- Keep formatting consistent and non-repetitive.

---

**Visual Slides (tables/charts only):**  
- No bullets on these slides.  
- Choose one:
  - **Bar Chart**
  - **Pie Chart**
  - **Line Chart**
  - **Comparison Table**

**Examples:**

**Chart Example**  
\`\`\`chart  
Type: bar  
Data:  
2019: 50  
2020: 80  
2021: 120  
2022: 100  
2023: 150  
\`\`\`  
Use a **bar chart icon** to symbolize growth.

**Table Example**  
\`\`\`table  
| Technology     | Description                     | Example Use        |  
|----------------|----------------------------------|--------------------|  
| AI             | Simulates human intelligence     | Chatbots, Vision   |  
| Blockchain     | Decentralized digital ledger     | Bitcoin, NFTs      |  
| IoT            | Connects physical devices online | Smart homes, cars  |  
\`\`\`  
Use a **grid or list icon** to represent structured information.

---

**Visual Cue (Optional):**  
- Suggest a symbolic visual per slide (e.g., tree, gear, eye, rocket).  

---

### ADDITIONAL GUIDELINES

- Use only relevant and **non-placeholder** content (do not return "--", "null", or empty charts).
- Explain abstract ideas with relatable examples or metaphors.
- Avoid filler content — each slide must meaningfully contribute to understanding the topic.
- Keep tone consistent and appropriate to the audience.
- Ensure compatibility with Reveal.js, Gamma, or similar slide tools.

---
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
    let currentChart = "";
    let inChart = false;

    lines.slice(1).forEach(line => {
      const shapeMatch = line.match(/Use a (\w+) shape/);
      if (shapeMatch) {
        shapes.push(shapeMatch[1]);
        return;
      }

      // Markdown table line
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
        const parsed = parseChart(currentChart.trim());
        if (parsed) charts.push(parsed);
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

function parseChart(chartText) {
  const chart = {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Dataset", // Default label
        data: [],
        backgroundColor: []
      }]
    }
  };

  const lines = chartText.split("\n");
  const colors = [
    "#8BC34A", "#7E57C2", "#4FC3F7", "#FFA726",
    "#F06292", "#26A69A", "#FFD54F", "#EF5350"
  ];

  let colorIndex = 0;

  lines.forEach(line => {
    if (line.startsWith("Type:")) {
      chart.type = line.replace("Type:", "").trim();
    } else if (line.startsWith("Title:")) {
      chart.data.datasets[0].label = line.replace("Title:", "").trim();
    } else if (line.includes(":")) {
      const [label, value] = line.split(":").map(s => s.trim().replace("%", ""));
      if (label && value) {
        chart.data.labels.push(label.replace(/^- /, ""));
        chart.data.datasets[0].data.push(Number(value));
        chart.data.datasets[0].backgroundColor.push(colors[colorIndex % colors.length]);
        colorIndex++;
      }
    }
  });

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