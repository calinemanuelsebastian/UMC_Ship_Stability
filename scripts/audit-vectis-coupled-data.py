"""Read-only source audit; extract condition-specific trajectories, not a solver grid.
Usage: python audit-vectis-coupled-data.py SOURCE_DOCUMENT_DIRECTORY OUTPUT_DIRECTORY
Requires pypdfium2 and pypdf. Preserves printed numeric tokens and compares engines.
"""
import sys,json,re,hashlib
from pathlib import Path
import pypdfium2 as pdfium
from pypdf import PdfReader
source,out=map(Path,sys.argv[1:3]);out.mkdir(parents=True,exist_ok=True)
header=re.compile(r'Angle\s*\((SB|PS)\)\s*Draft')
row=re.compile(r'^\s*(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s*$',re.M)
def rows(text):
 h=header.search(text)
 if not h:return []
 section=text[h.end():].split('Statical angle')[0]
 return [list(m.groups()) for m in row.finditer(section)]
records=[]
for name in ['004_STABILITY_LOADING_MANUAL.pdf','007_BALLAST_MANAGEMENT.pdf']:
 p=source/name;d=pdfium.PdfDocument(str(p));texts=[];independent=PdfReader(p)
 for i in range(len(d)):
  pg=d[i];tp=pg.get_textpage();texts.append(tp.get_text_range());tp.close();pg.close()
 for i,s in enumerate(texts):
  h=header.search(s)
  if not h:continue
  a=rows(s);b=rows(independent.pages[i].extract_text())
  assert a and a==b,(name,i+1,'numeric extraction disagreement')
  condition=re.search(r'Condition\s*:\s*([^\r\n]+)',s)
  previous=texts[i-1] if i else ''
  totals=re.findall(r'^TOTAL\s+-\s+-\s+([^\r\n]+)',previous,re.M)
  records.append({'file':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pdfPage':i+1,'printedPage':s.strip().splitlines()[0],'condition':condition.group(1).strip() if condition else 'Worked steel-coils example (context on PDF p12)','heelDirection':h.group(1),'columns':['heelDegrees','draftMouldedMetres','trimMetres','crossCurveLeverMetres','correctedKgSinMetres','tcgCosMetres','gzMetres','areaMetreRadians'],'sourceTokens':a,'precedingTotalLine':totals[-1] if totals else None,'contextPdfPage':i,'status':'Source reference only; condition fingerprint and datum semantics require validation before runtime use'})
 d.close()
summary={'date':'2026-10-15','scope':'Condition-specific constant-LCB trajectory tables. Not a complete coupled hydrostatic surface. Grain, docking and ballast cases are not interchangeable.','tables':len(records),'rows':sum(len(x['sourceTokens']) for x in records),'portTables':sum(x['heelDirection']=='PS' for x in records),'independentNumericExtraction':'pypdfium2 and pypdf match every retained token','records':records}
(out/'condition-trajectories.json').write_text(json.dumps(summary,indent=2)+'\n')
print({k:v for k,v in summary.items() if k!='records'})
