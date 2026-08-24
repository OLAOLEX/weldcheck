/* Deterministic exercise validation, learning guidance and attempt comparison. */
(function () {
  "use strict";

  var CONDITION_CHECKS = {
    visible_porosity: [
      "Check that the plate surface and weld area are clean.",
      "Review the electrode condition and the applicable storage or handling instructions.",
      "Ask the responsible reviewer to examine any visible rounded pits before the next decision."
    ],
    undercut: [
      "Review travel speed and electrode angle for the next weld or inspection.",
      "Ask the responsible reviewer to examine the groove visible along the weld edge."
    ],
    excessive_spatter: [
      "Review arc-length consistency and the applicable equipment setup.",
      "Confirm that the work surface was clean before the next weld or inspection."
    ],
    irregular_bead: [
      "Check travel-speed consistency during the next attempt.",
      "Check arc length and electrode angle.",
      "Use the same viewing distance when photographing the next attempt."
    ]
  };

  function number(value) { var n = Number(value); return isFinite(n) ? n : null; }
  function same(a, b) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase(); }
  function rangeText(min, max, unit) { return Number(min) === Number(max) ? min + " " + unit : min + "–" + max + " " + unit; }
  function checks(template) {
    var list = Array.isArray(template && template.preparationChecks) ? template.preparationChecks : [];
    return list.map(function (item, index) {
      if (typeof item === "string") return { key: "check_" + (index + 1), text: item, why: "Complete this preparation check before welding." };
      return { key: String(item.key || "check_" + (index + 1)), text: String(item.text || "Preparation check " + (index + 1)), why: String(item.why || "") };
    });
  }

  function issue(code, title, message, recorded, required) {
    return { code: code, title: title, message: message, recorded: recorded || "Not recorded", required: required || "" };
  }

  function evaluate(template, attempt) {
    var issues = [], thickness = number(attempt.plateThickness), size = number(attempt.electrodeSize), amps = number(attempt.currentAmp);
    if (!thickness) issues.push(issue("thickness_missing", "Record plate thickness", "Enter the thickness actually used for this attempt."));
    else if (thickness < Number(template.thicknessMin) || thickness > Number(template.thicknessMax)) issues.push(issue("thickness_range", "Check plate thickness", "The recorded thickness is outside this exercise requirement.", thickness + " mm", rangeText(template.thicknessMin, template.thicknessMax, "mm")));
    if (!String(attempt.electrodeClassification || "").trim()) issues.push(issue("electrode_missing", "Record electrode classification", "Enter the classification actually used."));
    else if (!same(attempt.electrodeClassification, template.electrodeClassification)) issues.push(issue("electrode_mismatch", "Check electrode classification", "The recorded electrode does not match this exercise.", attempt.electrodeClassification, template.electrodeClassification));
    if (!size) issues.push(issue("electrode_size_missing", "Record electrode size", "Enter the electrode diameter actually used."));
    else if (Math.abs(size - Number(template.electrodeSize)) > 0.001) issues.push(issue("electrode_size_mismatch", "Check electrode size", "The recorded diameter does not match this exercise.", size + " mm", template.electrodeSize + " mm"));
    if (!same(attempt.weldingPosition, template.weldingPosition)) issues.push(issue("position_mismatch", "Check welding position", "The recorded position does not match this exercise.", attempt.weldingPosition, template.weldingPosition));
    if (!amps) issues.push(issue("current_missing", "Record welding current", "Enter the machine current used for this attempt."));
    else if (amps < Number(template.currentMin) || amps > Number(template.currentMax)) issues.push(issue("current_range", "Check current setting", "The recorded current is outside the approved exercise range.", amps + " A", rangeText(template.currentMin, template.currentMax, "A")));
    checks(template).forEach(function (item) {
      if (!attempt.checks || !attempt.checks[item.key]) issues.push(issue("check_" + item.key, item.text, item.why || "Complete this preparation check before welding.", "Pending", "Done"));
    });
    return { status: issues.length ? "check_setup" : "ready", issues: issues, recordedCurrent: amps, setupIssuesSeen: attempt.setupIssuesSeen || [], completedChecks: checks(template).length - issues.filter(function (x) { return x.code.indexOf("check_") === 0; }).length, totalChecks: checks(template).length };
  }

  function guidance(conditions, readiness, job, attempt) {
    var items = [], seen = {};
    (conditions || []).forEach(function (condition) {
      (CONDITION_CHECKS[condition] || []).forEach(function (text) { if (!seen[text]) { seen[text] = true; items.push(text); } });
    });
    var workflow = job && (job.workflowType || job.exerciseSnapshot && job.exerciseSnapshot.workflowType), template = job && job.exerciseSnapshot || {};
    var actualCurrent = number(attempt && attempt.currentAmp) || number(readiness && readiness.recordedCurrent) || (workflow === "quick_check" ? number(template.currentMin) : null), currentRange = template.currentMin && template.currentMax ? rangeText(template.currentMin, template.currentMax, "A") : "";
    if (workflow === "quick_check") items.unshift((actualCurrent ? "Recorded current: " + actualCurrent + " A. " : "The recorded current shown in this report ") + "was not checked against a pre-weld range, so it is context only and not an approved cause or correction.");
    if (workflow === "job" && readiness && readiness.status !== "ready") items.unshift("The recorded setup was not fully confirmed against the applicable job requirement. Review the unresolved setup items before relying on this record.");
    if (readiness && readiness.status === "ready" && workflow === "practice") items.unshift((actualCurrent ? "Recorded current " + actualCurrent + " A is" : "The recorded current is") + " within the selected exercise range of " + currentRange + ". The photograph does not prove that this setting caused the visible result.");
    if (readiness && readiness.status === "ready" && workflow === "job") items.unshift((actualCurrent ? "Recorded current " + actualCurrent + " A is" : "The recorded current is") + " within the entered job range of " + currentRange + ". The photograph does not prove that this setting caused the visible result.");
    if ((attempt && attempt.setupIssuesSeen || readiness && readiness.setupIssuesSeen || []).length) items.push("Earlier setup entries needed correction before this photograph. Keep those changes in the attempt history for review.");
    if (items.length) return items.slice(0, 7);
    if (workflow === "quick_check") return ["Keep this photograph with the work record and ask a qualified reviewer whether another photograph or suitable test is required."];
    if (workflow === "job") return ["Keep the applicable requirement with this record and ask the responsible reviewer whether another inspection or suitable test is required."];
    return ["Keep the approved setup unchanged, save this record and ask the supervisor whether another practice attempt is required."];
  }

  function compare(previous, current) {
    var prevConditions = Array.from(new Set(previous && previous.conditions || [])), currentConditions = Array.from(new Set(current && current.conditions || []));
    var fields = [
      ["Plate thickness", "plateThickness", "mm"], ["Electrode", "electrodeClassification", ""],
      ["Electrode size", "electrodeSize", "mm"], ["Position", "weldingPosition", ""], ["Current", "currentAmp", "A"]
    ];
    var setupChanges = fields.filter(function (field) { return String(previous && previous.attempt && previous.attempt[field[1]]) !== String(current && current.attempt && current.attempt[field[1]]); }).map(function (field) {
      return { label: field[0], before: String(previous.attempt[field[1]]) + (field[2] ? " " + field[2] : ""), after: String(current.attempt[field[1]]) + (field[2] ? " " + field[2] : "") };
    });
    return {
      setupChanges: setupChanges,
      resolved: prevConditions.filter(function (x) { return currentConditions.indexOf(x) < 0; }),
      remaining: currentConditions.filter(function (x) { return prevConditions.indexOf(x) >= 0; }),
      newConditions: currentConditions.filter(function (x) { return prevConditions.indexOf(x) < 0; })
    };
  }

  window.WcLearning = { evaluate: evaluate, guidance: guidance, compare: compare, checks: checks, rangeText: rangeText };
})();
