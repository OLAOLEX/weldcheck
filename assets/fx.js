/* fx.js: small, zero-dependency motion helpers for WeldCheck (ported from the Movescrow
 * member-surface sel-fx pattern). window.WcFx. Everything degrades to an instant end-state
 * under prefers-reduced-motion. No build, classic browser script. */
(function () {
  "use strict";
  var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function reduced() { return REDUCED; }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* Count a number up from 0 to `to`. opts: { duration, from, format } */
  function countUp(el, to, opts) {
    if (!el) return;
    opts = opts || {};
    var fmt = opts.format || function (n) { return String(Math.round(n)); };
    to = Number(to) || 0;
    if (REDUCED || to <= 0) { el.textContent = fmt(to); return; }
    var from = opts.from || 0, dur = opts.duration || 750, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      el.textContent = fmt(from + (to - from) * easeOutCubic(p));
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
    }
    requestAnimationFrame(step);
  }

  /* Animate a .sel-progress__fill from 0 to pct% using the existing CSS width transition. */
  function progressTo(fillEl, pct, opts) {
    if (!fillEl) return;
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    if (REDUCED) { fillEl.style.width = pct + "%"; return; }
    fillEl.style.width = "0%";
    var delay = (opts && opts.delay) || 60;
    setTimeout(function () { requestAnimationFrame(function () { fillEl.style.width = pct + "%"; }); }, delay);
  }

  /* Staggered entrance for cards/rows. opts: { selector, step, base, max } */
  function reveal(container, opts) {
    if (REDUCED || !container) return;
    opts = opts || {};
    var sel = opts.selector || ".sel-card, .sel-stat, .sel-row";
    var step = opts.step || 55, base = opts.base || 0, max = opts.max || 14;
    var els = container.querySelectorAll(sel);
    for (var i = 0; i < els.length && i < max; i++) {
      els[i].style.animationDelay = (base + i * step) + "ms";
      els[i].classList.add("sel-fx-rise");
    }
  }

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  window.WcFx = { reduced: reduced, countUp: countUp, progressTo: progressTo, reveal: reveal, ready: ready };
})();
