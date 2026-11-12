"""Build the sourced report PDF and a linked Markdown edition; no network calls."""
from __future__ import annotations
import html
import json
import re
from collections import OrderedDict
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, CondPageBreak, Flowable, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph,
    Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'who-shapes-what-america-knows.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
BLUE = colors.HexColor('#2448b5')
INK = colors.HexColor('#20201c')
GRAY = colors.HexColor('#68685f')
PAPER = colors.HexColor('#f6f5f0')
WIDTH, HEIGHT = A4
MARGIN = 46
CONTENT_WIDTH = WIDTH - MARGIN * 2

def clean(text: str) -> str:
    return str(text).replace('\ufeff', '').replace('\u00a0', ' ').replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', ' - ').replace('\u2212', '-')

def word_count(text: str) -> int:
    text = re.sub(r'\[[HMOE]\d{2}\]', '', text)
    return len(re.findall(r"\b[\w’'-]+\b", text))

def scalar(value):
    if isinstance(value, list): return '; '.join(map(str, value))
    return str(value or '')

records = []
for name in ['editorial.json', 'ownership.json', 'media.json', 'evidence.json']:
    rows = json.loads((ROOT / 'sources' / name).read_text(encoding='utf-8-sig'))
    assert isinstance(rows, list), name
    records.extend(rows)
by_id = {s['id']: s for s in records}
assert len(by_id) == len(records), 'Duplicate source IDs'

chapter_files = ['01-03.md', '04.md', '05-07.md', '08-10.md']
chapters = '\n\n'.join((ROOT / 'chapters' / p).read_text(encoding='utf-8-sig') for p in chapter_files)
chapter_heads = re.findall(r'^#{1,2} (\d+)\. (.+)$', chapters, re.M)
assert [int(n) for n, _ in chapter_heads] == list(range(1, 11)), chapter_heads
used = set(re.findall(r'\[([HMOE]\d{2})\]', chapters))
assert used == set(by_id), {'missing': sorted(used-set(by_id)), 'uncited': sorted(set(by_id)-used)}
assert all(s.get('verified') for s in records), 'Unverified source record'
assert not re.search(r'\bp[ -]?nun\b', chapters, re.I), 'Disallowed branding'

# Group duplicate citations to the same record without discarding either stable source ID.
groups = OrderedDict()
for source in records:
    key = source['url'].rstrip('/').lower()
    if key not in groups:
        groups[key] = {**source, 'aliases': [source['id']]}
    else:
        groups[key]['aliases'].append(source['id'])
unique = list(groups.values())
number = {}
for i, source in enumerate(unique, 1):
    source['number'] = i
    for alias in source['aliases']: number[alias] = i
assert 40 <= len(unique) <= 60, len(unique)

# Standard PDF fonts are available everywhere; embed Georgia/Arial when available.
font_root = Path('C:/Windows/Fonts')
font_files = {'Body': 'georgia.ttf', 'Body-Bold': 'georgiab.ttf', 'Body-Italic': 'georgiai.ttf',
              'Body-BoldItalic': 'georgiaz.ttf', 'Sans': 'arial.ttf', 'Sans-Bold': 'arialbd.ttf',
              'Sans-Italic': 'ariali.ttf', 'Sans-BoldItalic': 'arialbi.ttf'}
if all((font_root / f).exists() for f in font_files.values()):
    for name, file in font_files.items(): pdfmetrics.registerFont(TTFont(name, str(font_root / file)))
    pdfmetrics.registerFontFamily('Body', normal='Body', bold='Body-Bold', italic='Body-Italic', boldItalic='Body-BoldItalic')
    pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='Sans-Bold', italic='Sans-Italic', boldItalic='Sans-BoldItalic')
else:
    font_files = {}
    for family, builtins in [('Body', ['Times-Roman','Times-Bold','Times-Italic','Times-BoldItalic']), ('Sans',['Helvetica','Helvetica-Bold','Helvetica-Oblique','Helvetica-BoldOblique'])]:
        pdfmetrics.registerFontFamily(family, normal=builtins[0],bold=builtins[1],italic=builtins[2],boldItalic=builtins[3])

BODY = 'Body' if font_files else 'Times-Roman'
SANS = 'Sans' if font_files else 'Helvetica'
BODY_BOLD = 'Body-Bold' if font_files else 'Times-Bold'
SANS_BOLD = 'Sans-Bold' if font_files else 'Helvetica-Bold'
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='ReportBody',fontName=SANS,fontSize=10.5,leading=14,textColor=INK,spaceAfter=6,alignment=TA_LEFT,allowWidows=0,allowOrphans=0))
styles.add(ParagraphStyle(name='ChapterTitle',fontName=BODY_BOLD,fontSize=27,leading=30,textColor=INK,spaceAfter=19,keepWithNext=1))
styles.add(ParagraphStyle(name='SectionTitle',fontName=SANS_BOLD,fontSize=12,leading=15,textColor=BLUE,spaceBefore=14,spaceAfter=8,keepWithNext=1))
styles.add(ParagraphStyle(name='Small',fontName=SANS,fontSize=9,leading=12,textColor=GRAY,spaceAfter=8))
styles.add(ParagraphStyle(name='TableCell',fontName=SANS,fontSize=9,leading=12.2,textColor=INK,spaceAfter=0))
styles.add(ParagraphStyle(name='TableHead',fontName=SANS_BOLD,fontSize=9,leading=12.2,textColor=colors.white,spaceAfter=0))
styles.add(ParagraphStyle(name='Reference',fontName=SANS,fontSize=9.1,leading=12,textColor=INK,spaceAfter=4))
styles.add(ParagraphStyle(name='ReferenceNote',fontName=SANS,fontSize=8.2,leading=10.8,textColor=GRAY,spaceAfter=12))
styles.add(ParagraphStyle(name='TOCChapter',fontName=BODY,fontSize=11,leading=17,leftIndent=0,firstLineIndent=0,spaceBefore=7,textColor=INK))
styles.add(ParagraphStyle(name='Glossary',fontName=SANS,fontSize=9.6,leading=12.6,textColor=INK,spaceAfter=0))

def inline(text):
    text = clean(text)
    text = html.escape(text, quote=False)
    text = re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    text = re.sub(r'(?<!\*)\*([^*]+)\*',r'<i>\1</i>',text)
    def cite(m):
        sid=m.group(1); source=by_id[sid]
        return '<link href="'+html.escape(source['url'],quote=True)+'" color="#2448b5">['+str(number[sid])+']</link>'
    return re.sub(r'\[([HMOE]\d{2})\]',cite,text)

class RouteDiagram(Flowable):
    def __init__(self): super().__init__(); self.width=CONTENT_WIDTH; self.height=88
    def draw(self):
        c=self.canv; labels=[('Report','Establish evidence'),('Publish','Choose and edit'),('Distribute','Rank and share'),('Interpret','Read and respond')]
        box=112; gap=(CONTENT_WIDTH-box*4)/3
        for i,(title,sub) in enumerate(labels):
            x=i*(box+gap); c.setFillColor(PAPER);c.setStrokeColor(BLUE);c.rect(x,28,box,47,fill=1,stroke=1)
            c.setFillColor(INK);c.setFont(SANS_BOLD,10);c.drawString(x+9,57,title);c.setFont(SANS,7.8);c.drawString(x+9,42,sub)
            if i<3:
                c.setStrokeColor(BLUE);c.line(x+box+2,52,x+box+gap-2,52)
        c.setFillColor(GRAY);c.setFont(SANS,8);c.drawString(0,10,'Illustrative roles, not a universal sequence or a measure of influence.')

def page(c,doc):
    if doc.page==1:
        c.setFillColor(PAPER);c.rect(0,0,WIDTH,HEIGHT,fill=1,stroke=0);return
    c.saveState();c.setStrokeColor(colors.HexColor('#c8c8bc'));c.setLineWidth(.5);c.line(MARGIN,HEIGHT-37,WIDTH-MARGIN,HEIGHT-37)
    c.setFont(SANS,8);c.setFillColor(BLUE);c.drawString(MARGIN,HEIGHT-27,'THE DAILY NUN')
    c.setFillColor(GRAY);c.drawRightString(WIDTH-MARGIN,HEIGHT-27,'Media, polarization, and U.S. democracy')
    c.line(MARGIN,37,WIDTH-MARGIN,37);c.setFont(SANS,8);c.drawString(MARGIN,25,'Research edition | November 2026');c.drawRightString(WIDTH-MARGIN,25,str(doc.page));c.restoreState()

class ReportDoc(BaseDocTemplate):
    def afterFlowable(self,f):
        if isinstance(f,Paragraph) and getattr(f,'toc_entry',None):
            title,key=f.toc_entry
            self.canv.bookmarkPage(key);self.canv.addOutlineEntry(title,key,level=0,closed=False)
            self.notify('TOCEntry',(0,title,self.page,key))

class Cover(Flowable):
    def __init__(self): super().__init__();self.width=CONTENT_WIDTH;self.height=650
    def draw(self):
        c=self.canv;c.saveState();c.setFillColor(PAPER);c.rect(-MARGIN,-100,WIDTH,HEIGHT+140,fill=1,stroke=0)
        c.setFillColor(INK);c.setFont(BODY_BOLD,32);c.drawString(0,608,'The Daily Nun');c.setStrokeColor(INK);c.setLineWidth(1);c.line(0,586,CONTENT_WIDTH,586)
        c.setFillColor(BLUE);c.setFont(SANS,12);c.drawString(0,552,'First research report')
        c.setFillColor(INK);c.setFont(BODY_BOLD,43)
        for y,line in [(440,'Who Shapes'),(388,'What America'),(336,'Knows?')]:c.drawString(0,y,line)
        c.setFont(BODY,19);c.drawString(0,279,'Media, Polarization, and U.S. Democracy')
        c.setFont(SANS,11);c.drawString(0,182,'Prepared for Peter Nunley');c.drawString(0,162,'An AI-assisted research synthesis for curious readers')
        c.setStrokeColor(BLUE);c.line(0,123,CONTENT_WIDTH,123);c.setFillColor(GRAY);c.setFont(SANS,9)
        for y,line in [(99,'Intended event cutoff: November 11, 2026'),(83,'Compiled and checked: November 12, 2026'),(57,'Ten chapters | Dated ownership map | Glossary | Clickable bibliography')]:c.drawString(0,y,line)
        c.restoreState()

flow=[]
flow.extend([Cover(),PageBreak(),Paragraph('Contents',styles['ChapterTitle'])])
toc=TableOfContents();toc.levelStyles=[styles['TOCChapter']];flow.extend([toc,Spacer(1,22),Paragraph('Citations link directly to sources. Page numbers refer to this PDF, including its cover and contents.',styles['Small']),PageBreak()])

def title(text,key):
    p=Paragraph(inline(text),styles['ChapterTitle']);p.toc_entry=(clean(text),key);flow.append(p)

def add_table(lines):
    rows=[]
    for i,line in enumerate(lines):
        cells=[c.strip() for c in line.strip().strip('|').split('|')]
        if i==1 and all(re.fullmatch(r'[: -]+',c) for c in cells):continue
        rows.append([Paragraph(inline(c),styles['TableHead'] if not rows else styles['TableCell']) for c in cells])
    widths=[112,192,CONTENT_WIDTH-304] if len(rows[0])==3 else [CONTENT_WIDTH/len(rows[0])]*len(rows[0])
    t=Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),BLUE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PAPER]),('LINEBELOW',(0,0),(-1,0),.7,BLUE),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#d8d8cf'))]))
    flow.extend([t,Spacer(1,9)])

def add_markdown(text,chapter_breaks=True,prefix='section'):
    lines=clean(text).splitlines();i=0;section=0
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line.startswith('|'):
            table=[]
            while i<len(lines) and lines[i].strip().startswith('|'):table.append(lines[i]);i+=1
            add_table(table);continue
        chapter=re.match(r'^#{1,2} (\d+)\. (.+)$',line)
        if chapter:
            if chapter_breaks:flow.extend([CondPageBreak(175),Spacer(1,14)])
            title(chapter.group(1)+'. '+chapter.group(2),'chapter-'+chapter.group(1));i+=1;continue
        if line.startswith('# '):
            section+=1;title(line[2:],prefix+'-'+str(section));i+=1;continue
        if re.match(r'^#{2,3} ',line):flow.append(Paragraph(inline(re.sub(r'^#{2,3} ','',line)),styles['SectionTitle']));i+=1;continue
        if line.startswith('- '):flow.append(Paragraph(inline(line[2:]),styles['ReportBody'],bulletText='-'));i+=1;continue
        paragraph=[line];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(#{1,3} |\||- )',lines[i].strip()):paragraph.append(lines[i].strip());i+=1
        flow.append(Paragraph(inline(' '.join(paragraph)),styles['ReportBody']))

front=(ROOT/'front-matter.md').read_text(encoding='utf-8')
add_markdown(front,False,'guide')
flow.append(RouteDiagram())
add_markdown(chapters,True)
flow.append(PageBreak());glossary=(ROOT/'glossary.md').read_text(encoding='utf-8');title('Glossary','glossary')
definitions=[p.strip() for p in glossary.split('\n\n') if p.strip() and not p.startswith('#')]
mid=(len(definitions)+1)//2
gloss_rows=[]
for i in range(mid):
    gloss_rows.append([Paragraph(inline(definitions[i]),styles['Glossary']),Paragraph(inline(definitions[mid+i]),styles['Glossary']) if mid+i<len(definitions) else ''])
gloss_table=Table(gloss_rows,colWidths=[CONTENT_WIDTH/2]*2,hAlign='LEFT')
gloss_table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),18),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),5)]));flow.append(gloss_table)
flow.append(PageBreak());title('Bibliography and source notes','bibliography')
flow.append(Paragraph(str(len(unique))+' distinct sources. Repeated citations to the same URL share one number. Source types and access limits are shown so corporate statements and abstract-only verification remain visible.',styles['Small']))
bib_md=['# Bibliography and source notes','']
for s in unique:
    authors=scalar(s.get('authors',s.get('author','')));date=scalar(s.get('date','n.d.'));publisher=scalar(s.get('publisher',''))
    heading='['+str(s['number'])+'] '+authors.rstrip('. ')+'. '+date.rstrip('. ')+'. '+s['title'].rstrip('. ')+'. '+publisher.rstrip('. ')+'.'
    linked=html.escape(clean(heading),quote=False)+' <link href="'+html.escape(s['url'],quote=True)+'" color="#2448b5">Open source</link>'
    reference_heading=Paragraph(linked,styles['Reference'])
    source_type=scalar(s.get('type',''))
    limit=scalar(s.get('limitations',''))
    # Keep source caveats readable without duplicating full research notes in the book.
    note='Type: '+source_type+'. '+limit+' Stable IDs: '+', '.join(s['aliases'])+'.'
    flow.append(KeepTogether([reference_heading,Paragraph(html.escape(clean(note),quote=False),styles['ReferenceNote'])]))
    bib_md.extend([heading,'',s['url'],'',clean(note),''])

doc=ReportDoc(str(OUT),pagesize=A4,leftMargin=MARGIN,rightMargin=MARGIN,topMargin=53,bottomMargin=53,title='Who Shapes What America Knows? Media, Polarization, and U.S. Democracy',author='The Daily Nun - prepared for Peter Nunley',subject='AI-assisted research synthesis on media ownership, narrowcasting, polarization, and democratic accountability',allowSplitting=1)
frame=Frame(MARGIN,53,CONTENT_WIDTH,HEIGHT-106,id='body',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='report',frames=[frame],onPage=page)])
doc.multiBuild(flow)

def linked_md(text):
    return re.sub(r'\[([HMOE]\d{2})\]',lambda m:'['+str(number[m.group(1)])+']('+by_id[m.group(1)]['url']+')',clean(text))

markdown='# Who Shapes What America Knows?\n\n## Media, Polarization, and U.S. Democracy\n\nThe Daily Nun - First research report\n\nPrepared for Peter Nunley. AI-assisted research synthesis. Intended event cutoff November 11, 2026; compiled November 12, 2026.\n\n'+linked_md(front)+'\n\n'+linked_md(chapters)+'\n\n'+glossary+'\n\n'+'\n'.join(bib_md)
(ROOT/'report.md').write_text(markdown,encoding='utf-8')
(ROOT/'sources'/'citation-map.json').write_text(json.dumps(unique,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
reader=PdfReader(OUT)
all_text='\n'.join(p.extract_text() or '' for p in reader.pages)
links=sum(len(p.get('/Annots',[])) for p in reader.pages)
assert len(reader.pages)>=30, 'Report shorter than the agreed substantial PDF'
assert all(str(i)+'. '+t in all_text for i,t in chapter_heads), 'Missing chapter text'
assert 'Glossary' in all_text and 'Bibliography and source notes' in all_text
assert '\ufffd' not in all_text
assert links>150, links
destinations={d.title:reader.get_destination_page_number(d)+1 for d in reader.outline if hasattr(d,'title')}
first_chapter_page=destinations['1. When the news sounds the same'];last_chapter_page=destinations['Glossary']-1
metrics={'pages':len(reader.pages),'chapter_pages':last_chapter_page-first_chapter_page+1,'chapter_first_page':first_chapter_page,'chapter_last_page':last_chapter_page,'chapter_words':word_count(chapters),'distinct_sources':len(unique),'stable_source_ids':len(records),'pdf_link_annotations':links,'pdf_bytes':OUT.stat().st_size,'title':str(reader.metadata.title),'output':str(OUT.relative_to(ROOT)),'source_cutoff':'2026-11-11','compiled':'2026-11-12','external_agent_review':'Not yet performed','visual_review':'Pending rendered-page inspection'}
(ROOT/'validation.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
print(json.dumps(metrics,indent=2))
