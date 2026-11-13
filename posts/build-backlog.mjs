import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');

// Scan for weekly post packages
const entries = fs.readdirSync(dir, { withFileTypes: true });
const weeklyPosts = [];

for (const entry of entries) {
  if (entry.isDirectory()) {
    const postJsonPath = path.join(dir, entry.name, 'post.json');
    if (fs.existsSync(postJsonPath)) {
      const postData = JSON.parse(fs.readFileSync(postJsonPath, 'utf8'));
      postData.slug = entry.name;
      weeklyPosts.push(postData);
    }
  }
}

weeklyPosts.sort((a, b) => a.week - b.week);

// Planned placeholder slots for 4-week backlog if not yet built
const fullBacklog = [1, 2, 3, 4].map(w => {
  const existing = weeklyPosts.find(p => p.week === w);
  if (existing) return { ...existing, ready: true };
  if (w === 3) {
    return {
      week: 3,
      ready: false,
      desk: 'Culture & Behavioral Tech',
      title: 'When does recommendation become manipulation?',
      status: 'In development by Claude Code (Issue #10)',
      caption: 'The Daily Nun is examining how recommendation engines convert user watch-time and outrage into behavioral habits.',
      owner: 'Claude Code'
    };
  }
  return {
    week: 4,
    ready: false,
    desk: 'Democracy & Local Watchdogs',
    title: 'The disappearing local beat: What happens when watchdogs close',
    status: 'Assigned to Codex (Issue #11)',
    caption: 'The Daily Nun is synthesizing Northwestern / Medill research on how municipal borrowing costs and corruption risks rise when local newspapers close.',
    owner: 'Codex'
  };
});

const escape = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>4-Week Pre-Launch Backlog Studio — The Daily Nun</title>
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
      padding: 24px 24px;
    }
    .topbar {
      border-bottom: 1px solid var(--ink);
      padding-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
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
      max-width: 720px;
      margin-bottom: 24px;
    }
    .backlog-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 24px 0 32px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 16px;
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
      transition: all 0.15s ease;
    }
    .week-btn[aria-selected="true"] {
      background: var(--ink);
      color: var(--paper);
    }
    .week-btn .badge {
      font-size: 11px;
      margin-left: 6px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--rule);
      color: var(--ink);
    }
    .week-btn[aria-selected="true"] .badge {
      background: var(--blue);
      color: var(--white);
    }
    .week-panel {
      display: none;
    }
    .week-panel.active {
      display: block;
    }
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
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
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
      border-radius: 4px;
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
    .teleprompter {
      background: #191916;
      color: #faf9f5;
      padding: 20px;
      border-radius: 4px;
      margin-top: 12px;
    }
    .teleprompter p {
      font: 500 18px/1.6 Georgia, serif;
      margin: 0 0 14px;
      color: #fff;
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
    }
    .sources-list li {
      margin-bottom: 10px;
    }
    a {
      color: var(--blue);
      text-underline-offset: 3px;
    }
    .pending-notice {
      padding: 40px;
      text-align: center;
      background: var(--accent-bg);
      border: 1px dashed var(--rule);
      border-radius: 4px;
    }
    footer {
      border-top: 1px solid var(--rule);
      margin-top: 48px;
      padding-top: 20px;
      font-size: 12px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }
    @media (max-width: 840px) {
      .grid { grid-template-columns: 1fr; }
      .slides-preview { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="topbar">
      <span>The Daily Nun &nbsp;·&nbsp; Internal Newsroom Backlog Studio</span>
      <span>Strict Third-Person Editorial Mode</span>
    </div>
    <a class="brand" href="../index.html">The Daily Nun</a>
    <h1>Pre-Launch 4-Week Backlog Studio</h1>
    <p class="tagline">
      Complete four-week editorial backlog prepared prior to public launch. Review carousel sequences, copy third-person captions, and record voiceover audio scripts.
    </p>

    <nav class="backlog-nav" role="tablist" aria-label="Weekly backlog tabs">
      ${fullBacklog.map((p, idx) => `
        <button class="week-btn" role="tab" id="tab-${p.week}" aria-selected="${idx === 0}" aria-controls="panel-${p.week}" onclick="switchWeek(${p.week})">
          Week ${p.week}: ${escape(p.desk || 'Desk')}
          <span class="badge">${p.ready ? 'Ready' : 'In Progress'}</span>
        </button>
      `).join('')}
    </nav>
  </header>

  <main>
    ${fullBacklog.map((p, idx) => `
      <section class="week-panel ${idx === 0 ? 'active' : ''}" id="panel-${p.week}" role="tabpanel" aria-labelledby="tab-${p.week}">
        ${p.ready ? `
          <div class="grid">
            <div>
              <h2>${escape(p.title)}</h2>
              <p style="color:var(--muted);font-size:14px;margin-top:-6px;margin-bottom:20px">
                Desk: <strong>${escape(p.desk || 'Editorial')}</strong> &nbsp;·&nbsp; Format: <strong>${escape(p.format)}</strong> &nbsp;·&nbsp; 
                <a href="${escape(p.slug)}/index.html">Open Dedicated Post Studio</a>
              </p>

              <h3>Instagram Carousel Preview (1080 × 1350)</h3>
              <div class="slides-preview">
                ${p.media ? p.media.map((m, sIdx) => `
                  <div class="slide-box">
                    <img src="../${escape(m)}" alt="Slide ${sIdx + 1}" loading="lazy">
                  </div>
                `).join('') : (p.slides || []).map((s, sIdx) => `
                  <div class="slide-box ${s.theme === 'blue' ? 'blue' : ''}">
                    <div class="slide-head">The Daily Nun <span>${sIdx + 1}/${p.slides.length}</span></div>
                    <div>
                      <div class="slide-title">${escape(s.title).replaceAll('\n', '<br>')}</div>
                      <p class="slide-body">${escape(s.body)}</p>
                    </div>
                    <div class="slide-foot"><span>The Daily Nun</span><span>${escape(p.desk || 'News')}</span></div>
                  </div>
                `).join('')}
              </div>

              <h3>Verified Source Ledger</h3>
              <ul class="sources-list">
                ${(p.sources || []).map(s => `
                  <li>
                    <strong><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></strong><br>
                    <span>${escape(s.author || '')} (${escape(s.publisher || '')}) — ${escape(s.date || '')}</span><br>
                    <span style="color:var(--muted)">Limits: ${escape(s.limits || 'Verified standard.')}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div>
              <div class="copy-card">
                <h2>Instagram Caption</h2>
                <p style="font-size:12px;color:var(--muted);margin-top:-6px">Third-person institutional voice (strictly avoids personal quotes out of context).</p>
                <textarea id="caption-${p.week}" readonly>${escape(p.caption + '\n' + (p.reportUrl || p.articleUrl || ''))}</textarea>
                <button class="action-btn" type="button" onclick="copyCaption(${p.week})">Copy Caption</button>
                <span id="copy-status-${p.week}" style="font-size:12px;color:var(--blue);margin-left:10px"></span>
              </div>

              ${p.reel ? `
                <div class="copy-card">
                  <h2>Voiceover Teleprompter</h2>
                  <p style="font-size:12px;color:var(--muted);margin-top:-6px">Read aloud while recording over vertical video asset (~15 sec).</p>
                  <div class="teleprompter">
                    <p>"${escape(p.reel.voiceover)}"</p>
                    <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9b9987;margin-bottom:6px">On-Screen Kinetic Text Sequence:</p>
                    <ol>
                      ${p.reel.kineticText.map(t => `<li>${escape(t)}</li>`).join('')}
                    </ol>
                  </div>
                </div>
              ` : `
                <div class="copy-card">
                  <h2>Audio / Reel Asset</h2>
                  <p style="font-size:13px;color:var(--muted)">Silent text video available in launch packs. Voiceover optional.</p>
                </div>
              `}
            </div>
          </div>
        ` : `
          <div class="pending-notice">
            <h2>Week ${p.week}: ${escape(p.title)}</h2>
            <p style="color:var(--muted);max-width:540px;margin:12px auto 20px">
              ${escape(p.status)}.<br>
              Assigned agent: <strong>${escape(p.owner)}</strong>. Once merged, it will automatically populate this studio.
            </p>
          </div>
        `}
      </section>
    `).join('')}
  </main>

  <footer>
    <span>The Daily Nun Backlog Studio &nbsp;·&nbsp; Prepared for Peter Nunley</span>
    <a href="../index.html">Return to Newspaper Front Page</a>
  </footer>

  <script>
    function switchWeek(weekNum) {
      document.querySelectorAll('.week-btn').forEach(btn => {
        btn.setAttribute('aria-selected', btn.id === 'tab-' + weekNum);
      });
      document.querySelectorAll('.week-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'panel-' + weekNum);
      });
    }

    async function copyCaption(weekNum) {
      const field = document.getElementById('caption-' + weekNum);
      const status = document.getElementById('copy-status-' + weekNum);
      try {
        await navigator.clipboard.writeText(field.value);
        status.textContent = 'Caption copied!';
      } catch (err) {
        field.focus();
        field.select();
        status.textContent = 'Selected. Press Ctrl+C / Cmd+C.';
      }
      setTimeout(() => { status.textContent = ''; }, 3000);
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('4-Week Backlog Studio compiled at posts/index.html');
