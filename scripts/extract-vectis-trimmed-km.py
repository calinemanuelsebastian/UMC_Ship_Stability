"""Enrich existing trimmed tables with KMt, preserving every existing value."""
import hashlib,json,re,sys
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
source=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]/'validation-references/reviewed-apples-vessel'
r=PdfReader(source);data=json.loads((root/'trimmed-table.json').read_text());records=[]
def tokens(text):return [line.split() for line in text.splitlines() if re.fullmatch(r'\s*\d+\.\d{3}(?:\s+[+-]?\d+\.\d+){7}\s*',line)]
with pdfplumber.open(source) as independent:
 for n in range(35,59):
  text=r.pages[n-1].extract_text();trim=float(re.search(r'Trim\s*=\s*([+-]?\d+\.\d+)\s*m',text)[1]);a=tokens(text);b=tokens(independent.pages[n-1].extract_text());assert a==b,(n,'independent mismatch')
  for t in a:
   draft,fresh,mass,tpc,mct,lcb,lcf,km=map(float,t)
   row=next(x for table in data['tables'] if table['trimMetres']==trim for x in table['rows'] if x['draft']==draft)
   assert (row['displacementTonnes'],row['lcb'],row['lcf'])==(mass,lcb,lcf),('Existing source mismatch',n,draft)
   row['kmTransverse']=km
   records.append({'trimMetres':trim,'draft':draft,'kmTransverse':km,'sourceToken':t[-1],'pdfPage':n})
assert len(records)==720
(root/'trimmed-table.json').write_text(json.dumps(data,indent=2)+'\n')
(root/'trimmed-km-audit.json').write_text(json.dumps({'source':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'Every numeric table token independently matched between pypdf and pdfplumber. Existing mass, LCB and LCF preserved exactly. KMt measured above baseline per manual PDF 12.','corrections':[],'records':records},indent=2)+'\n')
print('720 KMt values added; no existing table values changed.')
