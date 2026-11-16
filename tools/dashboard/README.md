# Local project dashboard

A read-only view of The Daily Nun's publication pipeline and of the agents working on it. It updates live and runs only on your own computer.

## Start

```bash
node tools/dashboard/server.mjs
```

Then open **http://127.0.0.1:4780/**. It needs Node 20 or newer and has no dependencies, so there is nothing to install.

| Option | Effect |
|---|---|
| `--port 4781` | Use another port if 4780 is busy |
| `--no-github` | Local files and git only, with no network calls |
| `--github-interval 120` | Seconds between GitHub refreshes (default 60, minimum 15) |
| `--repo PATH` | Watch a different checkout |

**GitHub rate limit:** without a token, GitHub allows 60 requests an hour. Requests whose data has not changed (HTTP 304, matched by ETag) do not count toward that limit. For a higher limit, start the server with a read-only token, `GITHUB_TOKEN=... node tools/dashboard/server.mjs`. The token stays inside the server process and is never sent to the browser. If GitHub rejects the token, the server carries on without it.

**Behind an HTTPS proxy:** add `NODE_USE_ENV_PROXY=1` so Node's `fetch` uses the proxy.

## What it shows and where it comes from

| Section | Source | Live trigger |
|---|---|---|
| Publication overview | `posts/*/post.json` and files on disk (slides, `reel.mp4`, `upload-pack.zip`), `instagram-launch/metrics.csv`, `research/media-democracy/validation.json` | File watcher |
| Agent activity | GitHub Issue claims (self-reported), the `AGENT_COORDINATION.md` task board (self-reported), agent-prefixed branches and PRs (inferred) | File watcher and GitHub poll |
| Project progress | GitHub Issues plus board rows that have no Issue; each status names its basis | File watcher and GitHub poll |
| Live activity | File edits in this checkout, local commits and ref changes, PRs opened and merged, CI conclusions, claims, and `DISCOVERIES.md` headings. Each item is labelled with its kind and source | File watcher and GitHub poll |
| Project health | GitHub Actions runs (with commit), the local check record, report validation, and the working-tree state | GitHub poll and file watcher |

Audience metrics are marked **Not connected** because no Instagram or site analytics are connected. Revenue is marked **Not applicable**. Nothing is estimated.

**Agent presence:** the dashboard has no telemetry from agents, so it never shows an agent as online or active. "Last update" means the latest claim, branch push, or PR update it can see. A card turns **stale** after 24 hours with no update.

**Other checkouts:** other agents work in their own checkouts. Their work becomes visible here only after they push to GitHub, and their remote branches appear only after you run `git fetch`. The dashboard never fetches, pulls, or pushes.

## Recording check results

Viewing the dashboard never runs builds or tests. To record local results, run:

```bash
node tools/dashboard/run-checks.mjs
```

It runs the same `node` and `python3` commands as `.github/workflows/content-check.yml`; like CI, the builders regenerate their output files. It records pass or fail, duration, branch, commit, and one short redacted line per failure in `tools/dashboard/.state/checks.json`, which Git ignores. The dashboard picks up the result automatically.

## Safety

- Binds to `127.0.0.1` only and rejects requests whose `Host` header names any other host.
- Serves `GET` only and contains no code that writes to the repository, runs shell commands from requests, or changes GitHub.
- Sends a strict Content-Security-Policy, and the page escapes all repository text before display.
- Never sends tokens, environment variables, file contents, or full logs to the browser.

To share the dashboard on your network, edit `opts.host` in `server.mjs` deliberately. Nothing in the dashboard does this for you.
