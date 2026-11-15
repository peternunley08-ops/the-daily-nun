#!/usr/bin/env node
// Export silent text Reels for one or more post packages.
//
// Usage:
//   node posts/export-reels.mjs 02-who-is-responsible 03-recommendation-or-manipulation
//   node posts/export-reels.mjs --serif-font /path/to/Gelasio-Bold.woff2 04-the-disappearing-local-beat
//
// Each line of post.json's reel.kineticText becomes one full-screen 1080 x 1920 card drawn with the same
// drawArt() design as the Week 1 launch Reels: still cards with hard cuts, no audio, 30 fps H.264.
// A final line written "The Daily Nun / ..." becomes a short brand card. Card times are shared out by
// word count so the total equals reel.duration, and the script refuses to make a card too brief to read.
// Headline line breaks are chosen automatically for the largest size that fits.
// Writes reel.mp4 and reel-cover.png to the package, then refreshes upload-pack.zip if slides exist.
// Requires Playwright with Chromium, ffmpeg, and zip. Not run in CI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs, loadPackage, openDrawingPage, measureTitle, renderCard, TEXT_WIDTH } from './drawing.mjs';
import { writeUploadPack } from './export-slides.mjs';

const FPS = 30;
const BRAND_SECONDS = 2;
const MAX_WORDS_PER_SECOND = 3;     // slower than this is comfortable to read on a phone
const MIN_CARD_SECONDS = 1.5;
const MIN_TITLE_PX = 96;             // drawArt() starts portrait headlines at 160px

const words = text => String(text).trim().split(/\s+/).filter(Boolean);

/** Try every way to split a line into 1-4 lines and keep the one that renders largest. */
async function bestBreak(page, text) {
  const w = words(text);
  const candidates = [w.join(' ')];
  for (let a = 1; a < w.length; a++) {
    candidates.push(`${w.slice(0, a).join(' ')}\n${w.slice(a).join(' ')}`);
    for (let b = a + 1; b < w.length; b++) {
      candidates.push(`${w.slice(0, a).join(' ')}\n${w.slice(a, b).join(' ')}\n${w.slice(b).join(' ')}`);
      for (let c = b + 1; c < w.length; c++) {
        candidates.push(`${w.slice(0, a).join(' ')}\n${w.slice(a, b).join(' ')}\n${w.slice(b, c).join(' ')}\n${w.slice(c).join(' ')}`);
      }
    }
  }
  let best = null;
  for (const title of candidates) {
    const parts = title.split('\n');
    // Never strand a short word ("A", "One", "The") on its own line.
    if (parts.length > 1 && parts.some(line => !line.includes(' ') && line.replace(/[^A-Za-z0-9$]/g, '').length <= 3)) continue;
    const fit = await measureTitle(page, title, 160);
    if (fit.widest > TEXT_WIDTH) continue;
    // Larger type wins, but each extra line must earn about 8px of size.
    const score = fit.size - 8 * (parts.length - 1);
    if (!best || score > best.score) best = { title, size: fit.size, lines: parts.length, score };
  }
  return best;
}

function planBeats(reel, name) {
  const lines = [...reel.kineticText];
  let brand = null;
  if (/^The Daily Nun\b/.test(lines.at(-1) || '')) brand = lines.pop();
  if (!lines.length) throw new Error(`${name}: reel.kineticText has no content lines`);
  const available = reel.duration - (brand ? BRAND_SECONDS : 0);
  const weights = lines.map(l => Math.max(words(l).length, 3));
  const total = weights.reduce((a, b) => a + b, 0);
  // Allocate whole frames so the video is exactly reel.duration long.
  let frames = weights.map(wt => Math.round(available * FPS * wt / total));
  frames[frames.length - 1] += Math.round(available * FPS) - frames.reduce((a, b) => a + b, 0);
  const beats = lines.map((text, i) => ({ text, frames: frames[i], theme: i === lines.length - 1 ? 'blue' : 'paper' }));
  for (const b of beats) {
    const seconds = b.frames / FPS;
    if (seconds < MIN_CARD_SECONDS || words(b.text).length / seconds > MAX_WORDS_PER_SECOND) {
      throw new Error(`${name}: "${b.text}" would show for ${seconds.toFixed(2)}s, too brief to read (${words(b.text).length} words). Shorten the on-screen text or lengthen reel.duration.`);
    }
  }
  if (brand) beats.push({ text: 'The Daily Nun', frames: BRAND_SECONDS * FPS, theme: 'paper', brand: true });
  return beats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packages = args.packages.map(name => loadPackage(name, []));
  const { browser, page } = await openDrawingPage(args.serifFont);
  try {
    for (const pkg of packages) {
      const reel = pkg.post.reel;
      if (!reel || !Array.isArray(reel.kineticText) || !reel.duration) throw new Error(`${pkg.name}: post.json has no reel with kineticText and duration`);
      const beats = planBeats(reel, pkg.name);
      const work = fs.mkdtempSync(path.join(os.tmpdir(), `reel-${pkg.name}-`));
      try {
        const list = [];
        for (const [i, beat] of beats.entries()) {
          const fit = await bestBreak(page, beat.text);
          if (!fit || fit.size < MIN_TITLE_PX) throw new Error(`${pkg.name}: on-screen line "${beat.text}" cannot fit at ${MIN_TITLE_PX}px or larger. Shorten it.`);
          const png = await renderCard(page, { title: fit.title, body: '', theme: beat.theme }, 1080, 1920);
          const file = path.join(work, `beat-${String(i + 1).padStart(2, '0')}.png`);
          fs.writeFileSync(file, png);
          if (i === 0) fs.writeFileSync(path.join(pkg.dir, 'reel-cover.png'), png);
          list.push(`file '${file}'`, `duration ${(beat.frames / FPS).toFixed(6)}`);
        }
        list.push(`file '${path.join(work, `beat-${String(beats.length).padStart(2, '0')}.png`)}'`);
        fs.writeFileSync(path.join(work, 'list.txt'), list.join('\n') + '\n');
        const out = path.join(pkg.dir, 'reel.mp4');
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'),
          '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-tune', 'stillimage',
          '-t', String(reel.duration), '-an', '-movflags', '+faststart', '-metadata', `title=${pkg.post.reel.title}`, out]);
        const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim());
        if (Math.abs(seconds - reel.duration) > 0.1) throw new Error(`${pkg.name}: encoded ${seconds}s, expected ${reel.duration}s`);
        const timing = beats.map(b => `${(b.frames / FPS).toFixed(1)}s`).join(' + ');
        const packNote = fs.existsSync(path.join(pkg.dir, 'slide-01.png'))
          ? (writeUploadPack(loadPackage(pkg.name), args.serifFont), '; upload-pack.zip refreshed')
          : '; no slides yet, so upload-pack.zip was not rebuilt';
        console.log(`${pkg.name}: reel.mp4 ${seconds.toFixed(2)}s (${timing}), reel-cover.png${packNote}`);
      } finally {
        fs.rmSync(work, { recursive: true, force: true });
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error(`export-reels: ${err.message}`); process.exit(1); });
