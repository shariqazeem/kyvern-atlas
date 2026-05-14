# Kyvern B-rolls

Animated HTML slides for X launch posts. Each slide is a self-contained
1920×1080 looped animation you can drop into a tweet.

## What's here

- `Kyvern B-rolls.html` — all 10 slides in one HTML file, navigable
  with `?slide=N` or arrow keys.
- `deck-stage.js` — the reusable web-component shell handling slide nav.
- `render.mjs` — Playwright + ffmpeg script that exports each slide as
  a 1920×1080 MP4. Use this instead of screen-recording manually.

## Render all slides to MP4

First time setup:

```
cd b-rolls
npm install
npx playwright install chromium
```

Render everything:

```
node render.mjs
```

Output lands in `b-rolls/out/slide-01.mp4 ... slide-10.mp4`. Each is
~10 seconds, captures one full animation loop, 1920×1080, H.264 yuv420p,
faststart for X-ready playback.

Iterate on one slide while tweaking:

```
node render.mjs 2          # just slide 2 (Unboxing)
node render.mjs 9 10       # slides 9 and 10
```

## Why this and not QuickTime screen recording

- Deterministic frame timing — every render is identical.
- No cursor in frame, no menu bars, no notifications.
- 1920×1080 pixel-exact. Phones that download from X get a crisp source.
- H.264 yuv420p + faststart is the codec X's transcoder is happiest with —
  fewer compression artifacts on upload than recording an arbitrary screen.

## Tweaking a slide

Open `Kyvern B-rolls.html` in Chrome with `?slide=2` to preview the loop
in real time. CSS lives at the top of the file in `<style>` blocks
labelled `SLIDE N`. Each slide's animations are namespaced under `.sN`
so you can edit one without touching others.

After editing, re-run `node render.mjs <n>` and the MP4 in `out/` updates.

## Posting flow

Each main launch post embeds one slide:

- POST 1 (Unboxing): `out/slide-02.mp4`
- POST 2 (SDK wrap): `out/slide-09.mp4`
- POST 3 (Live calls): `out/slide-10.mp4`

The remaining slides go in the reply chains under each post — see the
launch sequence doc.
