import json,hashlib,re
from pathlib import Path
import pypdfium2 as pdfium
root=Path('/Users/ces/Documents/Facultate/UMC/Anul 3 Semestrul 2/TTTM 1/Documentation and schematics')
inventory=[]
for p in root.rglob('*.pdf'):
 hits=[]
 try:
  doc=pdfium.PdfDocument(str(p))
  for i in range(len(doc)):
   page=doc[i];tp=page.get_textpage();text=tp.get_text_range();tp.close();page.close()
   matches=[m.group(0) for m in re.finditer(r'.{0,70}(?:waterline length|LWL|block coefficient|symmetr|Angle\(PS\)|deck.{0,15}immersion|downflood).{0,140}',text,re.I)]
   if matches:hits.append({'page':i+1,'excerpts':matches})
  inventory.append({'file':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pages':len(doc),'hits':hits})
  doc.close()
 except Exception as e:inventory.append({'file':str(p.relative_to(root)),'pages':0,'error':str(e)})
 print(p.name,flush=True)
Path('docs/audits/step3-document-search.json').write_text(json.dumps(inventory,indent=2))
print('Searched',len(inventory),'PDFs;',sum(x['pages'] for x in inventory),'pages')
