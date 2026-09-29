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

// Receive WhatsApp webhook events
app.post("/webhook", (req, res) => {
  // Acknowledge Meta immediately
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) return;

    console.log("WhatsApp message received:", {
      from: message.from,
      type: message.type,
      text: message.text?.body || null
    });

    // Next step:
    // Send this message to OpenAI and reply through WhatsApp.
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
