var crypto = require("crypto");
var CONDITION_CODES = ["visible_porosity", "undercut", "excessive_spatter", "irregular_bead"];
var RESULT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["status", "confidence_level", "confidence_reason", "image_quality_status", "image_quality_issues", "summary", "conditions", "observations", "assessment_reason", "possible_causes", "recommended_actions", "limitations"],
  properties: {
    status: { type: "string", enum: ["acceptable", "visible_issues", "retake"] },
    confidence_level: { type: "string", enum: ["low", "medium", "high"] },
    confidence_reason: { type: "string", description: "One plain sentence explaining how image clarity and visible evidence affect confidence." },
    image_quality_status: { type: "string", enum: ["acceptable", "poor"] },
    image_quality_issues: { type: "array", items: { type: "string" } },
    summary: { type: "string", description: "One or two plain sentences stating what the photograph shows. Do not infer skill, technique, settings, strength, penetration, safety, or code compliance." },
    conditions: { type: "array", items: { type: "string", enum: CONDITION_CODES } },
    observations: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", description: "A concrete, location-aware visible observation without explaining why it happened." } },
    assessment_reason: { type: "string", description: "Connect only the listed observations to the chosen status and allowed conditions." },
    possible_causes: { type: "array", maxItems: 5, items: { type: "string", description: "A cautious possibility using may, might, or could; never a confirmed cause." } },
    recommended_actions: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", description: "A short, practical next step. Recommend qualified review when the consequence is safety-critical." } },
    limitations: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } }
  }
};

var INSTRUCTIONS = [
  "You are the visible weld-surface inspection module in WeldCheck, a student learning and record system for SMAW mild-steel samples.",
  "First decide whether the photograph is usable. If it is not clear, set status to retake, image_quality_status to poor, conditions to an empty array, and give specific retake actions.",
  "For a usable image, return status acceptable only when none of the allowed visible conditions is evident. Otherwise return visible_issues and every condition that is visibly supported.",
  "Allowed conditions: visible_porosity (visible rounded pits or holes), undercut (a visible groove along a weld toe), excessive_spatter (many scattered metal droplets), irregular_bead (clearly inconsistent bead shape or width).",
  "Every observation must name a concrete visible feature and, when possible, where it appears. Do not praise or criticise the welder, skill, technique, settings, preparation, or workmanship from appearance alone.",
  "Possible causes are optional. When used, each must contain may, might, or could and must be presented as something to check, never as a fact. For acceptable status, return no possible causes.",
  "Recommended actions must be practical and proportionate: retake guidance for retake, review or correct the visible area for visible issues, and save or confirm the record for acceptable appearance.",
  "Use short sentences and familiar words. Explain technical terms using visible shapes, such as a groove at the weld edge or rounded pits.",
  "Do not claim internal-defect detection, penetration, mechanical strength, safety certification, pass/fail against a welding code, or replacement of a qualified inspector.",
  "Always state that only visible surface appearance is assessed and that internal condition or strength requires suitable tests and qualified review."
].join("\n");

function json(res, status, body) { res.status(status).json(body); }
function bearer(req) {
  var header = String(req.headers.authorization || "");
  return /^Bearer\s+(.+)$/i.test(header) ? header.replace(/^Bearer\s+/i, "") : "";
}
async function verifyUser(token) {
  var url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  var response = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
  if (!response.ok) return null;
  return response.json();
}
async function claimLimit(token, isAnonymous) {
  var configured = Number(process.env.AI_DAILY_LIMIT || 0);
  var limit = configured > 0 ? configured : (isAnonymous ? 5 : 20);
  var response = await fetch(process.env.SUPABASE_URL + "/rest/v1/rpc/claim_ai_check", {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ p_limit: limit })
  });
  if (!response.ok) throw new Error("Usage limit check failed.");
  return { allowed: await response.json(), limit: limit };
}
function outputText(data) {
  if (data.output_text) return data.output_text;
  var items = data.output || [];
  for (var i = 0; i < items.length; i++) {
    var content = items[i].content || [];
    for (var j = 0; j < content.length; j++) if (content[j].type === "output_text") return content[j].text;
  }
  return "";
}
function validResult(result) {
  if (!result || ["acceptable", "visible_issues", "retake"].indexOf(result.status) < 0) return false;
  if (!Array.isArray(result.conditions) || result.conditions.some(function (c) { return CONDITION_CODES.indexOf(c) < 0; })) return false;
  if (result.status === "acceptable" && result.conditions.length) return false;
  if (result.status === "visible_issues" && !result.conditions.length) return false;
  return ["observations", "possible_causes", "recommended_actions", "limitations", "image_quality_issues"].every(function (k) { return Array.isArray(result[k]); });
}
function normalizeResult(result) {
  var limits = { confidence_reason: 300, summary: 400, assessment_reason: 500 };
  Object.keys(limits).forEach(function (key) { result[key] = String(result[key] || "").slice(0, limits[key]); });
  var arrays = { image_quality_issues: 5, conditions: 4, observations: 6, possible_causes: 5, recommended_actions: 6, limitations: 4 };
  Object.keys(arrays).forEach(function (key) {
    result[key] = Array.isArray(result[key]) ? result[key].map(function (value) { return String(value).slice(0, 260); }).slice(0, arrays[key]) : [];
  });
  result.conditions = Array.from(new Set(result.conditions));
  if (result.status === "acceptable") result.possible_causes = [];
  if (result.status === "retake") { result.conditions = []; result.image_quality_status = "poor"; }
  var requiredLimits = [
    "This result covers only the visible surface shown in this photograph.",
    "Internal condition, penetration and strength require suitable tests and qualified review."
  ];
  result.limitations = result.limitations.filter(function (item) { return requiredLimits.indexOf(item) < 0; }).slice(0, 2).concat(requiredLimits);
  return result;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: "AI inspection is not configured." });
  var token = bearer(req);
  if (!token) return json(res, 401, { error: "Sign in as a guest or with Google before running an inspection." });
  var image = req.body && req.body.image;
  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return json(res, 400, { error: "Send a JPEG, PNG, or WebP image." });
  if (image.length > 4200000) return json(res, 413, { error: "The photograph is too large." });

  try {
    var user = await verifyUser(token);
    if (!user) return json(res, 401, { error: "Your session has expired. Refresh and try again." });
    var usage = await claimLimit(token, !!user.is_anonymous);
    if (!usage.allowed) return json(res, 429, { error: "Daily AI inspection limit reached.", limit: usage.limit });
    var job = req.body.job || {};
    var context = ["Inspect this completed SMAW mild-steel weld photograph.", "Recorded job details are context only. Do not use them as visible evidence and do not judge whether a setting was correct:", "Joint: " + String(job.jointType || "Not supplied"), "Plate thickness: " + String(job.plateThickness || "Not supplied") + " mm", "Electrode: " + String(job.electrodeClassification || "Not supplied") + " " + String(job.electrodeSize || "") + " mm", "Position: " + String(job.weldingPosition || "Not supplied"), "Current: " + String(job.currentAmp || "Not supplied") + " A"].join("\n");
    var started = Date.now();
    var response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        instructions: INSTRUCTIONS,
        input: [{ role: "user", content: [{ type: "input_text", text: context }, { type: "input_image", image_url: image, detail: "high" }] }],
        text: { format: { type: "json_schema", name: "weld_inspection", strict: true, schema: RESULT_SCHEMA } },
        max_output_tokens: 1500,
        temperature: 0.2,
        safety_identifier: crypto.createHash("sha256").update(String(user.id)).digest("hex"),
        store: false
      })
    });
    if (!response.ok) {
      console.error("OpenAI response", response.status, (await response.text()).slice(0, 600));
      return json(res, 502, { error: "The AI inspection is unavailable right now." });
    }
    var data = await response.json(), parsed = normalizeResult(JSON.parse(outputText(data)));
    if (!validResult(parsed)) return json(res, 502, { error: "The AI returned an incomplete inspection. Please retry." });
    parsed.response_time_ms = Date.now() - started;
    parsed.engine = "ai";
    return json(res, 200, parsed);
  } catch (error) {
    console.error("check-weld failed", error);
    return json(res, 502, { error: error.message === "Supabase is not configured." ? error.message : "The inspection could not be completed. Please try again." });
  }
};
