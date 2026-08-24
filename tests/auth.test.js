const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const document = {
  readyState: "loading",
  addEventListener() {}
};
const context = { window: {}, document, URLSearchParams, location: { search: "", hash: "" } };
vm.runInNewContext(fs.readFileSync("assets/auth.js", "utf8"), context);

const shouldShow = context.window.WcAuthRules.shouldShowWelcome;
const guest = { configured: true, user: { id: "guest", is_anonymous: true }, isGuest: true };
const google = { configured: true, user: { id: "google", is_anonymous: false }, isGuest: false };

assert.equal(shouldShow(guest, false), true, "a new guest chooses an access method once");
assert.equal(shouldShow(guest, true), false, "a returning guest is not interrupted again");
assert.equal(shouldShow(google, false), false, "a restored Google user never sees onboarding");
assert.equal(shouldShow({ configured: false, user: null, isGuest: false }, false), false, "local mode does not offer unavailable Google access");
console.log("authentication onboarding rules: ok");
