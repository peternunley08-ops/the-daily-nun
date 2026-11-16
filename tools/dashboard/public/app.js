// Client for the local dashboard. Renders server snapshots received over Server-Sent Events.
// All text from the server is inserted with textContent or escaped, never as raw HTML.
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https:\/\/github\.com\//.test(u || '') ? u : null;
const link = (text, url) => safeUrl(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>` : esc(text);

function ago(iso) {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 0) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
const stamp = iso => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const statusClass = s => ({ working: 's-working', blocked: 's-blocked', 'ready for review': 's-ready', complete: 's-complete', idle: 's-idle' }[s] || 's-upcoming');
const pill = s => `<span class="pill ${statusClass(s)}">${esc(s)}</span>`;

let view = null;
let seenFeed = new Set();
let firstRender = true;
let lastMessageAt = 0;
let connected = false;

// ---------- connection ----------
let source = null;
let retryDelay = 1000;
function connect() {
  setConn('wait', source ? 'Reconnecting…' : 'Connecting…');
  source = new EventSource('/events');
  source.addEventListener('snapshot', e => {
    retryDelay = 1000; lastMessageAt = Date.now(); connected = true;
    try { view = JSON.parse(e.data); render(); } catch (err) { showBanner(`Could not read an update from the server: ${err.message}`, true); }
  });
  source.addEventListener('ping', () => { lastMessageAt = Date.now(); if (view && connected) setConnFromView(); });
  source.onopen = () => { lastMessageAt = Date.now(); };
  source.onerror = () => {
    connected = false;
    // The browser retries on its own while readyState is CONNECTING; if it gave up, back off and reopen.
    if (source.readyState === EventSource.CLOSED) {
      setConn('bad', `Disconnected. Retrying in ${Math.round(retryDelay / 1000)}s`);
      setTimeout(connect, retryDelay); retryDelay = Math.min(retryDelay * 2, 30000);
    } else setConn('bad', 'Disconnected from the local server. Reconnecting…');
    showBanner('The dashboard lost its connection to the local server. Data below is frozen at the last update until it reconnects.', true);
  };
}
function setConn(kind, text) {
  $('conn-dot').className = `dot dot-${kind}`;
  $('conn-text').textContent = text;
}
function setConnFromView() {
  const gh = view.connection.github, local = view.connection.local;
  let kind = 'ok', text = 'Live';
  if (local.state === 'error') { kind = 'bad'; text = 'Local data error'; }
  else if (gh.state === 'error') { kind = 'wait'; text = 'Live (GitHub unavailable)'; }
  else if (gh.state === 'stale') { kind = 'wait'; text = 'Live (GitHub data stale)'; }
  else if (gh.state === 'disabled') { text = 'Live (local only)'; }
  setConn(kind, text);
  $('conn-sync').textContent = `local ${ago(local.syncedAt)} · GitHub ${gh.state === 'disabled' ? 'off' : ago(gh.syncedAt)}`;
}
// Detect a silent stall (no snapshot or ping for 45s even though the socket looks open).
setInterval(() => {
  if (connected && lastMessageAt && Date.now() - lastMessageAt > 45000) {
    connected = false;
    setConn('bad', 'No updates for 45s. Reconnecting…');
    source.close(); connect();
  } else if (view && connected) setConnFromView();
}, 5000);

function showBanner(text, bad) {
  const b = $('banner');
  if (!text) { b.hidden = true; return; }
  b.hidden = false; b.className = `banner${bad ? ' bad' : ''}`; b.textContent = text;
}

// ---------- render ----------
function render() {
  setConnFromView();
  const gh = view.connection.github;
  const notes = [];
  if (view.connection.local.state === 'error') notes.push(`Local data could not be read: ${view.connection.local.error}`);
  if (gh.state === 'error') notes.push(`GitHub could not be reached (${gh.error}). Agent claims, pull requests, and CI results are unavailable until it recovers; local data below is current.`);
  if (gh.state === 'stale') notes.push(`GitHub refresh failed (${gh.error}). GitHub data is from ${stamp(gh.syncedAt)} and may be out of date.`);
  if (view.connection.local.watching === 'error') notes.push('The file watcher stopped. File edits will not appear until the server restarts.');
  showBanner(notes.join(' '), view.connection.local.state === 'error');
  ['business-body', 'agents-body', 'progress-body', 'feed-body', 'health-body'].forEach(id => $(id).classList.remove('loading'));
  renderBusiness(); renderAgents(); renderProgress(); renderFeed(); renderHealth();
  $('foot').textContent = `Snapshot ${view.version} generated ${stamp(view.generatedAt)}. GitHub repo ${gh.repo || 'none'}${gh.rate ? `, API requests left this hour: ${gh.rate.remaining}/${gh.rate.limit}` : ''}${gh.authenticated ? ' (token in server)' : gh.tokenRejected ? ' (GITHUB_TOKEN was rejected by GitHub; reading public data without it)' : ''}. Stale = no update for ${view.staleHours}h.`;
  firstRender = false;
}

function metric(n, label, note, nc) {
  return `<div class="metric${nc ? ' nc' : ''}"><div class="n">${esc(n)}</div><div class="l">${esc(label)}</div>${note ? `<div class="src">${esc(note)}</div>` : ''}</div>`;
}

function renderBusiness() {
  const b = view.business;
  if (!b) { $('business-body').innerHTML = '<p class="empty">Publication data has not loaded.</p>'; return; }
  const t = b.totals, a = b.audience;
  const ncLabel = s => s.state === 'not applicable' ? 'Not applicable' : s.state === 'no data' ? 'No data recorded' : s.state === 'recorded' ? 'Recorded' : 'Not connected';
  const rows = b.stories.map(s => `<tr>
      <td>${s.week ? `Week ${esc(s.week)}` : '—'}</td><td>${esc(s.title)}<div class="src">${esc(s.desk)}</div></td>
      <td>${s.sources}</td><td class="${s.article ? 'yes' : 'no'}">${s.article === null ? 'n/a' : s.article ? 'yes' : 'missing'}</td>
      <td class="${s.slidesExported ? 'yes' : 'no'}">${s.slidesExported ? `${s.slides} exported` : `${s.slides} drafted`}</td>
      <td class="${s.uploadPack ? 'yes' : 'no'}">${s.uploadPack ? 'ready' : 'none'}</td>
      <td class="${s.reel === 'exported' ? 'yes' : 'no'}">${esc(s.reel)}</td>
      <td>${s.publishedAt ? esc(stamp(s.publishedAt)) : s.scheduledAt ? `scheduled ${esc(stamp(s.scheduledAt))}` : '<span class="no">not posted</span>'}</td></tr>`).join('');
  $('business-body').innerHTML = `
    <div class="metrics">
      ${metric(t.packages, 'story packages drafted', 'posts/*/post.json')}
      ${metric(t.exported, 'with upload pack ready', 'files on disk')}
      ${metric(t.reels, 'Reels exported', 'reel.mp4 on disk')}
      ${metric(t.published, 'published', 'publishedAt in post.json')}
      ${metric(ncLabel(a.instagram), 'Instagram reach and followers', a.instagram.note, a.instagram.state !== 'recorded')}
      ${metric(ncLabel(a.siteTraffic), 'Site visitors', a.siteTraffic.note, true)}
      ${metric(ncLabel(a.revenue), 'Revenue', a.revenue.note, true)}
      ${b.report ? metric(`${b.report.pages} pp`, 'research report', `${b.report.sources} sources, revised ${b.report.revised || 'n/a'}`) : metric('Not found', 'research report', 'validation.json missing', true)}
    </div>
    <div class="table-wrap"><table>
      <caption class="src" style="text-align:left;padding:8px">Story pipeline · source: ${esc(b.source)}</caption>
      <thead><tr><th>Week</th><th>Story</th><th>Sources</th><th>Article</th><th>Slides</th><th>Upload pack</th><th>Reel</th><th>Posted</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="empty">No story packages found in posts/.</td></tr>'}</tbody>
    </table></div>`;
}

function renderAgents() {
  const c = view.conflicts;
  $('conflicts').innerHTML = c.length ? `<div class="banner" role="alert"><strong>Ownership conflicts (${c.length}):</strong> ${c.map(x => `${link(x.what, x.url)} is claimed by ${esc(x.owners.join(', '))} <span class="src">${esc(x.source)}</span>`).join('; ')}</div>` : '';
  $('agents-body').innerHTML = view.agents.map(a => {
    const tasks = a.tasks.length ? `<ul class="plain">${a.tasks.map(t => `<li>${link(`${t.id} ${t.task}`, t.url)} ${pill(t.status)}${t.conflict ? ' <span class="pill s-blocked">shared claim</span>' : ''}
        ${t.scope ? `<div class="src">files: ${esc(t.scope)}</div>` : ''}${t.dependencies ? `<div class="src">depends on: ${esc(t.dependencies)}</div>` : ''}</li>`).join('')}</ul>` : '<p class="empty">No open task claimed.</p>';
    return `<article class="card${a.stale ? ' stale' : ''}" aria-label="${esc(a.name)}">
      <div class="card-top"><h3>${esc(a.name)}</h3>${pill(a.status)}</div>
      <div class="src ${a.selfReported ? 'self' : 'inferred'}">${esc(a.statusBasis)}</div>
      <dl class="kv">
        <dt>Presence</dt><dd>Unknown (no live telemetry)</dd>
        <dt>Last update</dt><dd>${a.lastUpdate ? `${esc(ago(a.lastUpdate))} · ${esc(stamp(a.lastUpdate))}` : 'None found'}</dd>
        <dt>Branches</dt><dd>${a.branches.length ? a.branches.map(b => esc(b.name)).join('<br>') : '—'}</dd>
        <dt>Open PRs</dt><dd>${a.openPrs.length ? a.openPrs.map(p => link(`#${p.number} ${p.title}`, p.url)).join('<br>') : '—'}</dd>
        ${a.note ? `<dt>Note</dt><dd>${esc(a.note)}</dd>` : ''}
      </dl>
      ${a.stale ? `<div class="warnline">Stale: no claim, branch push, or PR update in ${view.staleHours}h.</div>` : ''}
      ${tasks}
    </article>`;
  }).join('');
}

function renderProgress() {
  const p = view.progress;
  $('progress-basis').textContent = p.percent === null ? 'No tracked tasks yet' : `${p.percent}% of tracked tasks complete`;
  const order = ['upcoming', 'working', 'blocked', 'ready for review', 'complete'];
  const cols = order.map(k => {
    const all = p.groups[k] || [];
    const items = k === 'complete' ? all.slice(0, 6) : all;
    return `<div class="col"><h3><span>${esc(k)}</span><span>${all.length}</span></h3>${items.map(t => `<div class="task">
      <div>${link(`${t.id} ${t.task}`, t.url)}</div>
      <div class="meta">Owner: ${esc(t.owner)}${t.stale ? ' · <span class="s-ready">stale</span>' : ''}${t.conflict ? ' · <span class="s-blocked">multiple claims</span>' : ''}</div>
      ${t.statusText ? `<div class="meta">“${esc(t.statusText)}”</div>` : ''}
      ${t.dependencies ? `<div class="meta">Depends on: ${esc(t.dependencies)}</div>` : ''}
      ${(t.prs || []).length ? `<div class="meta">${t.prs.map(pr => link(`PR #${pr.number} (${pr.state}${pr.draft ? ', draft' : ''})`, pr.url)).join(', ')}</div>` : ''}
      <div class="src">${esc(t.basis)}</div></div>`).join('') || '<p class="empty">None</p>'}${all.length > items.length ? `<p class="empty">${all.length - items.length} older completed task(s) not shown.</p>` : ''}</div>`;
  }).join('');
  const bl = p.backlog;
  $('progress-body').innerHTML = `
    <div class="card">
      <div>${p.percent === null ? 'No tasks are tracked yet.' : `<strong>${p.percent}%</strong> complete`}</div>
      ${p.percent !== null ? `<div class="bar" role="img" aria-label="${p.percent} percent of tracked tasks complete"><i style="width:${p.percent}%"></i></div>` : ''}
      <div class="src">Basis: ${esc(p.basis)}</div>
      ${bl ? `<div style="margin-top:10px">Pre-launch backlog: <strong>${bl.done} of ${bl.of}</strong> weeks packaged</div><div class="bar" role="img" aria-label="${bl.done} of ${bl.of} weeks"><i style="width:${Math.round(100 * bl.done / bl.of)}%"></i></div><div class="src">Basis: ${esc(bl.basis)}</div>` : ''}
    </div>
    <div class="board" style="margin-top:12px">${cols}</div>
    <div class="card" style="margin-top:12px"><h3>Handoffs</h3>${p.handoffs.length ? `<ul class="plain">${p.handoffs.map(h => `<li>${esc(h.text)} <span class="src">${esc(h.source)}</span></li>`).join('')}</ul>` : `<p class="empty">${view.coordinationPresent ? 'No handoffs listed in AGENT_COORDINATION.md.' : 'AGENT_COORDINATION.md not found, so no handoffs are tracked.'}</p>`}</div>`;
}

function feedGroup(kind) {
  if (kind.startsWith('file')) return 'file';
  if (kind === 'commit' || kind === 'git-ref') return 'git';
  if (kind.startsWith('pr')) return 'pr';
  if (kind.startsWith('check')) return 'check';
  return 'claim';
}
const KIND_LABEL = { 'file-edit': 'file edit', 'file-removed': 'file removed', commit: 'commit', 'git-ref': 'git refs', 'pr-opened': 'PR opened', 'pr-merged': 'PR merged', 'check-passed': 'check passed', 'check-failed': 'check failed', claim: 'claim', discovery: 'log entry' };

function renderFeed() {
  const filter = $('feed-filter').value;
  const items = view.feed.filter(e => filter === 'all' || feedGroup(e.kind) === filter);
  const ol = $('feed-body');
  if (!items.length) { ol.innerHTML = '<li class="empty" style="display:block">No activity of this kind yet.</li>'; return; }
  ol.innerHTML = items.map(e => {
    const key = `${e.at}|${e.kind}|${e.text}`;
    const isNew = !firstRender && !seenFeed.has(key);
    return `<li class="${isNew ? 'new' : ''}"><time datetime="${esc(e.at)}" title="${esc(e.at)}">${e.dateOnly ? esc(e.at.slice(0, 10)) : esc(stamp(e.at))}</time>
      <div><span class="kind k-${esc(e.kind)}">${esc(KIND_LABEL[e.kind] || e.kind)}</span>${e.agent ? `<strong>${esc(e.agent)}</strong> · ` : ''}<span class="text">${link(e.text, e.url)}</span>${e.ref ? ` <code class="muted">${esc(e.ref)}</code>` : ''}
      <span class="from">${esc(e.source)}</span></div></li>`;
  }).join('');
  view.feed.forEach(e => seenFeed.add(`${e.at}|${e.kind}|${e.text}`));
}
$('feed-filter').addEventListener('change', () => view && renderFeed());

function runLine(r, label) {
  if (!r) return `<li>${esc(label)}: <span class="no">No completed run found</span></li>`;
  const cls = r.conclusion === 'success' ? 'yes' : r.conclusion ? 's-blocked' : 's-ready';
  return `<li>${esc(label)}: <span class="${cls}">${esc(r.conclusion || r.status)}</span> · ${link(r.name, r.url)} · ${esc(r.branch)} @ <code>${esc(r.sha)}</code> · ${esc(stamp(r.at))}</li>`;
}

function renderHealth() {
  const h = view.health, gh = view.connection.github;
  const ci = gh.state === 'disabled' ? '<p class="empty">GitHub is disabled (--no-github), so CI results are not shown.</p>'
    : gh.state === 'error' ? '<p class="empty">CI results unavailable: GitHub could not be reached.</p>'
    : `<ul class="plain">${runLine(h.ci.main, 'Latest CI on main')}${runLine(h.ci.head, `CI for this checkout's HEAD (${h.git?.head || '?'})`)}</ul>
       <details style="margin-top:8px"><summary class="muted">Recent runs</summary><ul class="plain">${h.ci.recent.map(r => runLine(r, r.pr ? `PR #${r.pr}` : r.event)).join('')}</ul></details>`;
  const lc = h.local;
  const local = lc ? `<ul class="plain">${lc.results.map(r => `<li><span class="${r.ok ? 'yes' : 's-blocked'}">${r.ok ? 'passed' : 'failed'}</span> · ${esc(r.name)} · ${(r.ms / 1000).toFixed(1)}s${r.ok ? '' : ` <div class="src">${esc(r.summary || '')}</div>`}</li>`).join('')}</ul>
       <div class="src">Ran ${esc(stamp(lc.finishedAt))} on ${esc(lc.branch)} @ ${esc(lc.head)}${lc.dirty ? ' with uncommitted changes' : ''}. Run again with: node tools/dashboard/run-checks.mjs</div>`
    : '<p class="empty">Not run on this machine yet. Run <code>node tools/dashboard/run-checks.mjs</code> in a terminal to record results here. Viewing this page never runs checks.</p>';
  const rep = h.report;
  const g = h.git;
  $('health-body').innerHTML = `
    <div class="card"><h3>Continuous integration <span class="src">GitHub Actions</span></h3>${ci}</div>
    <div class="card" style="margin-top:12px"><h3>Local checks <span class="src">tools/dashboard/.state/checks.json</span></h3>${local}</div>
    <div class="card" style="margin-top:12px"><h3>Research report <span class="src">validation.json</span></h3>${rep ? `<p>${esc(rep.pages)} pages, ${esc(rep.sources)} sources. Revised ${esc(rep.revised || 'n/a')}. Visual review: ${esc(rep.visualReview || 'not recorded')}.</p>` : '<p class="empty">No validation record found.</p>'}</div>
    <div class="card" style="margin-top:12px"><h3>This checkout <span class="src">local git</span></h3>${g ? `<p>Branch <code>${esc(g.branch)}</code> @ <code>${esc(g.head)}</code> · ${g.workingTree.modified} modified, ${g.workingTree.untracked} untracked file(s)</p><div class="src">${esc(g.note)}</div>` : '<p class="empty">Git information unavailable.</p>'}</div>`;
}

connect();
