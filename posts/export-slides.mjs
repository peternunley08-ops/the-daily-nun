#!/usr/bin/env node
// Export upload-ready carousel images for one or more post packages.
//
// Usage:
//   node posts/export-slides.mjs 02-who-is-responsible 03-recommendation-or-manipulation
//   node posts/export-slides.mjs --serif-font /path/to/Gelasio-Bold.woff2 04-the-disappearing-local-beat
//
// For each package it renders post.json's slides to 1080 x 1350 PNGs with the same drawArt()
// function that produced the Week 1 launch images (read from instagram-launch/build-launch.mjs,
// so the visual identity has one source), then writes ALT-TEXT.txt and upload-pack.zip.
//
// Requires Playwright with Chromium and the `zip` command. Not run in CI: it needs a browser.
// The design uses Georgia. If Georgia is not installed, the script stops unless --serif-font
// supplies a stand-in; images made that way are labelled in READ-ME.txt.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const postsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(postsDir, '..');

function parseArgs(argv) {
  const args = { serifFont: null, packages: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--serif-font') args.serifFont = path.resolve(argv[++i] || '');
    else args.packages.push(argv[i].replace(/\/+$/, '').replace(/^posts\//, ''));
  }
  if (!args.packages.length) throw new Error('Name at least one package folder, e.g. 02-who-is-responsible');
  if (args.serifFont && !fs.existsSync(args.serifFont)) throw new Error(`Font file not found: ${args.serifFont}`);
  return args;
}

function loadDrawingCode() {
  const source = fs.readFileSync(path.join(root, 'instagram-launch/build-launch.mjs'), 'utf8');
  const wrap = source.match(/function wrap\(ctx,text,width\)\{[^\n]*\n/);
  const draw = source.match(/function drawArt\(canvas,spec,width=1080,height=1350,footer=''\)\{[\s\S]*?\n  return canvas;\n\}/);
  if (!wrap || !draw) throw new Error('Could not find wrap() and drawArt() in instagram-launch/build-launch.mjs; the launch builder has changed.');
  return `${wrap[0]}\n${draw[0]}`;
}

function loadPackage(name) {
  const dir = path.join(postsDir, name);
  const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
  if (!Array.isArray(post.slides) || !post.slides.length) throw new Error(`${name}: post.json has no slides`);
  for (const file of ['caption.txt', 'SOURCES.md']) {
    if (!fs.existsSync(path.join(dir, file))) throw new Error(`${name}: ${file} missing; run the package's build.mjs first`);
  }
  return { name, dir, post };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const content = JSON.parse(fs.readFileSync(path.join(root, 'instagram-launch/content.json'), 'utf8'));
  const brand = { brand: content.brand, tagline: content.tagline };
  const drawingCode = loadDrawingCode();
  const packages = args.packages.map(loadPackage);
  const { chromium } = require('playwright');

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const fontFace = args.serifFont
      ? `<style>@font-face{font-family:Georgia;font-weight:700;src:url(data:font/woff2;base64,${fs.readFileSync(args.serifFont).toString('base64')}) format('woff2')}</style>`
      : '';
    await page.setContent(`<!doctype html><html><head>${fontFace}</head><body><script>const colors={paper:'#f6f5f0',ink:'#20201c',blue:'#2448b5',muted:'#68685f',rule:'#c8c8bc'};const data=${JSON.stringify(brand)};\n${drawingCode}\n</script></body></html>`);
    await page.evaluate(() => document.fonts.load('700 55px Georgia'));

    const georgiaMissing = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      const width = font => { ctx.font = font; return ctx.measureText('The Daily Nun 0123').width; };
      return width('700 55px Georgia, monospace') === width('700 55px monospace')
        && width('700 55px Georgia, sans-serif') === width('700 55px sans-serif');
    });
    if (georgiaMissing) throw new Error('Georgia is not available. Install it, or pass --serif-font with a metric-compatible stand-in such as Gelasio Bold (woff2).');

    for (const pkg of packages) {
      const slides = pkg.post.slides;
      const files = [];
      for (const [i, slide] of slides.entries()) {
        const spec = { ...slide, sequence: `${i + 1} / ${slides.length}` };
        // Mirrors drawArt's headline fit: start size, shrink by 2px to a 64px floor, 908px text width.
        const fit = await page.evaluate(s => {
          const ctx = document.createElement('canvas').getContext('2d');
          const lines = String(s.title).split('\n');
          let size = s.cover ? 146 : 112;
          while (size > 64) { ctx.font = `700 ${size}px Georgia`; if (lines.every(l => ctx.measureText(l).width <= 908)) break; size -= 2; }
          ctx.font = `700 ${size}px Georgia`;
          return { size, widest: Math.max(...lines.map(l => ctx.measureText(l).width)) };
        }, spec);
        const minimum = slide.cover ? 90 : 80;
        if (fit.widest > 908 || fit.size < minimum) {
          throw new Error(`${pkg.name} slide ${i + 1}: headline "${slide.title.replace(/\n/g, ' / ')}" renders at ${fit.size}px and ${Math.round(fit.widest)}px wide (limit 908px, minimum ${minimum}px). Add or move line breaks (\\n) in post.json.`);
        }
        const dataUrl = await page.evaluate(s => drawArt(document.createElement('canvas'), s, 1080, 1350).toDataURL('image/png'), spec);
        const file = `slide-${String(i + 1).padStart(2, '0')}.png`;
        fs.writeFileSync(path.join(pkg.dir, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
        files.push(file);
      }

      const altText = slides.map((s, i) => `Slide ${i + 1}: ${String(s.alt || '').replace(/^(The Daily Nun cover slide|Slide \d+): /, '')}`).join('\n\n') + '\n';
      fs.writeFileSync(path.join(pkg.dir, 'ALT-TEXT.txt'), altText);

      const stage = fs.mkdtempSync(path.join(postsDir, `.export-${pkg.name}-`));
      try {
        for (const file of files) fs.copyFileSync(path.join(pkg.dir, file), path.join(stage, file));
        fs.writeFileSync(path.join(stage, 'ALT-TEXT.txt'), altText);
        fs.copyFileSync(path.join(pkg.dir, 'caption.txt'), path.join(stage, 'CAPTION.txt'));
        fs.copyFileSync(path.join(pkg.dir, 'SOURCES.md'), path.join(stage, 'SOURCES.txt'));
        if (fs.existsSync(path.join(pkg.dir, 'voiceover-script.txt'))) fs.copyFileSync(path.join(pkg.dir, 'voiceover-script.txt'), path.join(stage, 'VOICEOVER.txt'));
        const readMe = [
          `Upload ${files.join(', ').replace(/, ([^,]*)$/, ', and $1')} in order.`,
          '',
          'Paste CAPTION.txt and use the per-slide descriptions in ALT-TEXT.txt.',
          '',
          'SOURCES.txt lists every source and its limits. VOICEOVER.txt has the optional Reel script and on-screen text.',
          '',
          'Nothing in this pack has been posted or scheduled.',
          ...(args.serifFont ? ['', `Headline font: rendered with ${path.basename(args.serifFont)} standing in for Georgia, which was not installed on the exporting machine. Re-export on a machine with Georgia for an exact match with Week 1.`] : [])
        ].join('\n') + '\n';
        fs.writeFileSync(path.join(stage, 'READ-ME.txt'), readMe);
        const zipPath = path.join(pkg.dir, 'upload-pack.zip');
        fs.rmSync(zipPath, { force: true });
        execFileSync('zip', ['-q', '-X', '-j', zipPath, ...fs.readdirSync(stage).sort().map(f => path.join(stage, f))]);
      } finally {
        fs.rmSync(stage, { recursive: true, force: true });
      }
      console.log(`${pkg.name}: ${files.length} slides, ALT-TEXT.txt, upload-pack.zip`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error(`export-slides: ${err.message}`); process.exit(1); });
