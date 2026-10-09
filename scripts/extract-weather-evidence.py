"""Extract condition-specific PS curves; never promote them to a general interpolation grid."""
import sys,json,re,hashlib
from pathlib import Path
import pypdfium2 as pdfium
import pdfplumber
root=Path(sys.argv[1]); target=Path(sys.argv[2])
number=r'-?\d+\.\d+'
row=re.compile(r'^\s*('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')\s*$',re.M)
condition=lambda t: re.search(r'Condition\s*:\s*([^\r\n]+)',t).group(1).strip()
records=[]; inventory=[]
for name in ['004_STABILITY_LOADING_MANUAL.pdf','007_BALLAST_MANAGEMENT.pdf']:
 file=root/name; pdf=pdfium.PdfDocument(str(file)); texts=[pdf[i].get_textpage().get_text_range() for i in range(len(pdf))]; sha=hashlib.sha256(file.read_bytes()).hexdigest(); pages=[]
 with pdfplumber.open(file) as other:
  for i,t in enumerate(texts):
   if not re.search(r'Angle\s*\(PS\)',t):continue
   tokens=row.findall(t); alt=row.findall(other.pages[i].extract_text()); other.pages[i].close()
   assert tokens==alt and len(tokens)==13,(name,i+1,'curve extraction disagrees')
   label=condition(t); summaryIndex=i if 'Maximum statical angle 80%' in t else i+1
   summary=texts[summaryIndex]
   assert condition(summary)==label and 'Maximum statical angle 80%' in summary
   pattern=r'Maximum statical angle 80% of angle of deck immersion\s+('+number+r')\s+('+number+r')'
   deck=re.search(pattern,summary).groups(); flood=re.search(r'Flooding angle\s+('+number+r')',summary).group(1)
   alternate=other.pages[summaryIndex].extract_text()
   assert re.search(pattern,alternate).groups()==deck
   assert re.search(r'Flooding angle\s+('+number+r')',alternate).group(1)==flood
   other.pages[summaryIndex].close()
   found=None
   for j in range(i,-1,-1):
    if j<i-6:break
    if 'Condition' not in texts[j] or condition(texts[j])!=label:break
    total=re.search(r'^TOTAL\s+-\s+-\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')',texts[j],re.M)
    if total:
     altTotal=re.search(r'^TOTAL\s+-\s+-\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')\s+('+number+r')',other.pages[j].extract_text(),re.M)
     assert altTotal and altTotal.groups()==total.groups();other.pages[j].close()
     found=(j,total.groups());break
   assert found,(name,i,'missing condition totals')
   weightPage,total=found
   cases={'id':name[:3]+'-'+str(i+1),'condition':label,'sourceFile':name,'sourceSha256':sha,'curvePage':i+1,'summaryPage':summaryIndex+1,'weightsPage':weightPage+1,'direction':'port','weightTokens':list(total),'massTonnes':float(total[0]),'physicalKg':float(total[1]),'lcg':float(total[2]),'tcgStarboard':float(total[3]),'fsm':float(total[4]),'deckLimit80Deg':float(deck[0]),'sourceWindHeelDeg':float(deck[1]),'reportedFloodingDeg':float(flood),'summaryTokens':list(deck)+[flood],'rows':[{'anglePortDeg':float(v[0]),'draft':float(v[1]),'trim':float(v[2]),'kn':float(v[3]),'kgSin':float(v[4]),'tcgCos':float(v[5]),'gzCorrectedPort':float(v[6]),'areaPort':float(v[7]),'sourceTokens':list(v)}for v in tokens]}
   records.append(cases);pages.append(i+1)
 inventory.append({'file':name,'sha256':sha,'pagesSearched':len(pdf),'portCurvePages':pages})
data=json.loads(target.read_text())
previous={c['id']:c for c in data.get('weatherEvidence',{}).get('cases',[])}
for c in records:
 old=previous.get(c['id'])
 if old and old['sourceSha256']==c['sourceSha256'] and old.get('weightRows'):
  c['weightRows']=old['weightRows']
data['weatherEvidence']={'version':1,'notice':'Stability manual: preliminary approval. Ballast plan: inspected PDF 52 carries a “Not Accepted” stamp. All cases here are source evidence, not approved operating limits.','waterlineFinding':'Waterline review: PDF 34 lists design LWL 123.950 m, breadth 17.400 m and design draught 8.000 m; PDF 5 lists block coefficient 0.8026. No condition-dependent LWL/CB table was identified in the seven vessel documents. These design particulars are not applied automatically.','scope':'Condition-specific port-side references only; not a general interpolation table or current-condition limits.','validation':'Every curve, total-weight and summary numeric token independently matched PDFium and pdfplumber. Source PDFs unchanged.','sources':inventory,'cases':records}
for r in data['requirements']:
 if r['id']=='weather':r['gap']='Gust, empirical roll and energy calculations are implemented with explicit missing-data guards. Condition-specific port-side reference curves and deck-immersion summary limits are extracted; a general two-sided grid, condition-dependent LWL/CB and verified final opening limits remain unavailable.'
target.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
print('Extracted',len(records),'cases and',sum(len(r['rows'])for r in records),'port-side rows',flush=True)
