import { buildPost } from '../build-post.mjs';

const result = buildPost(import.meta.url, { label: "Week 3", desk: "Culture", deskLong: "Culture & Attention", article: "desks/culture/when-does-a-recommendation-become-manipulation.md" });
console.log(`${result.folder} built (article: ${result.articleWords} words; slides exported: ${result.exported}).`);
