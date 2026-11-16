#!/usr/bin/env node
// The Daily Nun local project dashboard.
//
//   node tools/dashboard/server.mjs            -> http://127.0.0.1:4780/
//
// Options: --port N   --repo PATH   --github owner/name   --github-interval SECONDS   --no-github
// Optional: GITHUB_TOKEN in the environment raises the GitHub rate limit. It stays in this process.
//
// Read-only by design: it serves GET requests only, binds to 127.0.0.1, rejects other Host headers,
// never runs builds or tests, and never writes to the repository or to GitHub.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AGENTS, STALE_HOURS, agentFrom, parseCoordination, collectGit, collectContent, collectDiscoveries, GitHubReader } from './collect.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = { port: 4780, host: '127.0.0.1', repo: path.resolve(here, '../..'), github: null, interval: 60, useGithub: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--port') opts.port = Number(next());
    else if (a === '--repo') opts.repo = path.resolve(next());
    else if (a === '--github') opts.github = next();
    else if (a === '--github-interval') opts.interval = Math.max(15, Number(next()));
    else if (a === '--no-github') opts.useGithub = false;
    else if (a === '--help' || a === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^#!.*\n/, '').replace(/^\/\/ ?/gm, '')); process.exit(0); }
    else throw new Error(`Unknown option ${a}`);
  }
  if (!Number.isInteger(opts.port) || opts.port < 1 || opts.port > 65535) throw new Error('--port must be 1-65535');
  if (!opts.github) {
    try {
      const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: opts.repo }).toString().trim();
      const m = url.replace(/\.git$/, '').match(/([^/:]+)\/([^/:]+)$/);
      if (m) opts.github = `${m[1]}/${m[2]}`;
    } catch { /* no remote */ }
  }
  if (opts.github && !/^[\w.-]+\/[\w.-]+$/.test(opts.github)) throw new Error('--github must look like owner/name');
  return opts;
}

const log = (...args) => console.log(new Date().toISOString(), ...args);

// ---------- state ----------
const opts = parseArgs(process.argv.slice(2));
const state = {
  startedAt: new Date().toISOString(), repo: path.basename(opts.repo), github: opts.github,
  local: null, localSyncedAt: null, localError: null,
  remote: null, remoteState: opts.useGithub && opts.github ? 'loading' : 'disabled', remoteError: null, remoteSyncedAt: null,
  fileEvents: [], localChecks: null
};
const reader = opts.useGithub && opts.github ? new GitHubReader(opts.github, process.env.GITHUB_TOKEN || null) : null;
const clients = new Set();
let version = 0;

// Paths that never count as project activity.
const IGNORE = [/(^|\/)node_modules(\/|$)/, /(^|\/)\.git\//, /(^|\/)__pycache__(\/|$)/, /(^|\/)\.(venv|cache|gstack)(\/|$)/, /(^|\/)(dist|build|out|coverage)\//,
  /(^|\/)\.export-[^/]*(\/|$)/, /^tools\/dashboard\/\.state(\/|$)/, /\.(log|swp|tmp)$/, /~$/, /(^|\/)\.DS_Store$/, /^\.claude\/skills\/peter-project-os\//];
const GIT_SIGNALS = /^\.git\/(HEAD|ORIG_HEAD|FETCH_HEAD|packed-refs|refs\/.+)$/;

function readText(rel) { try { return fs.readFileSync(path.join(opts.repo, rel), 'utf8'); } catch { return null; } }

function readLocalChecks() {
  try { return JSON.parse(fs.readFileSync(path.join(here, '.state/checks.json'), 'utf8')); } catch { return null; }
}

async function refreshLocal(reason) {
  try {
    const [git] = await Promise.all([collectGit(opts.repo)]);
    const coordinationText = readText('AGENT_COORDINATION.md');
    const coordination = parseCoordination(coordinationText);
    state.local = {
      git, content: collectContent(opts.repo), discoveries: collectDiscoveries(opts.repo),
      coordination: { present: coordinationText !== null, ...coordination }
    };
    state.localChecks = readLocalChecks();
    state.localSyncedAt = new Date().toISOString(); state.localError = null;
  } catch (err) {
    state.localError = err.message; log('local refresh failed:', err.message);
  }
  publish(reason);
}

async function refreshRemote() {
  if (!reader) return;
  try {
    state.remote = await reader.collect();
    state.remoteState = 'connected'; state.remoteError = null; state.remoteSyncedAt = reader.lastSync;
  } catch (err) {
    state.remoteState = state.remote ? 'stale' : 'error'; state.remoteError = err.message; log('GitHub refresh failed:', err.message);
  }
  publish('github');
}

// ---------- derived view ----------
const hoursSince = iso => iso ? (Date.now() - Date.parse(iso)) / 3600e3 : Infinity;
const latest = list => list.filter(Boolean).sort().at(-1) || null;

function buildView() {
  const local = state.local || {}, remote = state.remote || {};
  const ghTasks = remote.tasks || [];
  const boardTasks = local.coordination?.tasks || [];
  const branches = local.git?.branches || [];

  // Tasks: GitHub Issues first; board rows add tasks that have no Issue.
  const tasks = [...ghTasks];
  for (const row of boardTasks) {
    const match = row.id && tasks.find(t => t.id === row.id);
    if (match) { match.board = row; continue; }
    tasks.push({ id: row.id || '-', task: row.task, owner: row.owner, owners: [row.owner], status: row.status, statusText: row.statusText,
      basis: 'Self-reported on the AGENT_COORDINATION.md task board', dependencies: row.dependencies, scope: row.scope, prs: [], claims: [],
      lastUpdate: null, stale: false, source: row.source });
  }

  // File-scope conflicts on the board: the same path claimed by two owners with unfinished work.
  const conflicts = [];
  const scopeOwners = new Map();
  for (const row of boardTasks.filter(r => r.status !== 'complete')) {
    for (const p of row.scope.split(/[,;]\s*/).map(s => s.replace(/`/g, '').trim()).filter(Boolean)) {
      const owners = scopeOwners.get(p) || new Set(); owners.add(row.owner); scopeOwners.set(p, owners);
    }
  }
  for (const [p, owners] of scopeOwners) if (owners.size > 1) conflicts.push({ kind: 'file', what: p, owners: [...owners], source: 'AGENT_COORDINATION.md' });
  for (const t of ghTasks.filter(t => t.conflict)) conflicts.push({ kind: 'issue', what: `${t.id} ${t.task}`, owners: t.owners, url: t.url, source: 'GitHub Issue claims' });

  const agents = AGENTS.map(name => {
    const mine = tasks.filter(t => t.owner === name && t.status !== 'complete');
    const claimed = ghTasks.filter(t => t.owners?.includes(name) && t.status !== 'complete');
    const team = (local.coordination?.team || []).find(m => m.name === name);
    const agentBranches = branches.filter(b => b.agent === name);
    const prs = (remote.prs || []).filter(p => p.agent === name);
    const openPrs = prs.filter(p => p.state === 'open');
    const claimTimes = (remote.claimEvents || []).filter(c => c.agent === name).map(c => c.at);
    const lastUpdate = latest([...claimTimes, ...agentBranches.map(b => b.date), ...prs.map(p => p.updatedAt)]);
    const current = mine[0] || claimed[0] || null;
    const allTasks = [...new Map([...mine, ...claimed].map(t => [t.id + t.task, t])).values()];
    return {
      name, note: team?.note || null,
      tasks: allTasks.map(t => ({ id: t.id, task: t.task, url: t.url, status: t.status, basis: t.basis, scope: t.scope || t.board?.scope || '', dependencies: t.dependencies || t.board?.dependencies || '', conflict: !!t.conflict })),
      status: current ? current.status : (openPrs.length ? 'ready for review' : 'idle'),
      statusBasis: current ? current.basis : (openPrs.length ? 'Inferred: an open pull request from its branch' : 'Inferred: no open claim found'),
      selfReported: !!current && /self-reported/i.test(current.basis || ''),
      branches: agentBranches.slice(0, 3), openPrs: openPrs.map(p => ({ number: p.number, title: p.title, url: p.url })),
      lastUpdate, stale: !!lastUpdate && hoursSince(lastUpdate) > STALE_HOURS,
      presence: 'unknown'
    };
  });

  // Activity feed, newest first. Every item names its source and kind.
  const feed = [];
  for (const e of state.fileEvents) feed.push(e);
  for (const c of (local.git?.commits || []).slice(0, 25)) feed.push({ at: c.date, kind: 'commit', agent: c.agent, text: c.subject, ref: c.sha, source: 'local git log (all fetched refs)' });
  for (const p of remote.prs || []) {
    feed.push({ at: p.createdAt, kind: 'pr-opened', agent: p.agent, text: `PR #${p.number} opened: ${p.title}`, url: p.url, source: 'GitHub pull requests' });
    if (p.mergedAt) feed.push({ at: p.mergedAt, kind: 'pr-merged', agent: p.agent, text: `PR #${p.number} merged: ${p.title}`, url: p.url, source: 'GitHub pull requests' });
  }
  for (const r of remote.checks || []) if (r.conclusion) feed.push({ at: r.at, kind: r.conclusion === 'success' ? 'check-passed' : 'check-failed', agent: agentFrom(r.branch + '/'), text: `${r.name}: ${r.conclusion} on ${r.branch} @ ${r.sha}`, url: r.url, source: 'GitHub Actions' });
  for (const c of remote.claimEvents || []) feed.push({ at: c.at, kind: 'claim', agent: c.agent, text: `${c.agent} posted a claim on ${c.task} (status: ${c.status})`, source: 'GitHub Issue comments (self-reported)' });
  for (const d of (local.discoveries || []).slice(-8)) feed.push({ at: `${d.date}T00:00:00Z`, dateOnly: true, kind: 'discovery', agent: d.agent, text: d.title, source: 'DISCOVERIES.md (dated by day)' });
  feed.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  // Progress groups and an explicit-basis percentage.
  const groups = { upcoming: [], working: [], blocked: [], 'ready for review': [], complete: [] };
  for (const t of tasks) (groups[t.status] || groups.upcoming).push({ id: t.id, task: t.task, url: t.url, owner: t.owner, basis: t.basis, dependencies: t.dependencies || t.board?.dependencies || '', prs: t.prs, stale: t.stale, conflict: t.conflict, statusText: t.statusText });
  const tracked = tasks.length;
  const done = groups.complete.length;

  // Health: CI runs (real, from GitHub), local checks (only when someone ran run-checks.mjs), report validation.
  const runs = remote.checks || [];
  const mainRun = runs.find(r => r.branch === 'main' && r.status === 'completed') || null;
  const headSha = local.git?.head;
  const branchRun = runs.find(r => headSha && r.sha.startsWith(headSha.slice(0, 7))) || null;

  return {
    version, generatedAt: new Date().toISOString(), staleHours: STALE_HOURS,
    connection: {
      local: { state: state.localError ? 'error' : state.local ? 'connected' : 'loading', syncedAt: state.localSyncedAt, error: state.localError, watching: watcherState },
      github: { state: state.remoteState, syncedAt: state.remoteSyncedAt, error: state.remoteError, repo: opts.github, intervalSeconds: opts.interval, rate: remote.rate || null, authenticated: !!(reader && reader.token), tokenRejected: !!reader?.tokenRejected }
    },
    business: local.content ? { ...local.content, report: local.content.report } : null,
    agents, conflicts,
    progress: {
      groups, tracked, done,
      percent: tracked ? Math.round(100 * done / tracked) : null,
      basis: `${done} of ${tracked} tracked tasks are complete. Tracked = open GitHub Issues, Issues closed in the last 14 days, and rows on the AGENT_COORDINATION.md task board without an Issue.`,
      backlog: local.content ? { done: new Set(local.content.stories.filter(s => s.week >= 1 && s.week <= 4 && s.slidesExported && s.uploadPack).map(s => s.week)).size, of: 4, basis: 'Backlog weeks 1-4 whose carousel images and upload pack exist on disk.' } : null,
      handoffs: (local.coordination?.handoffs || [])
    },
    feed: feed.slice(0, 60),
    health: {
      ci: { main: mainRun, head: branchRun, recent: runs.slice(0, 8) },
      local: state.localChecks,
      report: local.content?.report || null,
      git: local.git ? { branch: local.git.branch, head: local.git.head, workingTree: local.git.workingTree, note: local.git.note } : null
    },
    coordinationPresent: !!local.coordination?.present
  };
}

// ---------- push to browsers ----------
let publishTimer = null;
function publish(reason) {
  clearTimeout(publishTimer);
  publishTimer = setTimeout(() => {
    version++;
    const payload = `id: ${version}\nevent: snapshot\ndata: ${JSON.stringify(buildView())}\n\n`;
    for (const res of clients) res.write(payload);
    if (reason) log(`update #${version} (${reason}) -> ${clients.size} viewer(s)`);
  }, 120);
}

// ---------- file watching ----------
let watcherState = 'starting';
const pending = new Map();
let fileTimer = null;
function onFsEvent(rel) {
  if (!rel) return;
  rel = rel.split(path.sep).join('/');
  if (GIT_SIGNALS.test(rel)) { pending.set('.git', 'git'); }
  else if (IGNORE.some(re => re.test(rel))) return;
  else pending.set(rel, 'file');
  clearTimeout(fileTimer);
  fileTimer = setTimeout(flushFsEvents, 400);
}
function flushFsEvents() {
  const at = new Date().toISOString();
  const files = [...pending].filter(([, k]) => k === 'file').map(([p]) => p);
  const gitChanged = pending.has('.git');
  pending.clear();
  for (const f of files.slice(0, 20)) {
    const exists = fs.existsSync(path.join(opts.repo, f));
    state.fileEvents.unshift({ at, kind: exists ? 'file-edit' : 'file-removed', agent: null, text: f, source: 'local file watcher (this checkout)' });
  }
  if (files.length > 20) state.fileEvents.unshift({ at, kind: 'file-edit', agent: null, text: `…and ${files.length - 20} more files`, source: 'local file watcher (this checkout)' });
  if (gitChanged) state.fileEvents.unshift({ at, kind: 'git-ref', agent: null, text: 'Local git HEAD or refs changed (commit, checkout, merge, or fetch)', source: 'local file watcher (.git refs)' });
  state.fileEvents = state.fileEvents.slice(0, 40);
  refreshLocal(gitChanged ? 'git refs changed' : `${files.length} file(s) changed`);
}
function startWatching() {
  try {
    const w = fs.watch(opts.repo, { recursive: true }, (_type, name) => onFsEvent(name));
    w.on('error', err => { watcherState = 'error'; log('watcher error:', err.message); publish('watcher error'); });
    watcherState = 'recursive';
  } catch (err) {
    // Fallback where recursive watching is unsupported: watch key paths only.
    watcherState = 'partial';
    for (const rel of ['', 'posts', 'desks', '.git', '.git/refs/heads', 'tools/dashboard/.state']) {
      try { fs.watch(path.join(opts.repo, rel), (_t, name) => onFsEvent(name ? path.join(rel, name) : rel)); } catch { /* path absent */ }
    }
    log('recursive fs.watch unavailable; watching key paths only:', err.message);
  }
}

// ---------- HTTP ----------
const STATIC = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/app.css': ['app.css', 'text/css; charset=utf-8'] };
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'cache-control': 'no-store'
};

const server = http.createServer((req, res) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host !== `127.0.0.1:${opts.port}` && host !== `localhost:${opts.port}`) { res.writeHead(421, SECURITY_HEADERS); return res.end('Misdirected request'); }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { ...SECURITY_HEADERS, allow: 'GET, HEAD' }); return res.end('This dashboard is read-only.'); }
  const url = new URL(req.url, `http://${host}`);
  if (STATIC[url.pathname]) {
    const [file, type] = STATIC[url.pathname];
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': type });
    return res.end(fs.readFileSync(path.join(here, 'public', file)));
  }
  if (url.pathname === '/api/state') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(buildView()));
  }
  if (url.pathname === '/events') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': 'text/event-stream; charset=utf-8', connection: 'keep-alive' });
    res.write(`retry: 3000\nid: ${version}\nevent: snapshot\ndata: ${JSON.stringify(buildView())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  res.writeHead(404, SECURITY_HEADERS); res.end('Not found');
});

setInterval(() => { for (const res of clients) res.write(`event: ping\ndata: ${Date.now()}\n\n`); }, 15000).unref();

server.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${opts.port} is in use. Stop the other process or start with --port ${opts.port + 1}.`);
  else console.error(err.message);
  process.exit(1);
});

server.listen(opts.port, opts.host, async () => {
  log(`The Daily Nun dashboard: http://${opts.host}:${opts.port}/  (read-only, local only)`);
  log(`repo: ${opts.repo}`);
  log(reader ? `GitHub: ${opts.github}, polled every ${opts.interval}s${reader.token ? ' with GITHUB_TOKEN' : ' without a token (60 requests/hour limit; ETag reuse keeps it low)'}` : 'GitHub: disabled');
  startWatching();
  await refreshLocal('startup');
  if (reader) { await refreshRemote(); setInterval(refreshRemote, opts.interval * 1000).unref(); }
  setInterval(() => publish(null), 60000).unref(); // re-evaluates stale flags even when nothing changes
});
