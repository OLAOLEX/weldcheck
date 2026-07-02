# WeldCheck

Web-based pre-welding checklist and weld appearance checking system for mild steel samples.
Final year project, Department of Mechanical Engineering, Federal University of Technology, Minna.

## What it does

- **Job input**: records sample number, material, electrode size, date, and a short note.
- **Pre-welding checklist**: the nine checks from the project proposal (Appendix A, Table A1), saved per job as Done or Pending.
- **Image upload**: accepts a smartphone photo of the finished weld with capture guidance.
- **Appearance checking**: groups the photo into one of the four categories from Table 2.1 (good weld appearance, visible holes and rough bead, excessive spatter and uneven bead, unclear image) and shows the measurements behind the result plus the response time.
- **Job history**: every record kept and searchable, with smart resume (a job opens at its next incomplete step).

## How it is built

- Plain HTML, CSS, and JavaScript. No build step, no framework, no login.
- All records (including weld photos) are stored in the browser with IndexedDB. Nothing leaves the device.
- `assets/classifier.js` is a prototype analyzer: a deterministic image-measurement pipeline (brightness, contrast, Laplacian sharpness, edge activity, dark-spot ratio) mapped to the four categories with a rule set. It is the seam where the trained TensorFlow/Keras model plugs in later, keeping the same result shape. Thresholds are starting values and must be calibrated against the collected weld sample dataset.

## Structure

```
index.html        Home: stats, how it works, categories, recent jobs
new-job.html      Step 1: job input form
checklist.html    Step 2: pre-weld checklist with progress
upload.html       Step 3: weld photo upload and appearance check
result.html       Appearance result, measurements, job record
history.html      Job history with search
assets/
  weldcheck.css   Design tokens and components
  sprite.js       SVG icon sprite
  app.js          Shared helpers, checklist items, categories
  db.js           IndexedDB job store
  classifier.js   Appearance checking function (prototype analyzer)
  fx.js           Entrance and progress motion helpers
```

## Run locally

Any static file server works, for example:

```
python -m http.server 4173
```

Then open http://localhost:4173

## Deploy to Vercel

The project is a plain static site. In Vercel: import the repository, framework preset **Other**, no build command, output directory left as the repository root.
