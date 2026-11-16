# Agent Coordination Board

## Project goal
Maintain and advance The Daily Nun—a high-rigor, independent publication by Peter Nunley focusing on government, media, culture, and democracy for a high-school and civic audience. Prepare and verify a 4-week pre-launch content backlog, maintain the researched media-democracy report, and maintain the newspaper prototype and studio dashboards under strict third-person editorial voice and anti-slop standards.

## Team and environment
- **Agents**: Antigravity (Gemini), Codex, Claude Code, Cursor.
- **Integration Lead**: Antigravity.
- **Working Directories**: Cloud virtual machines / remote environments with independent git checkouts pushing to GitHub repository `peternunley08-ops/the-daily-nun`.
- **Coordination Method**: This file (`AGENT_COORDINATION.md`), `AGENTS.md`, `DISCOVERIES.md`, GitHub Issues, and focused pull requests prefixed by agent name (`antigravity/`, `codex/`, `claude/`, `cursor/`).

## Task board
| ID | Task | Owner | Status | Files / scope | Dependencies |
|---|---|---|---|---|---|
| T01 | Project OS Learning Loop & Manifest Check | Cursor | Complete | `workflows/project-os/`, `AGENTS.md` | Merged in PR #37 |
| T02 | Backlog Studio clarity & slide image resolution | Codex | Complete | `posts/build-backlog.mjs`, `posts/index.html` | Merged in PR #36 |
| T03 | Report follow-up: Gallup 2026 reading & TikTok JV dates | Antigravity | Complete | `research/media-democracy/` (Ch. 4, 8–10, sources, PDF, review) | Merged in PR #40, #41 |
| T04 | Initialize shared coordination board | Antigravity | Complete | `AGENT_COORDINATION.md` | Merged in PR #42 |
| T05 | Week 1 Reel parity & launch voiceover recording prep | Antigravity | Ready for review | `posts/01-who-picked-this/`, `posts/build-backlog.mjs` | Issue #47 |
| T06 | Future editorial pitches (Weeks 7+) | Select an unclaimed task | Unclaimed | Topic proposals in Issue #2 / `DISCOVERIES.md` | Peter approval |
| T07 | Backlog Studio video player, article links & mobile responsive QA | Antigravity | Complete | `posts/build-backlog.mjs`, `posts/index.html` | Merged in PR #45 |
| T08 | Keep both Gallup URLs and the January 23 TikTok date | Cursor | Complete | `research/media-democracy/` | Merged in PR #43 |
| T09 | Mobile visual QA & headline wrapping on desk articles | Cursor | Complete | `assets/article.css` | Merged in PR #46 |
| T10 | Local read-only project dashboard | Claude Code | Complete | `tools/dashboard/` | Merged in PR #44 |

## Interfaces and shared decisions
- **Voice & Persona**: Strict third-person editorial distance across all social copy, captions, and articles (e.g., "The Daily Nun examined...", "A closer look at..."). Peter Nunley byline is plain (`By Peter Nunley`).
- **Brand Rules**: No nickname branding (`p-nun`, etc.). Single-idea social posts.
- **Backlog Structure**:
  - `posts/01-who-picked-this/` (Week 1, Media Desk)
  - `posts/02-who-is-responsible/` (Week 2, Government Desk)
  - `posts/03-recommendation-or-manipulation/` (Week 3, Culture Desk)
  - `posts/04-the-disappearing-local-beat/` (Week 4, Democracy Desk)
  - `posts/05-who-gets-the-hours/` (Follow-on 5, Government Desk)
  - `posts/06-does-a-streak-help/` (Follow-on 6, Culture Desk)
- **Shared Builders**:
  - `posts/build-post.mjs`: Unified package builder called by each package's `build.mjs`.
  - `posts/build-backlog.mjs`: Compiles the unified Backlog Studio dashboard at `posts/index.html`.
  - `assets/render-article.mjs`: Unified strict Markdown article renderer for all desk articles.
  - `research/media-democracy/tools/build_report.py`: Report PDF compiler supporting `REPORT_FONT_DIR` and Linux/Windows fonts.
  - `research/media-democracy/tools/review_pdf.py`: PDF validator checking character bounds, blank pages, and link annotations.
- **Report sources**: E09 stays the 2025 Gallup URL. E16 is the September 29, 2026 Gallup article. The 6% / 27% split is not used. TikTok O09 uses the January 23, 2026 date printed on the fetched page.

## Handoffs and blockers
- **Antigravity, T05**: Connected `reel.mp4`, `reel-cover.png`, and `voiceover-script.txt` to Week 1 (`posts/01-who-picked-this/`), rebuilt `upload-pack.zip` to 9 files, and updated Backlog Studio and package preview. All 6 packages now have identical slide, reel, caption, and teleprompter parity (dashboard metric: 6 packages, 6 exported, 6 reels).
- **Handoff from T03**: The media and democracy report PDF is rebuilt to 40 pages with verified 2026 Gallup media trust data and clarified TikTok USDS JV dates. Dual PRs #38 and #39 have been cleanly closed.
- **Cursor, T08**: A later HTML fetch of https://usdsjv.tiktok.com/TikTok-USDS-Joint-Venture-LLC-Established did not contain January 22. The merged report uses January 23, 2026 and keeps the 2025 Gallup URL as E09.
- **Active state**: All 6 packages have exported slide PNGs, kinetic reel MP4s, alt text, teleprompter scripts, and `upload-pack.zip`.
- **Blockers**: None. CI is green on GitHub Actions.

## Validation
- `node stories-current-media/build.mjs`: Pass.
- `node instagram-launch/build-launch.mjs`: Pass.
- `node posts/01-who-picked-this/build.mjs` through `06`: Pass.
- `node posts/build-backlog.mjs`: Pass (6 packages compiled).
- `node tools/dashboard/run-checks.mjs`: Pass (11/11 checks).
- `python3 -m unittest workflows/project-os/test_check.py`: Pass (11 tests).
- `node -e '...'` (static link audit): Pass (16 static HTML pages, 0 broken relative links).
- `node -e '...'` (content totals check): 6 packages, 6 exported, 6 reels, 0 scheduled, 0 published.
- `uv run --with-requirements research/media-democracy/requirements.txt python3 research/media-democracy/tools/build_report.py`: Pass (40 pages).
- `uv run --with-requirements research/media-democracy/requirements.txt python3 research/media-democracy/tools/review_pdf.py`: Pass (0 blank pages, 0 out-of-page chars, 161 external links).
