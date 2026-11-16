# Agent coordination

Shared task board for agents working in this repository. `DISCOVERIES.md` remains the record of research decisions. This file records who is editing what.

## Project goal

Correct the published research report for Issue #20: keep Gallup's 2025 28% reading as the prior low, add the 2026 33% reading, and date the TikTok USDS page January 23, 2026. The latest coordination prompt did not add a new product goal.

## Team and environment

- Cursor: this checkout, branch `cursor/gallup-tiktok-dates-93f3`, pull request #39. Separate checkout from other agents. Integration lead: not assigned.
- Codex claimed Issue #20 in comments, then stopped because gstack `/browse` was unavailable. Peter authorized this machine's web tools for those two pages.
- Codex also owns Issue #35. Do not edit the site or backlog files named there.
- Pull request #37, the Project OS learning loop, merged to `main` on November 15, 2026 (Pacific).
- This file is on the report branch until that pull request merges. Agents on other branches will not see it until then.

## Task board

| ID | Task | Owner | Status | Files / scope | Dependencies |
|----|------|-------|--------|---------------|--------------|
| 20 | Gallup 2026 figure and TikTok date | Cursor | ready for review | `research/media-democracy/`, `DISCOVERIES.md` | Pull request #39. Pull request #40 already merged a parallel edit. |
| 20-merge | Keep both Gallup URLs and the January 23 TikTok date | Cursor | ready for review | `DISCOVERIES.md`, report sources | HTML re-fetch on November 15, 2026 (Pacific) shows January 23 and `publishDate` `2026-01-23`. |
| 35 | Site and backlog studio | Codex | owned elsewhere | `posts/build-backlog.mjs`, `posts/index.html`, `index.html`, selected post metadata, `README.md` | Do not edit from this branch. |
| os | Project OS learning loop | Cursor, earlier pass | merged | `workflows/project-os/`, `AGENTS.md`, content check | Pull request #37. |

## Interfaces and shared decisions

- E09 stays the 2025 Gallup 28% record. E16 is the September 29, 2026 Gallup article. E10 stays the Rescissions Act.
- The 6% / 27% split is not used. The fetched Gallup page did not state it.
- TikTok O09 uses the January 23, 2026 date printed on the fetched page. ByteDance's 19.9% is joint-venture equity.
- Every source id in the report JSON must be cited in the chapters. Rebuild with `python3 tools/build_report.py` from `research/media-democracy/`.

## Handoffs and blockers

- Codex review on pull request #39 did not finish: the review comment said the Codex review quota was reached. That is not a code finding.
- gstack `/browse` was not used. Verification was an HTTP fetch on November 15, 2026 (Pacific).
- No agent-to-agent channel exists beyond this file, `DISCOVERIES.md`, and GitHub.

## Validation

- After merging pull request #40: `python3 tools/build_report.py` and `python3 tools/review_pdf.py`. 40 pages, 16,477 chapter words, 55 sources, 58 ids, 0 blank pages, 0 out-of-page characters. `python3 -m unittest workflows/project-os/test_check.py`: 11 tests OK, 5 active lessons.
