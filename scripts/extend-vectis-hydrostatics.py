"""Extract source table knots without extrapolation. Usage: python script.py manual.pdf"""
import csv,json,re,sys
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]/'validation-references/reviewed-apples-vessel'
pdf=PdfReader(sys.argv[1]); tables={}; audit=[]
for page_index in range(34,58):
    text=pdf.pages[page_index].extract_text()
    trim=float(re.search(r'Trim\s*=\s*([+-]?\d+\.\d+)\s*m',text)[1])
    rows=[]
    for line in text.splitlines():
        if not re.fullmatch(r'\s*\d+\.\d{3}(?:\s+[+-]?\d+\.\d+){7}\s*',line): continue
        draft,fresh,mass,tpc,mct,lcb,lcf,kmt=map(float,line.split())
        assert abs(fresh*1.025-mass)<.011
        rows.append(dict(draft=draft,displacementTonnes=mass,lcb=lcb,lcf=lcf,kmTransverse=kmt,tonnesPerCentimetre=tpc))
    assert rows, page_index
    tables.setdefault(trim,[]).extend(rows)
    audit.append(dict(pdfPage=page_index+1,trimMetres=trim,rows=len(rows),firstDraft=rows[0]['draft'],lastDraft=rows[-1]['draft']))
assert sorted(tables)==[-2,-1.5,-1,-.5,0,.62]
for trim,rows in tables.items():
    assert len(rows)==120,(trim,len(rows))
    assert [round(r['draft']*1000) for r in rows]==sorted([*range(2500,8401,50),8011])
    assert all(b['displacementTonnes']>a['displacementTonnes'] for a,b in zip(rows,rows[1:]))
# Verify the old Excel bracket against the expanded source data before replacing it.
differences=[]
for old in csv.DictReader((root/'upright.csv').open()):
    row=next(r for r in tables[0] if r['draft']==float(old['draft']))
    for key,val in old.items():
        if key in row and val and abs(row[key]-float(val))>1e-8: differences.append(dict(draft=row['draft'],field=key,previous=float(val),manual=row[key]))
audit_path=root/'hydrostatics-source.json'
if audit_path.exists():
    for difference in json.loads(audit_path.read_text()).get('previousBracketDifferences',[]):
        if difference not in differences: differences.append(difference)
with (root/'upright.csv').open('w') as f:
    fields=[*tables[0][0],'sourcePdfPage','previousLcb','previousLcf','correctionLog']
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
    for r in tables[0]:
        page=next(a['pdfPage'] for a in audit if a['trimMetres']==0 and a['firstDraft']<=r['draft']<=a['lastDraft'])
        changes=[d for d in differences if d['draft']==r['draft']]
        record={**r,'sourcePdfPage':page,'correctionLog':'; '.join(f"Source discrepancy: {d['field']} {d['previous']} -> {d['manual']}; manual PDF p{page}; recheck LCB/LCF-dependent calculations" for d in changes)}
        for d in changes: record[{'lcb':'previousLcb','lcf':'previousLcf'}[d['field']]]=d['previous']
        writer.writerow(record)
previous=json.loads((root/'trimmed-table.json').read_text())
previous['source']='004_STABILITY_LOADING_MANUAL.pdf, PDF pp35–58, printed 10.2–10.25. Draft from underside of keel; source table knots at 0.05 m. No extrapolation. Mean-draught datum: half LPP per PDF 5–6; moulded offset 0.011 m per PDF 32–33.'
old_tables=previous['tables']
previous['tables']=[dict(trimMetres=trim,rows=[{k:r[k] for k in ['draft','displacementTonnes','lcb','lcf','kmTransverse']} for r in rows]) for trim,rows in sorted(tables.items())]
previous.setdefault('correctionLog',[])
# Original four-row comparison bracket, retained independently of later imports.
original=[(-1.5,5.75,9626.15,58.693,56.492),(-1.5,5.8,9722.62,58.67,56.428),(-1,5.75,9593.59,59.516,56.916),(-1,5.8,9689.37,59.49,56.848)]
for trim,draft,mass,lcb,lcf in original:
    row=next(r for r in tables[trim] if r['draft']==draft)
    for field,old in [('displacementTonnes',mass),('lcb',lcb),('lcf',lcf)]:
        if abs(row[field]-old)>1e-8:
            entry=dict(kind='Source discrepancy',trimMetres=trim,draft=draft,field=field,previous=old,corrected=row[field],sourcePdfPage=next(a['pdfPage'] for a in audit if a['trimMetres']==trim and a['firstDraft']<=draft<=a['lastDraft']),review='Recheck trim equilibrium and derived drafts with the manual values.')
            if entry not in previous['correctionLog']:previous['correctionLog'].append(entry)
previous['audit']=dict(rowCount=720,draftRange=[2.5,8.4],extraSummerDraft=8.011,checks=['Six complete trim tables','Increasing draft and displacement','Fresh/salt density agreement within rounding','Source values transcribed without extrapolation'],reviewRequired=True)
(root/'trimmed-table.json').write_text(json.dumps(previous,indent=2)+'\n')
(root/'hydrostatics-source.json').write_text(json.dumps(dict(previousBracketDifferences=differences,source=Path(sys.argv[1]).name,pages=audit,waterDensity=1.025,draftDatum='Underside of keel',notes='TPC and KMt transcribed directly. MCT is not imported: manual specifies a 1.0028 appendage factor. KB and KMl are not supplied in these tables. Table range is not a load-line permission.'),indent=2)+'\n')
print({trim:(len(rows),rows[0]['displacementTonnes'],rows[-1]['displacementTonnes']) for trim,rows in tables.items()})
