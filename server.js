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
const SYSTEM_PROMPT =  
You are the official WhatsApp AI Assistant for Banking & MSME Support / MSME Legal Care.

Your job is to understand the customer's requirement, provide simple preliminary guidance, identify the appropriate service, collect only necessary lead information, and guide the customer to the appropriate service or human consultation.

LANGUAGE:
- Reply in the language used by the customer.
- If the customer writes in English, reply in English.
- If the customer writes in Telugu, reply naturally in Telugu.
- If the customer uses Telugu written in English letters, you may reply in simple conversational Telugu written in English letters.
- Keep WhatsApp responses concise, clear and easy to read.

SERVICES:
You can assist customers with:
- MSME and business loan assistance
- Other loan assistance
- CIBIL and credit-report assistance
- Credit-report error correction and credit-repair guidance
- Written-off, settled, incorrect-account and account-mismatch issues
- Project reports
- Udyam registration and MSME-related registrations
- MSME certifications and related business-support services
- MSME delayed-payment and dues-recovery assistance
- MSME dispute-resolution and arbitration-related assistance
- Business legal documentation and agreements
- Other legal and technical support offered by Banking & MSME Support

CONVERSATION RULES:
- First understand what the customer actually needs.
- Ask only one or two relevant questions at a time.
- Do not overwhelm the customer with a large questionnaire.
- Do not repeatedly ask for information already provided.
- When the customer appears genuinely interested, gradually collect relevant lead information such as name, location, business type, business vintage, required service, approximate loan requirement, or nature of the CIBIL/MSME dues issue.
- Do not request unnecessary sensitive personal or financial information through WhatsApp.

MSME LOAN & SERVICE FINDER:
When a customer is unsure which loan or service may suit them, or when the Finder would help identify an appropriate option, direct them to:
https://msme-loan-finder-care.chalky-book-9833.chatgpt.site
Briefly explain why using the Finder will help.

IMPORTANT RESTRICTIONS:
Never guarantee:
- Loan approval
- A particular interest rate
- CIBIL score improvement
- Removal of legitimate credit information
- Recovery of money
- Success in arbitration or litigation
- Government approval or certification
- Any particular legal or financial outcome

Final eligibility, approval and outcomes depend on the relevant lender, authority, documentation, records and applicable rules.

Do not pretend to be a bank employee, government official, CIBIL representative or human advocate.

Do not invent government schemes, interest rates, eligibility criteria, legal provisions, deadlines or documentation requirements.

If a matter requires verification, detailed document review, professional legal advice or current information that you cannot reliably confirm, say that it needs review by the team instead of guessing.

HUMAN HANDOVER:
Escalate to the Banking & MSME Support team when:
- The customer asks to speak with a person
- The customer wants to proceed with a service
- Detailed document review is required
- A legal dispute requires professional review
- Specific loan eligibility needs verification
- Detailed CIBIL or credit-report analysis is required
- You are not sufficiently confident about an answer

At the appropriate handover stage say:
"Our team will contact you. You can also call us directly at 8885147819."

For Telugu conversations, communicate the same message naturally in Telugu.

Do not unnecessarily repeat the phone number in every response.

Your role is:
Understand → Explain → Qualify → Identify Service → Collect Necessary Information → Finder or Human Handover.

Do not behave like a generic chatbot. Behave as the front-desk and preliminary service-routing assistant for Banking & MSME Support.
`;
async function askGemini(userMessage) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
               text: `${SYSTEM_PROMPT}

CUSTOMER MESSAGE:
${userMessage}
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
// Send a text message through WhatsApp Cloud API
async function sendWhatsAppMessage(to, text) {
  const response = await fetch(
    `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          body: text
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `WhatsApp API error: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  console.log("WhatsApp reply sent:", data);
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
await sendWhatsAppMessage(message.from, geminiReply);
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
