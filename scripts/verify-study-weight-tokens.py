"""Independently compare every retained source weight's numeric tokens with pypdf.
Usage: python verify-study-weight-tokens.py DOCUMENT_DIRECTORY
"""
from pathlib import Path
import sys,json,re
from collections import Counter
from pypdf import PdfReader
root=Path(sys.argv[1]);data=json.loads(Path('validation-references/reviewed-apples-vessel/documented-studies.json').read_text());readers={n:PdfReader(root/n) for n in data['sources'] if not n.startswith('006')}
num=r'-?\d+\.\d+'
pattern=re.compile(r'^(.*?)\s+(-|'+num+r')\s+(-|'+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s*([!#]?)$')
pages={};checked=0
for c in data['cases']:
 for page in c['weightPages']:
  key=(c['source'],page)
  if key not in pages:
   fields=[]
   for line in readers[c['source']].pages[page-1].extract_text().splitlines():
    m=pattern.fullmatch(line.strip())
    if m:fields.append(tuple(float(v) if v!='-' else None for v in m.groups()[1:8])+(m.groups()[8],))
   pages[key]=Counter(fields)
  counts=pages[key].copy()
  for r in c['items']:
   if r['page']!=page:continue
   values=tuple(r[k] for k in ['fill','density','mass','kg','lcg','tcg','fsm'])+(r['flag'],)
   assert counts[values]>0,(key,r)
   counts[values]-=1;checked+=1
report={'independentEngine':'pypdf','primaryEngine':'pypdfium2','weightRowsCompared':checked,'weightPages':len(pages),'numericDisagreements':0,'massToleranceTonnes':.08,'centreToleranceMetres':.003}
Path('docs/audits/vectis-coupled-data-search/study-weight-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
