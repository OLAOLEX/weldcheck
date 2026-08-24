(function () {
  "use strict";
  var inspectionId = Wc.param("inspection"), state = null, originalUpdate = WcData.updateInspection;
  var labels = { exact: "Exact match", partial: "Partial match", no_match: "No match" };
  var basisLabels = { supervisor_visual: "Supervisor visual assessment", prepared_sample: "Prepared-sample label", other: "Other documented reference" };

  WcData.updateInspection = function (inspection) {
    if (state && inspection && inspection.id === state.id) {
      inspection.referenceConditions = (state.referenceConditions || []).slice();
      inspection.comparisonResult = state.comparisonResult || null;
      inspection.referenceBasis = state.referenceBasis || null;
      inspection.referenceSource = state.referenceSource || "";
      inspection.referenceAssessedAt = state.referenceAssessedAt || null;
      inspection.referenceNote = state.referenceNote || "";
    }
    return originalUpdate(inspection);
  };

  function selected() {
    return Array.from(Wc.$("referenceChecks").querySelectorAll("input:checked")).map(function (input) { return input.value; });
  }
  function render() {
    var saved = state && state.comparisonResult;
    Wc.$("referenceBasis").value = state && state.referenceBasis || "";
    Wc.$("referenceSource").value = state && state.referenceSource || "";
    Wc.$("referenceAssessedAt").value = state && state.referenceAssessedAt || new Date().toISOString().slice(0, 10);
    Wc.$("referenceNote").value = state && state.referenceNote || "";
    Wc.$("referenceChecks").innerHTML = Object.keys(Wc.CONDITIONS).map(function (key) {
      var checked = state && (state.referenceConditions || []).indexOf(key) >= 0;
      return '<label class="wc-condition"><input type="checkbox" value="' + key + '" ' + (checked ? "checked" : "") + '/><span>' + Wc.esc(Wc.CONDITIONS[key].label) + '</span></label>';
    }).join("");
    Wc.$("removeReference").hidden = !saved;
    if (!saved) { Wc.$("referenceSummary").innerHTML = "<p>Not recorded.</p>"; return; }
    var ai = Wc.conditionLabels(state.conditions).join(", ") || "Acceptable - no visible issue condition";
    var reference = Wc.conditionLabels(state.referenceConditions).join(", ") || "Acceptable - no visible issue condition";
    var provenance = state.referenceBasis && state.referenceSource && state.referenceAssessedAt ? (basisLabels[state.referenceBasis] || state.referenceBasis) + " · " + state.referenceSource + " · " + state.referenceAssessedAt + (state.referenceNote ? " · " + state.referenceNote : "") : "Provenance not recorded for this earlier reference.";
    Wc.$("referenceSummary").innerHTML = '<p><span class="sel-state-pill sel-state-pill--' + (saved === "exact" ? "good" : saved === "partial" ? "soon" : "danger") + '">' + labels[saved] + '</span></p><div class="sel-rows"><div class="sel-row"><div class="sel-row__body"><div class="sel-row__title">WeldCheck conditions</div><div class="sel-row__sub">' + Wc.esc(ai) + '</div></div></div><div class="sel-row"><div class="sel-row__body"><div class="sel-row__title">Reference conditions</div><div class="sel-row__sub">' + Wc.esc(reference) + '</div></div></div><div class="sel-row"><div class="sel-row__body"><div class="sel-row__title">Reference provenance</div><div class="sel-row__sub">' + Wc.esc(provenance) + '</div></div></div></div>';
  }
  function refresh() {
    return WcData.getInspection(inspectionId).then(function (latest) { if (!latest) throw new Error("missing"); state = latest; render(); return latest; });
  }
  Wc.$("saveReference").onclick = function () {
    var button = this, reference = selected(), basis = Wc.$("referenceBasis").value, source = Wc.$("referenceSource").value.trim(), assessedAt = Wc.$("referenceAssessedAt").value, note = Wc.$("referenceNote").value.trim();
    if (!basis || !source || !assessedAt) { Wc.toast("Choose the reference basis, source and assessment date."); return; }
    button.classList.add("is-loading");
    refresh().then(function () { state.referenceConditions = reference; state.comparisonResult = Wc.compareConditions(state.conditions, reference); state.referenceBasis = basis; state.referenceSource = source; state.referenceAssessedAt = assessedAt; state.referenceNote = note; return originalUpdate(state); }).then(function () { render(); Wc.toast("Reference comparison saved."); }).catch(function () { Wc.toast("The reference could not be saved."); }).finally(function () { button.classList.remove("is-loading"); });
  };
  Wc.$("removeReference").onclick = function () {
    var button = this; button.classList.add("is-loading");
    refresh().then(function () { state.referenceConditions = []; state.comparisonResult = null; state.referenceBasis = null; state.referenceSource = ""; state.referenceAssessedAt = null; state.referenceNote = ""; return originalUpdate(state); }).then(function () { render(); Wc.toast("Reference removed."); }).catch(function () { Wc.toast("The reference could not be removed."); }).finally(function () { button.classList.remove("is-loading"); });
  };
  refresh().catch(function () { Wc.$("referenceSummary").innerHTML = "<p>Reference unavailable.</p>"; });
})();
