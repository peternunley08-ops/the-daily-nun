# Story 5: Who decides who gets the hours?

- **Desk:** Government & Work
- **Format:** Three-slide Instagram carousel (1080 × 1350) + 30-second Reel script
- **Status:** Prepared draft / Unpublished. Comes after the four-week launch backlog; not part of it.
- **Voice:** Strict third-person editorial
- **Issue:** https://github.com/peternunley08-ops/the-daily-nun/issues/23

## What's Here
- `post.json`: post specification and source metadata. Edit this, then run `node posts/05-who-gets-the-hours/build.mjs`.
- `index.html`, `caption.txt`, `voiceover-script.txt`, `SOURCES.md`: generated from `post.json`.
- `build.mjs`: validates word limits and branding, builds the files above and the article page.

## Related Article
- Markdown: `desks/government/who-decides-who-gets-the-hours.md`
- Web page: `desks/government/who-decides-who-gets-the-hours.html`
- Written in the shorter format proposed in Issue #21 (deck, pull quote, short version, sources). When PR #22's shared renderer reaches `main`, this builder should switch to it.

## Verification Limits
- Sources read on 2026-11-15 with the cloud session's HTTP client, not gstack `/browse`.
- The governor's page, the SB 947 bill text, and Labor Code section 1391 blocked automated access; the article relies on the author's press release, a law-firm summary, and the state's April 2026 fact sheet instead.
- No source covers high-school or part-time student workers specifically. The article says so.
- Whether California has any statewide advance-notice rule was not confirmed; the article does not claim either way.
- No exported PNG, MP4, or upload ZIP yet.
