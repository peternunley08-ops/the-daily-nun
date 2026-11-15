import { buildPost } from '../build-post.mjs';

const result = buildPost(import.meta.url, { label: "Week 4", desk: "Democracy", deskLong: "Democracy & Local Watchdogs", article: "desks/democracy/what-happens-when-the-local-paper-closes.md" });
console.log(`${result.folder} built (article: ${result.articleWords} words; slides exported: ${result.exported}).`);
