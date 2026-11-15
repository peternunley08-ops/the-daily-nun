// Shared article renderer for The Daily Nun.
// Turns a small, strict subset of Markdown into the article page styled by assets/article.css.
// Anything outside the subset throws, so a formatting mistake fails the build instead of
// reaching the public page as literal symbols.

const escapeHtml = text => String(text)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const BRIEF_HEADING = 'The short version';
const SOURCES_HEADING = 'Sources';
const WORDS_PER_MINUTE = 230;

/** Inline Markdown: **bold** and [label](https://url). Everything else is escaped text. */
function inline(text) {
  const html = escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  if (/\*\*|\]\(/.test(html)) throw new Error(`Unsupported inline Markdown: ${text.slice(0, 80)}`);
  return html;
}

function list(block, ordered) {
  const marker = ordered ? /^\d+\.\s+/ : /^-\s+/;
  const items = block.split(/\r?\n/).map(line => {
    if (!marker.test(line)) throw new Error(`Mixed or malformed list item: ${line.slice(0, 80)}`);
    return `      <li>${inline(line.replace(marker, ''))}</li>`;
  });
  const tag = ordered ? 'ol' : 'ul';
  return `    <${tag}>\n${items.join('\n')}\n    </${tag}>`;
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * @param {object} options
 * @param {string} options.markdown   Article source. First block must be "# Title".
 * @param {string} options.kicker     Desk label shown above the headline.
 * @param {string} options.cssHref    Relative path to assets/article.css from the output page.
 * @param {string} options.homeHref   Relative path to the front page.
 * @param {string} options.footerHtml Trusted HTML for the footer (links back to related pages).
 * @param {string} [options.byline]   Plain author name.
 * @returns {{html: string, title: string, words: number}}
 */
export function renderArticle({ markdown, kicker, cssHref, homeHref, footerHtml, byline = 'Peter Nunley' }) {
  for (const [name, value] of Object.entries({ markdown, kicker, cssHref, homeHref, footerHtml })) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`renderArticle: missing ${name}`);
  }
  const blocks = markdown.trim().split(/\r?\n\s*\r?\n/).map(block => block.trim());
  const first = blocks.shift();
  if (!first || !first.startsWith('# ')) throw new Error('Article must start with "# Title"');
  const title = first.replace(/^#\s+/, '');

  let deck = '';
  if (blocks.length && /^\*[^*].*[^*]\*$/.test(blocks[0])) deck = blocks.shift().slice(1, -1);

  const body = [];
  const brief = [];
  const sources = [];
  let target = body;
  let ledeDone = false;
  let bodyWords = 0;

  for (const block of blocks) {
    if (block.startsWith('## ')) {
      const heading = block.replace(/^##\s+/, '');
      if (heading === BRIEF_HEADING) { target = brief; continue; }
      if (heading === SOURCES_HEADING) { target = sources; continue; }
      if (target !== body) throw new Error(`"${heading}" must come before "${BRIEF_HEADING}" and "${SOURCES_HEADING}"`);
      body.push(`    <h2 id="${slug(heading)}">${inline(heading)}</h2>`);
      continue;
    }
    if (block.startsWith('#')) throw new Error(`Unsupported heading level: ${block.slice(0, 60)}`);
    if (target === body) bodyWords += block.split(/\s+/).length;
    if (block.startsWith('> ')) {
      if (block.includes('\n')) throw new Error('A pull quote must be a single line');
      target.push(`    <p class="pull">${inline(block.replace(/^>\s+/, ''))}</p>`);
    } else if (/^-\s/.test(block)) {
      target.push(list(block, false));
    } else if (/^\d+\.\s/.test(block)) {
      target.push(list(block, true));
    } else if (/^(---|\*\*\*|```|\|)/.test(block)) {
      throw new Error(`Unsupported block: ${block.slice(0, 60)}`);
    } else if (target === body && !ledeDone) {
      target.push(`    <p class="lede">${inline(block)}</p>`);
      ledeDone = true;
    } else {
      target.push(`    <p>${inline(block)}</p>`);
    }
  }
  if (!body.length) throw new Error('Article has no body');

  // Close the story with an end mark on its last paragraph.
  const last = body.length - 1;
  if (body[last].endsWith('</p>') && !body[last].includes('class="pull"')) {
    body[last] = body[last].replace(/<\/p>$/, ' <span class="endmark" aria-hidden="true">■</span></p>');
  }

  const minutes = Math.max(1, Math.round(bodyWords / WORDS_PER_MINUTE));
  const briefHtml = brief.length
    ? `\n    <section class="brief" aria-labelledby="brief-title">\n      <h2 id="brief-title">${BRIEF_HEADING}</h2>\n${brief.join('\n')}\n    </section>`
    : '';
  const sourcesHtml = sources.length
    ? `\n    <section class="sources" aria-labelledby="sources-title">\n      <h2 id="sources-title">${SOURCES_HEADING}</h2>\n${sources.join('\n')}\n    </section>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} — The Daily Nun</title>${deck ? `\n  <meta name="description" content="${escapeHtml(deck)}">` : ''}
  <link rel="stylesheet" href="${escapeHtml(cssHref)}">
</head>
<body>
  <header class="site"><a href="${escapeHtml(homeHref)}">The Daily Nun</a></header>
  <article class="story">
    <p class="kicker">${escapeHtml(kicker)}</p>
    <h1>${inline(title)}</h1>${deck ? `\n    <p class="deck">${inline(deck)}</p>` : ''}
    <p class="byline">By <b>${escapeHtml(byline)}</b> &nbsp;/&nbsp; ${minutes} minute read</p>
${body.join('\n')}${briefHtml}${sourcesHtml}
  </article>
  <footer class="colophon">
    ${footerHtml}
  </footer>
</body>
</html>
`;
  return { html, title, words: bodyWords };
}
