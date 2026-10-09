"""Extract source ordinates without converting to a fixed-trim solver format."""
import csv, hashlib, json, re, sys
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
reader=PdfReader(source)
angles=[0,2,5,10,12,15,20,25,30,35,40,50,60]
trims=[-2,-1.5,-1,-.5,0,.62]
def rows(text):
 result=[]
 for line in text.splitlines():
  if re.match(r'^\s*\d{4,5}\s+[-\d.]',line):
   fields=line.split()
   assert len(fields)==14,(line,len(fields))
   assert all(re.fullmatch(r'-?\d+\.\d{3}',v) for v in fields[1:]),line
   result.append(fields)
 return result
sets=[];page_counts={};flat=[]
with pdfplumber.open(source) as independent:
 for j,trim in enumerate(trims):
  records=[]
  for page in range(60+j*3,63+j*3):
   text=reader.pages[page-1].extract_text()
   assert float(re.search(r'Initial trim\s*=\s*([-\d.]+)',text).group(1))==trim
   assert 'The trim is modified to meet constant LCB' in text
   assert 'Angle of inclination to SB' in text
   a=rows(text);b=rows(independent.pages[page-1].extract_text(layout=False))
   assert a==b,f'Independent extraction mismatch on page {page}'
   page_counts[str(page)]=len(a)
   for tokens in a:
    mass=int(tokens[0]);values=[float(v) for v in tokens[1:]]
    records.append({'displacementTonnes':mass,'ordinatesMetres':values,'sourceTokens':tokens[1:],'pdfPage':page,'printedPage':f'11.{page-58}'})
    for angle,token in zip(angles,tokens[1:]):flat.append([f'{trim:.3f}',mass,f'{angle:.2f}',token,page,f'11.{page-58}'])
  assert [r['displacementTonnes'] for r in records]==list(range(3500,14801,100))
  sets.append({'initialTrimMetres':trim,'rows':records})
metadata={'format':'vectis-cross-curves-source','version':1,'source':{'filename':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pdfPages':[60,77],'printedPages':['11.2','11.19'],'conventionsPdfPages':[6,12,13,59],'tableDate':'07 Jun 2012'},'ordinate':'KN sin(phi), as labelled by the manual; already a lever in metres, not KN to be multiplied again by sin(phi)','heelDirection':'starboard','heelAnglesDegrees':angles,'trimConvention':'Signed initial trim as printed; trim is modified during heel to meet constant LCB','referenceWaterDensityTonnesPerM3':None,'densityNote':'Mass ordinates retained exactly; no displacement-to-volume conversion or assumed reference density applied.','precisionMetres':.001,'sourceCoverage':{'initialTrimMetres':trims,'displacementTonnes':[3500,14800],'stepTonnes':100,'rows':684,'ordinates':8892},'limitations':['Positive starboard heel only; port ordinates have not been fabricated.','Initial trim is not fixed trim during heel. Do not feed this dataset to a fixed-zero-trim solver.','Downflooding tables following each set are not cross-curve ordinates and are excluded.','Source page 59 states no unprotected progressive-flooding openings up to 40 degrees; this is not an unrestricted 60-degree operating limit.'],'audit':{'independentExtraction':'Every row and printed numeric token matched between pypdf and pdfplumber.','pageRowCounts':page_counts,'corrections':[],'reviewRequired':'Extraction agreement does not certify source values. Preserve source precision and check calculations when adding the constant-LCB solver.'},'sets':sets}
(out/'cross-curves-constant-lcb.json').write_text(json.dumps(metadata,indent=2)+'\n')
with (out/'cross-curves-constant-lcb.csv').open('w',newline='') as f:
 writer=csv.writer(f);writer.writerow(['initialTrimMetres','displacementTonnes','heelDegreesStarboard','crossCurveOrdinateMetres','sourcePdfPage','sourcePrintedPage']);writer.writerows(flat)
print(json.dumps({'sets':len(sets),'rows':sum(len(s['rows']) for s in sets),'ordinates':len(flat),'independentMismatches':0,'pageRowCounts':page_counts}))
