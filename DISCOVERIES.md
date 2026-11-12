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

- Task claim: [Issue #1 - Codex report PDF](https://github.com/peternunley08-ops/the-daily-nun/issues/1). Agent owner: Codex; status: waiting for the user's priority decision.
- The user requested the earlier media/polarization/U.S.-democracy report as a PDF. Codex started research before the new coordination brief arrived.
- Ten chapter drafts are already saved in the parent workspace under `report-work/chapters/`: `01-03.md`, `04.md`, `05-07.md`, and `08-10.md`. Four source ledgers are in `report-work/sources/`.
- These are local checkpoints outside this Git repository; Claude cloud and Antigravity must not assume they can read them yet. Do not restart this research independently. The report Issue will track migration and the handoff.
- Source verification uses `/browse`. Ledgers record abstract-only access and other limits. Current drafts still need a complete cross-chapter review, citation checks, glossary/bibliography assembly, PDF layout, and rendered-page checks. No final PDF exists yet.
- Further report drafting and assembly were held when the user requested discovery/questions first. Confirm the next priority before resuming token-heavy work.

### Open choices for the user

- Which part of the Gen Z audience should the first month serve most directly?
- What posting cadence is enjoyable and sustainable?
- Should the existing report PDF be finished before the next launch work?
- Success measures, cross-agent ownership, and any scheduling automation remain undecided. No follower, reach, or revenue target has been agreed.

## 2026-11-12: Claude Code source re-check and handoff

- Agent: Claude Code (cloud session, branch `claude/great-gates-rk2omu`). Related: [Issue #1](https://github.com/peternunley08-ops/the-daily-nun/issues/1) (review input only; Codex owns the report), [Issue #2](https://github.com/peternunley08-ops/the-daily-nun/issues/2) (onboarding questions), [Issue #3](https://github.com/peternunley08-ops/the-daily-nun/issues/3) (source link returning 403).
- This checking was done before the coordination brief reached the session. Nothing was drafted or built, and no product file was changed.
- Method limit: gstack `/browse` is not available in a Claude Code cloud session. Sources were loaded from the live pages with an HTTP client and headless Chromium; DOIs were also checked against Crossref and OpenAlex. These are independent checks, not `/browse` checks.
- Audience (the user's high-school community) and cadence (one post a week) are settled in Issue #2. Do not re-ask.

### Six live Stories (`stories-current-media/`)

- Stories 01, 03, 04, 05, and 06: card copy, dates, and denominators match the live sources. Pew figures confirmed: 43% of U.S. adults ages 18–29 regularly get news on Instagram (survey Aug. 24–30, 2026; 5,166 adults; published Oct. 19, 2026); 38% of adults ages 18–29 and 21% of all adults regularly get news from news influencers (survey Aug. 18–24, 2025; published Nov. 4, 2025).
- Story 02: the copy matches Oxford's definition, but the source URL returned 403 here while the rest of corp.oup.com loaded. Evidence and the proposed replacement are in Issue #3. It needs one confirmation in a normal browser.
- Story 06: the TikTok help URL redirects to `https://www.tiktok.com/support/faq_detail?id=7655285288050104852` and still loads.
- Open call for the user: is "Your fave is the news desk." acceptable, or is "fave" the forced slang to avoid?

### Media report: citation check for Issue #1

- Version checked: the complete text the user pasted into the Claude Code session on November 12 (ten sections, glossary, 55-item bibliography, research cutoff November 11, 2026). It may differ from Codex's chapter checkpoints.
- All 55 cited sources were reached. Claims, dates, and figures matched, with four exceptions:
  1. Section 7, "In a 2018 experiment" (Bail et al.): the paper was published in 2018; its surveys ran in mid-October 2017 and about 1.5 months later. Suggest "an experiment published in 2018".
  2. Section 1 paraphrases Sinclair's defense as support for "fair, factual reporting". NPR quotes Sinclair as promoting "fair and objective reporting".
  3. Section 6 and bibliography item 19 date the TikTok joint-venture announcement January 22, 2026. The venture's own page is dated January 23, 2026.
  4. Section 9 cites Gallup's 2025 trust-in-media reading (28%; Sept. 2–16, 2025). It is accurate but no longer the latest. Gallup's 2026 reading is 33% (Sept. 1–17, 2026; 1,000 adults; ±4 points; published Sept. 29, 2026; Republicans 22%, independents 31%, Democrats 50%): https://news.gallup.com/poll/714938/trust-news-media-edges-slightly-higher.aspx
- Completed-deal checks: Skydance's October 6, 2026 release states the Warner Bros. Discovery acquisition is complete; Fox's November 6, 2026 release states the Roku acquisition is complete. Both are company statements.

### Tooling facts

- Image exports depend on the fonts Georgia, Impact, and Arial. A stock Linux container has none, and the canvas falls back silently. With those fonts installed, headless Chromium calling the preview page's own `window.exportStory(id)` reproduced the six committed PNGs (SSIM 0.993–0.996). Check fonts before exporting from any cloud or CI environment.
- A 403 to a plain HTTP client is not proof of a dead link: skydance.com refused curl but loaded in Chromium. Test in a browser before reporting a link as dead.
- `stories-current-media/build.mjs` hardcodes "Verified through gstack /browse on November 12, 2026" and the preview's "Checked November 12, 2026" instead of reading `checked` from `content.json`. A rebuild after a later re-check will carry the old date unless that changes.

### Handoff state

- The fetched source captures exist only in the cloud session's scratch space and will be lost when the container is reclaimed. The findings above are the durable record.
- Held until the user picks a direction: any new Story pack, and any edit to site status wording (`index.html`, `STARTER.md`, `instagram-launch/DEPARTMENTS.md`, and `stories-current-media/README.md` describe the work as unpublished or a concept while the Pages preview is live).
