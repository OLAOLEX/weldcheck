/* classifier.js: weld appearance checking function. window.WcClassify.
 *
 * Prototype analyzer: a deterministic image-measurement pipeline (no network, runs in the
 * browser). It downscales the photo, converts to grayscale, and computes simple measures:
 *   brightness  - mean luminance (0-255)
 *   contrast    - standard deviation of luminance
 *   sharpness   - variance of a 3x3 Laplacian (low = blurred photo)
 *   edgeActivity- share of pixels with a strong local gradient (busy, noisy surface)
 *   darkSpots   - share of pixels much darker than the image average (pits and holes)
 * A small rule set maps the measures to the four proposal categories (Table 2.1).
 *
 * This is the seam for the real model: the final project replaces classify()'s rule set with
 * the trained TensorFlow/Keras classifier (exported to TensorFlow.js or served from Flask)
 * while keeping the same { category, confidence, metrics, ms } result shape. Thresholds below
 * are starting values and must be calibrated against the collected weld sample dataset. */
(function () {
  "use strict";

  var SIZE = 256;

  function toGray(img) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var scale = Math.min(1, SIZE / Math.max(w, h));
    var cw = Math.max(8, Math.round(w * scale)), ch = Math.max(8, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cw, ch);
    var data = ctx.getImageData(0, 0, cw, ch).data;
    var gray = new Float32Array(cw * ch);
    for (var i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return { gray: gray, w: cw, h: ch };
  }

  function measure(g) {
    var gray = g.gray, w = g.w, h = g.h, n = gray.length;
    var sum = 0, i;
    for (i = 0; i < n; i++) sum += gray[i];
    var mean = sum / n;
    var varSum = 0;
    for (i = 0; i < n; i++) { var d = gray[i] - mean; varSum += d * d; }
    var std = Math.sqrt(varSum / n);

    /* Laplacian variance (sharpness) + gradient magnitude (edge activity), one pass. */
    var lapSum = 0, lapSqSum = 0, edgeCount = 0, darkCount = 0;
    var inner = 0;
    var darkT = mean - 1.35 * std;
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var p = y * w + x;
        var c = gray[p];
        var lap = gray[p - 1] + gray[p + 1] + gray[p - w] + gray[p + w] - 4 * c;
        lapSum += lap; lapSqSum += lap * lap;
        var gx = gray[p + 1] - gray[p - 1], gy = gray[p + w] - gray[p - w];
        if (Math.abs(gx) + Math.abs(gy) > 55) edgeCount++;
        if (c < darkT) darkCount++;
        inner++;
      }
    }
    var lapMean = lapSum / inner;
    var sharpness = lapSqSum / inner - lapMean * lapMean;
    return {
      brightness: Math.round(mean),
      contrast: Math.round(std),
      sharpness: Math.round(sharpness),
      edgeActivity: Math.round((edgeCount / inner) * 1000) / 10, /* percent, 1dp */
      darkSpots: Math.round((darkCount / inner) * 1000) / 10     /* percent, 1dp */
    };
  }

  /* Starting thresholds. ASSUMPTION: generic values, to be calibrated with the labelled
     mild steel weld photo dataset collected for the project (proposal section 3.5). */
  var T = {
    blur: 60,          /* sharpness below this reads as a blurred photo */
    darkImg: 45,       /* mean brightness below this: too dark */
    brightImg: 220,    /* mean brightness above this: washed out */
    flat: 16,          /* contrast below this: no visible bead detail */
    holes: 3.0,        /* darkSpots percent at or above this: pits and holes */
    spatter: 11        /* edgeActivity percent at or above this: busy, spattered surface */
  };

  function decide(m) {
    var margin;
    if (m.sharpness < T.blur || m.brightness < T.darkImg || m.brightness > T.brightImg || m.contrast < T.flat) {
      var worst = Math.min(m.sharpness / T.blur, m.brightness / T.darkImg, (255 - m.brightness) / (255 - T.brightImg), m.contrast / T.flat);
      return { key: "unclear", confidence: clamp(0.9 - worst * 0.3), reason: "The photo does not show enough clear detail for a reliable appearance check. Retake it with better light, a steady hand, and the bead filling the frame." };
    }
    /* Spatter first: an all-over noisy surface also creates dark pixels, so it would
       otherwise read as holes. Holes then need dark pits on a comparatively calm surface. */
    if (m.edgeActivity >= T.spatter) {
      margin = (m.edgeActivity - T.spatter) / T.spatter;
      return { key: "spatter", confidence: clamp(0.55 + margin * 0.3), reason: "The surface shows a high level of scattered texture, which usually points to spatter and an uneven bead width." };
    }
    if (m.darkSpots >= T.holes) {
      margin = (m.darkSpots - T.holes) / T.holes;
      return { key: "holes", confidence: clamp(0.55 + margin * 0.3), reason: "Dark pitted regions stand out against the bead surface, which usually points to visible holes and a rough, irregular finish." };
    }
    margin = Math.min((T.holes - m.darkSpots) / T.holes, (T.spatter - m.edgeActivity) / T.spatter);
    return { key: "good", confidence: clamp(0.55 + margin * 0.35), reason: "The bead surface reads as regular and clean, with no strong sign of pits, heavy spatter, or unevenness." };
  }
  function clamp(v) { return Math.round(Math.max(0.5, Math.min(0.95, v)) * 100); }

  /* classify(imgEl) -> Promise<{ key, confidence, metrics, reason, ms }> */
  function classify(imgEl) {
    return new Promise(function (resolve, reject) {
      try {
        var t0 = performance.now();
        var metrics = measure(toGray(imgEl));
        var out = decide(metrics);
        out.metrics = metrics;
        out.ms = Math.round(performance.now() - t0);
        resolve(out);
      } catch (e) { reject(e); }
    });
  }

  window.WcClassify = { classify: classify, thresholds: T };
})();
