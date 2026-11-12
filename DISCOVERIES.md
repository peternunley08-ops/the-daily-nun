# Discoveries & Shared Decisions Log — The Daily Nun

A persistent record of strategic decisions, editorial findings, audience insights, and technical notes across sessions and agents.

---

## 1. Audience & Core Direction (Established Nov 12, 2026)
- **Primary Audience**: Peter's high-school community and peers. Young adults who notice headlines on social feeds but want to understand the systems, mechanics, and incentives behind them.
- **Tone**: Curious, sharp, explanatory, never condescending. Avoid forced slang and clickbait. Investigate polarization without treating peers as a monolithic bloc.
- **Publishing Cadence**: One substantial editorial piece per week, accompanied by one minimal 3-slide Instagram carousel and supplementary Story cards. "Daily" is the publication's masthead name; the real cadence is weekly and sustainable.

## 2. Brand & Style Rules
- **Publication Name**: Strictly **The Daily Nun**.
- **Byline**: Plain `By Peter Nunley`.
- **Tagline**: *A closer look at the world.*
- **Prohibitions**: No nickname branding, no puns on "nun", no convent imagery, no personal name-origin lore.
- **Design Tokens**:
  - Paper: `#f6f5f0`
  - Ink: `#20201c`
  - Blue: `#2448b5`
  - Secondary/Muted: `#68685f`
  - Rules: `#c8c8bc`
  - White: `#ffffff`
  - Typography: Georgia for serif headlines; system sans-serif for UI, navigation, and metadata.

## 3. Fact-Checking & Source Standards
- Every factual claim must include: original source URL, publication date, precise denominator, and subgroup definitions (e.g. "U.S. adults ages 18–29", not "all Gen Z").
- Company statements (YouTube, TikTok) must be labeled as platform policies/explanations, not independent audits.
- Never invent reporting, readership numbers, engagement, or virality.

## 4. Technical Architecture
- **Static Hosting**: Served via GitHub Pages from root `index.html`.
- **Asset Generation**: Node.js scripts (`build.mjs`, `build-launch.mjs`) parse `content.json` files and generate HTML previews and markdown copy. Media generation (Canvas to PNG/MP4) runs in-browser.
- **Source Link Alert (Issue #3)**: Oxford 2025 rage-bait URL `corp.oup.com/word-of-the-year/2025/` returns 403; confirmed replacement is `https://corp.oup.com/news/the-oxford-word-of-the-year-2025-is-rage-bait/`.

## 5. Agent Ownership & Handoffs
- Codex: Active on Issue #5 (packaging the first weekly carousel from the media report). Owned Issue #1.
- Claude Code: Logged Issue #3 source link repair.
- Antigravity: Established `AGENTS.md` and `DISCOVERIES.md`, handling Phase 1 discovery and editorial onboarding alignment (Issue #2).
