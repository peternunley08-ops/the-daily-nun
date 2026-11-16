#!/usr/bin/env node
// Run this repository's CI checks locally and record the results for the dashboard.
//
//   node tools/dashboard/run-checks.mjs
//
// The command list comes from .github/workflows/content-check.yml, so local runs match CI.
// The builders regenerate committed outputs (caption.txt, article HTML, previews), exactly as CI does.
// Results go to tools/dashboard/.state/checks.json (git-ignored). Only exit codes, durations, and one
// short redacted line per failure are stored. Full logs are printed to this terminal, not the dashboard.
// The dashboard never starts this script; a person runs it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const workflow = fs.readFileSync(path.join(repo, '.github/workflows/content-check.yml'), 'utf8');

/** Pull single-line `node ...` / `python3 ...` commands out of the workflow's run blocks. */
function workflowCommands(yaml) {
  const commands = [];
  const lines = yaml.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)run:\s*(\|)?\s*(.*)$/);
    if (!m) continue;
    if (!m[2]) { if (m[3]) commands.push(m[3].trim()); continue; }
    const indent = (lines[i + 1] || '').match(/^\s*/)[0].length;
    const block = [];
    for (i = i + 1; i < lines.length && (lines[i].trim() === '' || lines[i].match(/^\s*/)[0].length >= indent); i++) block.push(lines[i].slice(indent));
    i--;
    const text = block.join('\n').trim();
    // A multi-line node -e script is one command; otherwise each line is its own command.
    if (/^node -e '/.test(text)) commands.push(text);
    else commands.push(...block.map(l => l.trim()).filter(l => l && !l.startsWith('#')));
  }
  return commands.filter(c => /^(node|python3)\s/.test(c));
}

const SECRET = /(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:token|secret|password|api[_-]?key)\s*[=:]\s*\S+)/gi;
const summarize = text => (String(text).trim().split(/\r?\n/).filter(Boolean).at(-1) || '').replace(SECRET, '[redacted]').slice(0, 200);

const commands = workflowCommands(workflow);
if (!commands.length) { console.error('No node/python3 commands found in content-check.yml'); process.exit(1); }
const git = args => { try { return execFileSync('git', args, { cwd: repo }).toString().trim(); } catch { return '?'; } };
const startedAt = new Date().toISOString();
const results = [];
for (const command of commands) {
  const name = command.startsWith('node -e') ? 'Brand and tone rules (inline script)' : command;
  const t = Date.now();
  const r = spawnSync('bash', ['-c', command], { cwd: repo, encoding: 'utf8', timeout: 300000 });
  const ok = r.status === 0;
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  results.push({ name, ok, ms: Date.now() - t, summary: ok ? '' : summarize(r.stderr || r.stdout || r.error?.message) });
}
const record = {
  startedAt, finishedAt: new Date().toISOString(), branch: git(['rev-parse', '--abbrev-ref', 'HEAD']), head: git(['rev-parse', '--short', 'HEAD']),
  dirty: git(['status', '--porcelain']) !== '', source: '.github/workflows/content-check.yml', results
};
fs.mkdirSync(path.join(here, '.state'), { recursive: true });
fs.writeFileSync(path.join(here, '.state/checks.json'), JSON.stringify(record, null, 2) + '\n');
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed. Recorded for the dashboard.`);
process.exit(failed ? 1 : 0);
