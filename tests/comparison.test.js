const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const document = {
  readyState: "loading",
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};
const context = { window: {}, document, URLSearchParams, location: { search: "" }, console };
context.window.document = document;
vm.runInNewContext(fs.readFileSync("assets/app.js", "utf8"), context);
const compare = context.window.Wc.compareConditions;

assert.equal(compare([], []), "exact");
assert.equal(compare(["undercut"], ["undercut"]), "exact");
assert.equal(compare(["undercut", "irregular_bead"], ["undercut"]), "partial");
assert.equal(compare(["visible_porosity"], ["excessive_spatter"]), "no_match");
console.log("reference comparison rules: ok");
