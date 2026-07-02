/* app.js: shared WeldCheck helpers + domain constants. window.Wc.
 * Checklist items come straight from the project proposal (Appendix A, Table A1) and the
 * appearance categories from Table 2.1, so the app stays faithful to the approved scope. */
(function () {
  "use strict";

  /* Pre-welding checklist (Table A1). The last item is completed after welding, when the
     weld photo is saved, so it is grouped and handled separately on the checklist page. */
  var CHECKLIST = [
    { key: "c1", text: "Mild steel sample number has been recorded." },
    { key: "c2", text: "Metal surface has been cleaned before welding." },
    { key: "c3", text: "Workpiece has been positioned and held firmly." },
    { key: "c4", text: "Electrode size has been recorded." },
    { key: "c5", text: "Welding machine has been checked." },
    { key: "c6", text: "Ground clamp has good contact with the workpiece." },
    { key: "c7", text: "Welding shield, gloves, and protective clothing are available." },
    { key: "c8", text: "Work area is clear and ready for welding." }
  ];
  var POST_ITEM = { key: "c9", text: "Weld image has been captured clearly after welding." };

  /* Weld appearance categories (Table 2.1). */
  var CATEGORIES = {
    good: {
      label: "Good weld appearance",
      meaning: "The bead looks regular and clean.",
      icon: "i-check-circle", pill: "sel-state-pill--good", hero: "wc-result-hero__ic--good"
    },
    holes: {
      label: "Visible holes and rough bead",
      meaning: "The bead shows holes, rough surface, and irregular finishing.",
      icon: "i-alert", pill: "sel-state-pill--holes", hero: "wc-result-hero__ic--holes"
    },
    spatter: {
      label: "Excessive spatter and uneven bead",
      meaning: "Heavy spatter, uneven bead width, and rough surface appearance.",
      icon: "i-activity", pill: "sel-state-pill--spatter", hero: "wc-result-hero__ic--spatter"
    },
    unclear: {
      label: "Unclear image",
      meaning: "The photograph is blurred, too dark, too bright, or poorly framed.",
      icon: "i-eye", pill: "sel-state-pill--unclear", hero: "wc-result-hero__ic--unclear"
    }
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  function uid() { return "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtDate(v) {
    if (!v) return "";
    var d = (v instanceof Date) ? v : new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  var toastTimer = null;
  function toast(msg) {
    var el = document.querySelector(".sel-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "sel-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(function () { el.classList.add("is-on"); });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2400);
  }

  /* How far a job has progressed: details -> checklist -> photo -> result. */
  function preDone(job) {
    var n = 0;
    CHECKLIST.forEach(function (it) { if (job.checks && job.checks[it.key]) n++; });
    return n;
  }
  function nextPage(job) {
    if (job.result) return "result.html?job=" + job.id;
    if (preDone(job) >= CHECKLIST.length) return "upload.html?job=" + job.id;
    return "checklist.html?job=" + job.id;
  }
  function statusPill(job) {
    if (job.result) {
      var c = CATEGORIES[job.result.key] || CATEGORIES.unclear;
      return '<span class="sel-state-pill ' + c.pill + '"><svg class="ic" aria-hidden="true"><use href="#' + c.icon + '"></use></svg>' + esc(c.label) + "</span>";
    }
    if (preDone(job) >= CHECKLIST.length) return '<span class="sel-state-pill sel-state-pill--soon">Awaiting photo</span>';
    return '<span class="sel-state-pill sel-state-pill--soon">Checklist ' + preDone(job) + "/" + CHECKLIST.length + "</span>";
  }

  /* Header nav active state + footer year, run on every page. */
  function chrome() {
    var page = document.body.getAttribute("data-page");
    document.querySelectorAll(".wc-topnav a[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === page) a.classList.add("is-active");
    });
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", chrome);
  else chrome();

  window.Wc = {
    CHECKLIST: CHECKLIST, POST_ITEM: POST_ITEM, CATEGORIES: CATEGORIES,
    $: $, esc: esc, param: param, uid: uid, fmtDate: fmtDate, toast: toast,
    preDone: preDone, nextPage: nextPage, statusPill: statusPill
  };
})();
