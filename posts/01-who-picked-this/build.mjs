import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../..');
const post=JSON.parse(fs.readFileSync(path.join(dir,'post.json'),'utf8'));
const caption=post.caption+'\n'+post.reportUrl+'\n';
const alt=fs.readFileSync(path.join(root,post.altTextFile),'utf8');
const stage=path.join(root,'.gstack','weekly-01-stage');
fs.mkdirSync(stage,{recursive:true});
for(const [i,relative] of post.media.entries()){
  const input=path.resolve(root,relative);
  if(!input.startsWith(root+path.sep))throw Error('Asset outside repository');
  const bytes=fs.readFileSync(input);
  if(bytes.readUInt32BE(16)!==1080||bytes.readUInt32BE(20)!==1350)throw Error('Unexpected slide dimensions');
  fs.writeFileSync(path.join(stage,'slide-'+String(i+1).padStart(2,'0')+'.png'),bytes);
}
const sourceNotes=['The Daily Nun / first weekly post','',...post.sources.flatMap(s=>[s.title,s.author+' / '+s.publisher+' / '+s.date,s.url,s.type+': '+s.limits,'']),'Full report and bibliography:',post.reportUrl,'','Prepared draft. No posting date or Instagram publication has been set.'].join('\n');
const uploadNotes='Upload slide-01.png, slide-02.png, and slide-03.png in order.\n\nPaste CAPTION.txt and use the supplied per-slide descriptions in ALT-TEXT.txt.\n\nThe full report URL is included in the caption and SOURCES.txt. A public account or profile link has not been created by this pack.\n\nOne post per week is the chosen cadence; this draft has no assigned publishing date.\n';
fs.writeFileSync(path.join(dir,'caption.txt'),caption);
fs.writeFileSync(path.join(stage,'CAPTION.txt'),caption);
fs.writeFileSync(path.join(stage,'ALT-TEXT.txt'),alt);
fs.writeFileSync(path.join(stage,'SOURCES.txt'),sourceNotes);
fs.writeFileSync(path.join(stage,'READ-ME.txt'),uploadNotes);
fs.writeFileSync(path.join(dir,'SOURCES.md'),'# Source notes\n\n'+sourceNotes+'\n');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const altParts=alt.trim().split(/\r?\n\s*\r?\n/);
const cards=post.media.map((src,i)=>`<figure><img src="../../${escape(src)}" width="1080" height="1350" alt="${escape(altParts[i])}"><figcaption>Slide ${i+1} of ${post.media.length}</figcaption></figure>`).join('');
const script=`document.getElementById('copy').addEventListener('click',async()=>{const field=document.getElementById('caption');try{await navigator.clipboard.writeText(field.value);document.getElementById('status').textContent='Caption copied.'}catch{field.focus();field.select();document.getElementById('status').textContent='Caption selected. Use your copy command.'}});`;
new vm.Script(script);
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(post.title)} — The Daily Nun</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f5f0;color:#20201c;font:16px/1.65 Arial,sans-serif}header,main,footer{max-width:1180px;margin:auto;padding:28px 24px}.brand{font:700 42px/1.1 Georgia,serif;letter-spacing:-.05em;text-decoration:none;color:inherit}h1{font:700 clamp(34px,6vw,58px)/1.08 Georgia,serif;letter-spacing:-.04em;margin:28px 0 16px}p{max-width:760px}a{color:#2448b5;text-underline-offset:4px}nav{display:flex;flex-wrap:wrap;gap:14px 25px;margin-top:22px}.slides{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{font-size:12px;color:#68685f;margin-top:10px}.copy{max-width:780px;border-top:1px solid #c8c8bc;margin-top:38px;padding-top:20px}h2{font:700 28px/1.2 Georgia,serif}textarea{width:100%;min-height:240px;resize:vertical;padding:16px;border:1px solid #c8c8bc;background:#fff;color:#20201c;font:16px/1.7 Arial,sans-serif}button{font:inherit;padding:9px 16px;border:1px solid #20201c;background:transparent;color:#20201c;cursor:pointer;margin-top:12px}a:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid #2448b5;outline-offset:4px}.note,#status,footer{font-size:13px;color:#68685f}footer{border-top:1px solid #c8c8bc;margin-top:30px}@media(max-width:620px){.slides{grid-template-columns:1fr;gap:28px}header,main,footer{padding-left:20px;padding-right:20px}.brand{font-size:36px}}
</style></head><body><header><a class="brand" href="../../index.html">The Daily Nun</a><h1>${escape(post.title)}</h1><p>First weekly post / Three-slide carousel / Prepared draft</p><nav aria-label="Post resources"><a href="upload-pack.zip" download>Download upload pack</a><a href="${escape(post.reportUrl)}">Read the full report</a><a href="SOURCES.md">Source notes</a></nav></header><main><section class="slides" aria-label="Carousel slides">${cards}</section><section class="copy"><h2>Caption</h2><textarea id="caption" readonly aria-label="Prepared Instagram caption">${escape(caption)}</textarea><button id="copy" type="button">Copy caption</button><p id="status" role="status"></p><p class="note">Upload the slides in order and use the supplied alt text. The existing launch visuals are reused here. This draft has no publishing date.</p></section></main><footer>One post weekly / The Daily Nun / Prepared locally; no social post has been published.</footer><script>${script}</script></body></html>`;
fs.writeFileSync(path.join(dir,'index.html'),html);
console.log('Prepared the first weekly caption, preview, source notes, and seven upload-pack files.');
