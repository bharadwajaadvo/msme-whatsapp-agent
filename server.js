import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Simple health check
app.get("/", (req, res) => {
  res.status(200).send("Banking & MSME Support WhatsApp AI backend is running.");
});

// Meta webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("Webhook verified successfully.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Ask Gemini
async function askGemini(userMessage) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: userMessage
              }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, I could not generate a response."
  );
}

// Receive WhatsApp webhook events
app.post("/webhook", (req, res) => {
  // Acknowledge Meta immediately
  res.sendStatus(200);

  (async () => {
    try {
      const value = req.body?.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];

      if (!message) return;

      const userText = message.text?.body;

      console.log("WhatsApp message received:", {
        from: message.from,
        type: message.type,
        text: userText || null
      });

      // For now, process only text messages
      if (!userText) return;

      const geminiReply = await askGemini(userText);

      console.log("Gemini reply:", geminiReply);

      // Next step:
      // Send geminiReply back to the customer through WhatsApp.
    } catch (error) {
      console.error("AI processing error:", error);
    }
  })();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
