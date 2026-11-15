# Week 4: What happens when the local paper closes?

- **Desk:** Democracy & Local Watchdogs
- **Format:** Three-slide Instagram carousel (1080 × 1350) + 30-second Reel script
- **Status:** Prepared draft / Unpublished. Final piece of the four-week launch backlog.
- **Voice:** Strict third-person editorial
- **Issue:** https://github.com/peternunley08-ops/the-daily-nun/issues/11 (reassigned from Codex to Claude Code at Peter's request)

## What's Here
- `post.json`: post specification and source metadata. Edit this, then run `node posts/04-the-disappearing-local-beat/build.mjs`.
- `index.html`, `caption.txt`, `voiceover-script.txt`, `SOURCES.md`: generated from `post.json`.
- `build.mjs`: validates word limits and branding, builds the files above and the article page.

## Related Article
- Markdown: `desks/democracy/what-happens-when-the-local-paper-closes.md`
- Web page: `desks/democracy/what-happens-when-the-local-paper-closes.html`
- Short-read format from Issue #21. Switch this builder to PR #22's shared renderer once it reaches `main`.

## Verification Limits
- Sources reused from the repository's verified report sources (E06, E08, H02, H14); the three research abstracts were re-read on 2026-11-15.
- The Medill site was unavailable on 2026-11-15 (HTTP 503 and a certificate error); its figures come from the report's 2026-11-11 verification.
- All three studies were read as abstracts only. The borrowing-cost figures and causal claim are the authors' own.
- No local (county-level) figures are claimed.
- Upload pack: `slide-01.png`–`slide-03.png` (1080 × 1350), `ALT-TEXT.txt`, and `upload-pack.zip`, made with `node posts/export-slides.mjs` on 2026-11-15. Headlines were rendered with Gelasio standing in for Georgia (not installed in the cloud session); re-export on a Mac for an exact Week 1 match.
- No MP4 exists yet; the Reel is a script only.
