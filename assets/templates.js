/* templates.js: sample weld photo generator. window.WcTemplates.
 * Draws simple weld-look pictures on a canvas, one per appearance category, so anyone can
 * test the full check flow with one tap and see what each category can look like. These are
 * drawings for demonstration and guidance only, not real weld photographs. */
(function () {
  "use strict";

  var KINDS = [
    { key: "good", label: "Good bead" },
    { key: "holes", label: "Holes and rough" },
    { key: "spatter", label: "Spatter and uneven" },
    { key: "unclear", label: "Unclear photo" }
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function draw(canvas, kind) {
    var w = canvas.width, h = canvas.height;
    var x = canvas.getContext("2d");

    /* Steel plate: vertical gradient + brushed texture */
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#83888f"); g.addColorStop(0.5, "#767b83"); g.addColorStop(1, "#6b7077");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var id = x.getImageData(0, 0, w, h), d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (Math.random() - 0.5) * 16;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    x.putImageData(id, 0, 0);
    /* faint joint line */
    x.strokeStyle = "rgba(40,44,50,.35)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();

    var mid = h / 2, count = Math.ceil(w / 11) + 3;
    var uneven = kind === "spatter";

    /* Bead: overlapping ripple ellipses across the joint */
    for (var b = 0; b < count; b++) {
      var bx = -10 + b * 11;
      var wob = uneven ? Math.sin(b * 0.9) * 10 + rnd(-6, 6) : Math.sin(b * 0.5) * 2;
      var ry = (uneven ? rnd(18, 40) : 30) + wob;
      x.fillStyle = "rgba(208,213,220,.55)";
      x.beginPath(); x.ellipse(bx, mid + (uneven ? rnd(-5, 5) : 0), 16, ry, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = "rgba(120,126,134,.35)"; x.lineWidth = 1.5;
      x.beginPath(); x.ellipse(bx, mid, 16, ry, 0, 0, Math.PI * 2); x.stroke();
    }
    /* soft highlight along the bead crown */
    var hg = x.createLinearGradient(0, mid - 26, 0, mid + 26);
    hg.addColorStop(0, "rgba(255,255,255,0)"); hg.addColorStop(0.5, "rgba(255,255,255,.22)"); hg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = hg; x.fillRect(0, mid - 26, w, 52);

    if (kind === "holes") {
      /* dark pits and rough patches: dense enough that the pit area clearly stands out */
      var pits = Math.round(w * h / 3100);
      for (var p = 0; p < pits; p++) {
        x.fillStyle = "rgba(14,15,18,.92)";
        x.beginPath(); x.arc(rnd(0, w), mid + rnd(-24, 24), rnd(3, w / 64), 0, Math.PI * 2); x.fill();
      }
      for (var r = 0; r < pits / 2; r++) {
        x.fillStyle = "rgba(55,59,65,.55)";
        x.beginPath(); x.arc(rnd(0, w), mid + rnd(-30, 30), rnd(4, w / 55), 0, Math.PI * 2); x.fill();
      }
    }

    if (kind === "spatter") {
      /* fine spatter dust across the plate, then heavier spatter balls around the bead */
      var did = x.getImageData(0, 0, w, h), dd = did.data;
      for (var di = 0; di < dd.length; di += 4) {
        if (Math.random() < 0.45) {
          var dn = (Math.random() - 0.5) * 150;
          dd[di] += dn; dd[di + 1] += dn; dd[di + 2] += dn;
        }
      }
      x.putImageData(did, 0, 0);
      var balls = Math.round(w * h / 640);
      for (var s = 0; s < balls; s++) {
        var sy = mid + (Math.random() < 0.5 ? -1 : 1) * rnd(24, h / 2 - 4);
        var tone = Math.random() < 0.6 ? "rgba(25,27,31,.85)" : "rgba(225,229,235,.9)";
        x.fillStyle = tone;
        x.beginPath(); x.arc(rnd(0, w), sy, rnd(1.5, 5), 0, Math.PI * 2); x.fill();
      }
    }

    if (kind === "unclear") {
      /* dim + heavy blur: what a shaky, badly lit photo looks like */
      x.filter = "blur(6px) brightness(.5)";
      x.drawImage(canvas, 0, 0);
      x.filter = "none";
    }
  }

  /* Render a small guide thumbnail into an existing canvas. */
  function thumb(canvas, kind) {
    canvas.width = 240; canvas.height = 150;
    draw(canvas, kind);
  }

  /* Build a full-size sample photo as a File, ready for the normal upload flow. */
  function makeFile(kind) {
    return new Promise(function (resolve, reject) {
      var c = document.createElement("canvas");
      c.width = 640; c.height = 440;
      draw(c, kind);
      c.toBlob(function (blob) {
        if (!blob) { reject(new Error("Could not create the sample image.")); return; }
        resolve(new File([blob], "sample-" + kind + ".png", { type: "image/png" }));
      }, "image/png");
    });
  }

  window.WcTemplates = { KINDS: KINDS, thumb: thumb, makeFile: makeFile };
})();
