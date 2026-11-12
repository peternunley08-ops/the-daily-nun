import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
fs.mkdirSync(path.join(dir, 'png'), { recursive: true });
const words = value => value.trim().split(/\s+/).length;
for (const s of data.stories) {
  if (words(s.headline.join(' ')) > 8 || words(s.body) > 18) throw Error('Copy too long: ' + s.id);
}
const sourceNotes = ['# The Daily Nun: source checks', '', 'Verified through gstack /browse on November 12, 2026. These are current media topics, not six claims of breaking news. The 2025 findings are visibly dated.', ''];
const copy = ['# The Daily Nun: six current-media Stories', '', '1080 × 1920 PNG files. Each Story stands alone. Suggested order matches filenames; publish individually or as a short series.', ''];
for (const s of data.stories) {
  sourceNotes.push(`## ${s.headline.join(' ')}`, '', `[${s.sourceTitle}](${s.url})`, '', `Publisher: ${s.publisher}. ${s.published ? 'Published: ' + s.published + '. ' : ''}Source type: ${s.sourceType}.`, '', s.evidence, '', ...(s.measurement ? [s.measurement, ''] : []), `Limits: ${s.limits}`, '');
  copy.push(`## ${s.headline.join(' ')}`, '', s.body, '', ...s.sourceLabel, '', `Image: png/${s.id}.png`, '', `Link sticker: Read the source — ${s.url}`, '', `Accessibility description: ${s.alt}`, '');
}
fs.writeFileSync(path.join(dir, 'SOURCES.md'), sourceNotes.join('\n'));
fs.writeFileSync(path.join(dir, 'COPY.md'), copy.join('\n'));
fs.writeFileSync(path.join(dir, 'README.md'), '# Six current-media Stories\n\nOpen index.html to preview and download individual images. Upload the PNGs in png/ as Instagram Stories. Each is 1080 × 1920.\n\nAdd a real Instagram link sticker using the corresponding source URL in COPY.md; source text printed on an image is not clickable. Keep the survey years and populations visible. The source notes distinguish platform statements, survey findings, and editorial interpretation.\n\nAccessibility descriptions and complete text are in COPY.md and content.json. Use them wherever the publishing interface supports descriptions or provide a text equivalent when repurposing.\n\nThese are unpublished assets. No accounts or posting schedules have been created.\n');
const runtime = String.raw`
const data=__DATA__;
const themes={paper:{bg:'#f6f5f0',fg:'#20201c',detail:'#2448b5'},blue:{bg:'#2448b5',fg:'#f6f5f0',detail:'#f6f5f0'},ink:{bg:'#20201c',fg:'#f6f5f0',detail:'#f6f5f0'}};
window.layoutChecks=[];
function wrap(x,text,width){const lines=[];let line='';for(const word of text.split(/\s+/)){const trial=line?line+' '+word:word;if(line&&x.measureText(trial).width>width){lines.push(line);line=word}else line=trial}if(line)lines.push(line);return lines}
function drawStory(s){const c=document.createElement('canvas');c.width=1080;c.height=1920;const x=c.getContext('2d');const t=themes[s.theme],p=90,w=900;
 x.fillStyle=t.bg;x.fillRect(0,0,1080,1920);x.textBaseline='top';x.fillStyle=t.fg;
 x.font='700 55px Georgia';x.fillText(data.brand,p,208);x.lineWidth=2;x.strokeStyle=t.fg;x.beginPath();x.moveTo(p,294);x.lineTo(990,294);x.stroke();
 x.font='400 32px Arial';x.fillStyle=t.detail;x.fillText(s.topic,p,332);
 let size=194;while(size>100){x.font=size+'px Impact';if(s.headline.every(line=>x.measureText(line).width<=w))break;size-=2}
 x.fillStyle=t.fg;const y=535,step=size*1.06;for(let i=0;i<s.headline.length;i++)x.fillText(s.headline[i],p,y+i*step);
 const bodyY=Math.max(1130,y+s.headline.length*step+80);x.font='400 52px Arial';const bodyLines=wrap(x,s.body,w);for(let i=0;i<bodyLines.length;i++)x.fillText(bodyLines[i],p,bodyY+i*69);
 const bodyBottom=bodyY+bodyLines.length*69;const sourceY=1535;
 if(bodyBottom>sourceY-45)throw Error('Body overflow: '+s.id);
 x.lineWidth=1.5;x.beginPath();x.moveTo(p,sourceY);x.lineTo(990,sourceY);x.stroke();x.font='400 29px Arial';s.sourceLabel.forEach((line,i)=>x.fillText(line,p,sourceY+35+i*43));
 window.layoutChecks.push({id:s.id,headlineSize:size,bodyLines:bodyLines.length,bodyBottom,sourceBottom:sourceY+121});
 return c;
}
window.exportStory=id=>drawStory(data.stories.find(s=>s.id===id)).toDataURL('image/png');
window.exportOverview=()=>{const c=document.createElement('canvas');c.width=1800;c.height=2390;const x=c.getContext('2d');x.fillStyle='#e6e7e2';x.fillRect(0,0,c.width,c.height);x.fillStyle='#20201c';x.font='700 76px Georgia';x.fillText(data.brand,60,112);x.font='30px Arial';x.fillText('Six current-media Stories / short hooks, sourced claims',60,171);data.stories.forEach((s,i)=>{const px=60+(i%3)*570,py=235+Math.floor(i/3)*1065;x.drawImage(drawStory(s),px,py,540,960);x.font='24px Arial';x.fillStyle='#20201c';x.fillText(s.topic,px,py+1005)});return c.toDataURL('image/png')};
const grid=document.querySelector('#stories');for(const s of data.stories){const card=document.createElement('article');const canvas=drawStory(s);canvas.role='img';canvas.setAttribute('aria-label',s.alt);card.append(canvas);const h=document.createElement('h2');h.textContent=s.headline.join(' ');card.append(h);const p=document.createElement('p');p.textContent=s.body;card.append(p);const a=document.createElement('a');a.href='png/'+s.id+'.png';a.download=s.id+'.png';a.textContent='Download Story';a.className='download';card.append(a);const b=document.createElement('button');b.textContent='Copy text + source';b.addEventListener('click',async()=>{const text=s.headline.join(' ')+'\n\n'+s.body+'\n\n'+s.sourceLabel.join('\n')+'\n'+s.url;try{await navigator.clipboard.writeText(text);b.textContent='Copied';setTimeout(()=>b.textContent='Copy text + source',1600)}catch{document.querySelector('#copy-field').value=text;document.querySelector('#copy-panel').hidden=false;document.querySelector('#copy-field').focus();document.querySelector('#copy-field').select()}});card.append(b);const source=document.createElement('a');source.href=s.url;source.target='_blank';source.rel='noopener noreferrer';source.className='source';source.textContent=s.sourceTitle;card.append(source);grid.append(card)}
`;
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Daily Nun — New Stories</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f5f0;color:#20201c;font:16px/1.6 Arial,sans-serif}header,main,footer{max-width:1250px;margin:auto;padding:28px 26px}header{padding-top:42px}.masthead{font:700 40px/1.1 Georgia,serif;letter-spacing:-.04em;color:inherit;text-decoration:none}h1{font:700 clamp(45px,7vw,80px)/1.02 Georgia,serif;letter-spacing:-.05em;margin:28px 0 16px}header p{max-width:650px;color:#68685f}nav{display:flex;flex-wrap:wrap;gap:12px 25px;margin-top:25px}a{color:#2448b5;text-underline-offset:4px}a:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid #2448b5;outline-offset:4px}#stories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:55px 26px}article{min-width:0}canvas{display:block;width:100%;height:auto}h2{font-size:21px;line-height:1.25;margin:19px 0 10px}article p{font-size:14px;min-height:47px;margin:0 0 15px}button{font:14px Arial;cursor:pointer;border:0;border-bottom:1px solid;background:transparent;color:#2448b5;padding:0;margin-left:15px}.download{font-size:14px}.source{display:block;font-size:12px;margin-top:17px;color:#68685f}footer{font-size:13px;color:#68685f;border-top:1px solid #c8c8bc;margin-top:30px}textarea{width:100%;height:200px}#copy-panel{padding:25px;border:1px solid #20201c;margin-bottom:30px}[hidden]{display:none!important}@media(max-width:850px){#stories{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){#stories{grid-template-columns:1fr;gap:45px}header,main,footer{padding-left:20px;padding-right:20px}canvas{max-width:400px;margin:auto}article p{min-height:0}}
</style></head><body><header><a class="masthead" href="../index.html">The Daily Nun</a><h1>New stories.</h1><p>Six current media topics. One hook and one fact per card. Checked November 12, 2026.</p><nav aria-label="Story resources"><a href="../daily-nun-current-media-stories.zip" download>Download all six</a><a href="COPY.md">Copy &amp; link stickers</a><a href="SOURCES.md">Sources &amp; context</a><a href="../instagram-launch/index.html">Earlier launch pack</a></nav></header><main><section id="copy-panel" hidden aria-label="Copy text"><p>Select and copy this text.</p><textarea id="copy-field" aria-label="Story text and source" readonly></textarea></section><section id="stories" aria-label="Six Instagram Story designs"></section></main><footer>1080 × 1920 / Add the source URL as a real Instagram link sticker. Printed source labels are not clickable. These assets have not been posted.</footer><script>${runtime.replace('__DATA__',JSON.stringify(data).replaceAll('<','\\u003c'))}</script></body></html>`;
fs.writeFileSync(path.join(dir,'index.html'),html);
console.log('Built six Stories, preview, copy, source notes, and accessibility descriptions.');
