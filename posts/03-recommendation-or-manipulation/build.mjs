import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));

// Validation checks
const banned = /p[-\s._\u2010-\u2015]*nun\b/i;
if (banned.test(JSON.stringify(post))) throw new Error('Rejected nickname branding');
for (const slide of post.slides) {
  if (slide.body && slide.body.trim().split(/\s+/).filter(Boolean).length > 22) {
    throw new Error(`Slide body exceeds 22 words: "${slide.body}"`);
  }
  if (slide.cover && slide.title.trim().split(/\s+/).filter(Boolean).length > 7) {
    throw new Error(`Cover title exceeds 7 words: "${slide.title}"`);
  }
}

// Build caption
const caption = post.caption + '\n' + post.articleUrl + '\n';
fs.writeFileSync(path.join(dir, 'caption.txt'), caption);

// Build source notes
const sourceNotes = [
  '# Source notes — Week 3 Culture Desk',
  '',
  `**Title:** ${post.title}`,
  '**Desk:** Culture & Attention',
  '**Status:** Prepared draft / Unpublished',
  '',
  '## Verified Sources',
  '',
  ...post.sources.flatMap(s => [
    `### ${s.title}`,
    `- **Author / Publisher:** ${s.author} (${s.publisher})`,
    `- **Date:** ${s.date}`,
    `- **URL:** [${s.url}](${s.url})`,
    `- **Type:** ${s.type}`,
    `- **Analytical Limits:** ${s.limits}`,
    ''
  ]),
  '## Reading Article',
  '',
  `Full research article available at: ${post.articleUrl}`
].join('\n');
fs.writeFileSync(path.join(dir, 'SOURCES.md'), sourceNotes + '\n');

// Build voiceover script
const voiceoverContent = [
  `# Voiceover & Video Script: ${post.reel.title}`,
  '',
  `**Duration:** ~${post.reel.duration} seconds`,
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
  '- Pacing: Measured, clear enunciation, ~140 words per minute.',
  '- Video functions silently with on-screen kinetic typography.'
].join('\n');
fs.writeFileSync(path.join(dir, 'voiceover-script.txt'), voiceoverContent + '\n');

// Build HTML article
const articleMdPath = path.join(root, 'desks/culture/when-does-a-recommendation-become-manipulation.md');
if (fs.existsSync(articleMdPath)) {
  const articleMd = fs.readFileSync(articleMdPath, 'utf8');
  const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const sections = articleMd.trim().split(/\r?\n\s*\r?\n/);
  const title = sections.shift().replace(/^#\s+/, '');
  const bodyHtml = sections.map(p => {
    if (p.startsWith('## ')) return `<h2>${escapeHtml(p.replace(/^##\s+/, ''))}</h2>`;
    if (p.startsWith('### ')) return `<h3>${escapeHtml(p.replace(/^###\s+/, ''))}</h3>`;
    if (p.startsWith('- ')) {
      const items = p.split(/\r?\n/).map(li => `<li>${escapeHtml(li.replace(/^[-\d.]+\s+/, ''))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    if (/^\d+\.\s/.test(p)) {
      const items = p.split(/\r?\n/).map(li => `<li>${escapeHtml(li.replace(/^\d+\.\s+/, ''))}</li>`).join('');
      return `<ol>${items}</ol>`;
    }
    if (p.startsWith('---')) return '<hr>';
    return '<p>' + escapeHtml(p).replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>') + '</p>';
  }).join('\n');

  const articleHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} — The Daily Nun</title>
  <style>
    :root{--paper:#f6f5f0;--ink:#20201c;--blue:#2448b5;--muted:#68685f;--rule:#c8c8bc}
    *{box-sizing:border-box}body{background:var(--paper);color:var(--ink);margin:0;font:18px/1.85 Georgia,serif}
    header,article,footer{max-width:760px;margin:auto;padding:30px 24px}
    header{border-bottom:3px double var(--ink)}
    header a{font:700 45px/1.1 Georgia,serif;letter-spacing:-.05em;color:inherit;text-decoration:none}
    h1{font-size:clamp(36px,7vw,58px);line-height:1.08;letter-spacing:-.045em;margin:18px 0 20px}
    h2{font-size:26px;line-height:1.2;margin:34px 0 16px;border-top:1px solid var(--rule);padding-top:20px}
    h3{font-size:20px;line-height:1.3;margin:24px 0 10px}
    .meta,footer{font:13px/1.7 Arial,sans-serif;color:var(--muted)}
    a{color:var(--blue);text-underline-offset:4px}
    ul,ol{padding-left:24px;margin-bottom:24px}li{margin-bottom:8px}
    p{margin:0 0 20px}
    footer{border-top:1px solid var(--rule);margin-top:40px;padding-top:20px}
  </style>
</head>
<body>
  <header><a href="../../index.html">The Daily Nun</a></header>
  <article>
    <p class="meta">Culture &amp; Attention / Week 3 Feature</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">By Peter Nunley &nbsp;·&nbsp; Draft for review</p>
    ${bodyHtml}
  </article>
  <footer>
    <a href="../../posts/03-recommendation-or-manipulation/index.html">View Instagram Carousel &amp; Script Preview</a><br>
    The Daily Nun / A closer look at the world.
  </footer>
</body>
</html>`;
  fs.writeFileSync(path.join(root, 'desks/culture/when-does-a-recommendation-become-manipulation.html'), articleHtml);
}

// Build index.html preview
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const previewHtml = `<!doctype html>
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
    h1{font:700 clamp(32px,5vw,52px)/1.1 Georgia,serif;letter-spacing:-.04em;margin:24px 0 12px}
    p{max-width:760px}a{color:var(--blue);text-underline-offset:4px}
    nav{display:flex;flex-wrap:wrap;gap:14px 25px;margin-top:20px}
    .slides{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:30px}
    .slide-card{background:var(--paper);border:1px solid var(--rule);padding:24px 20px;aspect-ratio:4/5;display:flex;flex-direction:column;justify-content:space-between;position:relative}
    .slide-card.blue{background:var(--blue);color:var(--paper);border-color:var(--blue)}
    .slide-header{font:700 20px Georgia,serif;border-bottom:2px solid currentColor;padding-bottom:10px;display:flex;justify-content:space-between}
    .slide-header span{font:400 12px Arial,sans-serif}
    .slide-title{font:700 26px/1.15 Georgia,serif;margin:18px 0 12px}
    .slide-body{font:400 14px/1.5 Arial,sans-serif;margin:0}
    .slide-footer{font:11px Arial,sans-serif;border-top:1px solid currentColor;padding-top:10px;display:flex;justify-content:space-between}
    .copy-section{max-width:780px;border-top:1px solid var(--rule);margin-top:40px;padding-top:24px}
    h2{font:700 26px/1.2 Georgia,serif;margin:0 0 14px}
    textarea{width:100%;min-height:180px;resize:vertical;padding:14px;border:1px solid var(--rule);background:var(--white);color:var(--ink);font:15px/1.6 Arial,sans-serif}
    button{font:inherit;padding:9px 18px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer;margin-top:10px}
    button:focus-visible,textarea:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
    .reel-box{background:var(--white);border:1px solid var(--rule);padding:22px;border-radius:4px;margin-top:20px}
    .reel-box pre{white-space:pre-wrap;font:14px/1.6 monospace;margin:0}
    footer{border-top:1px solid var(--rule);margin-top:40px;padding-top:20px;font-size:13px;color:var(--muted)}
    @media(max-width:768px){.slides{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header>
    <a class="brand" href="../../index.html">The Daily Nun</a>
    <h1>${escape(post.title)}</h1>
    <p>Week 3 / Culture &amp; Attention / Prepared draft</p>
    <nav aria-label="Post resources">
      <a href="../../desks/culture/when-does-a-recommendation-become-manipulation.html">Read the full article</a>
      <a href="SOURCES.md">Source notes</a>
      <a href="voiceover-script.txt">Voiceover script</a>
    </nav>
  </header>
  <main>
    <section class="slides" aria-label="Carousel slides">
      ${post.slides.map((s, i) => `
        <article class="slide-card ${s.theme === 'blue' ? 'blue' : ''}">
          <div class="slide-header">The Daily Nun <span>${i + 1} / ${post.slides.length}</span></div>
          <div>
            <div class="slide-title">${escape(s.title).replaceAll('\n', '<br>')}</div>
            <p class="slide-body">${escape(s.body)}</p>
          </div>
          <div class="slide-footer">
            <span>A closer look at the world.</span>
            <span>Culture</span>
          </div>
        </article>
      `).join('')}
    </section>

    <section class="copy-section">
      <h2>Instagram Caption (Third-Person Editorial)</h2>
      <textarea id="caption" readonly aria-label="Prepared caption">${escape(caption)}</textarea>
      <button id="copy-caption" type="button">Copy caption</button>
      <span id="copy-status" style="margin-left:12px;font-size:13px;color:var(--muted)"></span>
    </section>

    <section class="copy-section">
      <h2>Short Video Voiceover (For Peter)</h2>
      <div class="reel-box">
        <p><strong>Voiceover text:</strong></p>
        <blockquote style="font-style:italic;margin:0 0 16px 0;font-size:16px;line-height:1.6">"${escape(post.reel.voiceover)}"</blockquote>
        <p><strong>On-screen kinetic text:</strong></p>
        <pre>${post.reel.kineticText.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}</pre>
      </div>
    </section>
  </main>
  <footer>The Daily Nun &nbsp;·&nbsp; Prepared locally; no external post published.</footer>
  <script>
    document.getElementById('copy-caption').addEventListener('click', async () => {
      const field = document.getElementById('caption');
      try {
        await navigator.clipboard.writeText(field.value);
        document.getElementById('copy-status').textContent = 'Copied to clipboard.';
      } catch {
        field.focus(); field.select();
        document.getElementById('copy-status').textContent = 'Selected. Press Ctrl+C / Cmd+C.';
      }
    });
  </script>
</body>
</html>`;
fs.writeFileSync(path.join(dir, 'index.html'), previewHtml);

console.log('Week 3 Culture Desk package built successfully.');
