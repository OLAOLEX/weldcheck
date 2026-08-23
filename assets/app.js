/* Shared WeldCheck constants and UI helpers. */
(function () {
  "use strict";
  var CHECKLIST = [
    { key: "c1", text: "Mild steel material has been confirmed." },
    { key: "c2", text: "Plate thickness has been recorded." },
    { key: "c3", text: "Joint type and joint arrangement have been confirmed." },
    { key: "c4", text: "The surfaces to be welded are clean." },
    { key: "c5", text: "Electrode classification and size have been confirmed." },
    { key: "c6", text: "Welding current has been checked." },
    { key: "c7", text: "Electrode holder, cables, and ground clamp are secure." },
    { key: "c8", text: "Welding helmet, gloves, and protective clothing are ready." },
    { key: "c9", text: "The work area is safe and properly arranged." }
  ];
  var CONDITIONS = {
    visible_porosity: { label: "Visible porosity", tone: "danger" },
    undercut: { label: "Undercut", tone: "danger" },
    excessive_spatter: { label: "Excessive spatter", tone: "warn" },
    irregular_bead: { label: "Irregular bead", tone: "warn" }
  };
  var STATUSES = {
    acceptable: { label: "Acceptable appearance", tone: "good", icon: "i-check-circle" },
    visible_issues: { label: "Visible issues", tone: "danger", icon: "i-alert" },
    retake: { label: "Retake photo", tone: "unclear", icon: "i-camera" }
  };
  function $(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  function fmtDate(value, withTime) {
    if (!value) return "";
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d)) return String(value);
    var opts = { year: "numeric", month: "short", day: "numeric" };
    if (withTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
    return d.toLocaleString(undefined, opts);
  }
  function doneCount(job) {
    return CHECKLIST.reduce(function (n, item) { return n + (job.checks && job.checks[item.key] ? 1 : 0); }, 0);
  }
  function nextPage(job) {
    if (job.latestInspectionId) return "/result?job=" + encodeURIComponent(job.id) + "&inspection=" + encodeURIComponent(job.latestInspectionId);
    if (doneCount(job) === CHECKLIST.length) return "/upload?job=" + encodeURIComponent(job.id);
    return "/checklist?job=" + encodeURIComponent(job.id);
  }
  function statusPill(job) {
    if (job.latestStatus) {
      var st = STATUSES[job.latestStatus] || STATUSES.retake;
      return '<span class="sel-state-pill sel-state-pill--' + st.tone + '">' + esc(st.label) + "</span>";
    }
    if (doneCount(job) === CHECKLIST.length) return '<span class="sel-state-pill sel-state-pill--soon">Awaiting photo</span>';
    return '<span class="sel-state-pill sel-state-pill--soon">Checklist ' + doneCount(job) + "/" + CHECKLIST.length + "</span>";
  }
  function compareConditions(system, reference) {
    var a = Array.from(new Set(system || [])).sort(), b = Array.from(new Set(reference || [])).sort();
    if (a.length === b.length && a.every(function (v, i) { return v === b[i]; })) return "exact";
    if (a.some(function (v) { return b.indexOf(v) !== -1; })) return "partial";
    return "no_match";
  }
  function conditionLabels(values) { return (values || []).map(function (key) { return CONDITIONS[key] ? CONDITIONS[key].label : key; }); }
  function download(name, content, type) {
    var url = URL.createObjectURL(new Blob([content], { type: type || "text/plain" }));
    var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }
  var toastTimer;
  function toast(message) {
    var el = document.querySelector(".sel-toast");
    if (!el) { el = document.createElement("div"); el.className = "sel-toast"; document.body.appendChild(el); }
    el.textContent = message; requestAnimationFrame(function () { el.classList.add("is-on"); });
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 3000);
  }
  function isDark() {
    if (document.body.classList.contains("theme-dark")) return true;
    if (document.body.classList.contains("theme-light")) return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function updateTheme(btn) {
    var use = btn && btn.querySelector("use");
    if (use) use.setAttribute("href", isDark() ? "#i-sun" : "#i-moon");
    if (btn) btn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
  }
  function addGuidedStepper() {
    var badge = document.querySelector(".sel-steps"), match = badge && badge.textContent.match(/Step\s+(\d)\s+of\s+3/i);
    if (!match || document.querySelector(".wc-stepper")) return;
    var current = Number(match[1]), labels = ["Job details", "Preparation", "Weld photo"], list = document.createElement("ol");
    list.className = "wc-stepper"; list.setAttribute("aria-label", "Inspection progress");
    list.innerHTML = labels.map(function (label, index) {
      var n = index + 1, state = n < current ? " is-complete" : (n === current ? " is-current" : "");
      return '<li class="wc-stepper__item' + state + '"' + (n === current ? ' aria-current="step"' : '') + '><span>' + (n < current ? "✓" : n) + '</span><b>' + label + '</b></li>';
    }).join("");
    badge.parentNode.insertBefore(list, badge.nextSibling);
  }
  function addLoadingState() {
    var page = document.getElementById("page"), main = document.querySelector("main");
    if (!page || !page.hidden || !main || document.querySelector(".wc-page-loading")) return;
    var loader = document.createElement("div"); loader.className = page.classList.contains("sel-wrap") ? "sel-wrap wc-page-loading" : "sel-narrow wc-page-loading";
    loader.setAttribute("role", "status"); loader.setAttribute("aria-live", "polite");
    loader.innerHTML = '<span class="wc-loader" aria-hidden="true"></span><div><b>Loading your workspace</b><span>Retrieving the latest private record…</span></div>';
    main.insertBefore(loader, main.firstChild);
    var observer = new MutationObserver(function () {
      var missing = document.getElementById("missing");
      if (!page.hidden || (missing && !missing.hidden)) { loader.remove(); observer.disconnect(); }
    });
    observer.observe(page, { attributes: true, attributeFilter: ["hidden"] });
    var missing = document.getElementById("missing"); if (missing) observer.observe(missing, { attributes: true, attributeFilter: ["hidden"] });
  }
  function initChrome() {
    var saved = "";
    try { saved = localStorage.getItem("wcTheme") || ""; } catch (e) {}
    if (saved) document.body.classList.add("theme-" + saved);
    var btn = $("themeBtn"); updateTheme(btn);
    if (btn) btn.type = "button";
    if (btn) btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      document.body.classList.remove("theme-dark", "theme-light"); document.body.classList.add("theme-" + next);
      try { localStorage.setItem("wcTheme", next); } catch (e) {}
      updateTheme(btn);
    });
    var page = document.body.getAttribute("data-page");
    document.querySelectorAll("[data-nav]").forEach(function (a) { if (a.getAttribute("data-nav") === page) a.classList.add("is-active"); });
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    addGuidedStepper(); addLoadingState();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initChrome); else initChrome();
  window.Wc = { CHECKLIST: CHECKLIST, CONDITIONS: CONDITIONS, STATUSES: STATUSES, $: $, esc: esc, param: param, uid: uid, fmtDate: fmtDate, toast: toast, doneCount: doneCount, preDone: doneCount, nextPage: nextPage, statusPill: statusPill, compareConditions: compareConditions, conditionLabels: conditionLabels, download: download };
})();
