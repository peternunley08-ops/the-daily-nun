import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
const banned = /p[-\s._\u2010-\u2015]*nun\b/i;
if (banned.test(JSON.stringify(content))) throw new Error('Rejected nickname branding');
for (const post of content.carousels) {
  for (const slide of post.slides) {
    if (slide.body.trim().split(/\s+/).filter(Boolean).length > 22) throw new Error(`Too much copy: ${post.id}`);
    if (slide.cover && slide.title.trim().split(/\s+/).length > 7) throw new Error(`Long hook: ${post.id}`);
  }
}
for (const sub of ['carousels', 'reels', 'stories', 'brand']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
for (const post of content.carousels) {
  const target = path.join(dir, 'carousels', post.id);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'caption.txt'), post.caption + '\n');
  fs.writeFileSync(path.join(target, 'alt-text.txt'), post.slides.map((s, i) => `Slide ${i + 1}: ${s.alt}`).join('\n\n') + '\n');
}
for (const reel of content.reels) {
  fs.writeFileSync(path.join(dir, 'reels', `${reel.id}-caption.txt`), reel.caption + '\n');
  fs.writeFileSync(path.join(dir, 'reels', `${reel.id}-script.txt`), [reel.title, '', 'Optional voiceover script (not recorded):', reel.voiceover, '', 'Storyboard:', ...reel.beats.map(b => `${b.start}–${b.end}s: ${b.title.replaceAll('\n', ' ')}`), '', `Accessibility description: ${reel.alt}`, '', 'The supplied MP4 is a silent text video.'].join('\n'));
}
fs.writeFileSync(path.join(dir, 'brand', 'bio.txt'), content.bio + '\n');

const article = fs.readFileSync(path.join(dir, 'article.md'), 'utf8');
const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const articleSections = article.trim().split(/\r?\n\s*\r?\n/);
const articleTitle = articleSections.shift().replace(/^#\s+/, '');
const articleBody = articleSections.map(p => '<p>' + escapeHtml(p).replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>') + '</p>').join('\n');
fs.writeFileSync(path.join(dir, 'article.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(articleTitle)} — The Daily Nun</title><style>*{box-sizing:border-box}body{background:#f6f5f0;color:#20201c;margin:0;font:18px/1.85 Georgia,serif}header,article,footer{max-width:760px;margin:auto;padding:30px 24px}header{border-bottom:3px double #20201c}header a{font:700 45px/1.1 Georgia,serif;letter-spacing:-.05em;color:inherit;text-decoration:none}h1{font-size:clamp(38px,8vw,62px);line-height:1.08;letter-spacing:-.05em;margin:14px 0 25px}.meta,footer{font:13px/1.7 Arial,sans-serif;color:#68685f}a{color:#2448b5;text-underline-offset:4px}a:focus-visible{outline:3px solid #2448b5;outline-offset:4px}p{margin:0 0 24px}footer{border-top:1px solid #c8c8bc}</style></head><body><header><a href="index.html">The Daily Nun</a></header><article><p class="meta">Media &amp; democracy / Draft for review</p><h1>${escapeHtml(articleTitle)}</h1><p class="meta">By Peter Nunley</p>${articleBody}</article><footer><a href="index.html">Return to the Instagram launch pack</a><br>Prepared article. Not yet published.</footer></body></html>`);

const captionText = ['# The Daily Nun — launch copy', '', 'Prepared assets; nothing has been posted.', ''];
for (const post of content.carousels) captionText.push(`## Carousel: ${post.title}`, '', ...post.slides.map((s, i) => `${i + 1}. ${s.title.replaceAll('\n', ' ')}${s.body ? ' — ' + s.body : ''}`), '', post.caption, '');
for (const reel of content.reels) captionText.push(`## Reel: ${reel.title}`, '', `Voiceover script: ${reel.voiceover}`, '', reel.caption, '');
fs.writeFileSync(path.join(dir, 'CAPTIONS.md'), captionText.join('\n'));
const postingRows = [
  ...content.carousels.map(p => [p.day, 'Carousel', p.title, 'carousels/' + p.id, p.pinned ? 'Yes' : '']),
  ...content.reels.map(p => [p.day, 'Reel', p.title, 'reels/' + p.id + '.mp4', '']),
  ...content.stories.map(p => [p.day, 'Optional Story', p.title.replaceAll('\n', ' '), 'stories/' + p.id + '.png', ''])
].sort((a, b) => a[0] - b[0]);
const csv = value => '"' + String(value).replaceAll('"', '""') + '"';
fs.writeFileSync(path.join(dir, 'posting-order.csv'), [['Launch day', 'Format', 'Title', 'Asset path', 'Pin'], ...postingRows].map(row => row.map(csv).join(',')).join('\n') + '\n');
const metricsPath = path.join(dir, 'metrics.csv');
if (!fs.existsSync(metricsPath)) fs.writeFileSync(metricsPath, 'Post ID,Published date,Observation date,Reach,Saves,Shares,Profile visits,Notes\n' + [...content.carousels, ...content.reels].map(p => p.id + ',,,,,,,').join('\n') + '\n');

const runtime = String.raw`
const data = __DATA__;
const colors={paper:'#f6f5f0',ink:'#20201c',blue:'#2448b5',muted:'#68685f',rule:'#c8c8bc'};
const specGroups=[...data.carousels.map(p=>({kind:'carousel',id:p.id,title:p.title,day:p.day})),...data.reels.map(p=>({kind:'reel',id:p.id,title:p.title,day:p.day})),...data.stories.map(p=>({kind:'story',id:p.id,title:p.title.replaceAll('\n',' '),day:p.day}))];
let selected=specGroups[0], slide=0;
function wrap(ctx,text,width){const lines=[];for(const paragraph of String(text||'').split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){const trial=line?line+' '+word:word;if(line&&ctx.measureText(trial).width>width){lines.push(line);line=word}else line=trial}if(line)lines.push(line)}return lines}
function drawArt(canvas,spec,width=1080,height=1350,footer=''){
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');const portrait=height>width*1.5;
  const blue=spec.theme==='blue';const bg=blue?colors.blue:colors.paper;const ink=blue?colors.paper:colors.ink;const accent=blue?colors.paper:colors.blue;
  const p=86;const inner=width-p*2;const headerY=portrait?190:86;const footerY=portrait?1670:1202;
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.textBaseline='top';ctx.fillStyle=ink;
  ctx.font='700 55px Georgia';ctx.fillText(data.brand,p,headerY);
  ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p,headerY+86);ctx.lineTo(width-p,headerY+86);ctx.stroke();
  const lines=String(spec.title).split('\n');let size=portrait?160:(spec.cover?146:112);let titleY=portrait?530:(spec.cover?320:306);
  if(spec.number){ctx.font='700 italic '+(portrait?330:310)+'px Georgia';ctx.fillStyle=accent;ctx.fillText(lines[0],p,portrait?490:265);ctx.fillStyle=ink;ctx.font='700 142px Georgia';ctx.fillText(lines.slice(1).join(' '),p,portrait?875:650);titleY=portrait?1060:840}
  else {while(size>64){ctx.font='700 '+size+'px Georgia';if(lines.every(line=>ctx.measureText(line).width<=inner))break;size-=2}ctx.fillStyle=ink;const step=size*1.1;lines.forEach((line,i)=>ctx.fillText(line,p,titleY+i*step));titleY+=lines.length*step;}
  const body=spec.body||'';if(body){ctx.font='400 52px Arial';const bodyLines=wrap(ctx,body,inner);const y=titleY+66;bodyLines.forEach((line,i)=>ctx.fillText(line,p,y+i*70));if(y+bodyLines.length*70>footerY-32)throw new Error('Text overflow: '+spec.title)}
  ctx.strokeStyle=ink;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p,footerY);ctx.lineTo(width-p,footerY);ctx.stroke();ctx.fillStyle=ink;ctx.font='400 27px Arial';
  ctx.fillText(footer||spec.sourceLabel||data.tagline,p,footerY+35);
  if(spec.sequence){ctx.textAlign='right';ctx.fillText(spec.sequence,width-p,footerY+35);ctx.textAlign='left'}
  return canvas;
}
function getSpec(kind,id,index=0){if(kind==='carousel'){const post=data.carousels.find(p=>p.id===id);return {spec:{...post.slides[index],sequence:(index+1)+' / '+post.slides.length},width:1080,height:1350}}if(kind==='reel'){const reel=data.reels.find(r=>r.id===id);return {spec:{...reel.beats[0],cover:true},width:1080,height:1920}}const story=data.stories.find(s=>s.id===id);return {spec:story,width:1080,height:1920}}
window.exportPng=(kind,id,index=0)=>{const asset=getSpec(kind,id,index);return drawArt(document.createElement('canvas'),asset.spec,asset.width,asset.height).toDataURL('image/png')};
window.exportProfile=()=>{const c=document.createElement('canvas');c.width=c.height=1080;const x=c.getContext('2d');x.fillStyle=colors.blue;x.fillRect(0,0,1080,1080);x.fillStyle=colors.paper;x.textAlign='center';x.textBaseline='middle';x.font='700 182px Georgia';['The','Daily','Nun'].forEach((line,i)=>x.fillText(line,540,338+i*186));return c.toDataURL('image/png')};
window.exportOverview=()=>{const c=document.createElement('canvas');c.width=1740;c.height=1810;const x=c.getContext('2d');x.fillStyle='#e4e4dc';x.fillRect(0,0,c.width,c.height);x.fillStyle=colors.ink;x.font='700 78px Georgia';x.fillText(data.brand,60,105);x.font='30px Arial';x.fillText('Instagram launch / six short posts',60,158);const items=[...data.carousels.map(p=>({kind:'carousel',id:p.id,title:p.title})),...data.reels.map(p=>({kind:'reel',id:p.id,title:p.title}))];items.forEach((item,i)=>{const a=getSpec(item.kind,item.id);const art=drawArt(document.createElement('canvas'),a.spec,a.width,a.height);const col=i%3,row=Math.floor(i/3),px=60+col*560,py=220+row*790;const cw=500,ch=625;if(item.kind==='carousel')x.drawImage(art,px,py,cw,ch);else{x.fillStyle=colors.paper;x.fillRect(px,py,cw,ch);x.drawImage(art,px+(cw-ch*1080/1920)/2,py,ch*1080/1920,ch)}x.fillStyle=colors.ink;x.font='25px Arial';x.fillText(item.kind==='carousel'?'3-slide carousel':'15-second text Reel',px,py+665)});return c.toDataURL('image/png')};
window.recordReel=async(id)=>{
  const reel=data.reels.find(r=>r.id===id);if(!reel)throw Error('Unknown Reel');
  const mime=['video/mp4;codecs=avc1.42001E','video/mp4;codecs=avc1','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw Error('MP4 recording unavailable');
  const c=document.createElement('canvas');c.width=1080;c.height=1920;
  const stream=c.captureStream(30);const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});const chunks=[];
  const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=e=>reject(e.error||Error('Recording failed'));recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/mp4'}))});
  const start=performance.now();let timer;
  const paint=()=>{const t=Math.min((performance.now()-start)/1000,reel.duration-.001);const beat=reel.beats.find(b=>t>=b.start&&t<b.end)||reel.beats.at(-1);drawArt(c,beat,1080,1920);};
  paint();recorder.start(1000);timer=setInterval(paint,1000/30);
  await new Promise(resolve=>setTimeout(resolve,reel.duration*1000));clearInterval(timer);recorder.stop();const blob=await done;stream.getTracks().forEach(track=>track.stop());
  return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
};
function renderSelection(){const asset=getSpec(selected.kind,selected.id,slide);const canvas=document.getElementById('art');drawArt(canvas,asset.spec,asset.width,asset.height);canvas.setAttribute('aria-label',asset.spec.alt||selected.title);const post=selected.kind==='carousel'?data.carousels.find(p=>p.id===selected.id):selected.kind==='reel'?data.reels.find(p=>p.id===selected.id):data.stories.find(p=>p.id===selected.id);document.getElementById('selected-title').textContent=post.title.replaceAll('\n',' ');document.getElementById('caption').value=post.caption||'';document.getElementById('caption-section').hidden=!post.caption;document.getElementById('slide-controls').hidden=selected.kind!=='carousel';document.getElementById('counter').textContent=selected.kind==='carousel'?(slide+1)+' / '+post.slides.length:'';document.getElementById('previous').disabled=slide===0;document.getElementById('next').disabled=selected.kind!=='carousel'||slide===post.slides.length-1;const video=document.getElementById('reel-video');video.pause();video.hidden=selected.kind!=='reel';if(selected.kind==='reel'){video.src='reels/'+post.id+'.mp4';video.poster='reels/'+post.id+'-cover.png';document.getElementById('asset-link').href='reels/'+post.id+'.mp4';document.getElementById('asset-link').textContent='Download silent MP4';document.getElementById('format-note').textContent='1080 × 1920 / 15 seconds / silent text video';}else{video.removeAttribute('src');document.getElementById('asset-link').href=selected.kind==='carousel'?'carousels/'+post.id+'/slide-'+String(slide+1).padStart(2,'0')+'.png':'stories/'+post.id+'.png';document.getElementById('asset-link').textContent='Download image';document.getElementById('format-note').textContent=selected.kind==='carousel'?'1080 × 1350 / three-slide carousel':'1080 × 1920 / Story card'}document.querySelectorAll('[data-asset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.asset===selected.id)));}
const picker=document.getElementById('picker');for(const [kind,label] of [['carousel','Carousels'],['reel','Reels'],['story','Stories']]){const h=document.createElement('h2');h.textContent=label;picker.append(h);for(const item of specGroups.filter(s=>s.kind===kind)){const button=document.createElement('button');button.type='button';button.dataset.asset=item.id;button.textContent=item.title;button.addEventListener('click',()=>{selected=item;slide=0;renderSelection()});picker.append(button)}}
document.getElementById('previous').addEventListener('click',()=>{slide--;renderSelection()});document.getElementById('next').addEventListener('click',()=>{slide++;renderSelection()});
document.getElementById('copy-caption').addEventListener('click',async()=>{const field=document.getElementById('caption');try{await navigator.clipboard.writeText(field.value);document.getElementById('copy-status').textContent='Caption copied.'}catch{field.focus();field.select();document.getElementById('copy-status').textContent='Caption selected. Use your copy command.'}});
renderSelection();
`;

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The Daily Nun — Instagram launch</title><style>
:root{color-scheme:light;--paper:#f6f5f0;--ink:#20201c;--blue:#2448b5;--rule:#c8c8bc}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 Arial,sans-serif}a{color:var(--blue);text-underline-offset:4px}button,a:focus-visible,textarea:focus-visible{outline-offset:4px}button:focus-visible,a:focus-visible,textarea:focus-visible{outline:3px solid var(--blue)}button{font:inherit;cursor:pointer}[hidden]{display:none!important}header{max-width:1260px;margin:auto;padding:30px 30px 24px;border-bottom:3px double var(--ink)}header h1{font:700 clamp(42px,6vw,74px)/1.1 Georgia,serif;letter-spacing:-.055em;margin:0 0 12px}header p{margin:0;color:#68685f}.toplinks{display:flex;flex-wrap:wrap;gap:22px;margin-top:18px}.layout{display:grid;grid-template-columns:235px minmax(0,460px) minmax(240px,1fr);gap:35px;max-width:1260px;padding:32px 30px;margin:auto}#picker{border-right:1px solid var(--rule);padding-right:22px}#picker h2{font-size:13px;color:var(--blue);font-weight:400;margin:0 0 10px}#picker h2:not(:first-child){margin-top:25px}#picker button{display:block;width:100%;text-align:left;padding:12px;border:0;border-bottom:1px solid var(--rule);background:transparent;color:var(--ink);line-height:1.35}#picker button[aria-pressed=true]{background:var(--blue);color:white;border-color:var(--blue)}canvas{display:block;width:100%;height:auto;border:1px solid var(--rule)}#art{max-height:690px;width:auto;max-width:100%;margin:0 auto}#selected-title{font:700 30px/1.15 Georgia,serif;margin:0 0 20px;letter-spacing:-.035em}.caption-title{font-size:13px;margin:25px 0 10px;color:var(--blue)}textarea{width:100%;min-height:310px;resize:vertical;padding:14px;background:#fff;border:1px solid var(--rule);font:14px/1.7 Arial,sans-serif;color:var(--ink)}.controls{display:flex;justify-content:space-between;align-items:center;margin-top:15px;gap:12px}.controls button,#copy-caption{padding:8px 13px;border:1px solid var(--ink);background:transparent;color:var(--ink)}.controls button:disabled{opacity:.35;cursor:default}#copy-caption{margin-top:10px}#copy-status{font-size:12px;color:#68685f}#format-note{color:#68685f;font-size:12px}video{width:100%;max-height:470px;margin-top:20px;background:#20201c}.note{font-size:13px;color:#68685f;line-height:1.8}.docs{border-top:1px solid var(--rule);padding-top:17px;margin-top:24px}.docs a{display:block;margin:7px 0}footer{max-width:1200px;margin:10px auto 25px;padding:20px 0;border-top:1px solid var(--ink);font-size:12px;color:#68685f}@media(max-width:1000px){.layout{grid-template-columns:190px minmax(0,1fr)}.detail{grid-column:2}}@media(max-width:640px){header{padding:25px 20px}.layout{display:block;padding:23px 20px}#picker{border-right:0;padding:0;margin-bottom:25px}#picker button{display:inline-block;width:auto;max-width:100%;margin-right:7px}#picker h2{margin-top:15px!important}#art{max-height:none;width:100%}.detail{margin-top:30px}footer{margin:0 20px 20px}.toplinks{gap:14px}}
</style></head><body><header><h1>The Daily Nun</h1><p>Instagram launch pack / Minimal copy. One idea per post.</p><nav class="toplinks" aria-label="Launch resources"><a href="../daily-nun-instagram-launch.zip" download>Download the complete pack</a><a href="article.html">Read the opening article</a><a href="DEPARTMENTS.md">Newsroom workflow</a><a href="brand/profile.png" download>Profile image</a></nav></header><main class="layout"><nav id="picker" aria-label="Select a post"></nav><section aria-label="Selected design"><canvas id="art" width="1080" height="1350" role="img"></canvas><div class="controls" id="slide-controls"><button id="previous">Previous</button><span id="counter" aria-live="polite"></span><button id="next">Next</button></div></section><section class="detail"><h2 id="selected-title"></h2><p id="format-note"></p><a id="asset-link" download>Download image</a><video id="reel-video" controls playsinline preload="metadata" hidden></video><section id="caption-section"><p class="caption-title">Caption and sources</p><textarea id="caption" readonly aria-label="Caption and source links"></textarea><button id="copy-caption">Copy caption</button><p id="copy-status" role="status"></p></section><div class="docs"><p class="note">Prepared assets. Nothing has been posted. The videos contain text and no audio; optional voiceover scripts are included in the pack.</p><a href="CAPTIONS.md">All post copy</a><a href="brand/bio.txt">Instagram bio</a><a href="DEPARTMENTS.md">Posting sequence and departments</a></div></section></main><footer>Prepared for review / The Daily Nun</footer><script>${runtime.replace('__DATA__', JSON.stringify(content).replaceAll('<', '\\u003c'))}</script></body></html>`;

fs.writeFileSync(path.join(dir, 'index.html'), page);
fs.writeFileSync(path.join(dir, 'README.md'), `# The Daily Nun — Instagram launch\n\nOpen index.html to preview the pack and copy captions.\n\n- Three carousels, three slides each, in carousels/.\n- Three 15-second silent text MP4s and optional voiceover scripts in reels/.\n- Four optional Story cards in stories/.\n- Profile image and bio in brand/.\n- Opening newspaper article in article.html.\n- Source URLs and accessibility descriptions in content.json and the per-post files.\n- Departments and relative posting order in DEPARTMENTS.md.\n\nUpload carousel images in filename order and apply the supplied per-slide alt text when uploading. PNG files do not automatically populate Instagram's accessibility fields. Reel captions include the on-screen transcript; retain it when publishing.\n\nThe complete downloadable archive is ../daily-nun-instagram-launch.zip.\n\nAll assets are unpublished. No account, handle, audience result, or public destination is claimed. The design and copy are ready for Peter's review.\n`);
console.log('Built the launch studio, captions, scripts, and production folders.');
