const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync("assets/workflows.js", "utf8"), context);
context.WcWorkflow = context.window.WcWorkflow;
vm.runInNewContext(fs.readFileSync("assets/library.js", "utf8"), context);

const workflow = context.window.WcWorkflow;
const exercises = context.window.WcBuiltinExercises;
assert.deepEqual(Object.keys(workflow.TYPES), ["job", "quick_check", "practice"]);
assert.equal(workflow.PREPARATION_CHECKS.length, 9);
assert.equal(exercises.length, 6);
assert.equal(new Set(exercises.map((item) => item.code)).size, 6);
exercises.forEach((item) => {
  assert.equal(item.workflowType, "practice");
  assert.equal(item.material, "Mild steel");
  assert.ok(item.instructions.length >= 4);
  assert.ok(item.expectedAppearance.length >= 3);
  assert.match(item.sourceReference, /https:\/\//);
  assert.ok(item.currentMin > 0 && item.currentMax >= item.currentMin);
});
assert.equal(workflow.type({ workflowType: "quick_check" }), "quick_check");
assert.equal(workflow.recordName({ workflowType: "job", jobName: "Bracket" }), "Bracket");
console.log("workflow and exercise library: ok");
