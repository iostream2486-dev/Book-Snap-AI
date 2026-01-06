
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.post("/api/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices.length) {
    console.error("OpenAI raw response:", data);
    return res.status(500).json({
    error: "OpenAI ha restituito una risposta non valida"
  });
}
    let outputText = "";


if (data.choices && data.choices[0]?.message?.content) {
  outputText = data.choices[0].message.content;
}


else if (data.output_text) {
  outputText = data.output_text;
}


else {
  console.error("OpenAI raw response:", JSON.stringify(data, null, 2));
  return res.status(500).json({
    error: "OpenAI ha risposto ma senza testo leggibile"
  });
}

res.json({ text: outputText });
);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("SnapStudy backend running on " + port));
