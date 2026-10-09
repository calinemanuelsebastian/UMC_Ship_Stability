"""Extract annotated limits and sparse flooding thresholds without filling source gaps."""
import csv, hashlib, json, re, sys, xml.etree.ElementTree as ET
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
source, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True,exist_ok=True)
r=PdfReader(source)
provenance={'file':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
rows=[]
def kg_tokens(text):
 return [line.split() for line in text.splitlines() if re.fullmatch(r'\s*(?:\d+\.\d+\s+){5}DAM-GM\s*',line)]
for page in [175,176]:
 annotations=[a.get_object() for a in r.pages[page-1]['/Annots'] if 'DAM-GM' in str(a.get_object().get('/Contents',''))]
 assert len(annotations)==1
 a=annotations[0];tokens=kg_tokens(a['/Contents'])
 rich=''.join(ET.fromstring(a['/RC']).itertext())
 assert tokens==kg_tokens(rich), 'Annotation plain/rich text differs'
 for t in tokens:rows.append(dict(zip(['draftBottomKeelMetres','draftMouldedMetres','displacementTonnes','maximumVcgMetres','minimumGmMetres'],map(float,t[:5])),criterion=t[5],sourceTokens=t,pdfPage=page))
assert len(rows)==71,len(rows)
for key in ['draftBottomKeelMetres','draftMouldedMetres','displacementTonnes']:
 assert all(b[key]>a[key] for a,b in zip(rows,rows[1:]))
kg={'format':'umc-annotated-kg-limits','version':1,'source':provenance,'status':'Extracted source data; not an operational compliance verdict','application':'Cover annotation: use limiting curve on printed pages 13.82 and 13.83 for all trims and arbitrary deckload. Final approval letter remains unverified.','validation':'All five numeric columns match PDF annotation Contents and rich-text RC. Two rendered pages visually reviewed. Original precision retained.','reviewNotes':['DAM-GM is the printed criterion; these rows do not independently demonstrate intact or weather compliance.','Draught datum offsets vary at printed precision (0.011–0.012 m). Do not replace them with a fixed offset.','Annotated displacement differs from the existing hydrostatic tables. Do not silently join tables by draught or replace the hydrostatics.','Corrected KG convention and operating scope require verification against the approval letter before automatic pass/fail.'],'corrections':[],'rows':rows}
(out/'annotated-kg-limits.json').write_text(json.dumps(kg,indent=2)+'\n')
with (out/'annotated-kg-limits.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['draftBottomKeelMetres','draftMouldedMetres','displacementTonnes','maximumVcgMetres','minimumGmMetres','criterion','sourcePdfPage']);w.writerows([*x['sourceTokens'],x['pdfPage']] for x in rows)
angles=[0,2,5,10,12,15,20,25,30,35,40,50,60]
sets=[]
def flood_tokens(text):
 parts=text.split('Opening :')[1:];result=[]
 for part in parts:
  name=part.splitlines()[0].strip();data=re.findall(r'^\s*(\d+\.\d{2})\s+(-|\d+\.\d{3})\s*$',part,re.M)
  assert [float(x[0]) for x in data]==angles
  result.append((name,data))
 return result
with pdfplumber.open(source) as independent:
 for page,trim in zip([62,65,68,71,74,77],[-2,-1.5,-1,-.5,0,.62]):
  text=r.pages[page-1].extract_text();a=flood_tokens(text);b=flood_tokens(independent.pages[page-1].extract_text())
  assert a==b and len(a)==2
  sets.append({'initialTrimMetres':trim,'pdfPage':page,'openings':[{'name':name,'samples':[{'heelDegrees':float(angle),'floodingDisplacementTonnes':None if value=='-' else float(value),'sourceToken':value} for angle,value in samples]} for name,samples in a]})
# Preserve all source opening names, including duplicates and question marks.
openings=[]
for page in [18,19]:
 for line in r.pages[page-1].extract_text().splitlines():
  m=re.match(r'^\s*(.*?)\s+(-?\d+\.\d{3})\s+(-?\d+\.\d{3})\s+(-?\d+\.\d{3})\s+(Weathertight opening|Open opening|Watertight)\s+(.*?)\s*$',line)
  if m:openings.append({'name':m[1],'x':float(m[2]),'y':float(m[3]),'z':float(m[4]),'type':m[5],'compartment':m[6],'pdfPage':page})
assert len([x for x in openings if x['type']=='Open opening'])==2
flood={'format':'umc-downflooding-samples','version':1,'source':provenance,'heelDirection':'starboard','referenceDensity':1.025,'massRangeTonnes':[3500,14800],'coordinateNote':'Frame 0, centreline, baseline; source coordinates retained. No geometry-based immersion calculation.','reviewNotes':['PDF 18 red annotation requires both engine-room supply vent positions to be updated to the final Damage Control Plan. Thresholds remain preliminary.'],'unknownToken':'- means no numeric threshold supplied; not zero, infinity or proof of safety.','validation':'Every threshold token agrees between pypdf and pdfplumber.','corrections':[],'openings':openings,'sets':sets}
(out/'downflooding-samples.json').write_text(json.dumps(flood,indent=2)+'\n')
with (out/'downflooding-samples.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['initialTrimMetres','opening','heelDegreesStarboard','floodingDisplacementTonnes','sourcePdfPage'])
 for s in sets:
  for o in s['openings']:
   for a in o['samples']:w.writerow([s['initialTrimMetres'],o['name'],a['heelDegrees'],a['sourceToken'],s['pdfPage']])
print(json.dumps({'kgRows':len(rows),'openingRows':len(openings),'floodingSamples':156,'numericThresholds':sum(a['floodingDisplacementTonnes'] is not None for s in sets for o in s['openings'] for a in o['samples'])}))
