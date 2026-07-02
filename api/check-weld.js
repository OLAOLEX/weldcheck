/* /api/check-weld: Vercel serverless function. Receives a weld photo (data URL) and asks an
 * OpenAI vision model to group it into one of the four WeldCheck appearance categories,
 * replying in the exact result shape the front end already uses. No fine-tuning: a general
 * image model with careful prompting, so it works on any weld photo out of the box.
 *
 * Setup on Vercel: add the OPENAI_API_KEY environment variable (Settings > Environment
 * Variables). Optional: OPENAI_MODEL to override the default model. Without a key the
 * endpoint answers 503 and the front end falls back to the built-in basic analyzer.
 *
 * Spend protection: set AI_CHECK_PIN (for example a 6 digit code) and every AI check must
 * include that PIN. The app asks the user once and remembers it on their device. Change or
 * remove the PIN any time in Vercel env settings; without the variable no PIN is asked. */

var ALLOWED = { good: 1, holes: 1, spatter: 1, unclear: 1 };

var SYSTEM_PROMPT = [
  "You are the appearance checker inside WeldCheck, a student learning tool that looks at photos of mild steel weld samples.",
  "Group each photo into exactly one category:",
  '- "good": the weld bead looks regular and clean.',
  '- "holes": the bead shows visible holes, pits, or a rough irregular surface.',
  '- "spatter": there is heavy spatter around the bead or the bead width is clearly uneven.',
  '- "unclear": the photo is blurred, too dark, too bright, poorly framed, or does not show a weld at all.',
  "Reply with strict JSON only, no other text:",
  '{"category":"good|holes|spatter|unclear","confidence":<integer 0-100>,"reason":"<one or two short sentences in simple everyday language describing what you can see>"}',
  "If the photo does not show a weld, use \"unclear\" and say so plainly. Never use technical jargon in the reason."
].join("\n");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }
  var key = process.env.OPENAI_API_KEY;
  if (!key) {
    res.status(503).json({ error: "AI check is not configured on this deployment." });
    return;
  }

  /* PIN gate: when AI_CHECK_PIN is set, only requests carrying the right PIN reach the AI. */
  var requiredPin = process.env.AI_CHECK_PIN;
  if (requiredPin) {
    var pin = String((req.body && req.body.pin) || "");
    if (pin !== String(requiredPin)) {
      /* Small delay so guessing PINs is slow. */
      await new Promise(function (r) { setTimeout(r, 800); });
      res.status(401).json({
        error: pin ? "That PIN is not correct." : "A PIN is needed for the AI check.",
        code: pin ? "pin_wrong" : "pin_required"
      });
      return;
    }
  }

  var image = req.body && req.body.image;
  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
    res.status(400).json({ error: "Send { image } as a JPEG, PNG, or WebP data URL." });
    return;
  }
  if (image.length > 4200000) {
    res.status(413).json({ error: "The photo is too large. Please retry; the app resizes photos before sending." });
    return;
  }

  try {
    var r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 250,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Check this weld sample photo and reply with the JSON." },
              { type: "image_url", image_url: { url: image, detail: "low" } }
            ]
          }
        ]
      })
    });

    if (!r.ok) {
      var errText = await r.text();
      console.error("OpenAI error", r.status, errText.slice(0, 500));
      res.status(502).json({ error: "The AI check is unavailable right now." });
      return;
    }

    var data = await r.json();
    var raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    var parsed = JSON.parse(raw);
    var category = String(parsed.category || "").toLowerCase();
    if (!ALLOWED[category]) category = "unclear";
    var confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)));
    var reason = String(parsed.reason || "").slice(0, 400);

    res.status(200).json({ key: category, confidence: confidence, reason: reason, source: "ai" });
  } catch (e) {
    console.error("check-weld failed", e);
    res.status(502).json({ error: "The AI check failed. Please try again." });
  }
};
