#!/usr/bin/env node
/**
 * Render each slide of "Kyvern B-rolls.html" to a 1920x1080 MP4.
 *
 * Strategy: use Playwright headless Chromium with `recordVideo`, navigate
 * to the HTML with `?slide=N`, wait one full animation loop (8s), close,
 * convert the resulting WebM to MP4 with ffmpeg.
 *
 * Output: b-rolls/out/slide-NN.mp4 — one per slide. 1920x1080. ~10s each.
 *
 * Usage:
 *   cd b-rolls
 *   npx playwright install chromium     # first time only
 *   node render.mjs                     # all 10 slides
 *   node render.mjs 2                   # just slide 2 (e.g. for iteration)
 *   node render.mjs 2 4                 # slides 2 and 4
 */

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(HERE, "Kyvern B-rolls.html");
const OUT = path.join(HERE, "out");
const W = 1920;
const H = 1080;
const SLIDE_COUNT = 10;
const CYCLE_SECONDS = 10; // longest animation loop is 8s; 10s is safe

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function renderSlide(n) {
  const fileUrl = "file://" + HTML;
  const targetUrl = `${fileUrl}?slide=${n}`;
  const tmpDir = path.join(OUT, `_raw-${n}`);
  ensureDir(tmpDir);

  console.log(`▶ slide ${n} — opening ${path.basename(HTML)}?slide=${n}`);

  const browser = await chromium.launch({
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: tmpDir, size: { width: W, height: H } },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Inject a CSS reset so the deck stage renders at 1:1 (no letterboxing)
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const ds = document.querySelector("deck-stage");
      if (ds) ds.setAttribute("noscale", "");
    });
  });

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  // Give web fonts a moment to load
  await page.waitForTimeout(800);

  // Snap to the requested slide (deck-stage exposes a goto via URL hash + keys;
  // we'll send number keys to be safe).
  if (n >= 1 && n <= 9) {
    await page.keyboard.press(String(n));
  } else if (n === 10) {
    // 0 -> last
    await page.keyboard.press("End");
  }

  await page.waitForTimeout(CYCLE_SECONDS * 1000);

  await page.close();
  await context.close();
  await browser.close();

  // Find the .webm Playwright wrote
  const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error(`no webm produced for slide ${n}`);
  }
  const webm = path.join(tmpDir, files[0]);
  const mp4 = path.join(OUT, `slide-${String(n).padStart(2, "0")}.mp4`);

  console.log(`  ↳ converting ${path.basename(webm)} → ${path.basename(mp4)}`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i", webm,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-vf", `scale=${W}:${H}:flags=lanczos`,
      "-movflags", "+faststart",
      mp4,
    ],
    { stdio: "inherit" },
  );

  // Clean raw
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`  ✓ ${path.basename(mp4)}\n`);
}

async function main() {
  ensureDir(OUT);

  const args = process.argv.slice(2).map(Number).filter(Number.isFinite);
  const slides =
    args.length > 0
      ? args
      : Array.from({ length: SLIDE_COUNT }, (_, i) => i + 1);

  for (const n of slides) {
    if (n < 1 || n > SLIDE_COUNT) {
      console.error(`! skipping invalid slide number: ${n}`);
      continue;
    }
    try {
      await renderSlide(n);
    } catch (e) {
      console.error(`! slide ${n} failed:`, e.message);
    }
  }

  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
