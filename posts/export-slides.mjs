#!/usr/bin/env node
// Export upload-ready carousel images for one or more post packages.
//
// Usage:
//   node posts/export-slides.mjs 02-who-is-responsible 03-recommendation-or-manipulation
//   node posts/export-slides.mjs --serif-font /path/to/Gelasio-Bold.woff2 04-the-disappearing-local-beat
//
// Renders post.json's slides to 1080 x 1350 PNGs with the drawArt() design that produced the Week 1
// launch images (see posts/drawing.mjs), then writes ALT-TEXT.txt and upload-pack.zip.
// Requires Playwright with Chromium and the `zip` command. Not run in CI: it needs a browser.
// The design uses Georgia; without it the script stops unless --serif-font supplies a stand-in.
// If posts/export-reels.mjs has made reel.mp4, it is included in the pack.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs, loadPackage, openDrawingPage, measureTitle, renderCard, postsDir, TEXT_WIDTH } from './drawing.mjs';

export function writeUploadPack(pkg, serifFont) {
  const slides = pkg.post.slides;
  const files = slides.map((_, i) => `slide-${String(i + 1).padStart(2, '0')}.png`);
  const missing = files.filter(f => !fs.existsSync(path.join(pkg.dir, f)));
  if (missing.length) throw new Error(`${pkg.name}: missing ${missing.join(', ')}; export the slides first`);
  const altText = slides.map((s, i) => `Slide ${i + 1}: ${String(s.alt || '').replace(/^(The Daily Nun cover slide|Slide \d+): /, '')}`).join('\n\n') + '\n';
  fs.writeFileSync(path.join(pkg.dir, 'ALT-TEXT.txt'), altText);
  const hasReel = fs.existsSync(path.join(pkg.dir, 'reel.mp4'));

  const stage = fs.mkdtempSync(path.join(postsDir, `.export-${pkg.name}-`));
  try {
    for (const file of files) fs.copyFileSync(path.join(pkg.dir, file), path.join(stage, file));
    if (hasReel) fs.copyFileSync(path.join(pkg.dir, 'reel.mp4'), path.join(stage, 'REEL.mp4'));
    fs.writeFileSync(path.join(stage, 'ALT-TEXT.txt'), altText);
    fs.copyFileSync(path.join(pkg.dir, 'caption.txt'), path.join(stage, 'CAPTION.txt'));
    fs.copyFileSync(path.join(pkg.dir, 'SOURCES.md'), path.join(stage, 'SOURCES.txt'));
    if (fs.existsSync(path.join(pkg.dir, 'voiceover-script.txt'))) fs.copyFileSync(path.join(pkg.dir, 'voiceover-script.txt'), path.join(stage, 'VOICEOVER.txt'));
    const readMe = [
      `Upload ${files.join(', ').replace(/, ([^,]*)$/, ', and $1')} in order.`,
      '',
      'Paste CAPTION.txt and use the per-slide descriptions in ALT-TEXT.txt.',
      '',
      hasReel
        ? 'REEL.mp4 is a silent 1080 x 1920 text video. Record VOICEOVER.txt over it, or post it silent; the on-screen text carries the story either way.'
        : 'VOICEOVER.txt has the optional Reel script and on-screen text.',
      '',
      'SOURCES.txt lists every source and its limits.',
      '',
      'Nothing in this pack has been posted or scheduled.',
      ...(serifFont ? ['', `Headline font: rendered with ${path.basename(serifFont)} standing in for Georgia, which was not installed on the exporting machine. Re-export on a machine with Georgia for an exact match with Week 1.`] : [])
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(stage, 'READ-ME.txt'), readMe);
    const zipPath = path.join(pkg.dir, 'upload-pack.zip');
    fs.rmSync(zipPath, { force: true });
    execFileSync('zip', ['-q', '-X', '-j', zipPath, ...fs.readdirSync(stage).sort().map(f => path.join(stage, f))]);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
  return { files, hasReel };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packages = args.packages.map(name => loadPackage(name));
  const { browser, page } = await openDrawingPage(args.serifFont);
  try {
    for (const pkg of packages) {
      const slides = pkg.post.slides;
      for (const [i, slide] of slides.entries()) {
        const fit = await measureTitle(page, slide.title, slide.cover ? 146 : 112);
        const minimum = slide.cover ? 90 : 80;
        if (fit.widest > TEXT_WIDTH || fit.size < minimum) {
          throw new Error(`${pkg.name} slide ${i + 1}: headline "${slide.title.replace(/\n/g, ' / ')}" renders at ${fit.size}px and ${Math.round(fit.widest)}px wide (limit ${TEXT_WIDTH}px, minimum ${minimum}px). Add or move line breaks (\\n) in post.json.`);
        }
        const png = await renderCard(page, { ...slide, sequence: `${i + 1} / ${slides.length}` }, 1080, 1350);
        fs.writeFileSync(path.join(pkg.dir, `slide-${String(i + 1).padStart(2, '0')}.png`), png);
      }
      const { files, hasReel } = writeUploadPack(pkg, args.serifFont);
      console.log(`${pkg.name}: ${files.length} slides, ALT-TEXT.txt, upload-pack.zip${hasReel ? ' (with REEL.mp4)' : ''}`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch(err => { console.error(`export-slides: ${err.message}`); process.exit(1); });
}
