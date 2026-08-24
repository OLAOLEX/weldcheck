(function () {
  "use strict";
  var jobs = [], attempts = [], inspections = [];
  function bar(label, value, max) { return '<div class="wc-bar"><div class="wc-bar__meta"><span>' + Wc.esc(label) + '</span><b>' + value + '</b></div><div class="wc-bar__track"><span style="width:' + Math.round(value / Math.max(1, max) * 100) + '%"></span></div></div>'; }
  function renderStats() {
    var ready = attempts.filter(function (a) { return a.readinessStatus === "ready"; }).length;
    var reviewed = attempts.filter(function (a) { return a.supervisorStatus && a.supervisorStatus !== "unreviewed"; }).length;
    var times = inspections.map(function (i) { return i.responseTimeMs || 0; }).filter(Boolean);
    Wc.$("sJobs").textContent = jobs.length; Wc.$("sAttempts").textContent = attempts.length; Wc.$("sReady").textContent = ready;
    Wc.$("sInspections").textContent = inspections.length; Wc.$("sReviewed").textContent = reviewed;
    Wc.$("sTime").textContent = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) + " ms" : "—";
    var counts = {}; Object.keys(Wc.CONDITIONS).forEach(function (key) { counts[key] = 0; });
    inspections.forEach(function (inspection) { (inspection.conditions || []).forEach(function (key) { counts[key] = (counts[key] || 0) + 1; }); });
    var maximum = Math.max.apply(null, Object.values(counts).concat([1]));
    Wc.$("conditionChart").innerHTML = Object.keys(counts).map(function (key) { return bar(Wc.CONDITIONS[key].label, counts[key], maximum); }).join("");
    var states = { accepted: 0, needs_attempt: 0, incomplete: 0, unreviewed: 0 };
    attempts.forEach(function (attempt) { states[attempt.supervisorStatus || "unreviewed"]++; });
    var stateMax = Math.max.apply(null, Object.values(states).concat([1]));
    Wc.$("reviewChart").innerHTML = bar("Accepted", states.accepted, stateMax) + bar("Another attempt", states.needs_attempt, stateMax) + bar("Incomplete", states.incomplete, stateMax) + bar("Not reviewed", states.unreviewed, stateMax);
  }
  function renderJobs() {
    var query = Wc.$("searchBox").value.toLowerCase().trim(), condition = Wc.$("conditionFilter").value;
    var workflow = Wc.$("workflowFilter").value, review = Wc.$("reviewFilter").value;
    var list = jobs.filter(function (job) {
      var ownAttempts = attempts.filter(function (attempt) { return attempt.jobId === job.id; });
      var ownInspections = inspections.filter(function (inspection) { return inspection.jobId === job.id; });
      var text = [job.sampleNo, job.jobName, job.clientProject, job.operator, WcWorkflow.recordName(job), job.exerciseSnapshot && job.exerciseSnapshot.code].join(" ").toLowerCase();
      return (!query || text.indexOf(query) >= 0) && (!workflow || WcWorkflow.type(job) === workflow) && (!condition || ownInspections.some(function (inspection) { return (inspection.conditions || []).indexOf(condition) >= 0; })) && (!review || ownAttempts.some(function (attempt) { return (attempt.supervisorStatus || "unreviewed") === review; }));
    });
    Wc.$("jobList").innerHTML = list.length ? '<div class="sel-rows">' + list.map(function (job) { var info = WcWorkflow.info(job), name = WcWorkflow.recordName(job); return '<a class="sel-row" href="' + Wc.nextPage(job) + '"><div class="sel-row__icon"><svg class="ic"><use href="#' + info.icon + '"></use></svg></div><div class="sel-row__body"><div class="sel-row__title">' + Wc.esc(job.sampleNo) + (name ? ' · ' + Wc.esc(name) : '') + '</div><div class="sel-row__sub">' + Wc.esc(info.label) + ' · ' + (job.attemptCount || 0) + ' attempt(s) · ' + (job.inspectionCount || 0) + ' photo review(s)</div></div>' + Wc.statusPill(job) + '<svg class="ic sel-row__chev"><use href="#i-chevron-right"></use></svg></a>'; }).join("") + '</div>' : '<p class="sel-empty">No work records match these filters.</p>';
  }
  function csv(value) { return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"'; }
  function dateName() { return new Date().toISOString().slice(0, 10); }
  function exportCsv() {
    var head = ["workflow_type", "sample_no", "job_name_or_exercise", "client_project", "requirement_source", "attempt_no", "joint_type", "plate_thickness_mm", "electrode_classification", "electrode_size_mm", "position", "current_amp", "readiness", "ai_status", "ai_conditions", "user_verdict", "corrected_conditions", "review_status", "reviewer", "review_comment", "response_time_ms"], rows = [];
    attempts.forEach(function (attempt) { var job = jobs.find(function (item) { return item.id === attempt.jobId; }) || {}; var inspection = inspections.filter(function (item) { return item.attemptId === attempt.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; })[0] || {}; rows.push([WcWorkflow.type(job), job.sampleNo, WcWorkflow.recordName(job), job.clientProject, [job.referenceType, job.referenceText].filter(Boolean).join(": "), attempt.attemptNo, job.exerciseSnapshot && job.exerciseSnapshot.jointType || job.jointType, attempt.plateThickness, attempt.electrodeClassification, attempt.electrodeSize, attempt.weldingPosition, attempt.currentAmp, attempt.readinessStatus, inspection.status, Wc.conditionLabels(inspection.conditions).join("; "), inspection.humanVerdict, Wc.conditionLabels(inspection.correctedConditions).join("; "), attempt.supervisorStatus, attempt.reviewerName, attempt.supervisorComment, inspection.responseTimeMs]); });
    Wc.download("weldcheck-inspections-" + dateName() + ".csv", [head].concat(rows).map(function (row) { return row.map(csv).join(","); }).join("\n"), "text/csv");
  }
  function exportJson() { var clean = inspections.map(function (inspection) { var copy = Object.assign({}, inspection); delete copy.image; return copy; }); Wc.download("weldcheck-backup-" + dateName() + ".json", JSON.stringify({ app: "WeldCheck", schemaVersion: 4, exportedAt: new Date().toISOString(), note: "Photograph files are not included.", jobs: jobs, attempts: attempts, inspections: clean }, null, 2), "application/json"); }
  ["searchBox", "conditionFilter", "workflowFilter", "reviewFilter"].forEach(function (id) { Wc.$(id).addEventListener(id === "searchBox" ? "input" : "change", renderJobs); });
  Wc.$("csvBtn").onclick = exportCsv; Wc.$("jsonBtn").onclick = exportJson;
  Promise.all([WcData.allJobs(), WcData.allAttempts(), WcData.allInspections()]).then(function (values) { jobs = values[0]; attempts = values[1]; inspections = values[2]; var empty = !jobs.length; Wc.$("emptyDashboard").hidden = !empty; Wc.$("dashboardContent").hidden = empty; if (empty) return; renderStats(); renderJobs(); WcFx.reveal(document.body, { selector: ".sel-stat,.sel-card", step: 20 }); });
})();
