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


// Parse AI response
function parseGeminiResponse(responseText) {
    const slides = [];
    const slideSections = responseText.split("Slide ");

    slideSections.forEach((section) => {
        const match = section.match(/^(\d+):\s*(.+)/);
        if (match) {
            const title = match[2].replace(/\*\*/g, "").trim();
            const lines = section.split("\n").slice(1).map(line => line.trim());

            const content = [];
            const table = [];
            let isCodeBlock = false;
            let isTable = false;

            lines.forEach((line, index) => {
                if (line.startsWith("```")) {
                    isCodeBlock = !isCodeBlock;
                } else if (isCodeBlock) {
                    if (line) content.push(line);
                } else if (line && line !== "**") {
                    if (line.startsWith("|") && line.endsWith("|")) {
                        isTable = true;
                        table.push(line);
                    } else if (isTable && line.includes("|")) {
                        table.push(line);
                    } else {
                        isTable = false;
                        // Remove leading "- " if exists
                        content.push(line.replace(/^-\s*/, ""));
                    }
                }
            });

            slides.push({ title, content, table: table.length ? table : null });
        }
    });

    return slides.length ? { slides } : { error: "Invalid AI response format" };
}





// Generate PPT using AI
app.post("/generate-ppt", async (req, res) => {
    const { topic, slidesCount } = req.body;

    if (!topic || !slidesCount) {
        return res.status(400).json({ error: "Missing required fields: topic and slidesCount" });
    }

    const isCodingTopic = ["Java", "Python", "JavaScript", "C++", "C#", "React", "Node.js","PHP"].some(lang =>
        topic.toLowerCase().includes(lang.toLowerCase())
    );

    let prompt;
    if (isCodingTopic) {
        prompt = `
Generate a PowerPoint presentation on "${topic}" with exactly ${slidesCount} slides.

Slide Structure:

1. Slide Title: Format as "Slide X: Title".
2. Explanation: Use clear, structured bullet points (max 3 per slide).
3. Code Snippets: Include only one **small** example per slide, not exceeding 4 lines.

Example:

Slide 2: Hello World Example

- Basic syntax of ${topic}.
- How to print output.
- Entry point of the program.

\`\`\`${topic.toLowerCase()} program
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
\`\`\`
`;
    } else {
        prompt = `
Generate a structured PowerPoint presentation on "${topic}" with exactly ${slidesCount} slides.

Slide Structure:

1. Slide Title: Format as "Slide X: Title".
2. Content: Provide **exactly 4 to 5 bullet points** explaining key concepts in simple terms. Every slide must have at least 4 points. Do not exceed 5 bullet points.
3. Ensure that the number of points remains consistent across all slides, even if there are more than 14 slides.
4. Additionally, if slides 3, 6, and 8 exist in the presentation, each must include a table with at least 3 rows and 2 columns. Use varied table styles such as comparison tables, pros/cons, or data summaries.

Example:

Slide 1: Introduction to ${topic}

- Definition of ${topic}.
- Importance and real-world applications.
- How it impacts various industries.
- Key reasons why ${topic} is relevant today.
- Future scope and advancements.

Slide 2: Key Features

- Feature 1: Explanation.
- Feature 2: Explanation.
- Feature 3: Explanation.
- Feature 4: Explanation.
- Feature 5: Explanation.

Slide 3: Comparison Table

- Overview of different models.
- Factors considered in comparison.
- Below is a comparison table:

| Model | Use Case        |
|-------|-----------------|
| X     | Scenario A      |
| Y     | Scenario B      |
| Z     | Scenario C      |
`;
    }

    try {
        const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${GOOGLE_GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );

        const aiText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const formattedSlides = parseGeminiResponse(aiText);

        if (formattedSlides.error) {
            return res.status(500).json({ error: "Unexpected AI response. Please try again." });
        }

        return res.json(formattedSlides);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return res.status(500).json({ error: "Failed to generate slides from AI." });
    }
});





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});