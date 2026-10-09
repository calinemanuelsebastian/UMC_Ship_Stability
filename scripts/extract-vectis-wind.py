import json,re,sys,hashlib
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
src=Path(sys.argv[1]);out=Path(__file__).resolve().parents[1]/'validation-references/reviewed-apples-vessel/wind-profiles.json';pdf=PdfReader(src)
def rows(t):return [l.split() for l in t.splitlines() if re.fullmatch(r'\s*\d+\.\d{3}\s+\d+\s+\d+\s+\d+\.\d{3}\s+\d+\s*',l)]
profiles=[]
with pdfplumber.open(src) as other:
 for i,label in enumerate(['No deck cargo','Containers: 1 tier','Containers: 2 tiers','Containers: 3 tiers','Containers: 4 tiers']):
  data=[]
  for n in [79+3*i,80+3*i]:
   a=rows(pdf.pages[n-1].extract_text());assert a==rows(other.pages[n-1].extract_text()),n
   for r in a:
    draft,mass,moment,lever,area=map(float,r);assert abs(moment/mass-lever)<.00051
    data.append(dict(draftMouldedMetres=draft,sourceDisplacementKg=mass,momentKgMetres=moment,sourceLeverMetres=lever,areaM2=area,sourceTokens=r,pdfPage=n))
  assert len(data)==75,len(data)
  profiles.append(dict(id=str(i),label=label,rows=data))
d={'format':'umc-wind-profiles','version':1,'source':{'file':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()},'pressureKgPerM2':51.4,'reference':'Draught from baseline; moment about half draught; source pressure retained. Tables dated March 2011.','bilgeKeelAreaM2':21.5,'validation':'All numeric tokens agree between pypdf and pdfplumber. Moment/displacement agrees with printed lever within 0.00051 m.','profiles':profiles}
out.write_text(json.dumps(d,indent=2)+'\n');print('Extracted',sum(len(x['rows']) for x in profiles),'wind rows')
