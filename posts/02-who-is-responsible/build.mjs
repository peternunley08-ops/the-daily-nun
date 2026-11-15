import { buildPost } from '../build-post.mjs';

const result = buildPost(import.meta.url, { label: "Week 2", desk: "Government", deskLong: "Government & Civic Accountability", article: "desks/government/who-is-actually-responsible.md" });
console.log(`${result.folder} built (article: ${result.articleWords} words; slides exported: ${result.exported}).`);
