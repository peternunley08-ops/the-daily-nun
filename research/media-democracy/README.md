# Who Shapes What America Knows?

## Media, Polarization, and U.S. Democracy

The Daily Nun's first substantial research report, prepared for Peter Nunley. This is an AI-assisted research synthesis, not original interviews or a new survey.

**[Read the PDF](output/pdf/who-shapes-what-america-knows.pdf)** · [Read the linked text edition](report.md)

- 30 pages of chapters (PDF pages 4-33); 40 pages including the cover, contents, guide, glossary, and bibliography.
- Ten chapters, with 16,361 words under the builder's chapter-counting rule.
- 54 distinct sources, represented by 57 stable citation IDs before duplicates are grouped.
- Dated ownership table; nearby clickable citations; contents and PDF bookmarks.

Intended event cutoff: November 11, 2026. Compilation: November 12. Undated corporate pages are current-access corroboration; the Disney row uses an older, dated annual report. Some studies were verified through original abstracts and metadata rather than full methods. Limits are visible in the report and source ledgers. This is not a systematic review, a complete beneficial-ownership audit, or an exhaustive account of later litigation.

## Editable files

| Location | Purpose |
| --- | --- |
| `chapters/` | Chapter sources with stable citation tokens such as `[H01]`. |
| `front-matter.md`, `glossary.md` | Reader guide and definitions. |
| `sources/editorial.json` | History and civics sources. |
| `sources/ownership.json` | Ownership records, dates, and limits. |
| `sources/media.json` | Narrowcasting, platforms, and polarization sources. |
| `sources/evidence.json` | Media-effects studies, local journalism, and policy. |
| `sources/citation-map.json` | Generated bibliography numbers and aliases. |
| `report.md` | Generated text edition with citations and bibliography. |
| `output/pdf/` | First-edition PDF. |
| `validation.json`, `tools/` | Validation results and offline build tools. |

## Rebuild after editing

From this directory, with Python and the packages in `requirements.txt`:

```sh
python -m pip install -r requirements.txt
python tools/build_report.py
python tools/review_pdf.py
```

The builder regenerates the reading edition, citation map, counts, and PDF. The renderer writes ignored review images into `.build/`. Inspect those images before marking visual review complete in `validation.json`. Windows uses embedded Georgia and Arial; other systems fall back to Times and Helvetica, so pagination may change. Rebuilding resets visual-review status to pending.

## Handoff to Claude Code and Antigravity

Read [AGENTS.md](../../AGENTS.md), [DISCOVERIES.md](../../DISCOVERIES.md), and [Issue #1](https://github.com/peternunley08-ops/the-daily-nun/issues/1). This report already exists; do not restart it independently. Claim a focused follow-up for editorial, causal-language, or layout review. External Claude Code and Antigravity review has not yet occurred.

Peter wants one post weekly for his high-school community. Core interests include media influence on buying and political support, polarization, everyday thought, attention, belonging, and AI. School/sports fairness is optional. [Issue #2](https://github.com/peternunley08-ops/the-daily-nun/issues/2) asks agents to bring him questions and specific topic pitches before substantial new drafting.

College applications are authorized private background, not public content. This repository contains no application essays or private application-document links. Do not add them when developing an editorial profile.

Repository publication does not post to Instagram or TikTok. Posting day, platform mix, and future full-report frequency remain undecided.
