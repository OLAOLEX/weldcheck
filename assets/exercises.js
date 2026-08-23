/* Deterministic exercise validation, learning guidance and attempt comparison. */
(function () {
  "use strict";

  var CONDITION_CHECKS = {
    visible_porosity: [
      "Check that the plate surface and weld area are clean.",
      "Check the electrode condition and handling requirements for the approved exercise.",
      "Ask the supervisor to review any visible rounded pits before another attempt."
    ],
    undercut: [
      "Check the recorded current against the approved exercise range.",
      "Check travel speed and electrode angle during the next attempt.",
      "Ask the supervisor to review the groove visible along the weld edge."
    ],
    excessive_spatter: [
      "Check the recorded current against the approved exercise range.",
      "Check arc-length consistency and the approved machine setup.",
      "Confirm that the work surface is clean before the next attempt."
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
    return { status: issues.length ? "check_setup" : "ready", issues: issues, completedChecks: checks(template).length - issues.filter(function (x) { return x.code.indexOf("check_") === 0; }).length, totalChecks: checks(template).length };
  }

  function guidance(conditions, readiness) {
    var items = [], seen = {};
    (conditions || []).forEach(function (condition) {
      (CONDITION_CHECKS[condition] || []).forEach(function (text) { if (!seen[text]) { seen[text] = true; items.push(text); } });
    });
    if (readiness && readiness.status === "ready") items.unshift("The recorded setup passed the selected exercise rules before welding; the photograph does not prove that a setting caused the visible result.");
    return items.length ? items.slice(0, 6) : ["Keep the approved setup unchanged, save this record and ask the supervisor whether another practice attempt is required."];
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
