export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Το AI δεν έχει ρυθμισμένο GEMINI_API_KEY στον server." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const safeMessages = messages
      .map((item) => ({
        role: item && item.role === "assistant" ? "assistant" : "user",
        text: String(item && item.text || "").trim().replace(/\s+/g, " ").slice(0, 4000)
      }))
      .filter((item) => item.text);

    if (!safeMessages.length) {
      return res.status(400).json({ error: "Γράψε πρώτα μια ερώτηση." });
    }

    const conversation = safeMessages
      .map((item) => (item.role === "assistant" ? "Assistant: " : "User: ") + item.text)
      .join("\n\n");

    const prompt =
      "You are BasketLeague AI, the public assistant inside BasketLeaguePro. " +
      "Answer clearly and helpfully. You can discuss general topics, basketball, technology, coding, science, and everyday questions. " +
      "Do not claim access to live data unless it is provided. Prefer the user's language when practical.\n\nConversation:\n" +
      conversation;

    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || "gemini-flash-latest",
        input: prompt,
        store: false,
        generation_config: { max_output_tokens: 1200 }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Gemini API error:", upstream.status, data);
      return res.status(502).json({ error: "Το Gemini API επέστρεψε σφάλμα. Έλεγξε το API key και τα όρια χρήσης." });
    }

    const answer = Array.isArray(data.steps)
      ? data.steps
          .filter((step) => step && step.type === "model_output")
          .flatMap((step) => Array.isArray(step.content) ? step.content : [])
          .filter((part) => part && part.type === "text")
          .map((part) => part.text)
          .join("\n")
      : "";

    if (!answer) {
      return res.status(502).json({ error: "Το Gemini API δεν επέστρεψε κείμενο." });
    }

    return res.status(200).json({ text: answer });
  } catch (error) {
    console.error("AI chat error:", error);
    return res.status(500).json({ error: "Αποτυχία επικοινωνίας με το AI." });
  }
}
