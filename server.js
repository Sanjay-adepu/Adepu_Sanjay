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

### Slide Structure Rules:
- Slide 2, 5, 8: Use **multi-column layout with 3 columns**.
- Every 3rd slide (3, 6, 9...): Use a **markdown table**.
- All other slides: Use **bullet points**.

### Slide Format:

Slide 1: [Slide Title]  
- Bullet point 1  
- Bullet point 2  
- Bullet point 3  

Slide 2: [Slide Title]  
**Multi-Column Layout**  

**Column 1 Title:**  
- Item A  
- Item B  

**Column 2 Title:**  
- Item X  
- Item Y  

**Column 3 Title:**  
- Item M  
- Item N  

Slide 3: [Slide Title]  
\`\`\`table  
| Header 1 | Header 2 |  
|----------|----------|  
| Row 1    | Value 1  |  
| Row 2    | Value 2  |  
\`\`\`

### Guidelines:
- No diagrams, no visuals, no shapes.
- Each slide should be informative and unique.
- Avoid placeholder text like “TBD” or “Coming Soon”.
`;
}



// Parse Gemini response into structured slides
function parseGeminiResponse(responseText) {
  const slides = [];
  const lines = responseText.split('\n');
  let currentSlide = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start new slide
    const slideMatch = line.match(/^Slide\s+\d+:\s*(.+)$/i);
    if (slideMatch) {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = {
        title: slideMatch[1],
        type: 'bullet',
        content: [],
        columns: {},
        table: ''
      };
      continue;
    }

    // Detect Multi-Column Layout
    if (line.toLowerCase().includes('**multi-column layout**')) {
      currentSlide.type = 'columns';
      continue;
    }

    // Detect Column Title
    const columnTitleMatch = line.match(/^\*\*(.+?)\*\*:?$/);
    if (columnTitleMatch) {
      currentSlide.currentColumn = columnTitleMatch[1];
      currentSlide.columns[currentSlide.currentColumn] = [];
      continue;
    }

    // Add column items
    if (currentSlide?.type === 'columns' && line.startsWith('-')) {
      currentSlide.columns[currentSlide.currentColumn].push(line.slice(1).trim());
      continue;
    }

    // Detect Table
    if (line.startsWith('```table')) {
      currentSlide.type = 'table';
      currentSlide.table = '';
      continue;
    }
    if (currentSlide?.type === 'table') {
      if (line === '```') continue;
      currentSlide.table += line + '\n';
      continue;
    }

    // Add Bullet Items
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