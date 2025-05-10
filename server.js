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
You are an expert educator and presentation writer. Create a clear, engaging, and well-structured presentation on the topic: "${topic}", with exactly ${slidesCount} slides.

### Slide Structure Guidelines:
- Each slide must include:
  - A **Title**
  - Either **bullet points**, a **table**, or a **multi-column layout**

### Allowed Slide Types:
1. **Bullet Points**: Use for explanations, definitions, or short lists.
2. **Tables (Markdown)**: Use every 3rd slide to present structured comparisons or data.
3. **Multi-Column Layouts**: Use for side-by-side content such as:
   - Feature vs Benefit
   - Step-by-step guides
   - Comparisons (e.g., P-type vs N-type)
   - Pros vs Cons

### Output Format:

Slide 1: [Slide Title]  
- Bullet point 1  
- Bullet point 2  
- Bullet point 3  

Slide 2: [Slide Title]  
**Multi-Column Layout**

**Left Column Title:**  
- Item A  
- Item B  

**Right Column Title:**  
- Item X  
- Item Y  

Slide 3: [Slide Title]  
\`\`\`table
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
| Data 3   | Data 4   |
\`\`\`

### Notes:
- Avoid diagrams, shapes, or visual instructions.
- Make sure each slide adds new, useful information.
- Don’t include “Content coming soon...”.
`;
}

// Parse Gemini response into structured slides
function parseGeminiResponse(responseText) {
  const slides = [];
  const lines = responseText.split('\n');
  let currentSlide = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect new slide
    const slideMatch = line.match(/^Slide\s+\d+:\s*(.+)$/i);
    if (slideMatch) {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = {
        title: slideMatch[1],
        type: 'bullet', // default type
        content: [],
        columns: {},
        table: ''
      };
      continue;
    }

    // Detect multi-column section
    if (line.toLowerCase().includes('**multi-column layout**')) {
      currentSlide.type = 'columns';
      continue;
    }

    // Detect column title
    const columnTitleMatch = line.match(/^\*\*(.+)\*\*:?$/);
    if (columnTitleMatch) {
      currentSlide.currentColumn = columnTitleMatch[1];
      currentSlide.columns[currentSlide.currentColumn] = [];
      continue;
    }

    // Add to current column
    if (currentSlide?.type === 'columns' && line.startsWith('-')) {
      currentSlide.columns[currentSlide.currentColumn].push(line.slice(1).trim());
      continue;
    }

    // Detect table
    if (line.startsWith('```table')) {
      currentSlide.type = 'table';
      currentSlide.table = '';
      continue;
    }
    if (currentSlide?.type === 'table') {
      if (line === '```') {
        continue;
      } else {
        currentSlide.table += line + '\n';
        continue;
      }
    }

    // Add bullet point
    if (line.startsWith('-')) {
      currentSlide.content.push(line.slice(1).trim());
    }
  }

  if (currentSlide) slides.push(currentSlide);
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