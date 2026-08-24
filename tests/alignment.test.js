const assert = require("node:assert/strict");
const fs = require("node:fs");

const home = fs.readFileSync("assets/home.js", "utf8");
const upload = fs.readFileSync("upload.html", "utf8");
const endpoint = fs.readFileSync("api/check-weld.js", "utf8");
const result = fs.readFileSync("result.html", "utf8");
const schema = fs.readFileSync("supabase/alignment.sql", "utf8");

assert.match(home, /Primary workflow/);
assert.match(home, /WcData\.allAttempts\(\)/);
assert.match(upload, /id="demoSamples"[^>]*hidden/);
assert.match(upload, /localhost\|127/);
assert.match(endpoint, /parsed\.model_name/);
assert.match(endpoint, /parsed\.prompt_version/);
assert.match(result, /id="referenceBasis"/);
assert.match(result, /id="referenceSource"/);
assert.match(schema, /reference_assessed_at/);
assert.equal(fs.existsSync("assets/home-learning.js"), false);
assert.equal(fs.existsSync("assets/history-learning.js"), false);
assert.equal(fs.existsSync("assets/checklist-target.js"), false);
assert.equal(fs.existsSync("docs/PROJECT_SCOPE.md"), true);
assert.equal(fs.existsSync("docs/EVALUATION_PROTOCOL.md"), true);
console.log("project alignment rules: ok");
