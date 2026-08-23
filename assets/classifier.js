/* Local photograph-quality gate. It never classifies weld conditions. */
(function () {
  "use strict";
  var SIZE = 256;
  var T = { minWidth: 480, minHeight: 320, blur: 55, dark: 42, bright: 225, contrast: 14 };
  function pixels(img) {
    var originalW = img.naturalWidth || img.width, originalH = img.naturalHeight || img.height;
    var scale = Math.min(1, SIZE / Math.max(originalW, originalH));
    var w = Math.max(8, Math.round(originalW * scale)), h = Math.max(8, Math.round(originalH * scale));
    var canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0, w, h);
    var data = ctx.getImageData(0, 0, w, h).data, gray = new Float32Array(w * h);
    for (var i = 0, p = 0; i < data.length; i += 4, p++) gray[p] = .299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2];
    return { gray: gray, w: w, h: h, originalW: originalW, originalH: originalH };
  }
  function measure(g) {
    var sum = 0, i, n = g.gray.length;
    for (i = 0; i < n; i++) sum += g.gray[i];
    var mean = sum / n, variance = 0;
    for (i = 0; i < n; i++) variance += Math.pow(g.gray[i] - mean, 2);
    var lapSum = 0, lapSq = 0, inner = 0;
    for (var y = 1; y < g.h - 1; y++) for (var x = 1; x < g.w - 1; x++) {
      var p = y * g.w + x, lap = g.gray[p - 1] + g.gray[p + 1] + g.gray[p - g.w] + g.gray[p + g.w] - 4 * g.gray[p];
      lapSum += lap; lapSq += lap * lap; inner++;
    }
    var lapMean = lapSum / inner;
    return { width: g.originalW, height: g.originalH, brightness: Math.round(mean), contrast: Math.round(Math.sqrt(variance / n)), sharpness: Math.round(lapSq / inner - lapMean * lapMean) };
  }
  function assess(m) {
    var issues = [], actions = [];
    if (m.width < T.minWidth || m.height < T.minHeight) { issues.push("The photograph resolution is too low."); actions.push("Use the original camera image instead of a screenshot or thumbnail."); }
    if (m.sharpness < T.blur) { issues.push("The weld area is blurred or out of focus."); actions.push("Hold the phone steady and tap the weld bead to focus before taking the photo."); }
    if (m.brightness < T.dark) { issues.push("The photograph is too dark."); actions.push("Use brighter, even lighting without covering the light source."); }
    if (m.brightness > T.bright) { issues.push("The photograph is too bright or washed out."); actions.push("Reduce flash glare and move the light slightly to one side."); }
    if (m.contrast < T.contrast) { issues.push("The weld bead does not stand out clearly from the background."); actions.push("Clean the surface and use a plain background with even lighting."); }
    if (issues.length) actions.push("Retake the photo about 15 to 20 cm from the weld with the bead filling most of the frame.");
    return { suitable: !issues.length, status: issues.length ? "retake" : "acceptable", issues: issues, actions: actions, metrics: m };
  }
  function analyze(img) {
    return new Promise(function (resolve, reject) {
      try { var start = performance.now(), out = assess(measure(pixels(img))); out.ms = Math.round(performance.now() - start); resolve(out); }
      catch (e) { reject(e); }
    });
  }
  window.WcPhotoQuality = { analyze: analyze, thresholds: T };
  window.WcClassify = { classify: analyze, thresholds: T };
})();
