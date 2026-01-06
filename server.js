import express from "express";
import cors from "cors";
import { ImageAnnotatorClient } from "@google-cloud/vision";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const visionClient = new ImageAnnotatorClient();
console.log("OPENAI_API_KEY =", process.env.OPENAI_API_KEY);

function extractText(obj) {
  let text = "";

  if (typeof obj === "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      text += extractText(item) + "\n";
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      text += extractText(obj[key]) + "\n";
    }
  }

  return text;
}

app.post("/api/ai", async (req, res) => {
  try {
    const { images, action, language } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Nessuna immagine ricevuta" });
    }

    let fullText = "";

    for (const base64 of images) {
      const [result] = await visionClient.textDetection({
        image: { content: base64 }
      });

      if (result.fullTextAnnotation?.text) {
        fullText += "\n" + result.fullTextAnnotation.text;
      }
    }

    if (!fullText.trim()) {
      return res.status(400).json({ error: "OCR non ha estratto testo" });
    }

    let prompt = fullText.trim() + "\n\n";

    if (action === "summary") {
      prompt += "Crea un riassunto chiaro, strutturato e conciso.";
    } else if (action === "translation") {
      prompt += `Traduci il testo in ${language || "Italiano"}.`;
    } else {
      prompt += "Elabora il testo in modo chiaro.";
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();
let outputText = "";

if (
  data.output &&
  data.output[0] &&
  data.output[0].content
) {
  for (const block of data.output[0].content) {
    if (block.type === "output_text" && block.text) {
      outputText += block.text + "\n";
    }
  }
}

outputText = outputText.trim();

if (!outputText) {
  return res.status(500).json({
    error: "Testo AI non trovato"
  });
}

res.json({ text: outputText });

return res.json({
  debug: data
});

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
console.log("OPENAI KEY PRESENTE?", !!process.env.OPENAI_API_KEY);
const PORT_NUMBER = process.env.PORT || 3000;
app.listen(PORT_NUMBER, () => {
  console.log("SnapStudy backend running on", PORT_NUMBER);
});
