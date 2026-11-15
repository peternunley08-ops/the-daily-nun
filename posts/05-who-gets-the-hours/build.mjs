import { buildPost } from '../build-post.mjs';

const result = buildPost(import.meta.url, { label: "Story 5", desk: "Government", deskLong: "Government & Work", article: "desks/government/who-decides-who-gets-the-hours.md", note: "after the four-week backlog" });
console.log(`${result.folder} built (article: ${result.articleWords} words; slides exported: ${result.exported}).`);
