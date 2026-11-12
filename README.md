# The Daily Nun

A closer look at the world. A publication project by Peter Nunley about government, media, culture, and questions worth following.

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
