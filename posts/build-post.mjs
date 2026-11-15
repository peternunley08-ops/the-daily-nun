// Shared builder for weekly post packages (posts/02 onward).
// Each package's build.mjs calls buildPost() with its labels; this module validates post.json and writes
// caption.txt, SOURCES.md, voiceover-script.txt, the article page (through assets/render-article.mjs),
// and the package preview index.html. Exported slides (slide-0N.png) and upload-pack.zip from
// posts/export-slides.mjs are shown on the preview when present.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderArticle } from '../assets/render-article.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORDS_PER_MINUTE = 140;
const NICKNAME = /p[-\s._‐-―]*nun\b/i;
const words = text => String(text || '').trim().split(/\s+/).filter(Boolean);
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/**
 * @param {string} moduleUrl            import.meta.url of the package's build.mjs
 * @param {object} config
 * @param {string} config.label         e.g. "Week 2" or "Story 5"
 * @param {string} config.desk          Desk name shown on slides and previews, e.g. "Government"
 * @param {string} config.deskLong      Fuller desk name for source notes and previews
 * @param {string} config.article       Repository path of the article Markdown, e.g. "desks/government/x.md"
 * @param {string} [config.note]        Extra status text for the preview header
 */
export function buildPost(moduleUrl, { label, desk, deskLong, article, note = '' }) {
  const dir = path.dirname(fileURLToPath(moduleUrl));
  const folder = path.basename(dir);
  const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));

  // Validation
  if (NICKNAME.test(JSON.stringify(post))) throw new Error(`${folder}: nickname branding is not allowed`);
  for (const slide of post.slides) {
    if (words(slide.body).length > 22) throw new Error(`${folder}: slide body exceeds 22 words: "${slide.body}"`);
    if (slide.cover && words(slide.title).length > 7) throw new Error(`${folder}: cover title exceeds 7 words: "${slide.title}"`);
  }
  const voiceoverWords = words(post.reel.voiceover).length;
  const voiceoverSeconds = Math.round(voiceoverWords / WORDS_PER_MINUTE * 60);
  if (voiceoverSeconds > post.reel.duration + 1) {
    throw new Error(`${folder}: voiceover is ${voiceoverWords} words (about ${voiceoverSeconds}s at ${WORDS_PER_MINUTE} wpm) but the reel is ${post.reel.duration}s`);
  }

  // Caption
  const caption = `${post.caption}\n${post.articleUrl}\n`;
  fs.writeFileSync(path.join(dir, 'caption.txt'), caption);

  // Source notes
  fs.writeFileSync(path.join(dir, 'SOURCES.md'), [
    `# Source notes — ${label}, ${deskLong}`,
    '',
    `**Title:** ${post.title}`,
    `**Desk:** ${deskLong}`,
    '**Status:** Prepared draft / Unpublished',
    '',
    '## Sources',
    '',
    ...post.sources.flatMap(s => [
      `### ${s.title}`,
      `- **Author / Publisher:** ${s.author} (${s.publisher})`,
      `- **Date:** ${s.date}`,
      `- **URL:** [${s.url}](${s.url})`,
      `- **Type:** ${s.type}`,
      `- **Limits:** ${s.limits}`,
      ''
    ]),
    '## Article',
    '',
    `Full article: ${post.articleUrl}`,
    ''
  ].join('\n'));

  // Voiceover script
  fs.writeFileSync(path.join(dir, 'voiceover-script.txt'), [
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
  ].join('\n'));

  // Article page
  const articleMd = path.join(root, article);
  const articleHtmlRel = article.replace(/\.md$/, '.html');
  const depth = path.relative(path.dirname(path.join(root, article)), root).split(path.sep).join('/') || '.';
  const rendered = renderArticle({
    markdown: fs.readFileSync(articleMd, 'utf8'),
    kicker: `${desk} desk`,
    cssHref: `${depth}/assets/article.css`,
    homeHref: `${depth}/index.html`,
    footerHtml: `<a href="${depth}/posts/${folder}/index.html">See the Instagram carousel and script for this story</a><br>The Daily Nun / A closer look at the world. Draft for review.`
  });
  fs.writeFileSync(path.join(root, articleHtmlRel), rendered.html);

  // Preview page
  const pngs = post.slides.map((_, i) => `slide-${String(i + 1).padStart(2, '0')}.png`);
  const exported = pngs.every(f => fs.existsSync(path.join(dir, f)));
  const hasPack = fs.existsSync(path.join(dir, 'upload-pack.zip'));
  const slidesHtml = post.slides.map((s, i) => exported
    ? `<figure class="slide-img"><img src="${pngs[i]}" width="1080" height="1350" alt="${escape(s.alt || s.title.replaceAll('\n', ' '))}" loading="lazy"><figcaption><a href="${pngs[i]}" download>Download slide ${i + 1}</a></figcaption></figure>`
    : `<article class="slide-card ${s.theme === 'blue' ? 'blue' : ''}"><div class="slide-header">The Daily Nun <span>${i + 1} / ${post.slides.length}</span></div><div><div class="slide-title">${escape(s.title).replaceAll('\n', '<br>')}</div><p class="slide-body">${escape(s.body)}</p></div><div class="slide-footer"><span>A closer look at the world.</span><span>${escape(desk)}</span></div></article>`
  ).join('\n      ');

  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
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
    .status{color:var(--muted)}
    .slides{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:30px}
    .slide-img{margin:0}.slide-img img{display:block;width:100%;height:auto;border:1px solid var(--rule)}
    .slide-img figcaption{font-size:14px;margin-top:8px}
    .slide-card{background:var(--paper);border:1px solid var(--rule);padding:24px 20px;aspect-ratio:4/5;display:flex;flex-direction:column;justify-content:space-between}
    .slide-card.blue{background:var(--blue);color:var(--paper);border-color:var(--blue)}
    .slide-header{font:700 20px Georgia,serif;border-bottom:2px solid currentColor;padding-bottom:10px;display:flex;justify-content:space-between}
    .slide-header span{font:400 13px Arial,sans-serif}
    .slide-title{font:700 26px/1.15 Georgia,serif;margin:18px 0 12px}
    .slide-body{font:400 15px/1.5 Arial,sans-serif;margin:0}
    .slide-footer{font:13px Arial,sans-serif;border-top:1px solid currentColor;padding-top:10px;display:flex;justify-content:space-between}
    .copy-section{max-width:780px;border-top:1px solid var(--rule);margin-top:40px;padding-top:24px}
    h2{font:700 26px/1.2 Georgia,serif;margin:0 0 14px}
    textarea{width:100%;min-height:180px;resize:vertical;padding:14px;border:1px solid var(--rule);background:var(--white);color:var(--ink);font:15px/1.6 Arial,sans-serif}
    button{font:inherit;padding:9px 18px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer;margin-top:10px}
    button:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
    .reel-box{background:var(--white);border:1px solid var(--rule);padding:22px;border-radius:4px;margin-top:20px}
    .reel-box pre{white-space:pre-wrap;font:14px/1.6 monospace;margin:0}
    footer{border-top:1px solid var(--rule);margin-top:40px;padding-top:20px;font-size:14px;color:var(--muted)}
    @media(max-width:768px){.slides{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header>
    <a class="brand" href="../../index.html">The Daily Nun</a>
    <h1>${escape(post.title)}</h1>
    <p class="status">${escape(label)} / ${escape(deskLong)} / Prepared draft${note ? ` (${escape(note)})` : ''}. Not posted.</p>
    <nav aria-label="Post resources">
      <a href="../../${articleHtmlRel}">Read the article</a>
      ${hasPack ? '<a href="upload-pack.zip" download>Download the upload pack</a>' : ''}
      <a href="SOURCES.md">Source notes</a>
      <a href="voiceover-script.txt">Voiceover script</a>
    </nav>
  </header>
  <main>
    <section class="slides" aria-label="Carousel slides">
      ${slidesHtml}
    </section>
    ${exported ? '' : '<p class="status">These are layout previews. Run <code>node posts/export-slides.mjs ' + escape(folder) + '</code> to make the upload images.</p>'}
    <section class="copy-section">
      <h2>Caption</h2>
      <textarea id="caption" readonly aria-label="Prepared caption">${escape(caption)}</textarea>
      <button id="copy-caption" type="button">Copy caption</button>
      <span id="copy-status" role="status" style="margin-left:12px;font-size:14px;color:var(--muted)"></span>
    </section>
    <section class="copy-section">
      <h2>Short video voiceover</h2>
      <div class="reel-box">
        <p><strong>Voiceover text:</strong></p>
        <blockquote style="font-style:italic;margin:0 0 16px 0;font-size:16px;line-height:1.6">"${escape(post.reel.voiceover)}"</blockquote>
        <p><strong>On-screen text:</strong></p>
        <pre>${post.reel.kineticText.map((t, i) => `${i + 1}. ${escape(t)}`).join('\n')}</pre>
      </div>
    </section>
  </main>
  <footer>The Daily Nun &nbsp;·&nbsp; Prepared for review; nothing has been posted.</footer>
  <script>
    document.getElementById('copy-caption').addEventListener('click', async () => {
      const field = document.getElementById('caption');
      try { await navigator.clipboard.writeText(field.value); document.getElementById('copy-status').textContent = 'Copied.'; }
      catch { field.focus(); field.select(); document.getElementById('copy-status').textContent = 'Selected. Press Ctrl+C or Cmd+C.'; }
    });
  </script>
</body>
</html>
`);
  return { folder, articleWords: rendered.words, exported, hasPack };
}
