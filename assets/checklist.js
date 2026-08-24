(function () {
  "use strict";
  var jobId = Wc.param("job"), attemptId = Wc.param("attempt"), job, attempt, template, saveTimer;
  function row(item) { var done = !!attempt.checks[item.key]; return '<button type="button" class="wc-check' + (done ? ' is-done' : '') + '" data-key="' + Wc.esc(item.key) + '"><span class="wc-check__box"><svg class="ic"><use href="#i-check"></use></svg></span><span class="wc-check__txt"><b>' + Wc.esc(item.text) + '</b>' + (item.why ? '<small>' + Wc.esc(item.why) + '</small>' : '') + '</span><span class="wc-check__state">' + (done ? 'Done' : 'Pending') + '</span></button>'; }
  function pull() { attempt.plateThickness = Wc.$("plateThickness").value; attempt.electrodeClassification = Wc.$("electrodeClassification").value.trim(); attempt.electrodeSize = Wc.$("electrodeSize").value; attempt.weldingPosition = Wc.$("weldingPosition").value.trim(); attempt.currentAmp = Wc.$("currentAmp").value; }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { WcData.updateAttempt(attempt); }, 250); }
  function issueHtml(issue) { var expected = issue.required && issue.code.indexOf("check_") !== 0 ? " Required: " + Wc.esc(issue.required) + "." : ""; return '<div class="sel-row"><div class="sel-row__body"><div class="sel-row__title">' + Wc.esc(issue.title) + '</div><div class="sel-row__sub">' + Wc.esc(issue.message) + expected + '</div></div></div>'; }
  function evaluate() {
    pull(); var result = WcLearning.evaluate(template, attempt), practice = WcWorkflow.isPractice(job), ready = result.status === "ready";
    attempt.readinessStatus = result.status; attempt.readinessIssues = result.issues; Wc.$("progText").textContent = result.completedChecks + " of " + result.totalChecks + " done";
    WcFx.progressTo(Wc.$("progFill"), result.totalChecks ? Math.round(result.completedChecks / result.totalChecks * 100) : 100);
    Wc.$("readiness").className = "sel-card wc-section-card " + (ready ? "wc-ready-card" : ""); Wc.$("readyTitle").textContent = ready ? "Ready to weld" : "Check " + result.issues.length + " item" + (result.issues.length === 1 ? "" : "s");
    Wc.$("readyCopy").textContent = ready ? (practice ? "The recorded setup and preparation match this exercise." : "The recorded setup and preparation match the entered job requirement.") : "Correct or confirm these items before continuing.";
    Wc.$("issues").innerHTML = ready ? '<div class="sel-row"><div class="sel-row__body"><div class="sel-row__title">Setup check passed</div><div class="sel-row__sub">This confirms the recorded requirements; it does not predict weld quality.</div></div></div>' : result.issues.map(issueHtml).join("");
    Wc.$("nextBtn").disabled = !ready; save();
  }
  function bindChecks() { Wc.$("checkList").querySelectorAll(".wc-check").forEach(function (button) { button.onclick = function () { attempt.checks[this.dataset.key] = !attempt.checks[this.dataset.key]; renderChecks(); }; }); }
  function renderChecks() { Wc.$("checkList").innerHTML = WcLearning.checks(template).map(row).join(""); bindChecks(); evaluate(); }
  function render() {
    template = job.exerciseSnapshot; var practice = WcWorkflow.isPractice(job), instructions = template.instructions || [], targets = template.expectedAppearance || [];
    Wc.$("pageIntro").textContent = practice ? "Record what is actually being used. WeldCheck compares it with the selected exercise." : "Record what is actually being used. WeldCheck compares it with the entered procedure or reference.";
    var source = practice ? "Sourced guided exercise" : (job.referenceType && job.referenceText ? job.referenceType + ": " + job.referenceText : "Entered work requirement");
    Wc.$("jobStrip").innerHTML = '<div class="wc-jobstrip__ic"><svg class="ic"><use href="#i-file-text"></use></svg></div><div class="wc-jobstrip__t"><div class="wc-jobstrip__name">' + Wc.esc(WcWorkflow.recordName(job)) + ' · Attempt ' + attempt.attemptNo + '</div><div class="wc-jobstrip__meta">' + Wc.esc(WcWorkflow.info(job).label) + ' · ' + Wc.esc(source) + '</div></div>';
    if (practice && (instructions.length || targets.length)) { Wc.$("targetTitle").textContent = "How to complete this exercise"; Wc.$("targetObjective").textContent = template.objective || template.description || ""; Wc.$("instructionList").innerHTML = instructions.map(function (item) { return '<li>' + Wc.esc(item) + '</li>'; }).join(""); Wc.$("targetList").innerHTML = targets.map(function (item) { return '<li>' + Wc.esc(typeof item === "string" ? item : (item.text || item.label || "")) + '</li>'; }).join(""); Wc.$("targetCard").hidden = false; }
    ["plateThickness", "electrodeClassification", "electrodeSize", "weldingPosition", "currentAmp"].forEach(function (id) { Wc.$(id).value = attempt[id] == null ? "" : attempt[id]; Wc.$(id).oninput = evaluate; });
    renderChecks(); Wc.$("page").hidden = false;
  }
  Wc.$("nextBtn").onclick = function () { pull(); var result = WcLearning.evaluate(template, attempt); if (result.status !== "ready") { evaluate(); Wc.toast("Check the remaining setup items."); return; } attempt.readinessStatus = "ready"; attempt.readinessIssues = []; WcData.updateAttempt(attempt).then(function () { location.href = "/upload?job=" + job.id + "&attempt=" + attempt.id; }); };
  Promise.all([WcData.getJob(jobId), WcData.getAttempt(attemptId)]).then(function (values) { job = values[0]; attempt = values[1]; if (!job || !attempt || !job.exerciseSnapshot || WcWorkflow.isQuick(job)) throw new Error("missing"); render(); }).catch(function () { Wc.$("missing").hidden = false; });
})();
