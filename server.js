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
function parsePresentationSlides(content) {
  const slides = [];
  const lines = content.split('\n');

  let currentSlide = null;
  let inChart = false;
  let inTable = false;
  let chartLines = [];
  let tableLines = [];

  for (let line of lines) {
    const slideMatch = line.match(/^Slide\s+(\d+):\s*(.+)/);
    const chartStart = line.trim().startsWith('```chart');
    const tableStart = line.trim().startsWith('```table');
    const blockEnd = line.trim() === '```';

    if (slideMatch) {
      if (currentSlide) {
        slides.push(currentSlide);
      }
      currentSlide = {
        number: parseInt(slideMatch[1]),
        title: slideMatch[2].trim(),
        type: 'text',
        content: [],
        visualCue: null,
      };
      inChart = false;
      inTable = false;
      chartLines = [];
      tableLines = [];
      continue;
    }

    if (!currentSlide) continue;

    if (chartStart) {
      inChart = true;
      currentSlide.type = 'chart';
      chartLines = [];
      continue;
    }

    if (tableStart) {
      inTable = true;
      currentSlide.type = 'table';
      tableLines = [];
      continue;
    }

    if (blockEnd) {
      if (inChart) {
        currentSlide.content = chartLines.map(l => l.trim());
        inChart = false;
      } else if (inTable) {
        currentSlide.content = tableLines.map(l => l.trim());
        inTable = false;
      }
      continue;
    }

    if (inChart) {
      chartLines.push(line);
      continue;
    }

    if (inTable) {
      tableLines.push(line);
      continue;
    }

    if (line.startsWith('-') || line.startsWith('*')) {
      currentSlide.content.push(line.replace(/^[-*]\s*/, '').trim());
    }

    if (line.toLowerCase().includes('use a') && line.toLowerCase().includes('icon')) {
      currentSlide.visualCue = line.trim();
    }
  }

  if (currentSlide) {
    slides.push(currentSlide);
  }

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