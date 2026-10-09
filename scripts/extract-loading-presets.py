"""Extract starter-condition inputs; preserve source totals and never invent cargo geometry."""
import hashlib,json,re,sys
from pathlib import Path
import pdfplumber
source=Path(sys.argv[1]);target=Path(sys.argv[2]);catalog=json.loads(target.read_text());known={t['id'] for t in catalog['tanks']}
cases=[('ballast-departure','Ballast departure',227,'installed'),('ballast-arrival','Ballast arrival',232,'installed'),('homogeneous-departure','Homogeneous cargo — departure',237,'ashore'),('homogeneous-arrival','Homogeneous cargo — arrival',242,'ashore'),('stored-departure','Homogeneous cargo, decks stored — departure',247,'stored'),('stored-arrival','Homogeneous cargo, decks stored — arrival',252,'stored'),('heavy-departure','Heavy cargo — departure',257,'stored'),('heavy-arrival','Heavy cargo — arrival',262,'stored'),('coils-departure','Steel coils — departure',267,'stored'),('coils-arrival','Steel coils — arrival',272,'stored')]
num=r'-?\d+\.\d+';pattern=re.compile(r'^(.*?)\s+(-|'+num+r')\s+(-|'+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s+('+num+r')\s*([!#]?)$')
output=[]
with pdfplumber.open(source) as pdf:
 for id,name,page,deck in cases:
  tanks=[];weights=[];group='';sourceRows=[];reference=None;deckRows=[]
  for n in [page,page+1]:
   text=pdf.pages[n-1].extract_text()
   for line in text.splitlines():
    if line.startswith('Subtotals for group :'):group=line.split(':',1)[1].strip();continue
    match=pattern.fullmatch(line)
    if not match:continue
    label,fill,density,mass,kg,lcg,tcg,fsm,flag=match.groups();mass,kg,lcg,tcg,fsm=map(float,[mass,kg,lcg,tcg,fsm])
    if label=='TOTAL':reference=dict(displacementTonnes=mass,vcg=kg,lcg=lcg,tcg=tcg,fsm=fsm);continue
    if label in ['Empty ship','SUBTOTAL','Deadweight']:continue
    sourceRows.append({'page':n,'text':line})
    if group=='Grainbulkheads / Tweendecks':deckRows.append(dict(massTonnes=mass,vcg=kg,lcg=lcg,tcg=tcg));continue
    if group not in ['Cargo','Other']:
     code=label.split()[0];tankId=code.zfill(3) if code[-1].isdigit() else code[:-1].zfill(3)+code[-1]
     if tankId in known:
      tanks.append(dict(id=tankId,fillPercent=float(fill),density=float(density),sourceMassTonnes=mass));continue
     assert code=='65',('Unmapped tank',label)
    index=len(weights);category='cargo' if group=='Cargo' else 'other'
    row=dict(id=f'condition-{id}-{index}',name=label,category=category,massTonnes=str(mass),vcg=str(kg),lcg=str(lcg),tcg=str(tcg),freeSurfaceMomentTransverse=str(0 if flag=='#' else fsm))
    if category=='cargo':row['hold']='Cargo hold 1' if lcg>82 else 'Cargo hold 2'
    weights.append(row)
  assert reference and len(tanks)==len({t['id'] for t in tanks}) and tanks
  output.append(dict(id=id,name=name,waterDensity=1.025,tweenDeck=deck,tanks=tanks,weights=weights,reference=reference,sourceDeckWeights=deckRows,sourcePages=[page,page+1],sourceRows=sourceRows))
catalog['conditions']={'version':1,'source':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'note':'Source-based editable starters, not exact replays or approved operating conditions. Current tank capacities, filling-dependent centres and FSM are recalculated. Current installed/stored deck configuration is used, which can differ from the source stowage. Cargo rows are aggregate weights, not individual cargo units. Grain heeling moments marked # are not liquid FSM and are not applied as such.','items':output}
target.write_text(json.dumps(catalog,indent=2)+'\n');print([(x['id'],len(x['tanks']),len(x['weights'])) for x in output])
