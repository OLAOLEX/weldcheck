const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync("assets/exercises.js", "utf8"), context);
const learning = context.window.WcLearning;
const template = {
  thicknessMin: 4, thicknessMax: 6, electrodeClassification: "E-TEST",
  electrodeSize: 3, weldingPosition: "Flat", currentMin: 80, currentMax: 90,
  preparationChecks: [{ key: "clean", text: "Surface clean" }]
};
const ready = { plateThickness: 5, electrodeClassification: "e-test", electrodeSize: 3, weldingPosition: "flat", currentAmp: 85, checks: { clean: true } };

assert.equal(learning.evaluate(template, ready).status, "ready");
assert.equal(learning.evaluate(template, Object.assign({}, ready, { currentAmp: 95 })).issues[0].code, "current_range");
assert.equal(learning.evaluate(template, Object.assign({}, ready, { checks: {} })).issues[0].code, "check_clean");

const comparison = learning.compare(
  { attempt: Object.assign({}, ready, { currentAmp: 82 }), conditions: ["undercut"] },
  { attempt: ready, conditions: ["irregular_bead"] }
);
assert.equal(comparison.setupChanges.length, 1);
assert.deepEqual(Array.from(comparison.resolved), ["undercut"]);
assert.deepEqual(Array.from(comparison.newConditions), ["irregular_bead"]);

const jobGuidance = learning.guidance(["undercut"], { issues: [{ code: "current_range", message: "Recorded current is outside the requirement." }] }, { workflowType: "job" });
assert.ok(jobGuidance.some((item) => /requirement/.test(item)));
const quickGuidance = learning.guidance(["undercut"], { issues: [] }, { workflowType: "quick_check" });
assert.ok(quickGuidance.some((item) => /No pre-weld requirement/.test(item)));
console.log("learning-cycle rules: ok");
