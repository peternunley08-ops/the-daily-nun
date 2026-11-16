// Data collectors for the local project dashboard. Read-only: nothing here writes to the repository,
// runs builds, or changes anything on GitHub. Every value carries its source so the UI can label it.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

export const AGENTS = ['Claude Code', 'Codex', 'Cursor', 'Antigravity'];
const AGENT_PATTERNS = [
  ['Claude Code', /\bclaude(?: code)?\b|^claude\//i],
  ['Codex', /\bcodex\b|^codex\//i],
  ['Cursor', /\bcursor\b|^cursor\//i],
  ['Antigravity', /\bantigravity\b|\bgemini\b|^antigravity\//i]
];
export const STALE_HOURS = 24;

/** Map free text (a branch name, claim line, or commit trailer) to a known agent, or null. */
export function agentFrom(text) {
  if (!text) return null;
  for (const [name, pattern] of AGENT_PATTERNS) if (pattern.test(text)) return name;
  return null;
}

/** Normalise a self-reported status string to one of the dashboard's four states. */
export function normaliseStatus(text) {
  const s = String(text || '').toLowerCase();
  if (/\bblock/.test(s) || /awaiting|waiting on|needs (?:peter|permission|authori)/.test(s)) return 'blocked';
  if (/ready for review|in review|draft pr|pr open/.test(s)) return 'ready for review';
  if (/\b(complete|completed|done|merged|closed|delivered)\b/.test(s)) return 'complete';
  if (/unclaimed|unassigned|not started|todo|to do|planned/.test(s)) return 'upcoming';
  if (/in progress|working|claimed|started|underway/.test(s)) return 'working';
  return null;
}

/**
 * Read claims from an issue body or comment. Recognises this repo's conventions:
 * "Agent owner: Codex. Status: in progress." and "Claimed by Antigravity." / "**Claimed by Claude Code ...".
 */
export function parseClaim(text) {
  const plain = String(text || '').replace(/\*\*/g, '');
  const owner = plain.match(/Agent owner:\s*([^.\n(]+)/i) || plain.match(/Claimed by\s+([^.\n(,]+)/i) || plain.match(/Taken over by\s+([^.\n(,]+)/i) || plain.match(/Reassigned to\s+([^.\n(,]+)/i);
  if (!owner) return null;
  const agent = agentFrom(owner[1]) || owner[1].trim();
  const statusLine = plain.match(/Status:\s*([^\n]+)/i);
  const status = normaliseStatus(statusLine ? statusLine[1] : '') || normaliseStatus(plain.slice(0, 400)) || 'working';
  return { agent, status, statusText: statusLine ? statusLine[1].trim().slice(0, 140) : null };
}

/** Parse the markdown task board in AGENT_COORDINATION.md. Returns [] if the file or table is absent. */
export function parseCoordination(markdown) {
  if (!markdown) return { tasks: [], team: [], handoffs: [] };
  const lines = markdown.split(/\r?\n/);
  const tasks = [];
  let inBoard = false, header = null;
  for (const line of lines) {
    if (/^##\s+Task board/i.test(line)) { inBoard = true; header = null; continue; }
    if (inBoard && /^##\s/.test(line)) inBoard = false;
    if (!inBoard || !line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    if (!header) { header = cells.map(c => c.toLowerCase()); continue; }
    if (cells.every(c => /^:?-+:?$/.test(c))) continue;
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
    if (!row.task) continue;
    tasks.push({
      id: row.id || '', task: row.task, owner: agentFrom(row.owner) || (!row.owner || /unclaimed|unassigned|select an/i.test(row.owner) ? 'Unassigned' : row.owner),
      status: normaliseStatus(row.status) || (row.status ? row.status.toLowerCase() : 'upcoming'),
      statusText: row.status, scope: row['files / scope'] || row.scope || '', dependencies: row.dependencies || '',
      source: 'AGENT_COORDINATION.md (self-reported)'
    });
  }
  const team = [];
  const teamSection = markdown.split(/^##\s+Team and environment/im)[1];
  if (teamSection) for (const line of teamSection.split(/^##\s/m)[0].split(/\r?\n/)) {
    const m = line.match(/^-\s*\*?\*?([^:*]+?)\*?\*?:\s*(.+)/);
    if (m) team.push({ name: agentFrom(m[1]) || m[1].trim(), note: m[2].trim() });
  }
  const handoffs = [];
  const handoffSection = markdown.split(/^##\s+Handoffs/im)[1];
  if (handoffSection) for (const line of handoffSection.split(/^##\s/m)[0].split(/\r?\n/)) {
    const m = line.match(/^-\s+(.+)/);
    if (m && !/^_?none/i.test(m[1])) handoffs.push({ text: m[1].replace(/\*\*/g, '').trim().slice(0, 240), agent: agentFrom(m[1]), source: 'AGENT_COORDINATION.md (self-reported)' });
  }
  return { tasks, team, handoffs };
}

function run(cmd, args, cwd, timeout = 8000) {
  return new Promise(resolve => {
    execFile(cmd, args, { cwd, timeout, maxBuffer: 4_000_000 }, (err, stdout) => resolve(err ? null : String(stdout)));
  });
}

const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const exists = file => { try { return fs.statSync(file).isFile(); } catch { return false; } };

/** Local git state: branch, HEAD, working-tree counts (never contents), recent commits across refs. */
export async function collectGit(repo) {
  const [branch, head, status, log, remotes] = await Promise.all([
    run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repo),
    run('git', ['rev-parse', '--short', 'HEAD'], repo),
    run('git', ['status', '--porcelain=v1'], repo),
    run('git', ['log', '--all', '-40', '--date=iso-strict', '--format=%h%x1f%cI%x1f%s%x1f%D%x1f%(trailers:key=Co-Authored-By,valueonly,separator=%x2C)'], repo),
    run('git', ['for-each-ref', '--sort=-committerdate', '--format=%(refname:short)%1f%(committerdate:iso-strict)%1f%(objectname:short)', 'refs/remotes/origin'], repo)
  ]);
  if (branch === null) return { available: false, reason: 'Not a git repository or git is not installed' };
  const changes = (status || '').split('\n').filter(Boolean);
  const commits = (log || '').split('\n').filter(Boolean).map(l => {
    const [sha, date, subject, refs, trailer] = l.split('\x1f');
    return { sha, date, subject, refs, agent: agentFrom(trailer) || agentFrom(refs) || null };
  });
  const branches = (remotes || '').split('\n').filter(Boolean).map(l => {
    const [ref, date, sha] = l.split('\x1f');
    const name = ref.replace(/^origin\//, '');
    return { name, date, sha, agent: agentFrom(name.split('/')[0] + '/') };
  }).filter(b => b.name !== 'HEAD' && b.name !== 'origin');
  return {
    available: true, branch: branch.trim(), head: (head || '').trim(),
    workingTree: { modified: changes.filter(c => !c.startsWith('??')).length, untracked: changes.filter(c => c.startsWith('??')).length },
    commits, branches,
    note: 'Remote branches are as of the last `git fetch` in this checkout. The dashboard never fetches, pulls, or pushes.'
  };
}

/** Content pipeline from post packages: what the publication has drafted, exported, and published. */
export function collectContent(repo) {
  const postsDir = path.join(repo, 'posts');
  let folders = [];
  try { folders = fs.readdirSync(postsDir, { withFileTypes: true }).filter(e => e.isDirectory() && /^\d\d-/.test(e.name)).map(e => e.name).sort(); } catch { /* none */ }
  const stories = folders.map(folder => {
    const dir = path.join(postsDir, folder);
    const post = readJson(path.join(dir, 'post.json'));
    if (!post) return null;
    const pageUrl = post.articleUrl || post.reportUrl || '';
    const articleRel = pageUrl.includes('.github.io/the-daily-nun/') ? decodeURIComponent(pageUrl.split('.github.io/the-daily-nun/')[1].split('#')[0]) : null;
    const slides = (post.slides || []).length || (Array.isArray(post.media) ? post.media.length : 0);
    const pngs = fs.readdirSync(dir).filter(f => /^slide-\d\d\.png$/.test(f)).length + (Array.isArray(post.media) ? post.media.filter(m => exists(path.join(repo, m))).length : 0);
    return {
      folder, week: post.week ?? null, title: post.title || folder, desk: post.desk || '',
      sources: (post.sources || []).length,
      article: articleRel ? exists(path.join(repo, articleRel)) : null,
      slides, slidesExported: slides ? pngs >= slides : false,
      uploadPack: exists(path.join(dir, 'upload-pack.zip')),
      reel: post.reel ? (exists(path.join(dir, 'reel.mp4')) ? 'exported' : 'script only') : 'none',
      scheduledAt: post.scheduledAt || null, publishedAt: post.publishedAt || null
    };
  }).filter(Boolean);
  const metricsCsv = (() => { try { return fs.readFileSync(path.join(repo, 'instagram-launch/metrics.csv'), 'utf8'); } catch { return null; } })();
  let observations = null;
  if (metricsCsv !== null) {
    const rows = metricsCsv.trim().split(/\r?\n/).slice(1);
    observations = rows.filter(r => r.split(',').slice(1, 7).some(c => c.trim() !== '')).length;
  }
  const report = readJson(path.join(repo, 'research/media-democracy/validation.json'));
  return {
    name: 'The Daily Nun', tagline: 'A closer look at the world.',
    stories,
    totals: {
      packages: stories.length,
      exported: stories.filter(s => s.slidesExported && s.uploadPack).length,
      reels: stories.filter(s => s.reel === 'exported').length,
      scheduled: stories.filter(s => s.scheduledAt).length,
      published: stories.filter(s => s.publishedAt).length
    },
    report: report ? { pages: report.pages, sources: report.distinct_sources, revised: report.revised || report.compiled, visualReview: report.visual_review } : null,
    audience: {
      instagram: observations === null ? { state: 'not connected', note: 'No metrics file found.' }
        : { state: observations ? 'recorded' : 'no data', note: observations ? `${observations} post(s) with recorded observations in instagram-launch/metrics.csv` : 'instagram-launch/metrics.csv exists but has no recorded observations. No Instagram account is connected.' },
      siteTraffic: { state: 'not connected', note: 'GitHub Pages provides no analytics, and none is installed.' },
      revenue: { state: 'not applicable', note: 'This project has no sales, subscriptions, or ads.' }
    },
    source: 'posts/*/post.json, files on disk, instagram-launch/metrics.csv, research/media-democracy/validation.json'
  };
}

/** Recent dated entries in DISCOVERIES.md (headings only; bodies are not sent to the browser). */
export function collectDiscoveries(repo) {
  let text = '';
  try { text = fs.readFileSync(path.join(repo, 'DISCOVERIES.md'), 'utf8'); } catch { return []; }
  return [...text.matchAll(/^#{2,3}\s+(\d{4}-\d{2}-\d{2}):?\s*(.+)$/gm)].map(m => ({
    date: m[1], title: m[2].trim().slice(0, 160), agent: agentFrom(m[2])
  }));
}

/** GitHub reader with ETag caching. Unchanged (304) answers do not count against the rate limit. */
export class GitHubReader {
  constructor(repoSlug, token = null, fetchImpl = globalThis.fetch) {
    this.slug = repoSlug; this.token = token; this.fetch = fetchImpl;
    this.cache = new Map(); this.rate = null; this.lastError = null; this.lastSync = null;
  }
  async get(pathname) {
    const url = `https://api.github.com/repos/${this.slug}${pathname}`;
    const cached = this.cache.get(url);
    const headers = { accept: 'application/vnd.github+json', 'user-agent': 'daily-nun-local-dashboard' };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (cached?.etag) headers['if-none-match'] = cached.etag;
    const res = await this.fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining !== null) this.rate = { remaining: Number(remaining), limit: Number(res.headers.get('x-ratelimit-limit')), reset: Number(res.headers.get('x-ratelimit-reset')) * 1000 };
    if (res.status === 304 && cached) return cached.data;
    if (res.status === 401 && this.token) {
      // A token that GitHub rejects should not take the dashboard down; public data is readable without one.
      this.token = null; this.tokenRejected = true;
      return this.get(pathname);
    }
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${pathname}${res.status === 403 && this.rate?.remaining === 0 ? ' (rate limit reached)' : ''}`);
    const data = await res.json();
    this.cache.set(url, { etag: res.headers.get('etag'), data });
    return data;
  }

  /** Issues (as tasks), their claims, PRs, and CI runs. */
  async collect() {
    const [issues, pulls, runs] = await Promise.all([
      this.get('/issues?state=all&per_page=30&sort=updated'),
      this.get('/pulls?state=all&per_page=20&sort=updated&direction=desc'),
      this.get('/actions/runs?per_page=20')
    ]);
    const realIssues = issues.filter(i => !i.pull_request);
    const tasks = [];
    for (const issue of realIssues) {
      const recent = issue.state === 'open' || Date.now() - Date.parse(issue.closed_at || issue.updated_at) < 14 * 864e5;
      if (!recent) continue;
      const comments = issue.comments ? await this.get(`/issues/${issue.number}/comments?per_page=50`) : [];
      const claims = [];
      const bodyClaim = parseClaim(issue.body);
      if (bodyClaim) claims.push({ ...bodyClaim, at: issue.created_at, via: 'issue description' });
      for (const c of comments) {
        const claim = parseClaim(c.body);
        if (claim) claims.push({ ...claim, at: c.created_at, via: 'issue comment' });
      }
      const titleAgent = agentFrom((issue.title.match(/^\[([^\]]+)\]/) || [])[1]);
      const linked = pulls.filter(p => new RegExp(`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${issue.number}\\b`, 'i').test(p.body || ''));
      const owners = [...new Set(claims.map(c => c.agent))];
      const latest = claims.at(-1);
      let status, basis;
      if (issue.state === 'closed') { status = 'complete'; basis = 'Issue closed on GitHub'; }
      else if (linked.some(p => p.state === 'open')) { status = 'ready for review'; basis = 'An open pull request references it'; }
      else if (latest) { status = latest.status; basis = `Self-reported in the latest ${latest.via}`; }
      else { status = 'upcoming'; basis = 'No claim recorded'; }
      const lastUpdate = [issue.updated_at, ...linked.map(p => p.updated_at)].sort().at(-1);
      tasks.push({
        id: `#${issue.number}`, task: issue.title.replace(/^\[[^\]]+\]\s*/, ''), url: issue.html_url,
        owner: latest?.agent || titleAgent || 'Unassigned', owners, conflict: issue.state === 'open' && owners.length > 1,
        claims: claims.map(c => ({ agent: c.agent, status: c.status, at: c.at, via: c.via })),
        status, basis, statusText: latest?.statusText || null,
        prs: linked.map(p => ({ number: p.number, title: p.title, state: p.merged_at ? 'merged' : p.state, draft: p.draft, url: p.html_url, branch: p.head?.ref })),
        lastUpdate, stale: issue.state === 'open' && Date.now() - Date.parse(lastUpdate) > STALE_HOURS * 3600e3,
        source: 'GitHub Issues (claims are self-reported in issue text)'
      });
    }
    const prs = pulls.map(p => ({
      number: p.number, title: p.title, url: p.html_url, branch: p.head?.ref, agent: agentFrom(p.head?.ref + '/'),
      state: p.merged_at ? 'merged' : p.state, draft: p.draft, createdAt: p.created_at, mergedAt: p.merged_at, closedAt: p.closed_at, updatedAt: p.updated_at
    }));
    const checks = runs.workflow_runs.map(r => ({
      name: r.name, branch: r.head_branch, sha: r.head_sha.slice(0, 7), event: r.event,
      status: r.status, conclusion: r.conclusion, at: r.updated_at, url: r.html_url,
      pr: (r.pull_requests || [])[0]?.number ?? null
    }));
    const comments = [];
    for (const t of tasks) for (const c of t.claims) comments.push({ at: c.at, agent: c.agent, task: t.id, status: c.status });
    this.lastSync = new Date().toISOString(); this.lastError = null;
    return { tasks, prs, checks, claimEvents: comments, rate: this.rate, syncedAt: this.lastSync };
  }
}
