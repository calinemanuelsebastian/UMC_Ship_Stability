"""Attach preserved printed weights to matching reference cases, not editable presets.
Uses existing source-row transcripts plus manual PDF 21 lightship particulars.
Does not use recalculated tank quantities or the application's panel positions.
"""
import json,re
from pathlib import Path
root=Path('validation-references/reviewed-apples-vessel')
basis=json.loads((root/'assessment-basis.json').read_text())
presets=json.loads((root/'tanks.json').read_text())['conditions']
count=0
for c in basis['weatherEvidence']['cases']:
    preset=next((p for p in presets['items'] if c['weightsPage'] in p['sourcePages'] and c['sourceSha256']==presets['sha256']),None)
    if not preset: continue
    weights=[dict(id='lightship',name='Lightship',massTonnes=3660.,vcg=8.7,lcg=51.15,tcg=.4,freeSurfaceMomentTransverse=0.,page=21,text='Lightship: 3660 t; KG 8.700 m; LCG 51.150 m; TCG 0.400 m')]
    for i,r in enumerate(preset['sourceRows']):
        m=re.search(r'(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s*([!#]?)\s*$',r['text'])
        if not m: raise ValueError(r)
        mass,kg,lcg,tcg,fsm=map(float,m.groups()[:5])
        weights.append(dict(id=str(i),name=r['text'][:m.start()].strip(),massTonnes=mass,vcg=kg,lcg=lcg,tcg=tcg,freeSurfaceMomentTransverse=0 if m[6]=='#' else fsm,page=r['page'],text=r['text']))
    c['weightRows']=weights
    count+=1
(root/'assessment-basis.json').write_text(json.dumps(basis,indent=2,ensure_ascii=False)+'\n')
print('Attached original weight rows to',count,'reference cases')
