# Shared discoveries and decisions

Keep entries concise and dated. Record the agent, task Issue, evidence, decisions, open questions, and handoff state. Read existing entries before repeating research or changing direction.

## 2026-11-12: coordination bootstrap

- Agent: Codex. The user requested coordination between Claude Code, Codex, and Antigravity before further building.
- Before this entry, neither `AGENTS.md` nor `DISCOVERIES.md` existed locally or on GitHub `main`. The open-Issue check returned no tasks. Only `main` was listed as a remote branch at that check.
- Current product: newspaper prototype; opening article; earlier launch pack with three carousels, three silent text Reels, four Story cards, profile image, captions and source notes; six newer current-media Stories with PNGs, copy and source URLs.
- Repository: https://github.com/peternunley08-ops/the-daily-nun
- Public preview: https://peternunley08-ops.github.io/the-daily-nun/
- The Daily Nun and PoloBridge are already featured in the GitHub profile README and portfolio. No Instagram or TikTok account, public post, or scheduled publishing system has been created in this work.
- Accepted preferences: broad curiosity, newspaper identity, minimal social copy, Gen Z relevance, and no nickname/name-origin branding. Do not ask the user to re-establish these choices.

### Report PDF: existing work, not a completed deliverable

- Task claim: [Issue #1 - Codex report PDF](https://github.com/peternunley08-ops/the-daily-nun/issues/1). Agent owner: Codex; status: complete. [PR #4](https://github.com/peternunley08-ops/the-daily-nun/pull/4) merged the report and handoff into `main`; GitHub Pages deployment succeeded.
- The user requested the earlier media/polarization/U.S.-democracy report as a PDF. Codex started research before the new coordination brief arrived.
- Ten chapter drafts and four source ledgers have now been copied into `research/media-democracy/chapters/` and `research/media-democracy/sources/` on the `codex/report-pdf` branch. Do not restart the research independently.
- Source verification uses `/browse`. Ledgers record abstract-only access and other limits. The first PDF edition is assembled in `research/media-democracy/output/pdf/who-shapes-what-america-knows.pdf`, with editable chapters, a linked reading edition, glossary, bibliography, and validation record alongside it.
- Report assembly resumed after Peter explicitly confirmed it should be finished and shared. External Claude Code and Antigravity review has not yet occurred.

### Confirmed audience, cadence, and agent questions

- Audience: primarily Peter's high-school community; peers may know headlines while missing context. He is concerned about polarization. Treat this as a reason to investigate and explain, not permission to stereotype the school or assume every disagreement is misinformation.
- Cadence: one post weekly. Day, platform mix, full-report frequency, and numeric success targets remain open.
- This media/democracy report is the first substantial report. Peter requested its PDF in GitHub so the other agents can see and build from it.
- [Issue #2 - Editorial onboarding](https://github.com/peternunley08-ops/the-daily-nun/issues/2) asks Claude Code and Antigravity to bring Peter questions and specific future topic pitches based on known context. They should not assume new biographical facts or duplicate Issue #1.
- College applications may be used as authorized private background. No application text, private document links, or personal details are to be committed here. Availability and interpretation of private material are separate from permission to publish it.
- No social-media posting or scheduled publishing automation is authorized by this update. One post per week is a product preference, not an installed automation.

### Follow-up: editorial interests confirmed by Peter

- Peter wants to examine how media influences buying decisions, support for political candidates, polarization, and everyday thought and behavior.
- He is interested in belonging/group division and AI/attention/learning. Access or fairness in school/sports is optional; he expressed uncertainty about that topic. Do not make it a core beat by assumption.
- He used "brainwashes" to describe his concern. Treat that as a question about persuasion and manipulation to investigate, not an established conclusion that every exposure controls a person's choices. Preserve evidence, audience agency, and uncertainty.
- Future pitches can ask: When does advertising become manipulation? How does a feed make a candidate feel trustworthy? Why do groups become more hostile even when they encounter similar facts? What does AI change about what students notice and trust? These are proposed questions, not approved findings or additional report assignments.

### First report delivery checkpoint

- PDF: 30 chapter pages (PDF pages 4-33), 40 pages total including supporting material; 16,361 chapter words under the builder's counting rule; 54 distinct sources and 57 stable citation IDs.
- All citation IDs resolve. Repeated references to the same URL share one bibliography number. The PDF includes external source links and internal contents/bookmarks.
- All pages were rendered for review; ownership-table pages, cover, contents, glossary, and bibliography samples were inspected at larger size. Automated checks found no blank pages or out-of-page text. See `research/media-democracy/validation.json`.
- The report is an AI-assisted research synthesis. Abstract-only verification, older corporate records, company assertions, and the cutoff/current-access distinction are disclosed. It has not been independently reviewed by external Claude Code or Antigravity.
- Preparing this report and adding it to GitHub does not publish a social-media post. The one-post-weekly preference remains; publishing day and future full-report cadence are open.
- Repository detail: generated PDFs can initially look like text to Git. `.gitattributes` marks PDF and media formats as binary to prevent line-ending conversion across Windows and cloud checkouts.

### First weekly post and Oxford source repair

- Codex claimed [Issue #5](https://github.com/peternunley08-ops/the-daily-nun/issues/5) to package the first weekly draft from the existing "Who picked this for you?" carousel. Reuse its three PNGs and alt text; do not generate another version of the report. The draft lives in `posts/01-who-picked-this/` and remains unscheduled and unpublished.
- The caption is shorter and links the finished report. The upload pack contains the three images, caption, alt text, source notes, and upload instructions. The source images remain in `instagram-launch/`; the preview references them instead of duplicating them.
- For [Issue #3](https://github.com/peternunley08-ops/the-daily-nun/issues/3), Codex verified Oxford's dated newsroom release through `/browse`: https://corp.oup.com/news/the-oxford-word-of-the-year-2025-is-rage-bait/ , published December 1, 2025. It returned 200 and supports the existing definition. The older year URL returned 200 locally but redirected to the annual hub; Claude had observed a cloud 403. Do not describe that as proof the old page never existed.
- The rage-bait Story now cites the dated release. Its printed image and claim are unchanged; generated copy/source notes/preview and the downloadable ZIP are refreshed together. Claude's branch was checked before the claim and contained no overlapping Story edits.

### 2026-11-12: Editorial Strategy & Backlog Alignment (Peter Confirmed)

- **Backlog Requirement**: Prepare a complete **4-week backlog** of content and verified packages before public launch.
- **Voice & Persona Protection**: Strict **third-person editorial** voice across Instagram captions, Story copy, and website articles (e.g., "The Daily Nun examined...", "A closer look at..."). Peter explicitly requested third-person editorial distance to protect his personal persona from out-of-context quotes or misattribution. Bylines remain a clean `By Peter Nunley`.
- **Audio & Video Direction**: Peter can record voiceovers ("i can speak over"). Videos will provide clean, timed voiceover scripts alongside silent, readable kinetic typography so posts work both with sound on and muted.
- **Success Metrics (Tri-Fold)**:
  1. High-school campus & peer discourse: sparking informed, curious conversations among classmates without polarization or condescension.
  2. Academic & journalistic portfolio: building a rigorous, verified body of investigative work for college applications.
  3. Audience growth: expanding a wider digital readership over time.
- **Four-Week Backlog Plan**:
  - **Week 1 (Media Desk)**: *"Who picked this for you? Media ownership vs. distribution"* (Completed by Codex in `posts/01-who-picked-this/`).
  - **Week 2 (Government Desk)**: *"Who is actually responsible? Local public contracts & municipal authority"* — tracing local municipal/school board decisions, budgets, and public records. (Claimed by Antigravity).
  - **Week 3 (Culture Desk)**: *"When does a recommendation become manipulation? The mechanics of algorithmic engagement"* — investigating how algorithms convert outrage and watch-time into consumer habits and cultural trends. (Recommended for Claude Code).
  - **Week 4 (Democracy Desk)**: *"The disappearing local beat: What happens to a community when local reporting vanishes"* — Northwestern/Medill news desert research on municipal costs, corruption risks, and civic health. (Recommended for Codex).


### 2026-11-13: Week 3 Culture Desk package (Claude Code, [Issue #10](https://github.com/peternunley08-ops/the-daily-nun/issues/10))

- Package: `posts/03-recommendation-or-manipulation/`; article: `desks/culture/when-does-a-recommendation-become-manipulation.md` (+ generated `.html`). Prepared draft; nothing scheduled or published.
- **Browsing blocker:** gstack `/browse` is not installed in the Claude cloud session. Peter approved the session's built-in web fetch for this task. Sources were read on 2026-11-13 that way.
- Read and used: TikTok (2020), Instagram (2023), and YouTube (2021) ranking explainers, labeled as corporate statements; Milli et al., PNAS Nexus 2025 (n=806 U.S. Twitter users, Feb 11-27, 2023); FTC staff report press release (Sept 19, 2024; full report not read); Susser, Roessler & Nissenbaum 2020 (definition passages read from the PDF).
- Reused, abstract-only: Guess et al., Science 2023 (report source E01). `science.org` returned HTTP 403 from the cloud.
- **Not used because unverifiable here:** Rathje et al., PNAS 2021 and Piccardi et al., Science 2025 (publisher 403; PubMed cookie wall). Do not cite them from memory. Europe PMC worked for E01 and may work for these.
- **Scope gap:** Issue #10 asks how feeds convert attention into "consumer habits and candidate trust." No verified source here measures either. The article states that limit instead of asserting it. Open question for Peter: commission a follow-up on purchases/candidate trust, or leave it.
- `build.mjs` is a copy of Week 2's with desk strings changed and reel duration read from `post.json`. Week 4 could share one parameterized builder; not done here to avoid touching Codex's claimed scope.
