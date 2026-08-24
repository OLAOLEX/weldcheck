var crypto = require("crypto");
var CONDITION_CODES = ["visible_porosity", "undercut", "excessive_spatter", "irregular_bead"];
var SCHEMA_VERSION = "weld-inspection-v1", PROMPT_VERSION = "visible-surface-v2";
var RESULT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["status", "confidence_level", "confidence_reason", "image_quality_status", "image_quality_issues", "summary", "conditions", "observations", "assessment_reason", "limitations"],
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
    limitations: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } }
  }
};

var INSTRUCTIONS = [
  "You are the visible weld-surface inspection module in WeldCheck, a work-record and learning system for SMAW mild-steel welds.",
  "First decide whether the photograph is usable. If it is not clear, set status to retake, image_quality_status to poor, conditions to an empty array, and give specific retake actions.",
  "For a usable image, return status acceptable only when none of the allowed visible conditions is evident. Otherwise return visible_issues and every condition that is visibly supported.",
  "Allowed conditions: visible_porosity (visible rounded pits or holes), undercut (a visible groove along a weld toe), excessive_spatter (many scattered metal droplets), irregular_bead (clearly inconsistent bead shape or width).",
  "Every observation must name a concrete visible feature and, when possible, where it appears. Do not praise or criticise the welder, skill, technique, settings, preparation, or workmanship from appearance alone.",
  "Do not infer causes or recommend machine-setting changes. The application handles setup validation and learning guidance separately using approved exercise rules.",
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
  if (["low", "medium", "high"].indexOf(result.confidence_level) < 0) return false;
  if (["acceptable", "poor"].indexOf(result.image_quality_status) < 0) return false;
  if (!["confidence_reason", "summary", "assessment_reason"].every(function (key) { return typeof result[key] === "string" && result[key].trim().length > 0; })) return false;
  if (!Array.isArray(result.conditions) || result.conditions.some(function (c) { return CONDITION_CODES.indexOf(c) < 0; })) return false;
  if (result.status === "acceptable" && result.conditions.length) return false;
  if (result.status === "visible_issues" && !result.conditions.length) return false;
  if (result.status === "retake" && result.image_quality_status !== "poor") return false;
  if (result.status !== "retake" && result.image_quality_status !== "acceptable") return false;
  if (!["observations", "limitations", "image_quality_issues"].every(function (k) { return Array.isArray(result[k]); })) return false;
  return result.observations.length > 0 && result.limitations.length >= 2;
}
function normalizeResult(result) {
  var limits = { confidence_reason: 300, summary: 400, assessment_reason: 500 };
  Object.keys(limits).forEach(function (key) { result[key] = String(result[key] || "").slice(0, limits[key]); });
  var arrays = { image_quality_issues: 5, conditions: 4, observations: 6, limitations: 4 };
  Object.keys(arrays).forEach(function (key) {
    result[key] = Array.isArray(result[key]) ? result[key].map(function (value) { return String(value).slice(0, 260); }).slice(0, arrays[key]) : [];
  });
  result.conditions = Array.from(new Set(result.conditions));
  result.possible_causes = [];
  result.recommended_actions = [];
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
    var attempt = req.body.attempt || {}, exercise = req.body.exercise || {}, job = req.body.job || {};
    var context = ["Inspect this completed SMAW mild-steel weld photograph.", "The following recorded context is for the report only. It is not visual evidence; do not judge it and do not infer causes from it:", "Workflow: " + String(job.workflowType || exercise.workflowType || "Not supplied"), "Record: " + String(exercise.code || exercise.name || job.jobName || "Not supplied"), "Joint: " + String(exercise.jointType || "Not supplied"), "Recorded plate thickness: " + String(attempt.plateThickness || "Not supplied") + " mm", "Recorded electrode: " + String(attempt.electrodeClassification || "Not supplied") + " " + String(attempt.electrodeSize || "") + " mm", "Recorded position: " + String(attempt.weldingPosition || "Not supplied"), "Recorded current: " + String(attempt.currentAmp || "Not supplied") + " A"].join("\n");
    var started = Date.now();
    var modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
    var response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: modelName,
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
    parsed.engine = "openai_responses";
    parsed.model_name = modelName;
    parsed.schema_version = SCHEMA_VERSION;
    parsed.prompt_version = PROMPT_VERSION;
    parsed.app_version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.APP_VERSION || "local";
    return json(res, 200, parsed);
  } catch (error) {
    console.error("check-weld failed", error);
    return json(res, 502, { error: error.message === "Supabase is not configured." ? error.message : "The inspection could not be completed. Please try again." });
  }
};
