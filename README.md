# WeldCheck

Web-based pre-welding checklist and weld appearance checking system for mild steel samples.
Final year project by Abdulsommod Olaoluwa Olaniyi (2021/1/82532EM), Department of Mechanical
Engineering, Federal University of Technology, Minna. Supervisor: Engr. Dr. A. A. Abdullahi.

## What it does

- **Job input**: records sample number, material, electrode size, date, and a short note.
- **Pre-welding checklist**: the nine checks from the project proposal (Appendix A), saved per job as Done or Pending.
- **Image upload**: accepts a smartphone photo of the finished weld, with capture guidance and one-tap sample photos for quick testing.
- **Appearance checking**: groups the photo into one of the four categories from the proposal (good weld appearance, visible holes and rough bead, excessive spatter and uneven bead, unclear image), with a short plain-language reason and the response time.
- **Job history**: every record kept and searchable, with smart resume (a job opens at its next incomplete step).

## How the appearance check works

Two engines, same result shape:

1. **AI image service** (used when deployed): the photo is sent to `/api/check-weld`, a small
   Vercel function that asks an image recognition service (OpenAI) to group the photo into one
   of the four categories using careful prompting. No model training or fine-tuning is needed,
   so it works on any weld photo out of the box.
2. **Built-in basic analyzer** (fallback, works offline): simple measurements computed in the
   browser (brightness, contrast, sharpness, surface texture, dark spots) mapped to the same
   four categories. Used automatically when the AI service is not configured or unavailable.

The result page always says which engine produced the result.

## How it is built

- Plain HTML, CSS, and JavaScript. No build step, no framework, no login.
- All records (including weld photos) are stored in the browser with IndexedDB. The photo only
  leaves the device for the appearance check itself.

## Structure

```
index.html        Home: welcome popup, stats, how it works, categories, recent jobs
new-job.html      Step 1: job input form
checklist.html    Step 2: pre-weld checklist with progress
upload.html       Step 3: weld photo upload, sample gallery, appearance check
result.html       Appearance result, measurements, job record
history.html      Job history with search
api/
  check-weld.js   Vercel function: AI appearance check
assets/
  weldcheck.css   Design tokens and components
  sprite.js       SVG icon sprite
  app.js          Shared helpers, checklist items, categories
  db.js           IndexedDB job store
  classifier.js   Built-in basic analyzer (fallback engine)
  templates.js    Sample weld photo generator
  fx.js           Entrance and progress motion helpers
```

## Logo

The mark lives at `assets/logo.svg` (used in the header and welcome popup) with a copy at
`favicon.svg` (browser tab icon). To swap in a generated logo, replace both files with square
artwork of the same names; nothing else needs to change. A prompt that matches the app style:

> Minimal flat vector app icon for "WeldCheck", a welding checklist web app. A dark navy
> (#16233A) rounded square tile. Inside: a stylised weld bead of overlapping light cream
> ripples along the bottom, a welding electrode entering from the top right, and a bright
> orange (#EA580C) four-point spark where they meet. Clean geometric shapes, no text, no
> gradients, no shadows, crisp edges, centred composition, plenty of padding.

## Run locally

Any static file server works, for example:

```
python -m http.server 4173
```

Then open http://localhost:4173. Locally the AI endpoint is not running, so checks use the
built-in basic analyzer. To test the AI path locally, use `vercel dev` with the env var set.

## Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel. Framework preset **Other**,
   no build command, output directory left as the repository root.
2. In Vercel, Settings > Environment Variables, add `OPENAI_API_KEY` with your OpenAI key.
   Optional: `OPENAI_MODEL` to pick a different model (default `gpt-4o-mini`).
3. Redeploy. The AI check is live; without the key the app still works on the basic analyzer.
