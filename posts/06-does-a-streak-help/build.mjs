import { buildPost } from '../build-post.mjs';

const result = buildPost(import.meta.url, { label: "Story 6", desk: "Culture", deskLong: "Culture & Attention", article: "desks/culture/does-a-streak-help-anyone-learn.md", note: "after the four-week backlog" });
console.log(`${result.folder} built (article: ${result.articleWords} words; slides exported: ${result.exported}).`);
