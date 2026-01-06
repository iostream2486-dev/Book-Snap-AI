import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import vision from "@google-cloud/vision";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const visionClient = new vision.ImageAnnotatorClient();

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
      fullText += "\n" + (result.fullTextAnnotation?.text || "");
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();

    let outputText = "";

    if (data.choices && data.choices[0]?.message?.content) {
      outputText = data.choices[0].message.content;
    } else if (data.output_text) {
      outputText = data.output_text;
    } else {
      return res.status(500).json({
        error: "OpenAI ha risposto ma senza testo leggibile"
      });
    }

    res.json({ text: outputText });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("SnapStudy backend running on", port);
});
