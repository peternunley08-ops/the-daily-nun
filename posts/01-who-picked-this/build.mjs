import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));

// Validation
const NICKNAME = /p[-\s._\u2010-\u2015]*nun\b/i;
if (NICKNAME.test(JSON.stringify(post))) throw new Error('posts/01-who-picked-this: nickname branding is not allowed');

const caption = post.caption + '\n' + post.reportUrl + '\n';
const alt = fs.readFileSync(path.join(dir, 'ALT-TEXT.txt'), 'utf8');
const stage = path.join(root, '.gstack', 'weekly-01-stage');
fs.mkdirSync(stage, { recursive: true });

// Stage slides
for (const [i, relative] of post.media.entries()) {
  const input = path.resolve(root, relative);
  if (!input.startsWith(root + path.sep)) throw Error('Asset outside repository');
  const bytes = fs.readFileSync(input);
  if (bytes.readUInt32BE(16) !== 1080 || bytes.readUInt32BE(20) !== 1350) throw Error('Unexpected slide dimensions');
  fs.writeFileSync(path.join(stage, 'slide-' + String(i + 1).padStart(2, '0') + '.png'), bytes);
}

// Stage Reel and Voiceover
const hasReel = fs.existsSync(path.join(dir, 'reel.mp4'));
if (hasReel) {
  fs.copyFileSync(path.join(dir, 'reel.mp4'), path.join(stage, 'REEL.mp4'));
}

const WORDS_PER_MINUTE = 140;
const voiceoverWords = post.reel.voiceover.trim().split(/\s+/).length;
const voiceoverSeconds = Math.round((voiceoverWords / WORDS_PER_MINUTE) * 60);

const voiceoverScript = [
  `# Voiceover & Video Script: ${post.reel.title}`,
  '',
  `**Duration:** ${post.reel.duration} seconds (voiceover: ${voiceoverWords} words, about ${voiceoverSeconds} seconds at ${WORDS_PER_MINUTE} words per minute)`,
  '**Format:** Vertical Video (1080 × 1920) / Reel & TikTok',
  '',
  '## Voiceover Script (For Peter to record)',
  `"${post.reel.voiceover}"`,
  '',
  '## Kinetic On-Screen Text',
  ...post.reel.kineticText.map((line, i) => `${i + 1}. ${line}`),
  '',
  '## Delivery Notes',
  '- Tone: Calm, authoritative, third-person analytical.',
  `- Pacing: Measured, clear enunciation, about ${WORDS_PER_MINUTE} words per minute.`,
  '- Video works silently with on-screen kinetic typography.',
  ''
].join('\n');

fs.writeFileSync(path.join(dir, 'voiceover-script.txt'), voiceoverScript);
fs.writeFileSync(path.join(stage, 'VOICEOVER.txt'), voiceoverScript);

const sourceNotes = [
  '# Source notes — Week 1, Media Desk',
  '',
  `**Title:** ${post.title}`,
  '**Desk:** Media Desk',
  '**Status:** Prepared draft / Unpublished',
  '',
  '## Sources',
  '',
  ...post.sources.flatMap((s) => [
    `### ${s.title}`,
    `- **Author / Publisher:** ${s.author} (${s.publisher})`,
    `- **Date:** ${s.date}`,
    `- **URL:** [${s.url}](${s.url})`,
    `- **Type:** ${s.type}`,
    `- **Limits:** ${s.limits}`,
    ''
  ]),
  '## Full report and bibliography',
  '',
  `Full research report: ${post.reportUrl}`,
  ''
].join('\n');

const uploadNotes = [
  'Upload slide-01.png, slide-02.png, and slide-03.png in order.',
  '',
  'Paste CAPTION.txt and use the supplied per-slide descriptions in ALT-TEXT.txt.',
  '',
  hasReel
    ? 'REEL.mp4 is a silent 1080 x 1920 text video. Record VOICEOVER.txt over it, or post it silent; the on-screen text carries the story either way.'
    : 'VOICEOVER.txt has the optional Reel script and on-screen text.',
  '',
  'SOURCES.txt lists every source and its limits.',
  '',
  'The full report URL is included in the caption and SOURCES.txt. A public account or profile link has not been created by this pack.',
  '',
  'One post per week is the chosen cadence; this draft has no assigned publishing date.',
  ''
].join('\n');

fs.writeFileSync(path.join(dir, 'caption.txt'), caption);
fs.writeFileSync(path.join(stage, 'CAPTION.txt'), caption);
fs.writeFileSync(path.join(stage, 'ALT-TEXT.txt'), alt);
fs.writeFileSync(path.join(stage, 'SOURCES.txt'), sourceNotes);
fs.writeFileSync(path.join(stage, 'READ-ME.txt'), uploadNotes);
fs.writeFileSync(path.join(dir, 'SOURCES.md'), sourceNotes);

// Repack upload-pack.zip
const zipPath = path.join(dir, 'upload-pack.zip');
fs.rmSync(zipPath, { force: true });
const stageFiles = fs.readdirSync(stage).sort().map((f) => path.join(stage, f));
execFileSync('zip', ['-q', '-X', '-j', zipPath, ...stageFiles]);

const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const altParts = alt.trim().split(/\r?\n\s*\r?\n/);
const cards = post.media
  .map(
    (src, i) =>
      `<figure class="slide-img"><img src="../../${escape(src)}" width="1080" height="1350" alt="${escape(altParts[i])}" loading="lazy"><figcaption><a href="../../${escape(src)}" download>Download slide ${i + 1}</a></figcaption></figure>`
  )
  .join('');

const script = `document.getElementById('copy').addEventListener('click',async()=>{const field=document.getElementById('caption');try{await navigator.clipboard.writeText(field.value);document.getElementById('status').textContent='Caption copied.'}catch{field.focus();field.select();document.getElementById('status').textContent='Caption selected. Use your copy command.'}});`;
new vm.Script(script);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(post.title)} — The Daily Nun</title>
  <style>
    :root{--paper:#f6f5f0;--ink:#20201c;--blue:#2448b5;--muted:#68685f;--rule:#c8c8bc;--white:#fff}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 Arial,sans-serif}
    header,main,footer{max-width:1180px;margin:auto;padding:28px 24px}
    .brand{font:700 42px/1.1 Georgia,serif;letter-spacing:-.05em;text-decoration:none;color:inherit}
    h1{font:700 clamp(34px,6vw,58px)/1.08 Georgia,serif;letter-spacing:-.04em;margin:28px 0 16px}
    p{max-width:760px}a{color:var(--blue);text-underline-offset:4px}
    nav{display:flex;flex-wrap:wrap;gap:14px 25px;margin-top:22px}
    .status{color:var(--muted)}
    .slides{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:30px}
    .slide-img{margin:0}.slide-img img{display:block;width:100%;height:auto;border:1px solid var(--rule)}
    .slide-img figcaption{font-size:14px;margin-top:8px}
    .copy-section{max-width:780px;border-top:1px solid var(--rule);margin-top:40px;padding-top:24px}
    h2{font:700 26px/1.2 Georgia,serif;margin:0 0 14px}
    textarea{width:100%;min-height:200px;resize:vertical;padding:14px;border:1px solid var(--rule);background:var(--white);color:var(--ink);font:15px/1.6 Arial,sans-serif}
    button{font:inherit;padding:9px 18px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer;margin-top:10px}
    a:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
    .reel-box{background:var(--white);border:1px solid var(--rule);padding:22px;border-radius:4px;margin-top:20px}
    .reel-box pre{white-space:pre-wrap;font:14px/1.6 monospace;margin:0}
    video.reel{display:block;width:100%;max-width:300px;height:auto;border:1px solid var(--rule);background:var(--paper)}
    footer{border-top:1px solid var(--rule);margin-top:40px;padding-top:20px;font-size:14px;color:var(--muted)}
    @media(max-width:768px){.slides{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header>
    <a class="brand" href="../../index.html">The Daily Nun</a>
    <h1>${escape(post.title)}</h1>
    <p class="status">Week 1 / Media Desk / Prepared draft. Not posted.</p>
    <nav aria-label="Post resources">
      <a href="upload-pack.zip" download>Download upload pack</a>
      <a href="${escape(post.reportUrl)}">Read the full report</a>
      <a href="SOURCES.md">Source notes</a>
      <a href="voiceover-script.txt">Voiceover script</a>
    </nav>
  </header>
  <main>
    <section class="slides" aria-label="Carousel slides">${cards}</section>
    <section class="copy-section">
      <h2>Caption</h2>
      <textarea id="caption" readonly aria-label="Prepared Instagram caption">${escape(caption)}</textarea>
      <button id="copy" type="button">Copy caption</button>
      <span id="status" role="status" style="margin-left:12px;font-size:14px;color:var(--muted)"></span>
    </section>
    <section class="copy-section">
      <h2>Short video voiceover</h2>
      ${
        hasReel
          ? `<video class="reel" src="reel.mp4" poster="reel-cover.png" controls muted playsinline preload="metadata" width="1080" height="1920" aria-label="Silent text Reel: ${escape(post.reel.title)}"></video>
      <p><a href="reel.mp4" download>Download the Reel (silent MP4, ${post.reel.duration} seconds)</a></p>`
          : ''
      }
      <div class="reel-box">
        <p><strong>Voiceover text (for Peter to record):</strong></p>
        <blockquote style="font-style:italic;margin:0 0 16px 0;font-size:16px;line-height:1.6">"${escape(post.reel.voiceover)}"</blockquote>
        <p><strong>On-screen kinetic text sequence:</strong></p>
        <pre>${post.reel.kineticText.map((t, i) => `${i + 1}. ${escape(t)}`).join('\n')}</pre>
      </div>
    </section>
  </main>
  <footer>The Daily Nun &nbsp;·&nbsp; Prepared for review; nothing has been posted.</footer>
  <script>${script}</script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Prepared the first weekly caption, preview, source notes, and upload-pack files.');
