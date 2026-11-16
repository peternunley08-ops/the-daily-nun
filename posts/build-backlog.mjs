import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

const entries = fs.readdirSync(dir, { withFileTypes: true });
const weeklyPosts = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const postJsonPath = path.join(dir, entry.name, 'post.json');
  if (!fs.existsSync(postJsonPath)) continue;
  const postData = JSON.parse(fs.readFileSync(postJsonPath, 'utf8'));
  postData.slug = entry.name;
  weeklyPosts.push(postData);
}

weeklyPosts.sort((a, b) => (a.week || 0) - (b.week || 0));

function loadAltLines(post) {
  const candidates = [];
  if (post.altTextFile) candidates.push(path.join(dir, '..', post.altTextFile));
  candidates.push(path.join(dir, post.slug, 'ALT-TEXT.txt'));
  candidates.push(path.join(dir, post.slug, 'alt-text.txt'));
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const lines = fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
    if (lines.length) return lines;
  }
  return [];
}

function resolveSlideImages(post) {
  const packageDir = path.join(dir, post.slug);
  const altLines = loadAltLines(post);
  const localSlides = [1, 2, 3]
    .map((n) => `slide-0${n}.png`)
    .filter((name) => fs.existsSync(path.join(packageDir, name)));

  if (localSlides.length) {
    return localSlides.map((name, idx) => ({
      src: `${post.slug}/${name}`,
      alt: post.slides?.[idx]?.alt || altLines[idx] || `Slide ${idx + 1}: ${post.title}`,
    }));
  }

  if (Array.isArray(post.media) && post.media.length) {
    return post.media.map((rel, idx) => ({
      src: `../${rel}`,
      alt: post.slides?.[idx]?.alt || altLines[idx] || `Slide ${idx + 1}: ${post.title}`,
    }));
  }

  return null;
}

function captionText(post) {
  const base = String(post.caption || '').trimEnd();
  const url = post.reportUrl || post.articleUrl || '';
  if (!url) return base;
  if (base.includes(url)) return base;
  return `${base}\n${url}`;
}

function enrich(post) {
  const launchWeek = Number(post.week) >= 1 && Number(post.week) <= 4;
  const hasUploadPack = fs.existsSync(path.join(dir, post.slug, 'upload-pack.zip'));
  const hasReelVideo = fs.existsSync(path.join(dir, post.slug, 'reel.mp4'));
  return {
    ...post,
    ready: true,
    launchWeek,
    desk: post.desk || (post.week === 1 ? 'Media' : 'Editorial'),
    slideImages: resolveSlideImages(post),
    captionFull: captionText(post),
    hasUploadPack,
    hasReelVideo,
    badge: launchWeek ? 'Launch week' : 'Follow-on',
  };
}

const launchWeeks = [1, 2, 3, 4].map((week) => {
  const existing = weeklyPosts.find((p) => p.week === week);
  if (!existing) {
    return {
      week,
      ready: false,
      launchWeek: true,
      desk: 'Editorial',
      title: `Week ${week} package`,
      status: 'Not yet in this checkout',
      owner: 'Unassigned',
      badge: 'Missing',
      slug: null,
      slideImages: null,
      captionFull: '',
      hasUploadPack: false,
    };
  }
  return enrich(existing);
});

const followOns = weeklyPosts
  .filter((p) => Number(p.week) > 4)
  .map(enrich);

const studioPosts = [...launchWeeks, ...followOns];
const firstReady = studioPosts.find((p) => p.ready) || studioPosts[0];

const escape = (s) =>
  String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function renderSlides(p) {
  if (p.slideImages?.length) {
    return p.slideImages
      .map(
        (img) => `
                  <div class="slide-box">
                    <img src="${escape(img.src)}" alt="${escape(img.alt)}" loading="lazy" width="1080" height="1350">
                  </div>`
      )
      .join('');
  }

  return (p.slides || [])
    .map(
      (s, sIdx) => `
                  <div class="slide-box ${s.theme === 'blue' ? 'blue' : ''}">
                    <div class="slide-head">The Daily Nun <span>${sIdx + 1}/${p.slides.length}</span></div>
                    <div>
                      <div class="slide-title">${escape(s.title).replaceAll('\n', '<br>')}</div>
                      <p class="slide-body">${escape(s.body)}</p>
                    </div>
                    <div class="slide-foot"><span>The Daily Nun</span><span>${escape(p.desk || 'News')}</span></div>
                  </div>`
    )
    .join('');
}

function renderPanel(p, isActive) {
  if (!p.ready) {
    return `
      <section class="week-panel${isActive ? ' active' : ''}" id="panel-${p.week}" role="tabpanel" aria-labelledby="tab-${p.week}" ${isActive ? '' : 'hidden'}>
          <div class="pending-notice">
            <h2>Week ${p.week}: ${escape(p.title)}</h2>
            <p class="pending-copy">
              ${escape(p.status)}.<br>
              Assigned agent: <strong>${escape(p.owner)}</strong>.
            </p>
          </div>
      </section>`;
  }

  const duration = p.reel?.duration ? `~${escape(String(p.reel.duration))} sec` : '~15 sec';
  const packLink = p.hasUploadPack
    ? ` &nbsp;·&nbsp; <a href="${escape(p.slug)}/upload-pack.zip" download>Download upload pack</a>`
    : '';
  const readLink = p.articleUrl || p.reportUrl
    ? ` &nbsp;·&nbsp; <a href="${escape(p.articleUrl || p.reportUrl)}" target="_blank" rel="noopener noreferrer">${p.reportUrl ? 'Read full research report' : 'Read website article'}</a>`
    : '';

  return `
      <section class="week-panel${isActive ? ' active' : ''}" id="panel-${p.week}" role="tabpanel" aria-labelledby="tab-${p.week}" ${isActive ? '' : 'hidden'}>
          <div class="grid">
            <div>
              <h2>${escape(p.title)}</h2>
              <p class="meta-line">
                Desk: <strong>${escape(p.desk)}</strong> &nbsp;·&nbsp; Format: <strong>${escape(p.format)}</strong> &nbsp;·&nbsp;
                <a href="${escape(p.slug)}/index.html">Dedicated package studio</a>${readLink}${packLink}
              </p>

              <h3>Instagram carousel preview (1080 × 1350)</h3>
              <div class="slides-preview">
                ${renderSlides(p)}
              </div>

              <h3>Verified source ledger</h3>
              <ul class="sources-list">
                ${(p.sources || [])
                  .map(
                    (s) => `
                  <li>
                    <strong><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></strong><br>
                    <span>${escape(s.author || '')}${s.author || s.publisher ? ' (' : ''}${escape(s.publisher || '')}${s.author || s.publisher ? ')' : ''}${s.date ? ` — ${escape(s.date)}` : ''}</span><br>
                    <span class="limit">Limits: ${escape(s.limits || 'See package source notes.')}</span>
                  </li>`
                  )
                  .join('')}
              </ul>
            </div>

            <div>
              <div class="copy-card">
                <h2>Instagram caption</h2>
                <p class="hint">Third-person institutional voice. Prepared draft; not posted.</p>
                <textarea id="caption-${p.week}" readonly aria-label="Caption for week ${p.week}">${escape(p.captionFull)}</textarea>
                <button class="action-btn" type="button" data-copy-week="${p.week}">Copy caption</button>
                <span id="copy-status-${p.week}" class="copy-status" role="status"></span>
              </div>

              ${
                p.reel
                  ? `
                <div class="copy-card">
                  <h2>Short video &amp; voiceover teleprompter</h2>
                  <p class="hint">Silent vertical Reel (${duration}) alongside synchronized voiceover script.</p>
                  <div class="reel-teleprompter-grid">
                    ${
                      p.hasReelVideo
                        ? `
                    <div class="reel-player-box">
                      <video class="reel-video" src="${escape(p.slug)}/reel.mp4" poster="${escape(p.slug)}/reel-cover.png" controls muted playsinline preload="metadata" width="1080" height="1920" aria-label="Silent text Reel for ${escape(p.title)}"></video>
                      <p class="reel-dl"><a href="${escape(p.slug)}/reel.mp4" download>Download Reel MP4 (${duration})</a></p>
                    </div>`
                        : ''
                    }
                    <div class="teleprompter">
                      <p class="vo-label">Voiceover text to record</p>
                      <p class="vo-text">"${escape(p.reel.voiceover)}"</p>
                      <p class="kinetic-label">On-screen kinetic text sequence</p>
                      <ol>
                        ${(p.reel.kineticText || []).map((t) => `<li>${escape(t)}</li>`).join('')}
                      </ol>
                    </div>
                  </div>
                </div>`
                  : `
                <div class="copy-card">
                  <h2>Audio / Reel asset</h2>
                  <p class="hint">Three silent text launch Reels live in <a href="../instagram-launch/index.html">Instagram launch studio</a> (<code>instagram-launch/reels/</code>). Voiceover optional.</p>
                </div>`
              }
            </div>
          </div>
      </section>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Backlog studio — The Daily Nun</title>
  <style>
    :root {
      --paper: #f6f5f0;
      --ink: #20201c;
      --blue: #2448b5;
      --muted: #68685f;
      --rule: #c8c8bc;
      --white: #ffffff;
      --accent-bg: #ecebe4;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font: 16px/1.6 Arial, sans-serif;
    }
    header, main, footer {
      max-width: 1200px;
      margin: auto;
      padding: 24px;
    }
    .topbar {
      border-bottom: 1px solid var(--ink);
      padding-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    .brand {
      font: 700 44px/1.1 Georgia, serif;
      letter-spacing: -0.05em;
      text-decoration: none;
      color: inherit;
      display: inline-block;
      margin: 20px 0 8px;
    }
    h1 {
      font: 700 clamp(32px, 5vw, 50px)/1.1 Georgia, serif;
      letter-spacing: -0.04em;
      margin: 0 0 10px;
    }
    .tagline {
      font-size: 16px;
      color: var(--muted);
      max-width: 760px;
      margin: 0 0 8px;
    }
    .scope-note {
      font-size: 14px;
      color: var(--muted);
      max-width: 760px;
      margin: 0 0 24px;
    }
    .backlog-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 24px 0 12px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 16px;
    }
    .nav-label {
      flex: 0 0 100%;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 4px 0 0;
    }
    .week-btn {
      font: inherit;
      padding: 10px 18px;
      border: 1px solid var(--ink);
      background: transparent;
      color: var(--ink);
      cursor: pointer;
      font-size: 14px;
      border-radius: 2px;
    }
    .week-btn[aria-selected="true"] {
      background: var(--ink);
      color: var(--paper);
    }
    .week-btn .badge {
      font-size: 12px;
      margin-left: 6px;
      padding: 2px 6px;
      border-radius: 2px;
      background: var(--rule);
      color: var(--ink);
    }
    .week-btn[aria-selected="true"] .badge {
      background: var(--blue);
      color: var(--white);
    }
    .week-panel { display: none; }
    .week-panel.active { display: block; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(320px, 1fr);
      gap: 36px;
    }
    .slides-preview {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .slide-box {
      aspect-ratio: 4/5;
      border: 1px solid var(--rule);
      background: var(--paper);
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .slide-box:not(:has(img)) { padding: 18px 16px; }
    .slide-box.blue {
      background: var(--blue);
      color: var(--paper);
      border-color: var(--blue);
    }
    .slide-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .slide-head {
      font: 700 15px Georgia, serif;
      border-bottom: 1px solid currentColor;
      padding-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    .slide-title {
      font: 700 18px/1.2 Georgia, serif;
      margin: 12px 0 8px;
    }
    .slide-body {
      font-size: 12px;
      line-height: 1.45;
      margin: 0;
    }
    .slide-foot {
      font-size: 10px;
      border-top: 1px solid currentColor;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
    }
    .copy-card {
      background: var(--accent-bg);
      border: 1px solid var(--rule);
      padding: 24px;
      margin-bottom: 24px;
    }
    h2 {
      font: 700 22px/1.2 Georgia, serif;
      margin: 0 0 12px;
    }
    h3 {
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--blue);
      margin: 18px 0 8px;
    }
    .meta-line {
      color: var(--muted);
      font-size: 14px;
      margin-top: -6px;
      margin-bottom: 20px;
    }
    .hint {
      font-size: 12px;
      color: var(--muted);
      margin-top: -6px;
    }
    .limit { color: var(--muted); }
    .copy-status {
      font-size: 12px;
      color: var(--blue);
      margin-left: 10px;
    }
    textarea {
      width: 100%;
      min-height: 140px;
      padding: 12px;
      border: 1px solid var(--rule);
      background: var(--white);
      color: var(--ink);
      font: 14px/1.6 Arial, sans-serif;
      resize: vertical;
    }
    button.action-btn {
      font: inherit;
      padding: 8px 16px;
      border: 1px solid var(--ink);
      background: var(--white);
      color: var(--ink);
      cursor: pointer;
      margin-top: 8px;
      font-size: 13px;
    }
    button.action-btn:hover {
      background: var(--ink);
      color: var(--paper);
    }
    .reel-teleprompter-grid {
      display: grid;
      grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      margin-top: 12px;
    }
    .reel-player-box {
      background: #191916;
      border: 1px solid var(--rule);
      border-radius: 4px;
      padding: 10px;
      text-align: center;
    }
    .reel-video {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 2px;
      background: #000;
    }
    .reel-dl {
      margin: 8px 0 0;
      font-size: 11px;
    }
    .reel-dl a {
      color: #9cb3f7;
    }
    .vo-label {
      font-size: 11px !important;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9b9987 !important;
      margin: 0 0 4px !important;
    }
    .vo-text {
      font: italic 500 17px/1.55 Georgia, serif !important;
      color: #fff !important;
      margin: 0 0 16px !important;
    }
    .teleprompter {
      background: #191916;
      color: #faf9f5;
      padding: 20px;
      border-radius: 4px;
    }
    .teleprompter p {
      font: 500 18px/1.6 Georgia, serif;
      margin: 0 0 14px;
      color: #fff;
    }
    .kinetic-label {
      font-size: 11px !important;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9b9987 !important;
      margin-bottom: 6px !important;
    }
    .teleprompter ol {
      padding-left: 20px;
      font-size: 13px;
      color: #b0af9f;
      margin: 0;
    }
    .sources-list {
      font-size: 13px;
      line-height: 1.6;
      padding-left: 18px;
    }
    .sources-list li { margin-bottom: 10px; }
    a {
      color: var(--blue);
      text-underline-offset: 3px;
    }
    a:focus-visible, button:focus-visible, textarea:focus-visible {
      outline: 3px solid var(--blue);
      outline-offset: 3px;
    }
    .pending-notice {
      padding: 40px;
      text-align: center;
      background: var(--accent-bg);
      border: 1px dashed var(--rule);
    }
    .pending-copy {
      color: var(--muted);
      max-width: 540px;
      margin: 12px auto 0;
    }
    footer {
      border-top: 1px solid var(--rule);
      margin-top: 48px;
      padding-top: 20px;
      font-size: 12px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    @media (max-width: 840px) {
      .grid { grid-template-columns: 1fr; }
      .slides-preview { grid-template-columns: 1fr; }
      .reel-teleprompter-grid { grid-template-columns: 1fr; }
      .reel-player-box { max-width: 260px; margin: 0 auto 16px; }
    }
    @media (max-width: 600px) {
      header, main, footer { padding: 16px; }
      .brand { font-size: 32px; margin-top: 14px; }
      h1 { font-size: 28px; }
      .copy-card { padding: 16px; }
      .teleprompter { padding: 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; }
    }
  </style>
</head>
<body>
  <header>
    <div class="topbar">
      <span>The Daily Nun · Internal backlog studio · Unpublished</span>
      <span>Third-person editorial voice</span>
    </div>
    <a class="brand" href="../index.html">The Daily Nun</a>
    <h1>Pre-launch backlog studio</h1>
    <p class="tagline">
      Review launch-week carousels, copy captions, and read voiceover scripts before any public post.
    </p>
    <p class="scope-note">
      Weeks 1–4 are the launch sequence. Stories 5–6 are approved follow-on drafts after that backlog.
      Nothing here is scheduled or posted.
    </p>

    <nav class="backlog-nav" role="tablist" aria-label="Backlog packages">
      <div class="nav-label">Launch weeks</div>
      ${launchWeeks
        .map(
          (p) => `
        <button class="week-btn" role="tab" id="tab-${p.week}" type="button"
          aria-selected="${firstReady && firstReady.week === p.week ? 'true' : 'false'}"
          aria-controls="panel-${p.week}"
          tabindex="${firstReady && firstReady.week === p.week ? '0' : '-1'}"
          data-week="${p.week}">
          Week ${p.week}: ${escape(p.desk || 'Desk')}
          <span class="badge">${escape(p.badge)}</span>
        </button>`
        )
        .join('')}
      ${
        followOns.length
          ? `<div class="nav-label">Follow-on drafts</div>${followOns
              .map(
                (p) => `
        <button class="week-btn" role="tab" id="tab-${p.week}" type="button"
          aria-selected="${firstReady && firstReady.week === p.week ? 'true' : 'false'}"
          aria-controls="panel-${p.week}"
          tabindex="${firstReady && firstReady.week === p.week ? '0' : '-1'}"
          data-week="${p.week}">
          Story ${p.week}: ${escape(p.desk || 'Desk')}
          <span class="badge">${escape(p.badge)}</span>
        </button>`
              )
              .join('')}`
          : ''
      }
    </nav>
  </header>

  <main>
    ${studioPosts.map((p) => renderPanel(p, firstReady && firstReady.week === p.week)).join('')}
  </main>

  <footer>
    <span>The Daily Nun backlog studio · Prepared drafts only</span>
    <a href="../index.html">Return to newspaper front page</a>
  </footer>

  <script>
    function switchWeek(weekNum, focusTab) {
      const tabs = Array.from(document.querySelectorAll('.week-btn'));
      const panels = Array.from(document.querySelectorAll('.week-panel'));
      tabs.forEach((btn) => {
        const selected = btn.dataset.week === String(weekNum);
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
        btn.tabIndex = selected ? 0 : -1;
        if (selected && focusTab) btn.focus();
      });
      panels.forEach((panel) => {
        const active = panel.id === 'panel-' + weekNum;
        panel.classList.toggle('active', active);
        if (active) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      });
    }

    document.querySelectorAll('.week-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchWeek(btn.dataset.week, false));
      btn.addEventListener('keydown', (event) => {
        const tabs = Array.from(document.querySelectorAll('.week-btn'));
        const index = tabs.indexOf(btn);
        if (index < 0) return;
        let next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        switchWeek(next.dataset.week, true);
      });
    });

    document.querySelectorAll('[data-copy-week]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const weekNum = btn.getAttribute('data-copy-week');
        const field = document.getElementById('caption-' + weekNum);
        const status = document.getElementById('copy-status-' + weekNum);
        try {
          await navigator.clipboard.writeText(field.value);
          status.textContent = 'Caption copied.';
        } catch (err) {
          field.focus();
          field.select();
          status.textContent = 'Selected. Press Ctrl+C / Cmd+C.';
        }
        setTimeout(() => { status.textContent = ''; }, 3000);
      });
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Backlog studio compiled at posts/index.html (${studioPosts.length} packages)`);
