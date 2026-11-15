// Shared browser drawing setup for posts/export-slides.mjs and posts/export-reels.mjs.
// Loads the drawArt() design used for Week 1's launch images from instagram-launch/build-launch.mjs,
// so carousels and Reels share one visual identity.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const postsDir = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(postsDir, '..');

// drawArt() text area is the canvas width minus 86px margins on each side.
export const TEXT_WIDTH = 908;

export function parseArgs(argv) {
  const args = { serifFont: null, packages: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--serif-font') args.serifFont = path.resolve(argv[++i] || '');
    else args.packages.push(argv[i].replace(/\/+$/, '').replace(/^posts\//, ''));
  }
  if (!args.packages.length) throw new Error('Name at least one package folder, e.g. 02-who-is-responsible');
  if (args.serifFont && !fs.existsSync(args.serifFont)) throw new Error(`Font file not found: ${args.serifFont}`);
  return args;
}

export function loadPackage(name, requiredFiles = ['caption.txt', 'SOURCES.md']) {
  const dir = path.join(postsDir, name);
  const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(dir, file))) throw new Error(`${name}: ${file} missing; run the package's build.mjs first`);
  }
  return { name, dir, post };
}

function loadDrawingCode() {
  const source = fs.readFileSync(path.join(root, 'instagram-launch/build-launch.mjs'), 'utf8');
  const wrap = source.match(/function wrap\(ctx,text,width\)\{[^\n]*\n/);
  const draw = source.match(/function drawArt\(canvas,spec,width=1080,height=1350,footer=''\)\{[\s\S]*?\n  return canvas;\n\}/);
  if (!wrap || !draw) throw new Error('Could not find wrap() and drawArt() in instagram-launch/build-launch.mjs; the launch builder has changed.');
  return `${wrap[0]}\n${draw[0]}`;
}

/** Opens a page with drawArt() defined. Fails if Georgia is unavailable and no stand-in font is given. */
export async function openDrawingPage(serifFont) {
  const content = JSON.parse(fs.readFileSync(path.join(root, 'instagram-launch/content.json'), 'utf8'));
  const brand = { brand: content.brand, tagline: content.tagline };
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fontFace = serifFont
    ? `<style>@font-face{font-family:Georgia;font-weight:700;src:url(data:font/woff2;base64,${fs.readFileSync(serifFont).toString('base64')}) format('woff2')}</style>`
    : '';
  await page.setContent(`<!doctype html><html><head>${fontFace}</head><body><script>const colors={paper:'#f6f5f0',ink:'#20201c',blue:'#2448b5',muted:'#68685f',rule:'#c8c8bc'};const data=${JSON.stringify(brand)};\n${loadDrawingCode()}\n</script></body></html>`);
  await page.evaluate(() => document.fonts.load('700 55px Georgia'));
  const georgiaMissing = await page.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    const width = font => { ctx.font = font; return ctx.measureText('The Daily Nun 0123').width; };
    return width('700 55px Georgia, monospace') === width('700 55px monospace')
      && width('700 55px Georgia, sans-serif') === width('700 55px sans-serif');
  });
  if (georgiaMissing) {
    await browser.close();
    throw new Error('Georgia is not available. Install it, or pass --serif-font with a metric-compatible stand-in such as Gelasio Bold (woff2).');
  }
  return { browser, page };
}

/** Mirrors drawArt()'s headline sizing: shrink by 2px from `start` to a 64px floor until every line fits. */
export async function measureTitle(page, title, start) {
  return page.evaluate(([t, s, w]) => {
    const ctx = document.createElement('canvas').getContext('2d');
    const lines = String(t).split('\n');
    let size = s;
    while (size > 64) { ctx.font = `700 ${size}px Georgia`; if (lines.every(l => ctx.measureText(l).width <= w)) break; size -= 2; }
    ctx.font = `700 ${size}px Georgia`;
    return { size, widest: Math.max(...lines.map(l => ctx.measureText(l).width)) };
  }, [title, start, TEXT_WIDTH]);
}

/** Renders one drawArt() card to a PNG buffer. */
export async function renderCard(page, spec, width, height) {
  const dataUrl = await page.evaluate(([s, w, h]) => drawArt(document.createElement('canvas'), s, w, h).toDataURL('image/png'), [spec, width, height]);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}
