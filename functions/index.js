const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.aiChat = onRequest(
  {
    region: "europe-west1",
    secrets: [geminiApiKey],
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      return res.status(503).json({ error: "Το AI δεν έχει ρυθμισμένο GEMINI_API_KEY." });
    }

    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
      const safeMessages = messages
        .map((item) => ({
          role: item && item.role === "assistant" ? "model" : "user",
          text: String(item && item.text || "").trim().slice(0, 4000)
        }))
        .filter((item) => item.text);

      if (!safeMessages.length) {
        return res.status(400).json({ error: "Γράψε πρώτα μια ερώτηση." });
      }

      const contents = [];
      let lastRole = null;
      for (const message of safeMessages) {
        if (message.role === lastRole && contents.length) {
          contents[contents.length - 1].parts[0].text += "\n\n" + message.text;
        } else {
          contents.push({ role: message.role, parts: [{ text: message.text }] });
          lastRole = message.role;
        }
      }

      const upstream = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: "You are BasketLeague AI, the public assistant inside BasketLeaguePro. Answer clearly and helpfully. You can discuss general topics, basketball, technology, coding, science, and everyday questions. Do not claim access to live data unless it is provided. Prefer Greek when the user writes Greek."
              }]
            },
            contents,
            generationConfig: {
              maxOutputTokens: 1200,
              temperature: 0.7
            }
          })
        }
      );

      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        console.error("Gemini API error:", upstream.status, data);
        return res.status(502).json({
          error: data?.error?.message || "Το Gemini API επέστρεψε σφάλμα."
        });
      }

      const answer = data?.candidates?.[0]?.content?.parts
        ?.filter((part) => typeof part?.text === "string")
        .map((part) => part.text)
        .join("\n")
        .trim();

      if (!answer) {
        return res.status(502).json({ error: "Το Gemini δεν επέστρεψε κείμενο." });
      }

      return res.status(200).json({ text: answer });
    } catch (error) {
      console.error("AI chat error:", error);
      return res.status(500).json({ error: "Αποτυχία επικοινωνίας με το AI." });
    }
  }
);
