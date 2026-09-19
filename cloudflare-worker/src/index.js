const MODEL = "gemini-3.8-flash";
const MAX_MESSAGES = 12;
const MAX_TEXT = 4000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function sanitizeMessages(input) {
  const messages = Array.isArray(input) ? input.slice(-MAX_MESSAGES) : [];
  return messages
    .map((item) => ({
      role: item?.role === "assistant" ? "model" : "user",
      text: String(item?.text || "").trim().slice(0, MAX_TEXT)
    }))
    .filter((item) => item.text);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "Το AI δεν έχει ρυθμισμένο GEMINI_API_KEY." }, 503);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const messages = sanitizeMessages(body.messages);

      if (!messages.length) {
        return json({ error: "Γράψε πρώτα μια ερώτηση." }, 400);
      }

      const contents = [];
      let lastRole = null;

      for (const message of messages) {
        if (message.role === lastRole && contents.length) {
          contents[contents.length - 1].parts[0].text += "\n\n" + message.text;
        } else {
          contents.push({
            role: message.role,
            parts: [{ text: message.text }]
          });
          lastRole = message.role;
        }
      }

      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
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
              thinkingConfig: { thinkingLevel: "medium" }
            }
          })
        }
      );

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        console.error("Gemini API error:", upstream.status, data);
        return json({
          error: data?.error?.message || "Το Gemini API επέστρεψε σφάλμα."
        }, 502);
      }

      const answer = data?.candidates?.[0]?.content?.parts
        ?.filter((part) => typeof part?.text === "string")
        .map((part) => part.text)
        .join("\n")
        .trim();

      if (!answer) {
        return json({ error: "Το Gemini δεν επέστρεψε κείμενο." }, 502);
      }

      return json({ text: answer });
    } catch (error) {
      console.error("AI chat error:", error);
      return json({ error: "Αποτυχία επικοινωνίας με το AI." }, 500);
    }
  }
};
