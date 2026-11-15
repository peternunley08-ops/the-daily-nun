# The Daily Nun

A closer look at the world. A publication project by Peter Nunley about government, media, culture, and questions worth following.

**First research report:** [Who Shapes What America Knows? (PDF)](research/media-democracy/output/pdf/who-shapes-what-america-knows.pdf) · [Text, sources, and agent handoff](research/media-democracy/README.md)

**Weekly posts:** prepared drafts, none posted or scheduled. [See all four launch weeks on the backlog board](posts/index.html).

| | Story | Article | Upload pack |
|---|---|---|---|
| Week 1 | Who picked this for you? | [Read](instagram-launch/article.html) | [Preview](posts/01-who-picked-this/index.html) · [ZIP](posts/01-who-picked-this/upload-pack.zip) |
| Week 2 | Who is actually responsible? | [Read](desks/government/who-is-actually-responsible.html) | [Preview](posts/02-who-is-responsible/index.html) · [ZIP](posts/02-who-is-responsible/upload-pack.zip) |
| Week 3 | When does a recommendation become manipulation? | [Read](desks/culture/when-does-a-recommendation-become-manipulation.html) | [Preview](posts/03-recommendation-or-manipulation/index.html) · [ZIP](posts/03-recommendation-or-manipulation/upload-pack.zip) |
| Week 4 | What happens when the local paper closes? | [Read](desks/democracy/what-happens-when-the-local-paper-closes.html) | [Preview](posts/04-the-disappearing-local-beat/index.html) · [ZIP](posts/04-the-disappearing-local-beat/upload-pack.zip) |
| Story 5 | Who decides who gets the hours? | [Read](desks/government/who-decides-who-gets-the-hours.html) | [Preview](posts/05-who-gets-the-hours/index.html) · [ZIP](posts/05-who-gets-the-hours/upload-pack.zip) |
| Story 6 | Does a streak help anyone learn? | [Read](desks/culture/does-a-streak-help-anyone-learn.html) | [Preview](posts/06-does-a-streak-help/index.html) · [ZIP](posts/06-does-a-streak-help/upload-pack.zip) |

Current audience: primarily Peter's high-school community. Cadence: one post weekly. Core questions concern media influence, buying decisions, political support, polarization, attention, and everyday thought. Read [AGENTS.md](AGENTS.md), [DISCOVERIES.md](DISCOVERIES.md), and open Issues before starting work.

[Open the newspaper](https://peternunley08-ops.github.io/the-daily-nun/) · [Latest Instagram Stories](https://peternunley08-ops.github.io/the-daily-nun/stories-current-media/) · [Instagram launch studio](https://peternunley08-ops.github.io/the-daily-nun/instagram-launch/)

## What's here

- A responsive newspaper front page and an opening article about how stories reach readers.
- Six Instagram Stories about AI clips, rage bait, sponsorships, news habits, influencers, and personalized feeds. Each has a short hook, a source, and a 1080 × 1920 PNG.
- An earlier launch pack with three carousels, three silent 15-second Reels, four Story cards, a profile image, captions, and accessibility descriptions.
- Source notes that distinguish survey findings, platform statements, and editorial interpretation.

This is a developing publication and public design preview. Article drafts are labeled. Instagram assets are prepared for review; publishing this repository does not post them to Instagram.

## Open locally

Open `index.html` in a browser. No install, account, API key, or build step is needed to view the site.

The content studios are in `stories-current-media/index.html` and `instagram-launch/index.html`.

## Edit the content

Each studio has a `content.json` source file. With Node.js installed, regenerate its HTML and text resources using:

```sh
node stories-current-media/build.mjs
node instagram-launch/build-launch.mjs
```

The builders generate the previews and copy files. PNG and MP4 exports use the browser rendering functions embedded in each preview; rebuilding the HTML alone does not regenerate exported media or ZIP files.

Weekly post packages live in `posts/NN-slug/`. Edit `post.json` (slides, caption, voiceover, sources) and the article Markdown in `desks/`, then rebuild:

```sh
node posts/05-who-gets-the-hours/build.mjs
node posts/export-slides.mjs 05-who-gets-the-hours
node posts/export-reels.mjs 05-who-gets-the-hours
```

The first command validates word limits, voiceover length and branding, and writes the caption, source notes, voiceover script, article page and preview. All weekly packages share `posts/build-post.mjs`, and all articles share `assets/render-article.mjs` and `assets/article.css`. The second renders the 1080 × 1350 slide images and `upload-pack.zip`. The third renders the silent 1080 × 1920 text Reel (`reel.mp4`, `reel-cover.png`) from the on-screen lines, timed to the script's stated length, and adds it to the upload pack. Both need Playwright with Chromium and the Georgia font; the Reel exporter also needs ffmpeg. They refuse to save a headline that overflows or a Reel card too brief to read.

## Sources and publishing

- [Latest Story sources and measurement details](stories-current-media/SOURCES.md)
- [Latest Story copy and source URLs for link stickers](stories-current-media/COPY.md)
- [Launch-pack source checks](instagram-launch/SOURCE-CHECKS.md)
- [Editorial and publishing workflow](instagram-launch/DEPARTMENTS.md)

Keep dates, denominators, and source labels when republishing. Add source URLs as real Instagram link stickers; text printed on a PNG is not clickable.

## Downloads

- [Six current-media Stories](daily-nun-current-media-stories.zip)
- [Complete earlier Instagram launch pack](daily-nun-instagram-launch.zip)

The site uses HTML, CSS, JavaScript, and the Canvas API, with Node.js scripts for content preparation. GitHub Pages serves the committed files directly from `main`.
