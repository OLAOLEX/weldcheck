(function () {
  "use strict";
  var jobs = [], inspections = [];
  function uniq(values) { return Array.from(new Set(values.filter(Boolean))).sort(); }
  function bar(label, value, max) { return '<div class="wc-bar"><div class="wc-bar__meta"><span>' + Wc.esc(label) + '</span><b>' + value + '</b></div><div class="wc-bar__track"><span style="width:' + Math.round(value / Math.max(1, max) * 100) + '%"></span></div></div>'; }
  function renderStats() {
    var totalConditions = inspections.reduce(function (n, i) { return n + i.conditions.length; }, 0);
    var times = inspections.map(function (i) { return i.responseTimeMs || 0; }).filter(Boolean);
    var exact = inspections.filter(function (i) { return i.comparisonResult === "exact"; }).length;
    var partial = inspections.filter(function (i) { return i.comparisonResult === "partial"; }).length;
    var no = inspections.filter(function (i) { return i.comparisonResult === "no_match"; }).length;
    Wc.$("sJobs").textContent = jobs.length; Wc.$("sChecks").textContent = jobs.filter(function (j) { return Wc.doneCount(j) === Wc.CHECKLIST.length; }).length;
    Wc.$("sInspections").textContent = inspections.length; Wc.$("sConditions").textContent = totalConditions; Wc.$("sMatches").textContent = exact + " / " + partial + " / " + no;
    Wc.$("sTime").textContent = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) + " ms" : "—";
    var counts = {}; Object.keys(Wc.CONDITIONS).forEach(function (k) { counts[k] = 0; });
    inspections.forEach(function (i) { i.conditions.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; }); });
    var max = Math.max.apply(null, Object.values(counts).concat([1]));
    Wc.$("conditionChart").innerHTML = Object.keys(counts).map(function (k) { return bar(Wc.CONDITIONS[k].label, counts[k], max); }).join("");
    var mmax = Math.max(exact, partial, no, 1); Wc.$("matchChart").innerHTML = bar("Exact match", exact, mmax) + bar("Partial match", partial, mmax) + bar("No match", no, mmax);
  }
  function renderJobs() {
    var q = Wc.$("searchBox").value.toLowerCase().trim(), date = Wc.$("dateFilter").value, condition = Wc.$("conditionFilter").value, joint = Wc.$("jointFilter").value, electrode = Wc.$("electrodeFilter").value;
    var list = jobs.filter(function (j) { var text = [j.sampleNo, j.jobName, j.operator, j.electrodeClassification].join(" ").toLowerCase(), mine = inspections.filter(function (i) { return i.jobId === j.id; }); return (!q || text.indexOf(q) >= 0) && (!date || j.date === date) && (!joint || j.jointType === joint) && (!electrode || j.electrodeClassification === electrode) && (!condition || mine.some(function (i) { return i.conditions.indexOf(condition) >= 0; })); });
    if (!list.length) { Wc.$("jobList").innerHTML = '<p class="sel-empty">No jobs match these filters.</p>'; return; }
    Wc.$("jobList").innerHTML = '<div class="sel-rows">' + list.map(function (j) { return '<a class="sel-row" href="' + Wc.nextPage(j) + '"><div class="sel-row__icon"><svg class="ic"><use href="#i-file-text"></use></svg></div><div class="sel-row__body"><div class="sel-row__title">Sample ' + Wc.esc(j.sampleNo) + (j.jobName ? ' · ' + Wc.esc(j.jobName) : '') + '</div><div class="sel-row__sub">' + Wc.esc(Wc.fmtDate(j.date || j.createdAt)) + ' · ' + Wc.esc(j.jointType) + ' · ' + Wc.esc(j.electrodeClassification) + ' ' + j.electrodeSize + ' mm · ' + (j.inspectionCount || 0) + ' inspection(s)</div></div>' + Wc.statusPill(j) + '<svg class="ic sel-row__chev"><use href="#i-chevron-right"></use></svg></a>'; }).join("") + '</div>';
  }
  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  function dateName() { return new Date().toISOString().slice(0, 10); }
  function exportCsv() {
    var head = ["sample_no", "job_name", "job_date", "joint_type", "plate_thickness_mm", "electrode_classification", "electrode_size_mm", "welding_position", "current_amp", "operator", "inspection_id", "inspection_date", "status", "ai_conditions", "human_verdict", "corrected_conditions", "reference_conditions", "comparison", "response_time_ms"], rows = [];
    jobs.forEach(function (j) { inspections.filter(function (i) { return i.jobId === j.id; }).forEach(function (i) { rows.push([j.sampleNo, j.jobName, j.date, j.jointType, j.plateThickness, j.electrodeClassification, j.electrodeSize, j.weldingPosition, j.currentAmp, j.operator, i.id, new Date(i.createdAt).toISOString(), i.status, Wc.conditionLabels(i.conditions).join("; "), i.humanVerdict, Wc.conditionLabels(i.correctedConditions).join("; "), Wc.conditionLabels(i.referenceConditions).join("; "), i.comparisonResult, i.responseTimeMs]); }); });
    Wc.download("weldcheck-inspections-" + dateName() + ".csv", [head].concat(rows).map(function (r) { return r.map(csvCell).join(","); }).join("\n"), "text/csv"); Wc.toast("Spreadsheet downloaded.");
  }
  function exportJson() {
    var payload = { app: "WeldCheck", schemaVersion: 1, exportedAt: new Date().toISOString(), note: "Full record backup. Photograph files are not included.", jobs: jobs.map(function (j) { var x = Object.assign({}, j); delete x.latestInspectionId; delete x.latestStatus; return x; }), inspections: inspections.map(function (i) { var x = Object.assign({}, i); delete x.image; return x; }) };
    Wc.download("weldcheck-full-backup-" + dateName() + ".json", JSON.stringify(payload, null, 2), "application/json"); Wc.toast("Full backup downloaded. Keep it private.");
  }
  ["searchBox", "dateFilter", "conditionFilter", "jointFilter", "electrodeFilter"].forEach(function (id) { Wc.$(id).addEventListener(id === "searchBox" ? "input" : "change", renderJobs); });
  Wc.$("csvBtn").onclick = exportCsv; Wc.$("jsonBtn").onclick = exportJson;
  Promise.all([WcData.allJobs(), WcData.allInspections()]).then(function (v) { jobs = v[0]; inspections = v[1]; var empty = jobs.length === 0, hasInspections = inspections.length > 0; Wc.$("emptyDashboard").hidden = !empty; Wc.$("dashboardContent").hidden = empty; Wc.$("csvBtn").parentElement.hidden = empty; if (empty) { WcFx.reveal(document.body, { selector: ".wc-dashboard-empty", step: 25 }); return; } Wc.$("csvBtn").hidden = !hasInspections; Wc.$("downloadHelp").hidden = !hasInspections; Wc.$("analysisCharts").hidden = !hasInspections; Wc.$("jobFilters").hidden = jobs.length < 2; ["sInspections", "sConditions", "sMatches", "sTime"].forEach(function (id) { Wc.$(id).parentElement.hidden = !hasInspections; }); uniq(jobs.map(function (j) { return j.jointType; })).forEach(function (x) { Wc.$("jointFilter").insertAdjacentHTML("beforeend", '<option>' + Wc.esc(x) + '</option>'); }); uniq(jobs.map(function (j) { return j.electrodeClassification; })).forEach(function (x) { Wc.$("electrodeFilter").insertAdjacentHTML("beforeend", '<option>' + Wc.esc(x) + '</option>'); }); renderStats(); renderJobs(); WcFx.reveal(document.body, { selector: ".sel-stat,.sel-card", step: 25 }); });
})();
