"""Render all pages for visual review and check text/link integrity offline."""
from pathlib import Path
import json
import pdfplumber
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
PDF=ROOT/'output/pdf/who-shapes-what-america-knows.pdf'
BUILD=ROOT/'.build'
BUILD.mkdir(exist_ok=True)
pdf=pdfium.PdfDocument(str(PDF))
reader=PdfReader(PDF)
page_info=[]
outside=[]
with pdfplumber.open(PDF) as extracted:
    for i,page in enumerate(extracted.pages,1):
        text=page.extract_text() or ''
        page_info.append({'page':i,'words':len(text.split()),'first_lines':text.splitlines()[:4]})
        if not text.strip():raise ValueError(f'Blank page {i}')
        for char in page.chars:
            if char['x0'] < -1 or char['x1'] > page.width+1 or char['top'] < -1 or char['bottom'] > page.height+1:
                outside.append({'page':i,'char':char['text'],'bounds':[char['x0'],char['x1'],char['top'],char['bottom']]})
if outside:raise ValueError(f'Out-of-page text: {outside[:10]}')
bad_links=[]
uri_count=0
for i,page in enumerate(reader.pages,1):
    for a in page.get('/Annots',[]):
        annotation=a.get_object();action=annotation.get('/A',{})
        if action.get('/S')=='/URI':
            uri=str(action.get('/URI',''));uri_count+=1
            if not uri.startswith('https://'):bad_links.append({'page':i,'uri':uri})
assert not bad_links,bad_links
sheet_files=[]
for start in range(0,len(pdf),16):
    thumb_w=270;thumb_h=382;gap=20;cols=4;rows=4
    sheet=Image.new('RGB',(cols*(thumb_w+gap)+gap,rows*(thumb_h+35+gap)+gap),'#e8e9e4')
    draw=ImageDraw.Draw(sheet)
    for pos,index in enumerate(range(start,min(start+16,len(pdf)))):
        image=pdf[index].render(scale=0.6).to_pil().convert('RGB')
        image.thumbnail((thumb_w,thumb_h))
        x=gap+(pos%cols)*(thumb_w+gap);y=gap+(pos//cols)*(thumb_h+35+gap)
        sheet.paste(image,(x,y));draw.text((x,y+thumb_h+5),f'Page {index+1}',fill='#20201c')
    target=BUILD/f'contact-{start+1:02d}-{min(start+16,len(pdf)):02d}.png';sheet.save(target);sheet_files.append(target.name)
# Larger review samples: cover, contents, representative prose, ownership rows,
# glossary and bibliography. All remaining pages are represented in contact sheets.
samples={0,1,2,len(pdf)-1}
for index,page in enumerate(reader.pages):
    t=page.extract_text() or ''
    if any(term in t for term in ['Dated evidence and caution','Glossary','Bibliography and source notes']):samples.add(index)
for index in sorted(samples):pdf[index].render(scale=1.35).to_pil().save(BUILD/f'page-{index+1:02d}.png')
result={'pages':len(pdf),'external_links':uri_count,'out_of_page_characters':0,'blank_pages':0,'contact_sheets':sheet_files,'rendered_samples':[f'page-{i+1:02d}.png' for i in sorted(samples)],'page_info':page_info}
(BUILD/'review.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='page_info'},indent=2))
