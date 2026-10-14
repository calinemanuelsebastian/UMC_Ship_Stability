"""Read-only comparison of the supplied manual with the packaged hydrostatic tables."""
import csv, hashlib, json, re, sys
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
source=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
folder=root/'validation-references/reviewed-apples-vessel';out=root/'docs/audits/p03-foundations'
r=PdfReader(source);data=json.loads((folder/'trimmed-table.json').read_text());records=[]
with (folder/'upright.csv').open() as f: upright={float(row['draft']):row for row in csv.DictReader(f)}
def tokens(text):return [line.split() for line in text.splitlines() if re.fullmatch(r'\s*\d+\.\d{3}(?:\s+[+-]?\d+\.\d+){7}\s*',line)]
with pdfplumber.open(source) as independent:
 for n in range(35,59):
  text=r.pages[n-1].extract_text();trim=float(re.search(r'Trim\s*=\s*([+-]?\d+\.\d+)\s*m',text)[1]);a=tokens(text);b=tokens(independent.pages[n-1].extract_text());assert a==b,(n,'independent extraction mismatch')
  for t in a:
   draft,fresh,mass,tpc,mct,lcb,lcf,km=map(float,t)
   row=next(x for table in data['tables'] if table['trimMetres']==trim for x in table['rows'] if x['draft']==draft)
   assert (row['displacementTonnes'],row['lcb'],row['lcf'],row['kmTransverse'])==(mass,lcb,lcf,km),(n,draft)
   if trim==0:
    u=upright[draft]
    assert tuple(float(u[k]) for k in ['displacementTonnes','lcb','lcf','kmTransverse','tonnesPerCentimetre'])==(mass,lcb,lcf,km,tpc),(n,draft,'upright')
   records.append({'pdfPage':n,'trimMetres':trim,'draft':draft})
assert len(records)==720
wind=json.loads((folder/'wind-profiles.json').read_text());wind_rows=0
with pdfplumber.open(source) as independent:
 for profile in wind['profiles']:
  for page in sorted(set(row['pdfPage'] for row in profile['rows'])):
   def wind_tokens(t):return [l.split() for l in t.splitlines() if re.fullmatch(r'\s*\d+\.\d{3}\s+\d+\s+\d+\s+\d+\.\d{3}\s+\d+\s*',l)]
   a=wind_tokens(r.pages[page-1].extract_text());assert a==wind_tokens(independent.pages[page-1].extract_text())
   expected=[row for row in profile['rows'] if row['pdfPage']==page];assert len(a)==len(expected)
   for token,row in zip(a,expected):
    assert tuple(map(float,token))==tuple(row[k] for k in ['draftMouldedMetres','sourceDisplacementKg','momentKgMetres','sourceLeverMetres','areaM2'])
    wind_rows+=1
assert wind_rows==375
out.mkdir(parents=True,exist_ok=True)
(out/'source-hydrostatics-check.json').write_text(json.dumps({'source':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'windRowsCompared':wind_rows,'rowsCompared':len(records),'uprightRowsCompared':sum(x['trimMetres']==0 for x in records),'method':'pypdf and pdfplumber token agreement; exact packaged displacement/LCB/LCF/KMt and upright TPC; MCT not used by the LCB balance solver. No source tables written.','records':records},indent=2)+'\n')
print('720 trimmed rows and 120 upright rows match the supplied PDF; two extraction engines agree.')
