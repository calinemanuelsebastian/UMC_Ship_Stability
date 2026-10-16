"""Build read-only study cases from source weight rows, trajectories and arrangement pages.
Usage: python extract-documented-studies.py DOCUMENT_DIRECTORY
All printed numeric tokens retained. Never converts aggregate weights into fabricated cargo blocks.
"""
from pathlib import Path
import json,re,hashlib,io,base64,sys
from pypdf import PdfReader
import pypdfium2 as pdfium
root=Path(sys.argv[1]);out=Path('validation-references/reviewed-apples-vessel')
audit=json.loads(Path('docs/audits/vectis-coupled-data-search/condition-trajectories.json').read_text())
num=r'-?\d+\.\d+'
row=re.compile(r'^(.*?)\s+(-|'+num+r')\s+(-|'+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s*([!#]?)$')
def condition(s):
 m=re.search(r'Condition\s*:\s*([^\r\n]+)',s);return m.group(1).strip() if m else None
sources={};docs={};texts={}
for file in ['004_STABILITY_LOADING_MANUAL.pdf','007_BALLAST_MANAGEMENT.pdf','006_STRENGHT_LOADING_MANUAL.pdf']:
 path=root/file;docs[file]=pdfium.PdfDocument(str(path));texts[file]=[]
 for i in range(len(docs[file])):
  pg=docs[file][i];tp=pg.get_textpage();texts[file].append(tp.get_text_range());tp.close();pg.close()
 sources[file]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pages':len(texts[file])}

strength={}
for n,s in enumerate(texts['006_STRENGHT_LOADING_MANUAL.pdf'],1):
 if condition(s):strength.setdefault(condition(s),[]).append(n)
cases=[]
for rec in audit['records']:
 if rec['pdfPage']==13 and rec['file'].startswith('004'):continue # duplicate worked example of p269
 file=rec['file'];page=rec['pdfPage'];ss=texts[file];name=rec['condition'];group='Lightship';items=[];total=None;sourcePages=[]
 # Contiguous preceding weight-table pages of exactly this case.
 start=page-2
 while start>=0 and condition(ss[start])==name and 'Description' in ss[start] and 'Weight' in ss[start]:start-=1
 for i in range(start+1,page-1):
  sourcePages.append(i+1)
  for line in ss[i].splitlines():
   if line.startswith('Subtotals for group :'):group=line.split(':',1)[1].strip();continue
   m=row.fullmatch(line.strip())
   if not m:continue
   label,fill,density,mass,kg,lcg,tcg,fsm,flag=m.groups()
   if label=='TOTAL':total=dict(zip(['mass','kg','lcg','tcg','fsm'],map(float,[mass,kg,lcg,tcg,fsm])));continue
   if label in ['SUBTOTAL','Deadweight']:continue
   category='Lightship' if label=='Empty ship' else group
   items.append(dict(id=f'row-{len(items)+1}',name=label,group=category,fill=None if fill=='-' else float(fill),density=None if density=='-' else float(density),mass=float(mass),kg=float(kg),lcg=float(lcg),tcg=float(tcg),fsm=float(fsm),flag=flag,page=i+1,sourceText=line.strip()))
 assert items and total,(file,page,len(items))
 expected=[float(v) for v in rec['precedingTotalLine'].split()]
 assert list(total.values())==expected,(file,page,'total disagreement')
 mass=sum(w['mass'] for w in items);centres={k:sum(w['mass']*w[k] for w in items)/mass for k in ['kg','lcg','tcg']}
 assert abs(mass-total['mass'])<.08,(file,page,'mass rows do not reconcile',mass,total['mass'])
 assert all(abs(centres[k]-total[k])<.003 for k in centres),(file,page,'centre reconciliation',centres,total)
 table=ss[page-1];density=re.search(r'Specific weight\s+('+num+r')','\n'.join(ss[n-1] for n in sourcePages)+table);assert density,(file,page,table[:1000])
 static=re.search(r'Statical angle of inclination is\s+('+num+r')\s+degrees to\s+(portside|starboard)',table)
 arrangement=[];summary=table[table.index('Summary'):] if 'Summary' in table else ''
 for n in range(page+1,min(page+5,len(ss))+1):
  s=ss[n-1]
  if condition(s)!=name:break
  if 'Summary' in s:summary=s
  if 'Horizontal section' in s:
   cache=Path('/tmp/vectis-study-images');cache.mkdir(exist_ok=True);image=cache/f'{file[:3]}-{n}.webp'
   if not image.exists():
    p=docs[file][n-1];im=p.render(scale=1.8).to_pil();im.save(image,format='WEBP',quality=88);p.close()
   buf=io.BytesIO(image.read_bytes())
   arrangement.append({'page':n,'image':'data:image/webp;base64,'+base64.b64encode(buf.getvalue()).decode()})
 rejected=file.startswith('007');special=any(v in name.lower() for v in ['grain','timber','container','iron ore'])
 cases.append(dict(id=f'{file[:3]}-{page}',name=name,family='Ballast exchange' if rejected else 'Non-seagoing' if 'no seagoing' in name else 'Special cargo' if special else 'General loading',source=file,trajectoryPage=page,weightPages=sourcePages,strengthPages=strength.get(name,[]) if not rejected else [],qualifications=['NOT ACCEPTED — Annex 3 source examples. Study only; not a pumping plan.'] if rejected else ['Non-seagoing source condition.'] if 'no seagoing' in name else ['Source example for study; approval of the current loading condition is not established.'],total=total,reconciliation={'massDifferenceTonnes':round(mass-total['mass'],6),'maxCentreDifferenceMetres':max(abs(centres[k]-total[k]) for k in centres)},waterDensity=float(density.group(1)),staticHeel=None if not static else float(static.group(1))*(-1 if static.group(2)=='portside' else 1),direction=rec['heelDirection'],trajectory=[[float(v) for v in r] for r in rec['sourceTokens']],items=items,arrangement=arrangement,summaryText=summary))
value={'version':1,'modelId':'reviewed-apples-vessel','sources':sources,'cases':cases,'note':'Exact printed source weights/centres and trajectory samples; source rounding retained. No live-condition substitution. 77 unique conditions; the worked steel-coils trajectory on stability PDF p13 duplicates p269. Source cargo rows remain aggregate weights, not dimensioned units. The reconstructed hull pose is a visual interpretation of moulded midship draft, trim and heel, not verified heeled draft marks or displaced mesh volume.'}
(out/'documented-studies.json').write_text(json.dumps(value,separators=(',',':'),ensure_ascii=False)+'\n')
manifest=out/'manifest.json';m=json.loads(manifest.read_text());m['resources']=[r for r in m['resources'] if r['kind']!='documentation.study-cases']+[{'id':'documented-studies','kind':'documentation.study-cases','path':'documented-studies.json','config':{'sourceModelId':'reviewed-apples-vessel'}}];manifest.write_text(json.dumps(m,indent=2)+'\n')
print({'cases':len(cases),'weightRows':sum(len(c['items']) for c in cases),'arrangementPages':sum(len(c['arrangement']) for c in cases),'bytes':(out/'documented-studies.json').stat().st_size})
for d in docs.values():d.close()
